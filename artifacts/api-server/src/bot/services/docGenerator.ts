import PptxGenJS from "pptxgenjs";
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer, TableOfContents, ShadingType, BorderStyle } from "docx";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export type TemplateStyle = "academic" | "modern" | "technical";

export interface SlideData {
  title: string;
  content: string[];
}

export interface WordSection {
  heading: string;
  body: string;
}

// ─── PPTX TEMPLATES ───────────────────────────────────────────────────────────

const THEMES = {
  academic: {
    bg: "F5F5F0",        // warm white
    headerBg: "1A3A5C",  // navy
    accent: "B8860B",    // gold
    text: "1A1A2E",
    light: "FFFFFF",
    gray: "6B7280",
  },
  modern: {
    bg: "0F0F1A",        // deep dark
    headerBg: "6C2BD9",  // purple
    accent: "00D4FF",    // cyan
    text: "F0F0FF",
    light: "FFFFFF",
    gray: "A0A0C0",
  },
  technical: {
    bg: "1C1C1C",        // dark gray
    headerBg: "0D1117",  // near black
    accent: "FF6B35",    // orange
    text: "E0E0E0",
    light: "FFFFFF",
    gray: "808080",
  },
};

export async function generatePPTX(
  slides: SlideData[],
  topic: string,
  style: TemplateStyle = "academic"
): Promise<string> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  const T = THEMES[style];

  // ── Title slide ──
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: T.headerBg };

  if (style === "modern") {
    // gradient-like double bar
    titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "40%", h: "100%", fill: { color: "4A1D96" } });
    titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.06, h: "100%", fill: { color: T.accent } });
  } else if (style === "technical") {
    titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 4.8, w: "100%", h: 0.1, fill: { color: T.accent } });
    titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 4.9, w: "100%", h: 0.06, fill: { color: "FF8C5A" } });
  } else {
    // academic: top bar + bottom bar
    titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.12, fill: { color: T.accent } });
    titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 5.38, w: "100%", h: 0.12, fill: { color: T.accent } });
  }

  const titleX = style === "modern" ? 4.2 : 0.5;
  const titleW = style === "modern" ? 5.6 : 9;

  titleSlide.addText(topic, {
    x: titleX, y: 1.3, w: titleW, h: 1.8,
    fontSize: style === "modern" ? 32 : 36,
    bold: true, color: T.light,
    align: style === "modern" ? "left" : "center",
    valign: "middle", fontFace: "Arial",
  });

  const styleLabel = style === "academic" ? "تقرير أكاديمي" : style === "modern" ? "عرض إبداعي" : "تحليل تقني";
  titleSlide.addText(styleLabel, {
    x: titleX, y: 3.2, w: titleW, h: 0.4,
    fontSize: 14, color: T.accent,
    align: style === "modern" ? "left" : "center",
    fontFace: "Arial", bold: true,
  });

  titleSlide.addText(
    new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long" }),
    {
      x: titleX, y: 3.7, w: titleW, h: 0.4,
      fontSize: 13, color: T.gray,
      align: style === "modern" ? "left" : "center",
      fontFace: "Arial",
    }
  );

  // ── Content slides ──
  for (let i = 1; i < slides.length; i++) {
    const slide = slides[i];
    const s = pptx.addSlide();
    s.background = { color: T.bg };

    if (style === "academic") {
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 1.05, fill: { color: T.headerBg } });
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 1.05, w: 0.25, h: 4.45, fill: { color: T.accent } });
      s.addText(slide.title, { x: 0.5, y: 0.12, w: 8.8, h: 0.82, fontSize: 20, bold: true, color: T.light, align: "right", fontFace: "Arial" });
      s.addText(`${i}`, { x: 9.2, y: 0.05, w: 0.6, h: 0.35, fontSize: 10, color: T.gray, align: "right" });
      const bullets = slide.content.map((c) => ({ text: `◈  ${c}`, options: { fontSize: 13, color: T.text, breakLine: true, paraSpaceAfter: 8 } }));
      s.addText(bullets, { x: 0.55, y: 1.15, w: 9.1, h: 4.3, align: "right", valign: "top", fontFace: "Arial" });

    } else if (style === "modern") {
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 1.1, fill: { color: T.headerBg } });
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.06, h: "100%", fill: { color: T.accent } });
      s.addShape(pptx.ShapeType.rect, { x: 0.06, y: 1.1, w: "100%", h: 0.04, fill: { color: "4A1D96" } });
      s.addText(slide.title, { x: 0.3, y: 0.12, w: 9.2, h: 0.82, fontSize: 20, bold: true, color: T.light, align: "right", fontFace: "Arial" });
      s.addText(`${i} / ${slides.length - 1}`, { x: 0.2, y: 0.05, w: 1.5, h: 0.35, fontSize: 10, color: T.accent, align: "left" });
      const bullets = slide.content.map((c) => ({ text: `▶  ${c}`, options: { fontSize: 13, color: T.text, breakLine: true, paraSpaceAfter: 8 } }));
      s.addText(bullets, { x: 0.3, y: 1.22, w: 9.3, h: 4.2, align: "right", valign: "top", fontFace: "Arial" });

    } else {
      // technical
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 1.0, fill: { color: T.headerBg } });
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 1.0, w: "100%", h: 0.06, fill: { color: T.accent } });
      s.addShape(pptx.ShapeType.rect, { x: 8.8, y: 0.05, w: 1.0, h: 0.55, fill: { color: T.accent }, line: { color: T.accent } });
      s.addText(`${String(i).padStart(2, "0")}`, { x: 8.8, y: 0.1, w: 1.0, h: 0.45, fontSize: 18, bold: true, color: T.light, align: "center" });
      s.addText(slide.title, { x: 0.3, y: 0.1, w: 8.3, h: 0.8, fontSize: 20, bold: true, color: T.accent, align: "right", fontFace: "Courier New" });
      const bullets = slide.content.map((c) => ({ text: `⬡  ${c}`, options: { fontSize: 13, color: T.text, breakLine: true, paraSpaceAfter: 7 } }));
      s.addText(bullets, { x: 0.3, y: 1.15, w: 9.3, h: 4.3, align: "right", valign: "top", fontFace: "Courier New" });
    }
  }

  const outPath = path.join(os.tmpdir(), `presentation_${Date.now()}.pptx`);
  await pptx.writeFile({ fileName: outPath });
  return outPath;
}

