"use client";

import { useEffect, useRef } from "react";
import { useKeybindingsContext } from "@/lib/keybindings/KeybindingsProvider";
import type { Keybinding, KeybindingScope } from "@/lib/keybindings/types";

export function useKeybindings(
  scope: KeybindingScope,
  bindings: Keybinding[],
) {
  const { register } = useKeybindingsContext();
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  useEffect(() => {
    const unsubs = bindingsRef.current.map((binding) =>
      register(scope, {
        ...binding,
        handler: (event) => {
          const current = bindingsRef.current.find((b) => b.id === binding.id);
          current?.handler(event);
        },
      }),
    );
    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [register, scope]);
}