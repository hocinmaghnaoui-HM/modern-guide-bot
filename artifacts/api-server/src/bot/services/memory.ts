import Database from "@replit/database";

const db = new Database();

const PREFIX = "bot_memory_";

export interface DocumentMemory {
  userId: string;
  fileName: string;
  summary: string;
  uploadedAt: string;
}

export async function saveDocumentSummary(
  userId: string,
  fileName: string,
  summary: string
): Promise<void> {
  const key = `${PREFIX}doc_${userId}_${Date.now()}`;
  const doc: DocumentMemory = {
    userId,
    fileName,
    summary,
    uploadedAt: new Date().toISOString(),
  };
  await db.set(key, JSON.stringify(doc));
}

export async function getUserContext(userId: string): Promise<string> {
  try {
    const result = await db.list(`${PREFIX}doc_${userId}`);
    const allKeys: string[] = Array.isArray(result) ? result as string[] : [];
    if (allKeys.length === 0) return "";

    const docs: DocumentMemory[] = [];
    for (const key of allKeys) {
      const val = await db.get(key);
      if (val) docs.push(JSON.parse(val as unknown as string));
    }

    if (docs.length === 0) return "";

    const sorted = docs.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    return sorted
      .slice(0, 5)
      .map((d) => `📄 ملف: ${d.fileName}\nملخص: ${d.summary}`)
      .join("\n\n---\n\n");
  } catch {
    return "";
  }
}

export async function getUserDocuments(userId: string): Promise<DocumentMemory[]> {
  try {
    const result = await db.list(`${PREFIX}doc_${userId}`);
    const allKeys: string[] = Array.isArray(result) ? result as string[] : [];
    if (allKeys.length === 0) return [];
    const docs: DocumentMemory[] = [];
    for (const key of allKeys) {
      const val = await db.get(key);
      if (val) docs.push(JSON.parse(val as unknown as string));
    }
    return docs.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  } catch {
    return [];
  }
}

export async function clearUserMemory(userId: string): Promise<void> {
  const result = await db.list(`${PREFIX}doc_${userId}`);
  const allKeys: string[] = Array.isArray(result) ? result as string[] : [];
  for (const key of allKeys) {
    await db.delete(key);
  }
}

export async function saveUserSetting(userId: string, key: string, value: string): Promise<void> {
  await db.set(`${PREFIX}setting_${userId}_${key}`, value);
}

export async function getUserSetting(userId: string, key: string): Promise<string | null> {
  const val = await db.get(`${PREFIX}setting_${userId}_${key}`);
  return val as unknown as string | null;
}
