import TelegramBot from "node-telegram-bot-api";
import { askGemini, generateTip, generatePPTXContent, generateWordContent, enrichWithResearch } from "../services/gemini";
import { searchWeb, formatSearchResults } from "../services/tavily";
import { getUserContext, getUserDocuments, clearUserMemory } from "../services/memory";
import { generatePPTX, generateDOCX, TemplateStyle } from "../services/docGenerator";
import { getOrCreateRepo, backupToGitHub } from "../services/github";
import { trackUser, trackFileGeneration, trackSearch } from "../services/stats";
import {
  setPending, clearPending, getPendingState,
  setPendingTemplateTopic, setPendingFileConvert,
} from "../pendingActions";
import * as fs from "fs";

const activeTasks = new Map<number, AbortController>();

function displayName(from: TelegramBot.User | undefined): string {
  if (!from) return "مجهول";
  return [from.first_name, from.last_name].filter(Boolean).join(" ") || from.username || String(from.id);
}

// ─── Keyboards ────────────────────────────────────────────────────────────────

export const MAIN_KEYBOARD: TelegramBot.InlineKeyboardMarkup = {
  inline_keyboard: [
    [
      { text: "📊 عرض PowerPoint", callback_data: "action:pptx" },
      { text: "📝 تقرير Word",      callback_data: "action:word" },
    ],
    [
      { text: "🔍 بحث في الإنترنت", callback_data: "action:search" },
      { text: "💡 نصيحة يومية",     callback_data: "action:tip" },
    ],
    [
      { text: "📁 ملفاتي",          callback_data: "action:myfiles" },
      { text: "🗑️ مسح الذاكرة",    callback_data: "action:clear" },
    ],
    [{ text: "📖 المساعدة", callback_data: "action:help" }],
  ],
};

const BACK_TO_MENU: TelegramBot.InlineKeyboardMarkup = {
  inline_keyboard: [[{ text: "🔄 القائمة الرئيسية", callback_data: "action:menu" }]],
};

function templateKeyboard(type: "pptx" | "word"): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "🎨 أكاديمي رسمي", callback_data: `template:${type}:academic` }],
      [{ text: "🚀 عصري/إبداعي",  callback_data: `template:${type}:modern` }],
      [{ text: "📊 تقني/بيانات",  callback_data: `template:${type}:technical` }],
      [{ text: "◀ رجوع",          callback_data: "action:menu" }],
    ],
  };
}

const STYLE_LABELS: Record<TemplateStyle, string> = {
  academic:  "🎨 أكاديمي رسمي",
  modern:    "🚀 عصري/إبداعي",
  technical: "📊 تقني/بيانات",
};

// ─── Loading messages helpers ─────────────────────────────────────────────────

async function editLoading(
  bot: TelegramBot,
  chatId: number,
  msgId: number,
  text: string
): Promise<void> {
  try {
    await bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: "Markdown" });
  } catch {}
}

// ─── Core generators ──────────────────────────────────────────────────────────

