"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { KeybindingsManager } from "./KeybindingsManager";
import type { Keybinding, KeybindingScope } from "./types";

type KeybindingsContextValue = {
  register: (scope: KeybindingScope, binding: Keybinding) => () => void;
};

const KeybindingsContext = createContext<KeybindingsContextValue | null>(null);

export function KeybindingsProvider({ children }: { children: ReactNode }) {
  const managerRef = useRef(new KeybindingsManager());

  const register = useCallback(
    (scope: KeybindingScope, binding: Keybinding) =>
      managerRef.current.register(scope, binding),
    [],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      managerRef.current.dispatch(event);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(() => ({ register }), [register]);

  return (
    <KeybindingsContext.Provider value={value}>
      {children}
    </KeybindingsContext.Provider>
  );
}

export function useKeybindingsContext() {
  const ctx = useContext(KeybindingsContext);
  if (!ctx) {
    throw new Error("useKeybindingsContext must be used within KeybindingsProvider");
  }
  return ctx;
}