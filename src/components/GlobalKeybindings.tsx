"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useKeybindings } from "@/hooks/useKeybindings";
import type { Keybinding } from "@/lib/keybindings/types";

export function GlobalKeybindings() {
  const router = useRouter();

  const bindings = useMemo<Keybinding[]>(
    () => [
      {
        id: "main-menu",
        chord: "alt+m",
        scope: "global",
        handler: () => router.push("/"),
      },
    ],
    [router],
  );

  useKeybindings("global", bindings);

  return null;
}