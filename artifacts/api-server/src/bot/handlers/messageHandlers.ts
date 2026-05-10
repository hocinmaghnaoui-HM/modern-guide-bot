import TelegramBot from "node-telegram-bot-api";
import { askGemini, summarizeDocument } from "../services/gemini";
import { getUserContext, saveDocumentSummary } from "../services/memory";
import { downloadFile, extractTextFromPDF, extractTextFromDocx, cleanup } from "../services/fileProcessor";
import { trackUser } from "../services/stats";
import { getPendingState, clearPending, setPendingFileConvert } from "../pendingActions";
import { handlePPTX, handleWord, handleSearch, MAIN_KEYBOARD } from "./commandHandlers";
import { logger } from "../../lib/logger";

function displayName(from: TelegramBot.User | undefined): string {
  if (!from) return "مجهول";
  return [from.first_name, from.last_name].filter(Boolean).join(" ") || from.username || String(from.id);
}

const BACK_TO_MENU: TelegramBot.InlineKeyboardMarkup = {
  inline_keyboard: [[{ text: "🔄 القائمة الرئيسية", callback_data: "action:menu" }]],
};

export function registerMessageHandlers(bot: TelegramBot): void {

  bot.on("document", async (msg) => {
    const doc = msg.document;
    if (!doc || !msg.from) return;
    await trackUser(String(msg.from.id), displayName(msg.from));

    const ext = doc.file_name?.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "doc"].includes(ext || "")) {
      await bot.sendMessage(msg.chat.id, "⚠️ أقبل فقط ملفات PDF و Word (.docx)");
      return;
    }

    const waitMsg = await bot.sendMessage(
      msg.chat.id,
      `📎 جارٍ معالجة: *${doc.file_name}*...`,
      { parse_mode: "Markdown" }
    );

    try {
      const fileLink = await bot.getFileLink(doc.file_id);
      const localPath = await downloadFile(fileLink, `.${ext}`);

      let text = "";
      if (ext === "pdf") text = await extractTextFromPDF(localPath);
      else text = await extractTextFromDocx(localPath);
      cleanup(localPath);

      if (!text.trim()) {
        await bot.editMessageText("⚠️ لم أتمكن من استخراج النص.", { chat_id: msg.chat.id, message_id: waitMsg.message_id });
        return;
      }

      const summary = await summarizeDocument(text);
      await saveDocumentSummary(String(msg.from.id), doc.file_name || "ملف", summary);

      // Save pending state so user can convert the file
      setPendingFileConvert(msg.from.id, {
        type: "file_convert",
        summary,
        fileName: doc.file_name || "ملف",
      });

      await bot.editMessageText(
        `✅ *تم حفظ الملف في الذاكرة!*\n\n📄 *${doc.file_name}*\n\n📌 *الملخص:*\n${summary.substring(0, 400)}...\n\n💡 ماذا تريد أن تفعل بهذا الملف؟`,
        {
          chat_id: msg.chat.id,
          message_id: waitMsg.message_id,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "📊 تحويل إلى عرض PowerPoint", callback_data: "fileaction:pptx" }],
              [{ text: "📝 تلخيص في تقرير Word",       callback_data: "fileaction:word" }],
              [{ text: "📚 احتفاظ كمرجع فقط",          callback_data: "fileaction:keep" }],
            ],
          },
        }
      );
    } catch (e: any) {
      logger.error({ err: e }, "document processing error");
      await bot.editMessageText(`❌ فشلت المعالجة: ${e.message}`, { chat_id: msg.chat.id, message_id: waitMsg.message_id });
    }
  });

  bot.on("message", async (msg) => {
    if (!msg.text || msg.text.startsWith("/")) return;
    if (!msg.from) return;

    await trackUser(String(msg.from.id), displayName(msg.from));

    const pendingState = getPendingState(msg.from.id);

    // ── Pending: template + topic selected, now user sends topic ──
    if (pendingState?.kind === "template_topic") {
      clearPending(msg.from.id);
      const { type, template } = pendingState.data;
      const topic = msg.text.trim();

      // Check if there's extra file context from a file conversion
      const fileCtx = (global as any).__fileCtx?.[msg.from.id];
      let extraContext: string | undefined;
      if (fileCtx) {
        extraContext = fileCtx.context;
        delete (global as any).__fileCtx[msg.from.id];
      }

      if (type === "pptx") {
        await handlePPTX(bot, msg.chat.id, msg.from.id, msg.from, topic, template);
      } else {
        await handleWord(bot, msg.chat.id, msg.from.id, msg.from, topic, template);
      }
      return;
    }

    // ── Pending: simple action (search) ──
    if (pendingState?.kind === "action") {
      clearPending(msg.from.id);
      const topic = msg.text.trim();

      if (pendingState.action === "pptx") {
        await bot.sendMessage(msg.chat.id, "📊 *اختر نموذج العرض:*", {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🎨 أكاديمي رسمي", callback_data: "template:pptx:academic" }],
              [{ text: "🚀 عصري/إبداعي",  callback_data: "template:pptx:modern" }],
              [{ text: "📊 تقني/بيانات",  callback_data: "template:pptx:technical" }],
            ],
          },
        });
        // store topic for after template selection
        (global as any).__topicBuffer = (global as any).__topicBuffer || {};
        (global as any).__topicBuffer[msg.from.id] = topic;
        return;
      }

      if (pendingState.action === "word") {
        await bot.sendMessage(msg.chat.id, "📝 *اختر نموذج التقرير:*", {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🎨 أكاديمي رسمي", callback_data: "template:word:academic" }],
              [{ text: "🚀 عصري/إبداعي",  callback_data: "template:word:modern" }],
              [{ text: "📊 تقني/بيانات",  callback_data: "template:word:technical" }],
            ],
          },
        });
        (global as any).__topicBuffer = (global as any).__topicBuffer || {};
        (global as any).__topicBuffer[msg.from.id] = topic;
        return;
      }

      if (pendingState.action === "search") {
        await handleSearch(bot, msg.chat.id, msg.from.id, msg.from, topic);
        return;
      }
    }

    // ── Normal AI chat ──
    const waitMsg = await bot.sendMessage(msg.chat.id, "🤔 جارٍ التفكير...");
    try {
      const context = await getUserContext(String(msg.from.id));
      const answer = await askGemini(msg.text, context || undefined);
      await bot.editMessageText(answer, {
        chat_id: msg.chat.id, message_id: waitMsg.message_id, parse_mode: "Markdown",
      });
      await bot.sendMessage(msg.chat.id, "↩ العودة:", { reply_markup: BACK_TO_MENU });
    } catch (e: any) {
      logger.error({ err: e }, "AI response error");
      try {
        await bot.editMessageText(`❌ تعذر الحصول على إجابة. حاول مجدداً.`, {
          chat_id: msg.chat.id, message_id: waitMsg.message_id,
        });
      } catch {}
    }
  });
}