// ─── DOCX TEMPLATES ───────────────────────────────────────────────────────────

const DOC_COLORS = {
  academic: { title: "1A3A5C", heading: "1A3A5C", accent: "B8860B", body: "1A1A1A" },
  modern:   { title: "6C2BD9", heading: "4A1D96", accent: "00B4CC", body: "111111" },
  technical:{ title: "FF6B35", heading: "CC5500", accent: "FF8C5A", body: "1C1C1C" },
};

export async function generateDOCX(
  title: string,
  sections: WordSection[],
  style: TemplateStyle = "academic"
): Promise<string> {
  const C = DOC_COLORS[style];
  const children: Paragraph[] = [];

  // ── Cover / Title ──
  children.push(
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 44, color: C.title })],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 600, after: 200 },
    })
  );

  const styleLabel =
    style === "academic" ? "تقرير أكاديمي رسمي" :
    style === "modern"   ? "تقرير عصري/إبداعي" : "تقرير تقني/بيانات";

  children.push(
    new Paragraph({
      children: [new TextRun({ text: styleLabel, bold: true, size: 26, color: C.accent })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" }),
          size: 22, color: "888888",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
    })
  );

  // ── Table of Contents header ──
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "فهرس المحتويات", bold: true, size: 32, color: C.title })],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.RIGHT,
      spacing: { before: 400, after: 200 },
    })
  );

  sections.forEach((s, idx) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${idx + 1}.  ${s.heading}`, size: 22, color: C.body }),
          new TextRun({ text: `   ......   ${idx + 2}`, size: 22, color: "AAAAAA" }),
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 80 },
      })
    );
  });

  // page break before content
  children.push(new Paragraph({ children: [], pageBreakBefore: true }));

  // ── Sections ──
  for (const section of sections) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: section.heading, bold: true, size: 30, color: C.heading })],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.RIGHT,
        spacing: { before: 480, after: 200 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: C.accent },
        },
      })
    );

    const paragraphs = section.body.split("\n").filter((p) => p.trim());
    for (const para of paragraphs) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: para.trim(), size: 24, color: C.body })],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 160, line: 320 },
          indent: { right: 200 },
        })
      );
    }
  }

  // ── Footer note ──
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "─────────────────────────────────────────", size: 16, color: "CCCCCC" })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 600, after: 120 },
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "تم إنشاء هذا التقرير بواسطة Modern Guide Bot", size: 18, color: "AAAAAA", italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    })
  );

  const doc = new Document({
    styles: { paragraphStyles: [] },
    sections: [{ properties: {}, children }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(os.tmpdir(), `report_${Date.now()}.docx`);
  fs.writeFileSync(outPath, buffer);
  return outPath;
}
