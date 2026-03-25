// Text Handler - Intent Classification Pipeline
// Workflow: Text Input -> AI Intent Classification -> SQL Query -> Response

import {
  classifyIntent,
  type IntentResult,
  generateOrderPhrase,
  generateWikiDish,
} from "../ai_client.js";
import {
  searchDishesAdvanced,
  getAllPhrases,
  saveToHistory,
  getUserSession,
  getAllModeratedDishes,
  createDishFromWiki,
} from "../db.js";
import { t, type SupportedLanguage } from "../i18n/index.js";
import { getLang } from "../services/languages.js";

export interface PipelineContext {
  telegramId: string;
  lang: SupportedLanguage;
  text: string;
  ctx: any;
}

export async function handleTextMessage(ctx: PipelineContext): Promise<void> {
  const { telegramId, lang, text, ctx: context } = ctx;

  console.log(`[DEBUG: TEXT_PIPELINE] Stage 1 - Input received: "${text}"`);

  await saveToHistory(telegramId, "user", text, undefined, undefined);

  console.log(`[DEBUG: TEXT_PIPELINE] Stage 2 - Intent Classification`);
  const intent: IntentResult = await classifyIntent(text);
  console.log(
    `[DEBUG: TEXT_PIPELINE] Stage 2 - Result: intent=${intent.intent}, name_vi=${intent.name_vi || "null"}, sql_filter=${intent.sql_filter || "null"}`,
  );

  switch (intent.intent) {
    case "INFO":
      console.log(`[DEBUG: TEXT_PIPELINE] Stage 3 - INFO branch (SQL Query)`);
      await handleInfoBranch(ctx, intent);
      break;

    case "ORDER":
      console.log(`[DEBUG: TEXT_PIPELINE] Stage 3 - ORDER branch (RAG)`);
      await handleOrderBranch(ctx, intent);
      break;

    case "OFF_TOPIC":
      console.log(`[DEBUG: TEXT_PIPELINE] Stage 3 - OFF_TOPIC branch`);
      await handleOffTopicBranch(ctx);
      break;

    default:
      console.log(
        `[DEBUG: TEXT_PIPELINE] Stage 3 - Unknown intent, default handling`,
      );
      await context.reply(t(lang, "help"));
  }

  console.log(`[DEBUG: TEXT_PIPELINE] Complete`);
}

async function handleInfoBranch(ctx: PipelineContext, intent: IntentResult) {
  const { telegramId, lang, ctx: context } = ctx;

  console.log("[DEBUG: INFO_BRANCH] Input:", intent);

  // 1. Поиск в локальной БД
  const localDishes = await searchDishesAdvanced({
    query: intent.sql_filter,
    queryname: intent.name_vi,
    excludeQuery: intent.exclude,
    spiceLevel: intent.spice_level,
  });

  // 2. Создаем Set из названий в нижнем регистре для O(1) поиска
  // Это исключает лишние циклы .includes() внутри .filter()
  const foundNamesSet = new Set(
    localDishes.map((d) => d.name_vi.trim().toLowerCase()),
  );

  // 3. Находим блюда, которых нет в локальной базе
  // Теперь мы уверены, что сравниваем lowercase с lowercase
  const missingNames = (intent.name_vi || []).filter((name) => {
    const normalizedName = name.trim().toLowerCase();
    return !foundNamesSet.has(normalizedName);
  });

  // 3. Генерируем Wiki-карточки для отсутствующих
  if (missingNames.length > 0) {
    const statusMsg = await context.reply(t(lang, "searching_info"));

    for (const name of missingNames) {
      try {
        console.log(`[DEBUG: DB_MISS] Generating Wiki for: ${name}`);
        const wikiData = await generateWikiDish(name);
        const newDish = await createDishFromWiki(
          name,
          wikiData.description,
          wikiData.warnings,
          wikiData.allergens,
          wikiData.spice_level,
          wikiData.search_tags,
          wikiData.price_range,
          wikiData.image_urls,
        );
        localDishes.push(newDish);
      } catch (e) {
        console.error(`[DEBUG: WIKI_ERROR] Failed for ${name}:`, e);
      }
    }

    try {
      await context.api.deleteMessage(context.chat.id, statusMsg.message_id);
    } catch (e) {
      console.error(`[DEBUG: MSG_DELETE_ERROR]`, e);
    }
  }

  // 4. Вывод пользователю
  if (localDishes.length === 0) {
    return context.reply(t(lang, "not_found"));
  }

  for (const dish of localDishes) {
    const description =
      typeof dish.description === "string"
        ? JSON.parse(dish.description)
        : dish.description;
    const warnings =
      typeof dish.warnings === "string"
        ? JSON.parse(dish.warnings)
        : dish.warnings;
    const allergens =
      typeof dish.allergens === "string"
        ? JSON.parse(dish.allergens)
        : dish.allergens;

    const desc =
      description?.[lang] || description?.en || description?.vi || dish.name_vi;
    const dishWarnings = warnings?.[lang] || warnings?.en || [];
    const dishAllergens = allergens?.[lang] || allergens?.en || [];

    let message = `🍜 ${dish.name_vi}\n\n`;
    /*
    if (!dish.is_moderated) {
      message += `⚠️ ${t(lang, "wiki_warning") || "AI Generated Info"}\n\n`;
    }
    */
    message += `${desc}\n`;

    if (dishWarnings.length > 0) {
      message += `\n⚠️ ${dishWarnings.join(", ")}`;
    }
    if (dishAllergens.length > 0) {
      message += `\n🚫 ${dishAllergens.join(", ")}`;
    }
    if (dish.spice_level) {
      message += `\n🌶️ ${t(lang, "spicy_level")}: ${"█".repeat(dish.spice_level)}${"░".repeat(5 - dish.spice_level)} (${dish.spice_level}/5)`;
    }
    if (dish.price_range) {
      message += `\n💰 ${t(lang, "price_range")}: ${dish.price_range}`;
    }

    await context.reply(message);
    await saveToHistory(telegramId, "assistant", message, dish.id, "INFO");
  }
}

