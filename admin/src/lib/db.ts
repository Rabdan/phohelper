import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@postgres:5432/phomenu";
export const sql = postgres(connectionString, { max: 10 });

export async function getUsers(limit = 100) {
  return sql`SELECT * FROM users ORDER BY created_at DESC LIMIT ${limit}`;
}

export async function getDishes(moderated?: boolean) {
  if (moderated !== undefined) {
    return sql`SELECT * FROM dishes WHERE is_moderated = ${moderated} ORDER BY created_at DESC`;
  }
  return sql`SELECT * FROM dishes ORDER BY created_at DESC`;
}

export async function getPhrases() {
  return sql`SELECT * FROM waiter_phrases ORDER BY usage_count DESC`;
}

export async function updateDish(id: number, data: Record<string, any>) {
  const updates: Record<string, any> = {};

  if (data.name_vi !== undefined) updates.name_vi = data.name_vi;
  if (data.is_moderated !== undefined) updates.is_moderated = data.is_moderated;
  if (data.description !== undefined)
    updates.description = JSON.stringify(data.description);
  if (data.warnings !== undefined)
    updates.warnings = JSON.stringify(data.warnings);
  if (data.allergens !== undefined)
    updates.allergens = JSON.stringify(data.allergens);
  if (data.spice_level !== undefined) updates.spice_level = data.spice_level;
  if (data.price_range !== undefined) updates.price_range = data.price_range;
  if (data.search_tags !== undefined) updates.search_tags = data.search_tags;
  if (data.image_urls !== undefined) updates.image_urls = data.image_urls;

  if (Object.keys(updates).length === 0) return;

  updates.updated_at = sql`NOW()`;

  await sql`
    UPDATE dishes
    SET ${sql(updates)}
    WHERE id = ${id}
  `;
}

export async function createDish(data: {
  name_vi: string;
  description: any;
  warnings: any;
  allergens: any;
  spice_level: number;
  price_range: string;
  search_tags: string[];
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
      search_tags,
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
      ${data.search_tags},
      ${data.image_urls},
      ${data.is_moderated ?? false}
    )
    RETURNING *
  `;
  return dish;
}

export async function deleteDish(id: number) {
  await sql`DELETE FROM dishes WHERE id = ${id}`;
}

export async function updatePhrase(id: number, data: Record<string, any>) {
  const updates: Record<string, any> = {};

  if (data.phrase_vi !== undefined) updates.phrase_vi = data.phrase_vi;
  if (data.translations !== undefined)
    updates.translations = JSON.stringify(data.translations);
  if (data.category !== undefined) updates.category = data.category;

  if (Object.keys(updates).length === 0) return;

  updates.updated_at = sql`NOW()`;

  await sql`
    UPDATE waiter_phrases
    SET ${sql(updates)}
    WHERE id = ${id}
  `;
}

export async function createPhrase(
  phrase_vi: string,
  translations: Record<string, string>,
  category: string,
) {
  const key = phrase_vi
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");
  const [phrase] = await sql`
    INSERT INTO waiter_phrases (phrase_key, phrase_vi, translations, category)
    VALUES (${key}, ${phrase_vi}, ${JSON.stringify(translations)}, ${category})
    RETURNING *
  `;
  return phrase;
}

export async function deletePhrase(id: number) {
  await sql`DELETE FROM waiter_phrases WHERE id = ${id}`;
}
