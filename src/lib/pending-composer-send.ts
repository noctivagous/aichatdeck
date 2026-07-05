export type PendingComposerSend = {
  text: string;
  files?: FileList;
};

let pending: PendingComposerSend | null = null;

export function stashPendingComposerSend(payload: PendingComposerSend): void {
  pending = payload;
}

export function consumePendingComposerSend(): PendingComposerSend | null {
  const current = pending;
  pending = null;
  return current;
}