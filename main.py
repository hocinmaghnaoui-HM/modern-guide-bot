import os
import logging
import asyncio
from telegram import Update
from telegram.ext import ApplicationBuilder, ContextTypes, CommandHandler, MessageHandler, filters
import google.generativeai as genai
from dotenv import load_dotenv

# 1. تحميل الإعدادات من ملف .env
load_dotenv()

TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
GEMINI_KEY = os.getenv("GEMINI_API_KEY")

# 2. إعداد ذكاء Gemini
genai.configure(api_key=GEMINI_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

# 3. إعداد التسجيل (Logging) لمراقبة الأخطاء
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

# 4. وظيفة الأمر /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_name = update.effective_user.first_name
    welcome_msg = (
        f"أهلاً بك يا {user_name} في بوت Modern Guide 🤖\n\n"
        "أنا مدعوم بالذكاء الاصطناعي Gemini. يمكنني مساعدتك في:\n"
        "✅ الإجابة على الأسئلة البرمجية والتقنية.\n"
        "✅ تلخيص المحتوى.\n"
        "✅ قريباً: صناعة ملفات PowerPoint و Word آلياً!"
    )
    await context.bot.send_message(chat_id=update.effective_chat.id, text=welcome_msg)

# 5. وظيفة الرد باستخدام Gemini
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_text = update.message.text
    
    # إظهار حالة "يكتب الآن..." لإعطاء لمسة احترافية
    await context.bot.send_chat_action(chat_id=update.effective_chat.id, action="typing")
    
    try:
        # إرسال النص لـ Gemini
        response = model.generate_content(user_text)
        await update.message.reply_text(response.text)
    except Exception as e:
        await update.message.reply_text("عذراً، حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.")
        print(f"Error: {e}")

if __name__ == '__main__':
    # تشغيل البوت
    application = ApplicationBuilder().token(TELEGRAM_TOKEN).build()
    
    start_handler = CommandHandler('start', start)
    msg_handler = MessageHandler(filters.TEXT & (~filters.COMMAND), handle_message)
    
    application.add_handler(start_handler)
    application.add_handler(msg_handler)
    
    print("Modern Guide Bot is running...")
    application.run_polling()
