import { isOverlayOpen, isTypingTarget, matchKey } from "./match";
import type { Keybinding, KeybindingScope, RegisteredBindings } from "./types";

const SCOPE_PRIORITY: KeybindingScope[] = [
  "composer",
  "main-menu",
  "chat",
  "global",
];

const SEQUENCE_WINDOW_MS = 400;

export class KeybindingsManager {
  private bindings: RegisteredBindings = new Map();
  private lastSequence: { chord: string; at: number } | null = null;

  register(scope: KeybindingScope, binding: Keybinding): () => void {
    const list = this.bindings.get(scope) ?? [];
    list.push(binding);
    this.bindings.set(scope, list);

    return () => {
      const current = this.bindings.get(scope) ?? [];
      this.bindings.set(
        scope,
        current.filter((item) => item.id !== binding.id),
      );
    };
  }

  dispatch(event: KeyboardEvent): boolean {
    if (isOverlayOpen()) return false;

    const typing = isTypingTarget(event.target);
    const scopes = this.orderedScopes(typing);

    for (const scope of scopes) {
      const list = this.bindings.get(scope) ?? [];
      for (const binding of list) {
        if (binding.requireTypingTarget && !typing) continue;
        if (!binding.allowInTypingTarget && typing && scope !== "composer") {
          continue;
        }

        if (binding.when && !binding.when()) continue;

        if (binding.sequence) {
          if (!matchKey(event, binding.chord)) continue;
          const now = Date.now();
          const prev = this.lastSequence;
          if (
            !prev ||
            prev.chord !== binding.sequence ||
            now - prev.at > SEQUENCE_WINDOW_MS
          ) {
            this.lastSequence = { chord: binding.chord, at: now };
            continue;
          }
          this.lastSequence = null;
        } else if (!matchKey(event, binding.chord)) {
          continue;
        }

        if (binding.preventDefault !== false) {
          event.preventDefault();
        }
        binding.handler(event);
        return true;
      }
    }

    if (matchKey(event, "arrowleft") || matchKey(event, "arrowright")) {
      this.lastSequence = null;
    }

    return false;
  }

  private orderedScopes(typing: boolean): KeybindingScope[] {
    if (typing) {
      return ["composer", "chat", "global"];
    }
    return SCOPE_PRIORITY;
  }
}