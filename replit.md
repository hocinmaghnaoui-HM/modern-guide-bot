# بوت تيليغرام الذكي

بوت تيليغرام احترافي يستخدم الذكاء الاصطناعي لإنشاء العروض والتقارير، والبحث الشامل، وحفظ الملفات كمرجع ذكي.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — تشغيل السيرفر والبوت (port 5000)
- `pnpm run typecheck` — فحص الأنواع عبر جميع الحزم
- `pnpm run build` — بناء جميع الحزم

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Bot: node-telegram-bot-api
- AI: Google Gemini 1.5 Flash
- Search: Tavily API
- Memory: Replit Database
- Docs: pptxgenjs + docx
- File parsing: pdf-parse + mammoth

## Where things live

- `artifacts/api-server/src/bot/` — كود البوت الكامل
- `artifacts/api-server/src/bot/services/` — الخدمات (Gemini, Tavily, Memory, GitHub, DocGenerator, FileProcessor)
- `artifacts/api-server/src/bot/handlers/` — معالجات الأوامر والرسائل
- `artifacts/api-server/src/bot/scheduler.ts` — جدولة النصائح كل 6 ساعات

## Architecture decisions

- البوت يعمل داخل نفس عملية Express لتبسيط التشغيل
- الذاكرة الذكية مبنية على Replit DB لاستمرارية ملفات المستخدم
- كل عملية بحث/إنشاء ملف تعمل بشكل غير متزامن مع دعم /cancel
- نظام Retry تلقائي (3 محاولات) لكل اتصال API
- النسخ الاحتياطي يتم على GitHub بعد كل إنشاء ملف

## Product

- `/start` `/help` — ترحيب ودليل
- `/tip` — نصيحة ذكية يومية
- `/search [موضوع]` — بحث شامل في الإنترنت مع ملخص ذكي
- `/pptx [موضوع]` — إنشاء عرض PowerPoint احترافي (10+ شرائح)
- `/word [موضوع]` — إنشاء تقرير Word أكاديمي (8+ أقسام)
- `/myfiles` — عرض الملفات المحفوظة
- `/clear` — مسح الذاكرة
- `/cancel` — إلغاء المهمة الجارية
- إرسال PDF/Word → يُحفظ ويُلخَّص تلقائياً كمرجع
- نشر نصيحة تلقائية كل 6 ساعات في القناة

## User preferences

- اللغة العربية في جميع ردود البوت
- المحتوى الأكاديمي الغزير (10+ شرائح، 8+ أقسام)
- تجنب تكرار العناوين في العروض

## Gotchas

- CHANNEL_ID يجب أن يبدأ بـ `-100` للقنوات
- ADMIN_ID بدون علامة `-` (موجب)
- بعد تعديل الكود يجب إعادة تشغيل workflow لإعادة البناء

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
