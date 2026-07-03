"use client";

import { useEffect, type RefObject } from "react";
import {
  horizontalWheelDelta,
  isAtHorizontalScrollStart,
  SLIDE_BACK_GESTURE_COOLDOWN_MS,
  SLIDE_BACK_SWIPE_THRESHOLD,
  SLIDE_BACK_WHEEL_ACCUM_WINDOW_MS,
  SLIDE_BACK_WHEEL_THRESHOLD,
} from "@/lib/slide-back-gesture";

type UseSlideBackGestureArgs = {
  wrapRef: RefObject<HTMLDivElement | null>;
  currentIndexRef: RefObject<number>;
  onBack: () => void;
};

function isEventOnFirstSlide(event: Event, wrap: HTMLElement): boolean {
  const firstSlide = wrap.querySelector<HTMLElement>(".slide");
  if (!firstSlide) return false;

  const target = event.target;
  return target instanceof Node && firstSlide.contains(target);
}

export function useSlideBackGesture({
  wrapRef,
  currentIndexRef,
  onBack,
}: UseSlideBackGestureArgs) {
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    let wheelAccum = 0;
    let lastWheelAt = 0;
    let lastBackAt = 0;
    let touchStart: { x: number; y: number } | null = null;

    const canGoBack = () => {
      if (Date.now() - lastBackAt < SLIDE_BACK_GESTURE_COOLDOWN_MS) return false;
      if (currentIndexRef.current !== 0) return false;
      return isAtHorizontalScrollStart(wrap.scrollLeft);
    };

    const triggerBack = () => {
      if (!canGoBack()) return;
      lastBackAt = Date.now();
      wheelAccum = 0;
      onBack();
    };

    const onWheel = (event: WheelEvent) => {
      if (currentIndexRef.current !== 0) {
        wheelAccum = 0;
        return;
      }

      if (!isEventOnFirstSlide(event, wrap)) {
        wheelAccum = 0;
        return;
      }

      const delta = horizontalWheelDelta(event);
      if (delta >= 0) {
        wheelAccum = 0;
        return;
      }

      if (!isAtHorizontalScrollStart(wrap.scrollLeft)) {
        wheelAccum = 0;
        return;
      }

      const now = Date.now();
      if (now - lastWheelAt > SLIDE_BACK_WHEEL_ACCUM_WINDOW_MS) {
        wheelAccum = 0;
      }
      lastWheelAt = now;
      wheelAccum += delta;

      if (wheelAccum <= -SLIDE_BACK_WHEEL_THRESHOLD) {
        event.preventDefault();
        triggerBack();
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      if (currentIndexRef.current !== 0) return;
      if (!isEventOnFirstSlide(event, wrap)) return;
      const touch = event.touches[0];
      if (!touch) return;
      touchStart = { x: touch.clientX, y: touch.clientY };
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!touchStart || currentIndexRef.current !== 0) return;
      if (!isAtHorizontalScrollStart(wrap.scrollLeft)) {
        touchStart = null;
        return;
      }

      const touch = event.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - touchStart.x;
      const dy = touch.clientY - touchStart.y;
      touchStart = null;

      if (dx < SLIDE_BACK_SWIPE_THRESHOLD) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.2) return;

      triggerBack();
    };

    wrap.addEventListener("wheel", onWheel, { passive: false });
    wrap.addEventListener("touchstart", onTouchStart, { passive: true });
    wrap.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      wrap.removeEventListener("wheel", onWheel);
      wrap.removeEventListener("touchstart", onTouchStart);
      wrap.removeEventListener("touchend", onTouchEnd);
    };
  }, [wrapRef, currentIndexRef, onBack]);
}