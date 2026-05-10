export type PendingAction = "pptx" | "word" | "search";
export type TemplateStyle = "academic" | "modern" | "technical";

export interface PendingTemplate {
  type: "pptx" | "word";
  template: TemplateStyle;
}

export interface PendingFileConvert {
  type: "file_convert";
  summary: string;
  fileName: string;
}

type PendingState =
  | { kind: "action"; action: PendingAction }
  | { kind: "template_topic"; data: PendingTemplate }
  | { kind: "file_convert"; data: PendingFileConvert };

const store = new Map<number, PendingState>();

export function setPending(userId: number, action: PendingAction): void {
  store.set(userId, { kind: "action", action });
}

export function setPendingTemplateTopic(userId: number, data: PendingTemplate): void {
  store.set(userId, { kind: "template_topic", data });
}

export function setPendingFileConvert(userId: number, data: PendingFileConvert): void {
  store.set(userId, { kind: "file_convert", data });
}

export function getPendingState(userId: number): PendingState | undefined {
  return store.get(userId);
}

export function getPending(userId: number): PendingAction | undefined {
  const s = store.get(userId);
  return s?.kind === "action" ? s.action : undefined;
}

export function clearPending(userId: number): void {
  store.delete(userId);
}
