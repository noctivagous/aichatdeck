"use client";

import { startTransition } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export type ViewTransitionDirection = "forward" | "back";

function withDirectionalViewTransition(
  direction: ViewTransitionDirection,
  update: () => void,
) {
  if (typeof document === "undefined" || !document.startViewTransition) {
    update();
    return;
  }

  const root = document.documentElement;
  const previousDirection = root.dataset.vtDirection;
  root.dataset.vtDirection = direction;

  document.startViewTransition(update).finished.finally(() => {
    if (previousDirection) {
      root.dataset.vtDirection = previousDirection;
      return;
    }
    delete root.dataset.vtDirection;
  });
}

export function pushWithViewTransition(
  router: AppRouterInstance,
  href: string,
  direction: ViewTransitionDirection = "forward",
) {
  withDirectionalViewTransition(direction, () => {
    startTransition(() => {
      router.push(href);
    });
  });
}

export function replaceWithViewTransition(
  router: AppRouterInstance,
  href: string,
  direction: ViewTransitionDirection = "forward",
) {
  withDirectionalViewTransition(direction, () => {
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  });
}