export async function handlePPTX(
  bot: TelegramBot, chatId: number, userId: number,
  from: TelegramBot.User, topic: string, style: TemplateStyle = "academic"
): Promise<void> {
  const waitMsg = await bot.sendMessage(chatId, `📊 *إنشاء عرض PowerPoint*\n_النموذج: ${STYLE_LABELS[style]}_\n\n⏳ جارٍ جمع المعلومات من الإنترنت...`, { parse_mode: "Markdown" });
  const controller = new AbortController();
  activeTasks.set(userId, controller);

  try {
    // Step 1 — Live research
    let researchContext = "";
    try {
      await editLoading(bot, chatId, waitMsg.message_id, `📊 *إنشاء عرض PowerPoint*\n_النموذج: ${STYLE_LABELS[style]}_\n\n🌐 جارٍ البحث عن أحدث المعلومات حول "${topic}"...`);
      const results = await searchWeb(topic, 5);
      const rawContext = results.map((r) => `${r.title}\n${r.content}`).join("\n\n");
      researchContext = await enrichWithResearch(topic, rawContext);
    } catch {}

    // Step 2 — Generate content
    await editLoading(bot, chatId, waitMsg.message_id, `📊 *إنشاء عرض PowerPoint*\n_النموذج: ${STYLE_LABELS[style]}_\n\n🧠 جارٍ صياغة المحتوى الذكي (12+ شريحة)...`);
    const userContext = await getUserContext(String(userId));
    const combinedContext = [researchContext, userContext].filter(Boolean).join("\n\n");
    const slides = await generatePPTXContent(topic, combinedContext || undefined, style);

    // Step 3 — Build file
    await editLoading(bot, chatId, waitMsg.message_id, `📊 *إنشاء عرض PowerPoint*\n_النموذج: ${STYLE_LABELS[style]}_\n\n🎨 جارٍ تنسيق التصميم والشرائح...`);
    const filePath = await generatePPTX(slides, topic, style);

    // Step 4 — Send
    await editLoading(bot, chatId, waitMsg.message_id, `📊 *إنشاء عرض PowerPoint*\n_النموذج: ${STYLE_LABELS[style]}_\n\n📤 جارٍ إرسال الملف...`);
    await bot.sendDocument(chatId, filePath, {
      caption: `📊 *عرض: ${topic}*\n✨ ${slides.length} شريحة | ${STYLE_LABELS[style]}`,
      parse_mode: "Markdown",
      reply_markup: BACK_TO_MENU,
    });
    await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});

    await trackFileGeneration(String(userId), displayName(from), "pptx", topic);

    try {
      const { owner, repo } = await getOrCreateRepo("telegram-bot-backups");
      const content = JSON.stringify({ topic, style, slides, createdAt: new Date().toISOString() }, null, 2);
      await backupToGitHub(owner, repo, `pptx/${Date.now()}_${topic.replace(/\s+/g, "_")}.json`, content, `backup: pptx - ${topic}`);
    } catch {}

    fs.unlinkSync(filePath);
  } catch (e: any) {
    if (!controller.signal.aborted) {
      await editLoading(bot, chatId, waitMsg.message_id, `❌ فشل إنشاء العرض: ${e.message}`);
      await bot.sendMessage(chatId, "↩ العودة:", { reply_markup: BACK_TO_MENU });
    }
  } finally {
    activeTasks.delete(userId);
  }
}

export async function handleWord(
  bot: TelegramBot, chatId: number, userId: number,
  from: TelegramBot.User, topic: string, style: TemplateStyle = "academic"
): Promise<void> {
  const waitMsg = await bot.sendMessage(chatId, `📝 *إنشاء تقرير Word*\n_النموذج: ${STYLE_LABELS[style]}_\n\n⏳ جارٍ جمع المعلومات من الإنترنت...`, { parse_mode: "Markdown" });
  const controller = new AbortController();
  activeTasks.set(userId, controller);

  try {
    // Step 1 — Live research
    let researchContext = "";
    try {
      await editLoading(bot, chatId, waitMsg.message_id, `📝 *إنشاء تقرير Word*\n_النموذج: ${STYLE_LABELS[style]}_\n\n🌐 جارٍ البحث عن أحدث المعلومات حول "${topic}"...`);
      const results = await searchWeb(topic, 5);
      const rawContext = results.map((r) => `${r.title}\n${r.content}`).join("\n\n");
      researchContext = await enrichWithResearch(topic, rawContext);
    } catch {}

    // Step 2 — Generate content
    await editLoading(bot, chatId, waitMsg.message_id, `📝 *إنشاء تقرير Word*\n_النموذج: ${STYLE_LABELS[style]}_\n\n🧠 جارٍ صياغة المحتوى الذكي (11+ قسم)...`);
    const userContext = await getUserContext(String(userId));
    const combinedContext = [researchContext, userContext].filter(Boolean).join("\n\n");
    const result = await generateWordContent(topic, combinedContext || undefined, style);

    // Step 3 — Build file
    await editLoading(bot, chatId, waitMsg.message_id, `📝 *إنشاء تقرير Word*\n_النموذج: ${STYLE_LABELS[style]}_\n\n🗂️ جارٍ تنسيق الصفحات وبناء الفهرس...`);
    const filePath = await generateDOCX(result.title, result.sections, style);

    // Step 4 — Send
    await editLoading(bot, chatId, waitMsg.message_id, `📝 *إنشاء تقرير Word*\n_النموذج: ${STYLE_LABELS[style]}_\n\n📤 جارٍ إرسال الملف...`);
    await bot.sendDocument(chatId, filePath, {
      caption: `📝 *تقرير: ${result.title}*\n✨ ${result.sections.length} أقسام | ${STYLE_LABELS[style]}`,
      parse_mode: "Markdown",
      reply_markup: BACK_TO_MENU,
    });
    await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});

    await trackFileGeneration(String(userId), displayName(from), "word", topic);

    try {
      const { owner, repo } = await getOrCreateRepo("telegram-bot-backups");
      const content = JSON.stringify({ topic, style, ...result, createdAt: new Date().toISOString() }, null, 2);
      await backupToGitHub(owner, repo, `word/${Date.now()}_${topic.replace(/\s+/g, "_")}.json`, content, `backup: word - ${topic}`);
    } catch {}

    fs.unlinkSync(filePath);
  } catch (e: any) {
    if (!controller.signal.aborted) {
      await editLoading(bot, chatId, waitMsg.message_id, `❌ فشل إنشاء التقرير: ${e.message}`);
      await bot.sendMessage(chatId, "↩ العودة:", { reply_markup: BACK_TO_MENU });
    }
  } finally {
    activeTasks.delete(userId);
  }
}

