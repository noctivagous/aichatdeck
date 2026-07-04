export function findHeadingInSlide(
  slide: HTMLElement,
  headingSlug: string,
): HTMLElement | null {
  const viewport = slide.querySelector<HTMLElement>(
    "[data-radix-scroll-area-viewport]",
  );
  if (!viewport) return null;

  const byId = viewport.querySelector<HTMLElement>(
    `#${CSS.escape(headingSlug)}`,
  );
  if (byId) return byId;

  return viewport.querySelector<HTMLElement>(
    `[data-heading-slug="${CSS.escape(headingSlug)}"]`,
  );
}

export function scrollViewportToHeading(
  viewport: HTMLElement,
  heading: HTMLElement,
  behavior: ScrollBehavior = "instant",
): void {
  const viewportRect = viewport.getBoundingClientRect();
  const headingRect = heading.getBoundingClientRect();
  const top = viewport.scrollTop + (headingRect.top - viewportRect.top) - 24;

  viewport.scrollTo({
    top: Math.max(0, top),
    behavior,
  });
}

export function findMessageInViewport(
  viewport: HTMLElement,
  messageId: string,
): HTMLElement | null {
  return viewport.querySelector<HTMLElement>(
    `[data-message-id="${CSS.escape(messageId)}"]`,
  );
}

export function scrollViewportToMessage(
  viewport: HTMLElement,
  messageId: string,
  behavior: ScrollBehavior = "smooth",
): boolean {
  const message = findMessageInViewport(viewport, messageId);
  if (!message) return false;

  viewport.scrollTo({
    top: Math.max(0, message.offsetTop - 12),
    behavior,
  });
  return true;
}

export function isSlideHorizontallyCentered(
  wrap: HTMLElement,
  slide: HTMLElement,
  tolerance = 32,
): boolean {
  const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
  const viewportCenter = wrap.scrollLeft + wrap.clientWidth / 2;
  return Math.abs(slideCenter - viewportCenter) < tolerance;
}