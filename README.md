# 🤖 Modern Guide Bot

بوت تيليغرام ذكي احترافي لإنشاء العروض والتقارير والبحث الشامل، مدعوم بـ Gemini 2.0 Flash وTavily API.

## ✨ المميزات

### 📊 إنشاء الملفات الذكي
- **PowerPoint** — 12+ شريحة منظمة (مقدمة، أهداف، محتوى، خاتمة، مراجع)
- **Word** — تقارير أكاديمية مع فهرس محتويات تلقائي ومراجع
- **3 نماذج تصميم:** أكاديمي رسمي 🎨 | عصري/إبداعي 🚀 | تقني/بيانات 📊

### 🔍 البحث الحي
- يبحث في الإنترنت عبر Tavily API قبل إنشاء أي ملف
- يدمج أحدث المعلومات (2025-2026) مع محتوى Gemini

### 🧠 الذكاء الاصطناعي
- إجابة على أي سؤال باللغة العربية
- معالجة وتلخيص ملفات PDF و Word المرفوعة
- ذاكرة ذكية تحفظ ملفاتك كمرجع

### ⚙️ الأتمتة
- نشر نصيحة تلقائية كل 6 ساعات في القناة
- نسخ احتياطي تلقائي على GitHub بعد كل ملف

### 📊 لوحة التحكم
- واجهة ويب عربية RTL محمية بكلمة مرور
- إحصاءات حية: مستخدمون، ملفات، بحث، رسائل
- تحديث تلقائي كل 30 ثانية

## 🗂️ هيكل المشروع

```
├── artifacts/
│   ├── api-server/          # السيرفر + البوت (Express + node-telegram-bot-api)
│   │   └── src/
│   │       ├── bot/
│   │       │   ├── handlers/        # معالجات الأوامر والرسائل
│   │       │   ├── services/        # Gemini, Tavily, Memory, GitHub, DocGenerator
│   │       │   ├── scheduler.ts     # نشر النصائح كل 6 ساعات
│   │       │   └── pendingActions.ts # إدارة حالة المحادثة
│   │       └── routes/             # API endpoints
│   └── dashboard/           # لوحة التحكم (React + Vite + Tailwind)
├── lib/
│   ├── api-spec/            # OpenAPI spec
│   └── api-client-react/    # Generated React Query hooks
└── pnpm-workspace.yaml
```

## 🚀 التشغيل

### المتطلبات
- Node.js 20+
- pnpm 9+

### الإعداد

```bash
# 1. نسخ المشروع
git clone https://github.com/hocinmaghnaoui-HM/modern-guide-bot.git
cd modern-guide-bot

# 2. نسخ ملف المتغيرات البيئية
cp .env.example .env
# ثم أضف قيمك الفعلية في .env

# 3. تثبيت الاعتمادات
pnpm install

# 4. تشغيل السيرفر والبوت
pnpm --filter @workspace/api-server run dev

# 5. تشغيل لوحة التحكم (نافذة أخرى)
pnpm --filter @workspace/dashboard run dev
```

## 🔑 المتغيرات البيئية

| المتغير | الوصف |
|---------|-------|
| `TELEGRAM_BOT_TOKEN` | رمز البوت من @BotFather |
| `CHANNEL_ID` | معرّف القناة (يبدأ بـ `-100`) |
| `ADMIN_ID` | معرّف المدير على تيليغرام |
| `GEMINI_API_KEY` | مفتاح Google Gemini API |
| `TAVILY_API_KEY` | مفتاح Tavily Search API |
| `GITHUB_TOKEN` | رمز GitHub للنسخ الاحتياطي |
| `DASHBOARD_PASSWORD` | كلمة مرور لوحة التحكم |
| `SESSION_SECRET` | سر جلسة Express |

## 📱 أوامر البوت

| الأمر | الوصف |
|-------|-------|
| `/start` | القائمة الرئيسية بأزرار تفاعلية |
| `/pptx [موضوع]` | إنشاء عرض PowerPoint |
| `/word [موضوع]` | إنشاء تقرير Word |
| `/search [موضوع]` | بحث شامل في الإنترنت |
| `/tip` | نصيحة ذكية يومية |
| `/myfiles` | عرض الملفات المحفوظة |
| `/clear` | مسح الذاكرة |
| `/cancel` | إلغاء المهمة الجارية |

## 🛠️ التقنيات المستخدمة

- **Runtime:** Node.js 24, TypeScript 5.9
- **Bot:** node-telegram-bot-api
- **AI:** Google Gemini 2.0 Flash
- **Search:** Tavily API
- **Documents:** pptxgenjs + docx
- **File Parsing:** pdf-parse + mammoth
- **Database:** Replit Database (@replit/database)
- **Frontend:** React + Vite + Tailwind CSS + Recharts
- **API:** Express 5 + OpenAPI

## 📄 الترخيص

MIT License — أنشأه Modern Guide Bot Team