export async function handleSearch(
  bot: TelegramBot, chatId: number, userId: number,
  from: TelegramBot.User, query: string
): Promise<void> {
  const waitMsg = await bot.sendMessage(chatId, `🔍 جارٍ البحث عن: *${query}*...`, { parse_mode: "Markdown" });
  const controller = new AbortController();
  activeTasks.set(userId, controller);
  try {
    const results = await searchWeb(query, 5);
    const formatted = formatSearchResults(results, query);
    const context = results.map((r) => `${r.title}\n${r.content}`).join("\n\n");
    const summary = await askGemini(`بناءً على نتائج البحث، قدم ملخصاً عن: ${query}`, context);
    await trackSearch(String(userId), displayName(from), query, results.length);
    await bot.editMessageText(`${formatted}\n📌 *ملخص ذكي:*\n${summary}`, {
      chat_id: chatId, message_id: waitMsg.message_id,
      parse_mode: "Markdown", disable_web_page_preview: true,
    });
    await bot.sendMessage(chatId, "↩ العودة:", { reply_markup: BACK_TO_MENU });
  } catch (e: any) {
    if (!controller.signal.aborted) {
      await bot.editMessageText(`❌ فشل البحث: ${e.message}`, { chat_id: chatId, message_id: waitMsg.message_id });
      await bot.sendMessage(chatId, "↩ العودة:", { reply_markup: BACK_TO_MENU });
    }
  } finally {
    activeTasks.delete(userId);
  }
}

// ─── Command registration ─────────────────────────────────────────────────────

