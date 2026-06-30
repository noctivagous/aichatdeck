export type ChatNavigateTarget = {
  pageIndex: number;
  headingSlug?: string;
};

export function parseChatNavigateTarget(
  searchParams: URLSearchParams,
): ChatNavigateTarget | null {
  const page = searchParams.get("page");
  if (page === null) return null;

  const pageIndex = Number(page);
  if (!Number.isFinite(pageIndex) || pageIndex < 0) return null;

  const heading = searchParams.get("heading");
  return {
    pageIndex: Math.floor(pageIndex),
    headingSlug: heading?.trim() || undefined,
  };
}

export function buildChatNavigateHref(
  conversationId: string,
  pageIndex: number,
  headingSlug?: string,
): string {
  const params = new URLSearchParams({ page: String(pageIndex) });
  if (headingSlug) params.set("heading", headingSlug);
  return `/chat/${conversationId}?${params.toString()}`;
}