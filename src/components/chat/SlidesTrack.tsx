"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useKeybindings } from "@/hooks/useKeybindings";
import type { Keybinding } from "@/lib/keybindings/types";
import type { PageView } from "@/lib/types";
import { PageCard } from "./PageCard";
import { Minimap } from "./Minimap";
import { Composer } from "./Composer";
import { ScrollShortcutHint } from "./ScrollShortcutHint";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { totalTokens } from "@/lib/tokens";
import { slideEdgeGutter } from "@/lib/page-width";
import { formatShortcut, keyBadgeClass } from "@/lib/keybindings/match";
import {
  findHeadingInSlide,
  scrollViewportToHeading,
} from "@/lib/scroll-to-heading";
import type { PageColumnCount } from "@/lib/page-columns";
import type { ReplyFontScaleId } from "@/lib/reply-font-size";
import type { ReplyLineHeightId } from "@/lib/reply-line-height";
type SlidesTrackProps = {
  pages: PageView[];
  pageWidth: number;
  columnCount: PageColumnCount;
  fontScale: ReplyFontScaleId;
  lineHeight: ReplyLineHeightId;
  isStreaming: boolean;
  streamingMessageId?: string;
  composerValue: string;
  onComposerChange: (value: string) => void;
  onSend: () => void;
  onSendToNewPage?: () => void;
  onStop: () => void;
  onAttach: (files: FileList) => void;
  disabled?: boolean;
  initialFocusedPageIndex: number;
  onFocusedPageChange: (index: number) => void;
  centerNewPages: boolean;
  onCenterNewPagesChange: (enabled: boolean) => void;
};

export type SlidesTrackHandle = {
  focusPage: (index: number, headingSlug?: string) => void;
};

