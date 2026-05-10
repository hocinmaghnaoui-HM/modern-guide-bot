import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export async function downloadFile(fileUrl: string, ext: string): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `bot_file_${Date.now()}${ext}`);
  const response = await axios.get(fileUrl, { responseType: "arraybuffer", timeout: 60000 });
  fs.writeFileSync(tmpPath, response.data);
  return tmpPath;
}

export async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text || "";
  } catch (e: any) {
    throw new Error(`فشل في قراءة PDF: ${e.message}`);
  }
}

export async function extractTextFromDocx(filePath: string): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || "";
  } catch (e: any) {
    throw new Error(`فشل في قراءة Word: ${e.message}`);
  }
}

export function cleanup(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
}
