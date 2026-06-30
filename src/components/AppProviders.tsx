"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { KeybindingsProvider } from "@/lib/keybindings/KeybindingsProvider";
import { GlobalKeybindings } from "@/components/GlobalKeybindings";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <KeybindingsProvider>
        <GlobalKeybindings />
        {children}
      </KeybindingsProvider>
    </ThemeProvider>
  );
}