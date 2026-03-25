// Photo Handler - Vision Pipeline
// Workflow: Photo -> AI Vision Analysis -> DB Match -> Session Update -> Response

import { analyzePhoto, generateWikiDish } from "../ai_client.js";
import {
  saveToHistory,
  updateUserSession,
  searchDishesAdvanced,
  createDishFromWiki,
} from "../db.js";
import { t, type SupportedLanguage } from "../i18n/index.js";

export interface PhotoContext {
  telegramId: string;
  lang: SupportedLanguage;
  fileId: string;
  ctx: any;
}

export async function handlePhotoMessage(ctx: PhotoContext): Promise<void> {
  const { telegramId, lang, fileId, ctx: context } = ctx;

  console.log(`[DEBUG: VISION_PIPELINE] Stage 1 - Photo received`);
  await context.reply(t(lang, "photo_analyzing"));

  // 1. Распознавание через Vision API
  const file = await context.api.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

  // Fetch file and convert to base64
  const response = await fetch(fileUrl);
  const buffer = await response.arrayBuffer();
  const base64Data = Buffer.from(buffer).toString("base64");

  const visionResult = await analyzePhoto(fileUrl, base64Data);
  const detectedItems =
    visionResult.list || (visionResult.dish ? [visionResult.dish] : []);

  if (detectedItems.length === 0) {
    await context.reply(
      `📸 ${visionResult.description || t(lang, "not_recognized")}\n\n` +
        t(lang, "try_another_photo"),
    );
    return;
  }

  // 2. Массовый поиск в БД
  let localDishes = await searchDishesAdvanced({ queryname: detectedItems });

  const foundNamesSet = new Set(
    localDishes.map((d) => d.name_vi.trim().toLowerCase()),
  );

  // Теперь мы уверены, что сравниваем lowercase с lowercase
  const missingNames = (detectedItems || []).filter((name) => {
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
  }

  if (localDishes.length > 0) {
    // Сохраняем в сессию для ORDER_INTENT
    await updateUserSession(
      telegramId,
      localDishes.map((d) => ({ id: d.id, name_vi: d.name_vi })),
    );

    // 4. Формируем нумерованный ответ
    let response =
      detectedItems.length > 1 ? `📝 ${t(lang, "many_found")}:\n\n` : "";

    for (let i = 0; i < localDishes.length; i++) {
      const dish = localDishes[i];
      const description =
        typeof dish.description === "string"
          ? JSON.parse(dish.description)
          : dish.description;
      const desc =
        description?.[lang] ||
        description?.en ||
        description?.vi ||
        dish.name_vi;

      if (localDishes.length > 1) {
        response += `${i + 1} `;
      }
      // Для одиночного блюда выводим полную карточку
      let message = `🍜 ${dish.name_vi}\n\n`;
      /*
      if (!dish.is_moderated) {
        message += `⚠️ ${t(lang, "wiki_warning") || "AI Generated Info"}\n\n`;
      }
      */
      message += `${desc}\n`;

      if (dish.spice_level) {
        message += `\n🌶️ ${t(lang, "spicy_level")}: ${"█".repeat(dish.spice_level)}${"░".repeat(5 - dish.spice_level)}`;
      }
      if (dish.price_range) {
        message += `\n💰 ${t(lang, "price_range")}: ${dish.price_range}`;
      }
      response += message + "\n----------\n\n";
      await saveToHistory(telegramId, "assistant", message, dish.id, "PHOTO");
    }

    if (localDishes.length > 1) {
      await context.reply(response);
      await context.reply(`📝 ${t(lang, "order_by_number")}`);
      await saveToHistory(telegramId, "assistant", response, null, "PHOTO");
    }
  } else {
    await context.reply(
      `🍜 ${detectedItems.join(", ")}\n\n` +
        `${t(lang, "not_in_db")} ${t(lang, "try_another_photo")}`,
    );
  }

  console.log(`[DEBUG: VISION_PIPELINE] Complete`);
}
