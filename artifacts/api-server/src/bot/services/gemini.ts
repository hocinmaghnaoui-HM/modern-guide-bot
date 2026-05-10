import { GoogleGenerativeAI } from "@google/generative-ai";

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

const MAX_RETRIES = 3;

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw new Error("Max retries reached");
}

export async function askGemini(prompt: string, context?: string): Promise<string> {
  return withRetry(async () => {
    const model = getClient().getGenerativeModel({ model: "gemini-2.0-flash" });
    const fullPrompt = context
      ? `السياق من الملفات المحفوظة:\n${context}\n\nالسؤال:\n${prompt}`
      : prompt;
    const result = await model.generateContent(fullPrompt);
    return result.response.text();
  });
}

export async function generateTip(): Promise<string> {
  return withRetry(async () => {
    const model = getClient().getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `اكتب نصيحة عملية مفيدة ومميزة في مجال الإنتاجية أو التطوير الذاتي أو التكنولوجيا. 
    النصيحة يجب أن تكون:
    - قصيرة ومركزة (3-5 جمل)
    - عملية وقابلة للتطبيق الفوري
    - مكتوبة باللغة العربية بأسلوب احترافي
    - مميزة وغير مكررة
    ابدأ بعنوان جذاب ثم اشرح النصيحة.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  });
}

export async function generatePPTXContent(
  topic: string,
  context?: string,
  style: "academic" | "modern" | "technical" = "academic"
): Promise<Array<{ title: string; content: string[] }>> {
  return withRetry(async () => {
    const model = getClient().getGenerativeModel({ model: "gemini-2.0-flash" });
    const contextPart = context ? `\nاستخدم هذا السياق كمرجع إضافي:\n${context}\n` : "";

    const styleNote =
      style === "technical"
        ? "ركّز على الأرقام والإحصاءات والبيانات والجداول المقارنة في كل شريحة."
        : style === "modern"
        ? "استخدم أسلوباً إبداعياً وعصرياً مع عناوين جذابة وأمثلة حديثة."
        : "استخدم أسلوباً أكاديمياً رسمياً مع مصطلحات علمية ومراجع.";

    const prompt = `${contextPart}
أنت خبير في إنشاء محتوى عروض تقديمية احترافية. ${styleNote}
قم بإنشاء محتوى تفصيلي لعرض PowerPoint حول: "${topic}"

الهيكل المطلوب (12 شريحة على الأقل):
1. شريحة العنوان والمقدمة
2. أهداف العرض (4-5 أهداف واضحة)
3-10. شرائح المحتوى المفصل (8 شرائح، كل منها بعنوان فريد ومحتوى غزير)
11. الخاتمة والتوصيات
12. المراجع والمصادر

متطلبات كل شريحة:
- عنوان فريد لا يتكرر مع أي شريحة أخرى
- 5-7 نقاط مفصلة وغنية بالمعلومات
- تجنب تماماً تكرار المعلومات بين الشرائح

أجب بتنسيق JSON فقط بدون أي نص آخر:
[
  {"title": "عنوان الشريحة", "content": ["نقطة 1 مفصلة", "نقطة 2 مفصلة", "نقطة 3 مفصلة", "نقطة 4 مفصلة", "نقطة 5 مفصلة"]},
  ...
]`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(text);
  });
}

export async function generateWordContent(
  topic: string,
  context?: string,
  style: "academic" | "modern" | "technical" = "academic"
): Promise<{ title: string; sections: Array<{ heading: string; body: string }> }> {
  return withRetry(async () => {
    const model = getClient().getGenerativeModel({ model: "gemini-2.0-flash" });
    const contextPart = context ? `\nاستخدم هذا السياق كمرجع إضافي:\n${context}\n` : "";

    const styleNote =
      style === "technical"
        ? "ركّز على الجداول والإحصاءات والبيانات الرقمية والمقارنات التقنية."
        : style === "modern"
        ? "استخدم أسلوباً عصرياً وإبداعياً مع أمثلة واقعية وحديثة."
        : "استخدم أسلوباً أكاديمياً رسمياً مع توثيق المصادر والمراجع.";

    const prompt = `${contextPart}
أنت خبير في كتابة التقارير الأكاديمية والمهنية. ${styleNote}
قم بكتابة تقرير شامل ومفصل حول: "${topic}"

الهيكل المطلوب:
1. الملخص التنفيذي
2. المقدمة والخلفية
3-9. أقسام المحتوى الرئيسية (7 أقسام متخصصة، كل قسم بمحتوى فريد)
10. الخاتمة والتوصيات
11. المراجع والمصادر

متطلبات كل قسم:
- عنوان واضح ومميز
- محتوى غزير ومفصل (3 فقرات على الأقل)
- معلومات دقيقة ومحدّثة

أجب بتنسيق JSON فقط:
{
  "title": "عنوان التقرير الكامل",
  "sections": [
    {"heading": "عنوان القسم", "body": "محتوى تفصيلي غزير للقسم بأكثر من فقرة..."},
    ...
  ]
}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(text);
  });
}

export async function summarizeDocument(text: string): Promise<string> {
  return withRetry(async () => {
    const model = getClient().getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `قم بتلخيص هذا المستند بدقة واحتفظ بالمعلومات الجوهرية والمفاهيم الرئيسية. 
    الملخص يجب أن يكون شاملاً ويغطي النقاط الأساسية. اكتب الملخص باللغة العربية.
    
    المستند:
    ${text.substring(0, 8000)}`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  });
}

export async function enrichWithResearch(
  topic: string,
  researchContext: string
): Promise<string> {
  return withRetry(async () => {
    const model = getClient().getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `بناءً على المعلومات البحثية الحديثة التالية حول "${topic}"، قم بصياغة ملخص معلوماتي شامل ومحدّث يُستخدم كسياق لإنشاء محتوى احترافي.

المعلومات البحثية:
${researchContext}

اكتب ملخصاً تفصيلياً يتضمن:
- أحدث الحقائق والإحصاءات
- المفاهيم الأساسية
- التطورات الحديثة (2025-2026)
- الجوانب المهمة والتطبيقية`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  });
}