export const SlidesTrack = forwardRef<SlidesTrackHandle, SlidesTrackProps>(
  function SlidesTrack({
  pages,
  pageWidth,
  columnCount,
  fontScale,
  lineHeight,
  isStreaming,
  streamingMessageId,
  composerValue,
  onComposerChange,
  onSend,
  onSendToNewPage,
  onStop,
  onAttach,
  disabled,
  initialFocusedPageIndex,
  onFocusedPageChange,
  centerNewPages,
  onCenterNewPagesChange,
}, ref) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const pendingCenterNewPage = useRef(false);
  const prevPageCountRef = useRef(pages.length);
  const restoredFocusRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hoveredSlideIndex, setHoveredSlideIndex] = useState<number | null>(null);
  const [composerFocused, setComposerFocused] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const [edgeGutter, setEdgeGutter] = useState(0);
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const isStreamingRef = useRef(isStreaming);
  isStreamingRef.current = isStreaming;
  const programmaticFocusRef = useRef<number | null>(null);
  const hoveredSlideIndexRef = useRef(hoveredSlideIndex);
  hoveredSlideIndexRef.current = hoveredSlideIndex;
  const headingScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const isSlideCentered = useCallback(
    (wrap: HTMLElement, slide: HTMLElement) => {
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      const viewportCenter = wrap.scrollLeft + wrap.clientWidth / 2;
      return Math.abs(slideCenter - viewportCenter) < 24;
    },
    [],
  );

  const scrollSlideToCenter = useCallback(
    (wrap: HTMLElement, slide: HTMLElement, smooth: boolean) => {
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      const targetLeft = slideCenter - wrap.clientWidth / 2;
      const maxLeft = Math.max(0, wrap.scrollWidth - wrap.clientWidth);
      wrap.scrollTo({
        left: Math.max(0, Math.min(targetLeft, maxLeft)),
        behavior: smooth ? "smooth" : "instant",
      });
    },
    [],
  );

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const updateGutter = () => {
      setEdgeGutter(slideEdgeGutter(wrap.clientWidth, pageWidth));
    };

    updateGutter();
    const observer = new ResizeObserver(updateGutter);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [pageWidth]);

  useEffect(() => {
    if (edgeGutter <= 0 || pages.length === 0 || isStreamingRef.current) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const slides = wrap.querySelectorAll<HTMLElement>(".slide");
    const target = slides[currentIndexRef.current];
    if (target) scrollSlideToCenter(wrap, target, false);
  }, [edgeGutter, pages.length, scrollSlideToCenter]);

  const livePageIndex = pages.findIndex((page) => !page.sealed);
  const hasLivePage = livePageIndex >= 0;
  const isLive = hasLivePage && currentIndex === livePageIndex;

  const focusPage = useCallback(
    (index: number, smooth = true) => {
      const clamped = Math.min(Math.max(0, index), Math.max(0, pages.length - 1));
      programmaticFocusRef.current = clamped;
      setCurrentIndex(clamped);
      currentIndexRef.current = clamped;
      onFocusedPageChange(clamped);
      if (hasLivePage && clamped === livePageIndex) setUnseenCount(0);

      const wrap = wrapRef.current;
      if (!wrap) return;

      const slides = wrap.querySelectorAll<HTMLElement>(".slide");
      const target = slides[clamped];
      if (!target) return;

      scrollSlideToCenter(wrap, target, smooth);
      if (!smooth && isSlideCentered(wrap, target)) {
        programmaticFocusRef.current = null;
      }
    },
    [
      hasLivePage,
      isSlideCentered,
      livePageIndex,
      onFocusedPageChange,
      pages.length,
      scrollSlideToCenter,
    ],
  );

  const scrollToHeadingInSlide = useCallback(
    (pageIndex: number, headingSlug: string) => {
      const wrap = wrapRef.current;
      if (!wrap) return false;

      const slides = wrap.querySelectorAll<HTMLElement>(".slide");
      const slide = slides[pageIndex];
      if (!slide) return false;

      const heading = findHeadingInSlide(slide, headingSlug);
      if (!heading) return false;

      const viewport = slide.querySelector<HTMLElement>(
        "[data-radix-scroll-area-viewport]",
      );
      if (!viewport) return false;

      scrollViewportToHeading(viewport, heading, "instant");
      return true;
    },
    [],
  );

  const scheduleHeadingScroll = useCallback(
    (pageIndex: number, headingSlug: string) => {
      if (headingScrollTimerRef.current) {
        clearTimeout(headingScrollTimerRef.current);
        headingScrollTimerRef.current = null;
      }

      let attempts = 0;
      const poll = () => {
        if (scrollToHeadingInSlide(pageIndex, headingSlug)) return;
        if (attempts++ < 80) {
          headingScrollTimerRef.current = setTimeout(poll, 50);
        }
      };

      requestAnimationFrame(() => requestAnimationFrame(poll));
    },
    [scrollToHeadingInSlide],
  );

  useEffect(
    () => () => {
      if (headingScrollTimerRef.current) {
        clearTimeout(headingScrollTimerRef.current);
      }
    },
    [],
  );

  const focusPageWithHeading = useCallback(
    (index: number, headingSlug?: string) => {
      if (headingSlug) {
        focusPage(index, false);
        scheduleHeadingScroll(index, headingSlug);
        return;
      }
      focusPage(index, true);
    },
    [focusPage, scheduleHeadingScroll],
  );

  useImperativeHandle(
    ref,
    () => ({
      focusPage: focusPageWithHeading,
    }),
    [focusPageWithHeading],
  );

  const liveMessageCount = hasLivePage
    ? (pages[livePageIndex]?.messages.length ?? 0)
    : 0;
  const prevLiveCount = useRef(liveMessageCount);

  useEffect(() => {
    if (isLive) {
      prevLiveCount.current = liveMessageCount;
      return;
    }
    if (hasLivePage && liveMessageCount > prevLiveCount.current) {
      setUnseenCount((count) => count + (liveMessageCount - prevLiveCount.current));
    }
    prevLiveCount.current = liveMessageCount;
  }, [hasLivePage, isLive, liveMessageCount]);

  useEffect(() => {
    if (pages.length === 0) return;
    if (currentIndex > pages.length - 1) {
      focusPage(pages.length - 1, false);
    }
  }, [currentIndex, focusPage, pages.length]);

  useEffect(() => {
    if (restoredFocusRef.current || pages.length === 0) return;
    const index = Math.min(
      Math.max(0, initialFocusedPageIndex),
      pages.length - 1,
    );
    focusPage(index, false);
    restoredFocusRef.current = true;
  }, [pages.length, initialFocusedPageIndex, focusPage]);

  const centerNewPagesRef = useRef(centerNewPages);
  centerNewPagesRef.current = centerNewPages;
  const focusPageRef = useRef(focusPage);
  focusPageRef.current = focusPage;
  const hasLivePageRef = useRef(hasLivePage);
  hasLivePageRef.current = hasLivePage;
  const livePageIndexRef = useRef(livePageIndex);
  livePageIndexRef.current = livePageIndex;

  useEffect(() => {
    const pageCountIncreased = pages.length > prevPageCountRef.current;
    prevPageCountRef.current = pages.length;

    if (!centerNewPagesRef.current) return;

    if (pageCountIncreased) {
      focusPageRef.current(pages.length - 1, true);
      pendingCenterNewPage.current = false;
      return;
    }

    if (
      pendingCenterNewPage.current &&
      hasLivePageRef.current &&
      liveMessageCount > 0
    ) {
      focusPageRef.current(livePageIndexRef.current, true);
      pendingCenterNewPage.current = false;
    }
  }, [pages.length, liveMessageCount]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const syncIndexFromScroll = () => {
      const lockedIndex = programmaticFocusRef.current;
      if (lockedIndex !== null) {
        const slides = wrap.querySelectorAll<HTMLElement>(".slide");
        const target = slides[lockedIndex];
        if (target && !isSlideCentered(wrap, target)) {
          return;
        }
        programmaticFocusRef.current = null;
      }

      const slides = [...wrap.querySelectorAll<HTMLElement>(".slide")];
      const center = wrap.scrollLeft + wrap.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      slides.forEach((slide, index) => {
        const distance = Math.abs(
          slide.offsetLeft + slide.offsetWidth / 2 - center,
        );
        if (distance < bestDist) {
          bestDist = distance;
          best = index;
        }
      });

      if (best === currentIndexRef.current) return;
      currentIndexRef.current = best;
      setCurrentIndex(best);
      onFocusedPageChange(best);
    };

    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(syncIndexFromScroll, 80);
    };

    const onScrollEnd = () => {
      clearTimeout(timer);
      syncIndexFromScroll();
    };

    wrap.addEventListener("scroll", onScroll, { passive: true });
    wrap.addEventListener("scrollend", onScrollEnd, { passive: true });
    return () => {
      clearTimeout(timer);
      wrap.removeEventListener("scroll", onScroll);
      wrap.removeEventListener("scrollend", onScrollEnd);
    };
  }, [isSlideCentered, onFocusedPageChange, pages.length]);

  const scrollSlideContent = useCallback((delta: number) => {
    const index =
      hoveredSlideIndexRef.current ?? currentIndexRef.current;

    const wrap = wrapRef.current;
    if (!wrap) return;

    const slide = wrap.querySelector<HTMLElement>(
      `.slide[data-page-index="${index}"]`,
    );
    if (!slide) return;

    const viewport = slide.querySelector<HTMLElement>(
      "[data-radix-scroll-area-viewport]",
    );
    if (!viewport) return;

    viewport.scrollTop = Math.max(
      0,
      Math.min(
        viewport.scrollTop + delta,
        viewport.scrollHeight - viewport.clientHeight,
      ),
    );
  }, []);

  const scrollSlideContentByPage = useCallback((direction: 1 | -1) => {
    const index =
      hoveredSlideIndexRef.current ?? currentIndexRef.current;

    const wrap = wrapRef.current;
    if (!wrap) return;

    const slide = wrap.querySelector<HTMLElement>(
      `.slide[data-page-index="${index}"]`,
    );
    if (!slide) return;

    const viewport = slide.querySelector<HTMLElement>(
      "[data-radix-scroll-area-viewport]",
    );
    if (!viewport) return;

    scrollSlideContent(direction * viewport.clientHeight);
  }, [scrollSlideContent]);

  const chatBindings = useMemo<Keybinding[]>(
    () => [
      {
        id: "main-menu-double-left",
        chord: "arrowleft",
        scope: "chat",
        sequence: "arrowleft",
        when: () => currentIndexRef.current === 0,
        handler: () => router.push("/"),
      },
      {
        id: "slide-prev",
        chord: "arrowleft",
        scope: "chat",
        handler: () => {
          focusPage(Math.max(0, currentIndexRef.current - 1), false);
        },
      },
      {
        id: "slide-next",
        chord: "arrowright",
        scope: "chat",
        handler: () => {
          focusPage(
            Math.min(pages.length - 1, currentIndexRef.current + 1),
            false,
          );
        },
      },
      {
        id: "slide-prev-alt",
        chord: "alt+arrowleft",
        scope: "chat",
        allowInTypingTarget: true,
        handler: () => {
          focusPage(Math.max(0, currentIndexRef.current - 1), false);
        },
      },
      {
        id: "slide-next-alt",
        chord: "alt+arrowright",
        scope: "chat",
        allowInTypingTarget: true,
        handler: () => {
          focusPage(
            Math.min(pages.length - 1, currentIndexRef.current + 1),
            false,
          );
        },
      },
      {
        id: "slide-scroll-up",
        chord: "arrowup",
        scope: "chat",
        handler: () => scrollSlideContent(-80),
      },
      {
        id: "slide-scroll-down",
        chord: "arrowdown",
        scope: "chat",
        handler: () => scrollSlideContent(80),
      },
      {
        id: "slide-scroll-up-shift",
        chord: "shift+arrowup",
        scope: "chat",
        allowInTypingTarget: true,
        requireTypingTarget: true,
        handler: () => scrollSlideContent(-80),
      },
      {
        id: "slide-scroll-down-shift",
        chord: "shift+arrowdown",
        scope: "chat",
        allowInTypingTarget: true,
        requireTypingTarget: true,
        handler: () => scrollSlideContent(80),
      },
      {
        id: "slide-scroll-page-up",
        chord: "pageup",
        scope: "chat",
        handler: () => scrollSlideContentByPage(-1),
      },
      {
        id: "slide-scroll-page-down",
        chord: "pagedown",
        scope: "chat",
        handler: () => scrollSlideContentByPage(1),
      },
      {
        id: "slide-scroll-page-up-shift",
        chord: "shift+pageup",
        scope: "chat",
        allowInTypingTarget: true,
        requireTypingTarget: true,
        handler: () => scrollSlideContentByPage(-1),
      },
      {
        id: "slide-scroll-page-down-shift",
        chord: "shift+pagedown",
        scope: "chat",
        allowInTypingTarget: true,
        requireTypingTarget: true,
        handler: () => scrollSlideContentByPage(1),
      },
    ],
    [focusPage, pages.length, router, scrollSlideContent, scrollSlideContentByPage],
  );

  useKeybindings("chat", chatBindings);

  const allMessages = pages.flatMap((page) => page.messages);
  const tokenTotal = totalTokens(allMessages);

  return (
    <>
      <main className="relative min-h-0 flex-1 overflow-hidden bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.08),_transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.12),_transparent_60%)]">
        <div
          ref={wrapRef}
          className="overflow-scrollbar absolute inset-0 snap-x snap-proximity overflow-x-auto overflow-y-hidden scroll-smooth"
        >
          <div className="flex h-full w-max min-w-full items-center gap-5 md:gap-8">
            <div className="shrink-0" style={{ width: edgeGutter }} aria-hidden />
            {currentIndex === 0 ? (
              <div className="flex h-[min(680px,calc(100%-16px))] w-[11rem] shrink-0 items-start sm:w-[13rem]">
                <aside
                  className="pointer-events-none w-full rounded-xl border border-zinc-200/50 bg-white/40 px-3 py-2.5 text-[11px] leading-snug text-zinc-500 shadow-sm backdrop-blur-md dark:border-zinc-700/45 dark:bg-zinc-950/35 dark:text-zinc-400 sm:text-xs"
                  aria-hidden
                >
                  Press{" "}
                  <kbd className={keyBadgeClass}>
                    {formatShortcut("arrowleft")}
                  </kbd>{" "}
                  twice or{" "}
                  <kbd className={keyBadgeClass}>
                    {formatShortcut("alt+m")}
                  </kbd>{" "}
                  to return to the main menu.
                </aside>
              </div>
            ) : null}
            {pages.map((page) => (
              <PageCard
                key={page.index}
                page={page}
                widthPx={pageWidth}
                columnCount={columnCount}
                fontScale={fontScale}
                lineHeight={lineHeight}
                isLive={hasLivePage && page.index === livePageIndex}
                isFocused={currentIndex === page.index}
                composerFocused={composerFocused}
                isStreaming={isStreaming && hasLivePage && page.index === livePageIndex}
                streamingMessageId={
                  hasLivePage && page.index === livePageIndex
                    ? streamingMessageId
                    : undefined
                }
                onFocus={() => focusPage(page.index, true)}
                onHoverStart={() => setHoveredSlideIndex(page.index)}
                onHoverEnd={() =>
                  setHoveredSlideIndex((current) =>
                    current === page.index ? null : current,
                  )
                }
              />
            ))}
            <div className="shrink-0" style={{ width: edgeGutter }} aria-hidden />
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute left-4 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 rounded-full bg-white/90 shadow-lg backdrop-blur lg:grid dark:bg-zinc-900/90"
          onClick={() => focusPage(Math.max(0, currentIndex - 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute right-4 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 rounded-full bg-white/90 shadow-lg backdrop-blur lg:grid dark:bg-zinc-900/90"
          onClick={() => focusPage(Math.min(pages.length - 1, currentIndex + 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        {hasLivePage && !isLive ? (
          <button
            type="button"
            onClick={() => focusPage(livePageIndex, true)}
            className="absolute bottom-6 right-4 z-30 flex h-10 items-center gap-1.5 rounded-full bg-zinc-900 px-3.5 text-[13px] font-medium text-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] transition hover:translate-y-[-1px] dark:bg-white dark:text-zinc-900 md:right-6"
          >
            <span>
              {unseenCount > 0
                ? `Jump to Live • ${unseenCount} new`
                : "Jump to Live"}
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </button>
        ) : null}
      </main>

      <footer className="shrink-0 border-t border-zinc-200/70 bg-white/85 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/85">
        <div className="flex h-[42px] items-center justify-between gap-3 border-b border-zinc-200/50 px-3 dark:border-zinc-800/80 md:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Minimap
              pages={pages}
              currentIndex={currentIndex}
              onSelect={(index) => focusPage(index, true)}
            />
            <div className="ml-1 hidden items-center gap-1.5 border-l border-zinc-200 pl-2 text-[11px] text-zinc-500 dark:border-zinc-800 sm:flex">
              <ScrollShortcutHint composerFocused={composerFocused} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!isLive && unseenCount > 0 ? (
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-medium text-white">
                {unseenCount} new
              </span>
            ) : null}
            <span className="text-[11px] tabular-nums text-zinc-500">
              ~{(tokenTotal / 1000).toFixed(1)}k tokens
            </span>
          </div>
        </div>

        <div className="p-3 md:p-3.5">
          <Composer
            value={composerValue}
            onChange={onComposerChange}
            centerNewPages={centerNewPages}
            onCenterNewPagesChange={onCenterNewPagesChange}
            onFocusChange={setComposerFocused}
            onSend={() => {
              if (hasLivePage && !isLive) focusPage(livePageIndex, true);
              onSend();
            }}
            onSendToNewPage={() => {
              if (centerNewPages) pendingCenterNewPage.current = true;
              onSendToNewPage?.();
            }}
            onStop={onStop}
            onAttach={onAttach}
            isStreaming={isStreaming}
            disabled={disabled}
          />
        </div>
      </footer>
    </>
  );
});

SlidesTrack.displayName = "SlidesTrack";