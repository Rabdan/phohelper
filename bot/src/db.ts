import postgres from "postgres"; // eslint-disable-line @typescript-eslint/no-require-imports

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/phomenu";
export const sql = postgres(connectionString, { max: 10 });

export async function getOrCreateUser(
  telegramId: string,
  username?: string,
  firstName?: string,
) {
  const [user] = await sql`
    INSERT INTO users (telegram_id, username, first_name)
    VALUES (${telegramId}, ${username ?? null}, ${firstName ?? null})
    ON CONFLICT (telegram_id) DO UPDATE SET
      username = EXCLUDED.username,
      first_name = EXCLUDED.first_name,
      updated_at = NOW()
    RETURNING *
  `;
  return user;
}

export async function getDishById(id: number): Promise<any | null> {
  const [dish] = await sql`
    SELECT * FROM dishes WHERE id = ${id}
  `;
  return dish || null;
}

export async function getDishByName(name: string): Promise<any | null> {
  console.log(`🔍 DB search for: "${name}"`);

  const searchLower = name.toLowerCase().trim();
  const searchNormalized = searchLower
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const [dish] = await sql`
    SELECT * FROM dishes
    WHERE is_moderated = true
    AND (
      LOWER(name_vi) = ${searchLower}
      OR LOWER(name_vi) LIKE ${"%" + searchLower + "%"}
      OR LOWER(name_vi) LIKE ${"%" + searchNormalized + "%"}
    )
    LIMIT 1
  `;

  if (dish) {
    console.log(`✅ Found by name_vi: ${dish.name_vi}`);
  } else {
    console.log(`❌ Dish not found for: "${name}"`);
  }

  return dish || null;
}

export interface SearchParams {
  query?: string[];
  queryname?: string[];
  spiceLevel?: number;
  excludeWarnings?: string[];
  excludeQuery?: string[];
}

export async function searchDishesAdvanced(
  params: SearchParams,
): Promise<any[]> {
  const {
    query = [],
    queryname = [],
    spiceLevel,
    excludeWarnings = [],
    excludeQuery = [],
  } = params;

  // Helper to ensure we are working with arrays and clean strings
  const ensureArray = (val: any): string[] => {
    if (Array.isArray(val)) return val.map(String);
    if (typeof val === "string") return val.split(",").filter(Boolean);
    return [];
  };

  const queryTags = ensureArray(query).map(
    (t) => `%${t.toLowerCase().trim()}%`,
  );
  const excludeTags = ensureArray(excludeQuery).map(
    (t) => `%${t.toLowerCase().trim()}%`,
  );
  const namePatterns = ensureArray(queryname).map(
    (n) => `%${n.toLowerCase().trim()}%`,
  );
  const warningPatterns = ensureArray(excludeWarnings).map(
    (w) => `%${w.toLowerCase().trim()}%`,
  );

  const conditions = [];

  // 1. Main Search: Tags (ALL) OR Names (ANY)
  if (queryTags.length > 0 || namePatterns.length > 0) {
    const searchParts = [];

    if (queryTags.length > 0) {
      const tagAnds = queryTags.map((t) => sql`search_tags::text ILIKE ${t}`);
      searchParts.push(
        sql`(${tagAnds.reduce((acc, curr) => sql`${acc} AND ${curr}`)})`,
      );
    }

    if (namePatterns.length > 0) {
      const nameOrs = namePatterns.map((n) => sql`name_vi ILIKE ${n}`);
      searchParts.push(
        sql`(${nameOrs.reduce((acc, curr) => sql`${acc} OR ${curr}`)})`,
      );
    }

    conditions.push(
      sql`AND (${searchParts.reduce((acc, curr) => sql`${acc} OR ${curr}`)})`,
    );
  }

  // 2. Spice Level Filter
  if (spiceLevel !== undefined) {
    conditions.push(sql`AND spice_level <= ${spiceLevel}`);
  }

  // 3. Exclude Tags (ALL)
  if (excludeTags.length > 0) {
    const excludeAnds = excludeTags.map(
      (t) => sql`search_tags::text ILIKE ${t}`,
    );
    conditions.push(
      sql`AND NOT (${excludeAnds.reduce((acc, curr) => sql`${acc} AND ${curr}`)})`,
    );
  }

  return await sql`
    SELECT * FROM dishes
    WHERE 1=1 ${conditions}
    ORDER BY
      ${
        warningPatterns.length > 0
          ? sql`(${warningPatterns.map((w) => sql`warnings::text ILIKE ${w}`).reduce((acc, curr) => sql`${acc} OR ${curr}`)}) ASC,`
          : sql``
      }
      is_moderated DESC,
      name_vi ASC
    LIMIT 10;
  `;
}

export async function searchDishesByQuery(
  query: string[],
): Promise<any | null> {
  const dishes = await searchDishesAdvanced({ query });
  return dishes[0] || null;
}

export async function getRandomModeratedDish() {
  const [dish] = await sql`
    SELECT * FROM dishes WHERE is_moderated = true ORDER BY RANDOM() LIMIT 1
  `;
  return dish;
}

export async function getTopPhrases(limit = 10) {
  return sql`
    SELECT * FROM waiter_phrases ORDER BY usage_count DESC LIMIT ${limit}
  `;
}
export async function getAllPhrases() {
  return sql`
    SELECT * FROM waiter_phrases
  `;
}