export function registerCommandHandlers(bot: TelegramBot): void {
  bot.onText(/\/start/, async (msg) => {
    const name = msg.from?.first_name || "مستخدم";
    if (msg.from) await trackUser(String(msg.from.id), displayName(msg.from));
    await bot.sendMessage(
      msg.chat.id,
      `👋 *أهلاً ${name}!*\n\nأنا بوتك الذكي الاحترافي. اختر ما تريد من الأزرار أدناه:`,
      { parse_mode: "Markdown", reply_markup: MAIN_KEYBOARD }
    );
  });

  bot.onText(/\/help/, async (msg) => {
    if (msg.from) await trackUser(String(msg.from.id), displayName(msg.from));
    await bot.sendMessage(
      msg.chat.id,
      `📖 *دليل الاستخدام*\n\n💡 \`/tip\` — نصيحة ذكية\n🔍 \`/search [موضوع]\` — بحث إنترنت\n📊 \`/pptx [موضوع]\` — PowerPoint\n📝 \`/word [موضوع]\` — تقرير Word\n📁 \`/myfiles\` — ملفاتك\n🗑️ \`/clear\` — مسح الذاكرة\n❌ \`/cancel\` — إلغاء\n\n📎 أرسل PDF/Word → يُحفظ كمرجع ذكي\n\nأو استخدم الأزرار التفاعلية عبر /start`,
      { parse_mode: "Markdown", reply_markup: BACK_TO_MENU }
    );
  });

  bot.onText(/\/tip/, async (msg) => {
    if (msg.from) await trackUser(String(msg.from.id), displayName(msg.from));
    const waitMsg = await bot.sendMessage(msg.chat.id, "💡 جارٍ توليد نصيحة...");
    try {
      const tip = await generateTip();
      await bot.editMessageText(`💡 *نصيحة اليوم*\n\n${tip}`, { chat_id: msg.chat.id, message_id: waitMsg.message_id, parse_mode: "Markdown" });
      await bot.sendMessage(msg.chat.id, "↩ العودة:", { reply_markup: BACK_TO_MENU });
    } catch (e: any) {
      await bot.editMessageText(`❌ تعذر توليد النصيحة: ${e.message}`, { chat_id: msg.chat.id, message_id: waitMsg.message_id });
    }
  });

  bot.onText(/\/search (.+)/, async (msg, match) => {
    const query = match?.[1]?.trim();
    if (!query || !msg.from) return;
    await trackUser(String(msg.from.id), displayName(msg.from));
    await handleSearch(bot, msg.chat.id, msg.from.id, msg.from, query);
  });

  bot.onText(/\/pptx (.+)/, async (msg, match) => {
    const topic = match?.[1]?.trim();
    if (!topic || !msg.from) return;
    await trackUser(String(msg.from.id), displayName(msg.from));
    await bot.sendMessage(msg.chat.id, `📊 *اختر نموذج العرض لـ "${topic}":*`, { parse_mode: "Markdown", reply_markup: templateKeyboard("pptx") });
    setPendingTemplateTopic(msg.from.id, { type: "pptx", template: "academic" });
    // Override with a "topic-first" flow: store topic and show templates
    setPendingTemplateTopic(msg.from.id, { type: "pptx", template: "academic" });
  });

  bot.onText(/\/word (.+)/, async (msg, match) => {
    const topic = match?.[1]?.trim();
    if (!topic || !msg.from) return;
    await trackUser(String(msg.from.id), displayName(msg.from));
    await bot.sendMessage(msg.chat.id, `📝 *اختر نموذج التقرير لـ "${topic}":*`, { parse_mode: "Markdown", reply_markup: templateKeyboard("word") });
  });

  bot.onText(/\/myfiles/, async (msg) => {
    if (msg.from) await trackUser(String(msg.from.id), displayName(msg.from));
    const docs = await getUserDocuments(String(msg.from!.id));
    if (!docs.length) {
      await bot.sendMessage(msg.chat.id, "📁 لا توجد ملفات محفوظة.\nأرسل PDF أو Word وسيُحفظ تلقائياً.", { reply_markup: BACK_TO_MENU });
      return;
    }
    let text = `📁 *ملفاتك المحفوظة (${docs.length}):*\n\n`;
    docs.slice(0, 10).forEach((d, i) => {
      const date = new Date(d.uploadedAt).toLocaleDateString("ar-SA");
      text += `${i + 1}. 📄 *${d.fileName}*\n   📅 ${date}\n   📌 ${d.summary.substring(0, 100)}...\n\n`;
    });
    await bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown", reply_markup: BACK_TO_MENU });
  });

  bot.onText(/\/clear/, async (msg) => {
    await clearUserMemory(String(msg.from!.id));
    await bot.sendMessage(msg.chat.id, "✅ تم مسح ملفاتك من الذاكرة.", { reply_markup: BACK_TO_MENU });
  });

  bot.onText(/\/cancel/, async (msg) => {
    if (msg.from) clearPending(msg.from.id);
    const controller = msg.from?.id ? activeTasks.get(msg.from.id) : undefined;
    if (controller) {
      controller.abort();
      if (msg.from?.id) activeTasks.delete(msg.from.id);
      await bot.sendMessage(msg.chat.id, "❌ تم إلغاء المهمة الجارية.", { reply_markup: BACK_TO_MENU });
    } else {
      await bot.sendMessage(msg.chat.id, "ℹ️ لا توجد مهمة جارية.", { reply_markup: BACK_TO_MENU });
    }
  });

  // ─── Callback query handler ───────────────────────────────────────────────

  bot.on("callback_query", async (query) => {
    const chatId = query.message?.chat.id;
    const from = query.from;
    if (!chatId || !from) return;

    await bot.answerCallbackQuery(query.id);
    const name = [from.first_name, from.last_name].filter(Boolean).join(" ") || from.username || String(from.id);
    await trackUser(String(from.id), name);

    const data = query.data || "";

    // ── Main menu ──
    if (data === "action:menu") {
      await bot.sendMessage(chatId, "🏠 *القائمة الرئيسية:*", { parse_mode: "Markdown", reply_markup: MAIN_KEYBOARD });
      return;
    }

    // ── Instant actions ──
    if (data === "action:tip") {
      const waitMsg = await bot.sendMessage(chatId, "💡 جارٍ توليد نصيحة...");
      try {
        const tip = await generateTip();
        await bot.editMessageText(`💡 *نصيحة اليوم*\n\n${tip}`, { chat_id: chatId, message_id: waitMsg.message_id, parse_mode: "Markdown" });
      } catch (e: any) {
        await bot.editMessageText(`❌ ${e.message}`, { chat_id: chatId, message_id: waitMsg.message_id });
      }
      await bot.sendMessage(chatId, "↩ العودة:", { reply_markup: BACK_TO_MENU });
      return;
    }

    if (data === "action:myfiles") {
      const docs = await getUserDocuments(String(from.id));
      if (!docs.length) {
        await bot.sendMessage(chatId, "📁 لا توجد ملفات محفوظة.", { reply_markup: BACK_TO_MENU });
        return;
      }
      let text = `📁 *ملفاتك المحفوظة (${docs.length}):*\n\n`;
      docs.slice(0, 10).forEach((d, i) => {
        const date = new Date(d.uploadedAt).toLocaleDateString("ar-SA");
        text += `${i + 1}. 📄 *${d.fileName}*\n   📅 ${date}\n   📌 ${d.summary.substring(0, 100)}...\n\n`;
      });
      await bot.sendMessage(chatId, text, { parse_mode: "Markdown", reply_markup: BACK_TO_MENU });
      return;
    }

    if (data === "action:clear") {
      await clearUserMemory(String(from.id));
      await bot.sendMessage(chatId, "✅ تم مسح ملفاتك من الذاكرة.", { reply_markup: BACK_TO_MENU });
      return;
    }

    if (data === "action:help") {
      await bot.sendMessage(
        chatId,
        `📖 *دليل الاستخدام*\n\n💡 \`/tip\` — نصيحة ذكية\n🔍 \`/search [موضوع]\` — بحث إنترنت\n📊 \`/pptx [موضوع]\` — PowerPoint\n📝 \`/word [موضوع]\` — تقرير Word\n📁 \`/myfiles\` — ملفاتك\n🗑️ \`/clear\` — مسح الذاكرة\n❌ \`/cancel\` — إلغاء\n\n📎 أرسل PDF/Word → يُحفظ كمرجع ذكي`,
        { parse_mode: "Markdown", reply_markup: BACK_TO_MENU }
      );
      return;
    }

    // ── Template-picker trigger ──
    if (data === "action:pptx") {
      await bot.sendMessage(chatId, "📊 *اختر نموذج العرض:*", { parse_mode: "Markdown", reply_markup: templateKeyboard("pptx") });
      return;
    }
    if (data === "action:word") {
      await bot.sendMessage(chatId, "📝 *اختر نموذج التقرير:*", { parse_mode: "Markdown", reply_markup: templateKeyboard("word") });
      return;
    }

    // ── Template selected → ask for topic ──
    if (data.startsWith("template:")) {
      const [, type, style] = data.split(":") as ["template", "pptx" | "word", TemplateStyle];
      setPendingTemplateTopic(from.id, { type, template: style });
      const label = STYLE_LABELS[style];
      const typeLabel = type === "pptx" ? "العرض التقديمي" : "التقرير";
      await bot.sendMessage(
        chatId,
        `${label}\n\n✏️ أرسل الآن موضوع ${typeLabel} الذي تريده:`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // ── Search button ──
    if (data === "action:search") {
      setPending(from.id, "search");
      await bot.sendMessage(chatId, "🔍 *البحث في الإنترنت*\n\nأرسل الموضوع الذي تريد البحث عنه:", { parse_mode: "Markdown" });
      return;
    }

    // ── File convert callbacks ──
    if (data.startsWith("fileaction:")) {
      const parts = data.split(":");
      const action = parts[1] as "pptx" | "word" | "keep";
      const pending = getPendingState(from.id);
      if (pending?.kind !== "file_convert") return;

      clearPending(from.id);
      if (action === "keep") {
        await bot.sendMessage(chatId, "✅ تم حفظ الملف كمرجع فقط.", { reply_markup: BACK_TO_MENU });
        return;
      }
      // Show template picker, preserve file context in topic via a combined pending
      const fileContext = pending.data.summary;
      const topicFromFile = pending.data.fileName.replace(/\.[^.]+$/, "");
      setPendingTemplateTopic(from.id, { type: action, template: "academic" });
      await bot.sendMessage(chatId, `${action === "pptx" ? "📊" : "📝"} *اختر النموذج:*`, {
        parse_mode: "Markdown",
        reply_markup: templateKeyboard(action),
      });
      // Store file context in a temp key
      (global as any).__fileCtx = (global as any).__fileCtx || {};
      (global as any).__fileCtx[from.id] = { context: fileContext, topic: topicFromFile };
      return;
    }
  });
}