async function handleDiscoveryMode(ctx: PipelineContext, query: string) {
  const { telegramId, lang, ctx: context } = ctx;

  console.log(`[DEBUG: DISCOVERY_MODE] Checking available dishes`);

  const dishes = await getAllModeratedDishes();
  const dishList = dishes.map((d: any) => d.name_vi).join(", ");

  await context.reply(
    `${t(lang, "not_found_in_db")}\n\n` +
      `${t(lang, "available_dishes")}: ${dishList}\n\n` +
      `${t(lang, "try_from_list")}`,
  );
}

async function handleOrderBranch(ctx: PipelineContext, intent: IntentResult) {
  const { telegramId, lang, ctx: context, text } = ctx;

  let dishName = intent.name_vi;
  let orderFromContext = false;

  if (intent.use_context) {
    console.log(`[DEBUG: ORDER_BRANCH] Checking session for context`);
    const session = await getUserSession(telegramId);
    if (session?.last_menu) {
      console.log(
        `[DEBUG: ORDER_BRANCH] Found session: ${JSON.stringify(session.last_menu)}`,
      );

      const numMatch = text.match(/(\d+)[-\s]*(?:й|ый|я|ое|е|nd|st|rd)/i);
      if (numMatch) {
        const idx = parseInt(numMatch[1]) - 1;
        if (session.last_menu && session.last_menu[idx]) {
          dishName = session.last_menu[idx].name_vi;
          console.log(
            `[DEBUG: ORDER_BRANCH] Using dish from context: ${dishName}`,
          );
          orderFromContext = true;
        }
      }
    }
  }

  console.log(
    `[DEBUG: ORDER_BRANCH] Dish: ${dishName}, Prefs: ${intent.preferences.join(", ")}`,
  );

  console.log(`[DEBUG: ORDER_BRANCH] Fetching RAG phrases`);
  const phrases = await getAllPhrases();
  const ragPhrases = phrases.map(
    (p: any) => `${p.phrase_key}: ${p.translations?.[lang] || p.phrase_vi}`,
  );

  console.log(`[DEBUG: ORDER_BRANCH] Generating phrase with RAG`);
  const result = await generateOrderPhrase(
    text,
    dishName,
    intent.preferences,
    ragPhrases,
  );

  let message = `🗣️ ${result.vi}\n📖 ${result.translated}`;
  if (result.phonetic) message += `\n🔊 ${result.phonetic}`;

  await context.reply(message);
  await saveToHistory(telegramId, "assistant", message, null, "ORDER");
}

async function handleOffTopicBranch(ctx: PipelineContext) {
  const { lang, ctx: context } = ctx;

  console.log(`[DEBUG: OFF_TOPIC_BRANCH] Sending greeting + random dish`);

  await context.reply(t(lang, "off_topic"));

  const dishes = await getAllModeratedDishes();
  if (dishes.length > 0) {
    const randomDish = dishes[Math.floor(Math.random() * dishes.length)];
    const description =
      typeof randomDish.description === "string"
        ? JSON.parse(randomDish.description)
        : randomDish.description;
    const desc =
      description?.[lang] ||
      description?.en ||
      description?.vi ||
      randomDish.name_vi;
    const name = desc.split(" - ")[0] || randomDish.name_vi;

    await context.reply(`${t(lang, "try_this")}: ${name}`);
  }
}