export async function incrementPhraseUsage(key: string) {
  await sql`
    UPDATE waiter_phrases SET usage_count = usage_count + 1 WHERE phrase_key = ${key}
  `;
}

export async function saveToHistory(
  userId: string | undefined,
  role: string,
  content: string,
  dishId?: number | null,
  intentCategory?: string,
) {
  if (!userId) return;
  await sql`
    INSERT INTO conversations (user_id, role, content, dish_id, intent_category)
    SELECT ${userId}, ${role}, ${content}, ${dishId ?? null}, ${intentCategory ?? null}
    WHERE EXISTS (SELECT 1 FROM users WHERE telegram_id = ${userId})
  `;
}

export async function getUserSession(userId: string): Promise<any | null> {
  const [session] = await sql`
    SELECT * FROM user_sessions WHERE user_id = ${userId}
  `;
  return session;
}

export async function updateUserSession(userId: string, lastMenu: any) {
  await sql`
    INSERT INTO user_sessions (user_id, last_menu)
    VALUES (${userId}, ${JSON.stringify(lastMenu)})
    ON CONFLICT (user_id) DO UPDATE SET
      last_menu = EXCLUDED.last_menu,
      updated_at = NOW()
  `;
}

export async function createDishFromWiki(
  nameVi: string,
  description: any,
  warnings: any,
  allergens: any,
  spiceLevel: number,
  searchTags: string[],
  priceRange: string,
  imageUrls: string[],
) {
  const [dish] = await sql`
    INSERT INTO dishes (
      name_vi,
      description,
      warnings,
      allergens,
      spice_level,
      search_tags,
      price_range,
      image_urls,
      is_moderated,
      is_from_wiki
    )
    VALUES (
      ${nameVi},
      ${JSON.stringify(description)},
      ${JSON.stringify(warnings)},
      ${JSON.stringify(allergens)},
      ${spiceLevel},
      ${searchTags},
      ${priceRange},
      ${imageUrls},
      false,
      true
    )
    ON CONFLICT (name_vi) DO UPDATE SET
      description = EXCLUDED.description,
      warnings = EXCLUDED.warnings,
      allergens = EXCLUDED.allergens,
      spice_level = EXCLUDED.spice_level,
      search_tags = EXCLUDED.search_tags,
      price_range = EXCLUDED.price_range,
      image_urls = EXCLUDED.image_urls,
      is_from_wiki = true,
      updated_at = NOW()
    RETURNING *
  `;

  return dish;
}

export async function getAllModeratedDishes() {
  return sql`
    SELECT * FROM dishes WHERE is_moderated = true ORDER BY name_vi
  `;
}

export async function getAllDishes() {
  return sql`
    SELECT * FROM dishes ORDER BY name_vi
  `;
}

export async function createDish(data: {
  name_vi: string;
  description: any;
  warnings: any;
  allergens: any;
  spice_level: number;
  price_range: string;
  image_urls: string[];
  is_moderated?: boolean;
}) {
  const [dish] = await sql`
    INSERT INTO dishes (
      name_vi,
      description,
      warnings,
      allergens,
      spice_level,
      price_range,
      image_urls,
      is_moderated
    )
    VALUES (
      ${data.name_vi},
      ${JSON.stringify(data.description)},
      ${JSON.stringify(data.warnings)},
      ${JSON.stringify(data.allergens)},
      ${data.spice_level},
      ${data.price_range},
      ${data.image_urls},
      ${data.is_moderated ?? false}
    )
    ON CONFLICT (name_vi) DO UPDATE SET
      description = EXCLUDED.description,
      warnings = EXCLUDED.warnings,
      allergens = EXCLUDED.allergens,
      spice_level = EXCLUDED.spice_level,
      price_range = EXCLUDED.price_range,
      image_urls = EXCLUDED.image_urls,
      is_moderated = EXCLUDED.is_moderated,
      updated_at = NOW()
    RETURNING *
  `;
  return dish;
}

export async function updateDish(
  id: number,
  data: Partial<{
    description: any;
    warnings: any;
    allergens: any;
    spice_level: number;
    price_range: string;
    image_urls: string[];
    is_moderated: boolean;
  }>,
) {
  const updates: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (data.description !== undefined) {
    updates.push(`description = $${idx++}`);
    values.push(JSON.stringify(data.description));
  }
  if (data.warnings !== undefined) {
    updates.push(`warnings = $${idx++}`);
    values.push(JSON.stringify(data.warnings));
  }
  if (data.allergens !== undefined) {
    updates.push(`allergens = $${idx++}`);
    values.push(JSON.stringify(data.allergens));
  }
  if (data.spice_level !== undefined) {
    updates.push(`spice_level = $${idx++}`);
    values.push(data.spice_level);
  }
  if (data.price_range !== undefined) {
    updates.push(`price_range = $${idx++}`);
    values.push(data.price_range);
  }
  if (data.image_urls !== undefined) {
    updates.push(`image_urls = $${idx++}`);
    values.push(data.image_urls);
  }
  if (data.is_moderated !== undefined) {
    updates.push(`is_moderated = $${idx++}`);
    values.push(data.is_moderated);
  }

  if (updates.length === 0) return null;

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const query = `UPDATE dishes SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`;
  const [dish] = await sql.unsafe(query, values);
  return dish;
}

export async function deleteDish(id: number) {
  await sql`DELETE FROM dishes WHERE id = ${id}`;
}
