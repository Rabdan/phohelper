// PhoMenu Bot - Main Pipeline Orchestrator
// Linear Pipeline: [Input] -> [Debug] -> [Handler] -> [Response]

import { Bot } from "grammy";
import { Menu } from "@grammyjs/menu";
import { autoRetry } from "@grammyjs/auto-retry";
import { getOrCreateUser, getAllModeratedDishes, sql } from "./db.js";
import { t, getMenuText, type SupportedLanguage } from "./i18n/index.js";
import { setLang, getLang } from "./services/languages.js";
import { handleTextMessage } from "./handlers/text.js";
import { handlePhotoMessage } from "./handlers/photo.js";

console.log("🚀 Bot starting...");

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || "");
console.log("✅ Bot instance created");
bot.api.config.use(autoRetry());

const mainMenu = new Menu("main-menu")
  .text("📷 Photo", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(t(getLang(ctx.from?.id.toString() || ""), "photo_help"));
  })
  .text("📝 Phrases", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(buildPhrasesMenu(getLang(ctx.from?.id.toString() || "")));
  })
  .row()
  .text("🌐 Language", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply("Use /lang vi|ru|en|kk|uz|de|fr");
  })
  .text("❓ Help", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(t(getLang(ctx.from?.id.toString() || ""), "help"));
  });

bot.use(mainMenu);

bot.command("start", async (ctx) => {
  console.log("[DEBUG: COMMAND] /start");
  const telegramId = ctx.from?.id.toString() || "";
  await getOrCreateUser(telegramId, ctx.from?.username, ctx.from?.first_name);
  const lang = getLang(telegramId);
  console.log(`   User: ${ctx.from?.first_name}, Lang: ${lang}`);
  await ctx.reply(t(lang, "greeting"));
  await ctx.reply(getMenuText(lang), { reply_markup: mainMenu });
  console.log("[DEBUG: COMMAND] /start complete");
});

bot.command("help", async (ctx) => {
  console.log("[DEBUG: COMMAND] /help");
  const lang = getLang(ctx.from?.id.toString() || "");
  await ctx.reply(t(lang, "help"));
});

bot.command("lang", async (ctx) => {
  console.log("[DEBUG: COMMAND] /lang");
  const telegramId = ctx.from?.id.toString() || "";
  const lang = ctx.match as SupportedLanguage;
  if (["vi", "ru", "en", "kk", "uz", "de", "fr"].includes(lang)) {
    setLang(telegramId, lang);
    console.log(`   Language changed to: ${lang}`);
    await ctx.reply(`✅ ${t(lang, "language_changed")}`);
  } else {
    await ctx.reply("Supported: vi, ru, en, kk, uz, de, fr");
  }
});

bot.command("menu", async (ctx) => {
  console.log("[DEBUG: COMMAND] /menu");
  const lang = getLang(ctx.from?.id.toString() || "");
  await ctx.reply(getMenuText(lang), { reply_markup: mainMenu });
});

bot.command("list", async (ctx) => {
  console.log("[DEBUG: COMMAND] /list");
  const lang = getLang(ctx.from?.id.toString() || "");

  const dishes = await getAllModeratedDishes();

  if (dishes.length === 0) {
    await ctx.reply("No dishes available");
    return;
  }

  let message = `📋 *Available Dishes:*\n\n`;
  for (const dish of dishes) {
    const description =
      typeof dish.description === "string"
        ? JSON.parse(dish.description)
        : dish.description;
    const desc =
      description?.[lang] || description?.en || description?.vi || dish.name_vi;
    const name = desc.split(" - ")[0] || dish.name_vi;
    message += `• ${name}\n`;
  }

  await ctx.reply(message);
});

bot.on("message:text", async (ctx) => {
  console.log("\n========== TEXT PIPELINE ==========");
  console.log(`[DEBUG: INPUT] User: ${ctx.from?.first_name} (${ctx.from?.id})`);
  console.log(`[DEBUG: INPUT] Text: "${ctx.message?.text}"`);

  const telegramId = ctx.from?.id.toString() || "";
  const lang = getLang(telegramId);
  const text = ctx.message?.text;

  if (!text) {
    console.log("[DEBUG: INPUT] No text, skipping");
    return;
  }

  await getOrCreateUser(telegramId, ctx.from?.username, ctx.from?.first_name);

  await handleTextMessage({
    telegramId,
    lang,
    text,
    ctx,
  });

  console.log("========== TEXT PIPELINE DONE =========\n");
});

bot.on("message:photo", async (ctx) => {
  console.log("\n========== VISION PIPELINE ==========");
  console.log(`[DEBUG: INPUT] User: ${ctx.from?.first_name} (${ctx.from?.id})`);
  console.log(`[DEBUG: INPUT] Photo received`);

  const telegramId = ctx.from?.id.toString() || "";
  const lang = getLang(telegramId);

  await getOrCreateUser(telegramId, ctx.from?.username, ctx.from?.first_name);

  try {
    const photo = ctx.message.photo;
    if (photo && photo.length > 0) {
      const fileId = photo[photo.length - 1].file_id;
      console.log(`[DEBUG: INPUT] File ID: ${fileId}`);

      await handlePhotoMessage({
        telegramId,
        lang,
        fileId,
        ctx,
      });
    }
  } catch (e) {
    console.error(`[DEBUG: ERROR] ${e}`);
    await ctx.reply("❌ Error processing photo");
  }

  console.log("========== VISION PIPELINE DONE =========\n");
});

bot.catch((err) => {
  console.error("[DEBUG: ERROR] Bot error:", err);
});

bot.start();
console.log("✅ Bot started and listening for messages...");

function buildPhrasesMenu(lang: SupportedLanguage): string {
  return `
📝 Common Phrases:
1. ${t(lang, "no_sugar")}
2. ${t(lang, "no_cilantro")}
3. ${t(lang, "extra_noodles")}
4. ${t(lang, "more_soup")}
5. ${t(lang, "bill_please")}
${t(lang, "help")}
`;
}
