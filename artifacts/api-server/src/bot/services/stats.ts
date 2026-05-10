import Database from "@replit/database";

const db = new Database();
const PREFIX = "bot_stats_";

export interface FileRecord {
  userId: string;
  userName: string;
  type: "pptx" | "word";
  topic: string;
  createdAt: string;
}

export interface SearchRecord {
  userId: string;
  userName: string;
  query: string;
  resultCount: number;
  searchedAt: string;
}

export interface UserRecord {
  userId: string;
  userName: string;
  firstSeen: string;
  lastSeen: string;
  messageCount: number;
}

async function listKeys(prefix: string): Promise<string[]> {
  const result = await db.list(prefix);
  if (Array.isArray(result)) return result as string[];
  // @replit/database v3 wraps results
  if (result && typeof result === "object" && "ok" in result) {
    const r = result as any;
    if (r.ok && Array.isArray(r.value)) return r.value as string[];
  }
  return [];
}

async function getJson<T>(key: string): Promise<T | null> {
  try {
    const val = await db.get(key);
    if (val === null || val === undefined) return null;
    if (typeof val === "string") return JSON.parse(val) as T;
    return val as unknown as T;
  } catch {
    return null;
  }
}

export async function trackUser(userId: string, userName: string): Promise<void> {
  const key = `${PREFIX}user_${userId}`;
  const existing = await getJson<UserRecord>(key);
  if (existing) {
    existing.lastSeen = new Date().toISOString();
    existing.messageCount = (existing.messageCount || 0) + 1;
    existing.userName = userName;
    await db.set(key, JSON.stringify(existing));
  } else {
    const user: UserRecord = {
      userId, userName,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      messageCount: 1,
    };
    await db.set(key, JSON.stringify(user));
  }
}

export async function trackFileGeneration(
  userId: string, userName: string, type: "pptx" | "word", topic: string
): Promise<void> {
  const key = `${PREFIX}file_${Date.now()}_${userId}`;
  await db.set(key, JSON.stringify({ userId, userName, type, topic, createdAt: new Date().toISOString() }));
}

export async function trackSearch(
  userId: string, userName: string, query: string, resultCount: number
): Promise<void> {
  const key = `${PREFIX}search_${Date.now()}_${userId}`;
  await db.set(key, JSON.stringify({ userId, userName, query, resultCount, searchedAt: new Date().toISOString() }));
}

export async function getStats() {
  const userKeys = await listKeys(`${PREFIX}user_`);
  const fileKeys = await listKeys(`${PREFIX}file_`);
  const searchKeys = await listKeys(`${PREFIX}search_`);

  const userList: UserRecord[] = [];
  for (const k of userKeys) {
    const v = await getJson<UserRecord>(k);
    if (v) userList.push(v);
  }

  const fileList: FileRecord[] = [];
  for (const k of fileKeys) {
    const v = await getJson<FileRecord>(k);
    if (v) fileList.push(v);
  }

  const searchList: SearchRecord[] = [];
  for (const k of searchKeys) {
    const v = await getJson<SearchRecord>(k);
    if (v) searchList.push(v);
  }

  const sortedFiles = fileList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const sortedSearches = searchList.sort((a, b) => new Date(b.searchedAt).getTime() - new Date(a.searchedAt).getTime());
  const sortedUsers = userList.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());

  return {
    overview: {
      totalUsers: userList.length,
      totalFiles: fileList.length,
      totalSearches: searchList.length,
      totalMessages: userList.reduce((s, u) => s + (u.messageCount || 0), 0),
      pptxCount: fileList.filter((f) => f.type === "pptx").length,
      wordCount: fileList.filter((f) => f.type === "word").length,
    },
    recentFiles: sortedFiles.slice(0, 20),
    recentSearches: sortedSearches.slice(0, 20),
    recentUsers: sortedUsers.slice(0, 10),
  };
}
