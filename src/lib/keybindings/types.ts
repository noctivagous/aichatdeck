export type KeybindingScope = "global" | "chat" | "composer" | "main-menu";

export type KeyChord =
  | "enter"
  | "alt+enter"
  | "arrowleft"
  | "arrowright"
  | "arrowup"
  | "arrowdown"
  | "alt+arrowleft"
  | "alt+arrowright"
  | "alt+m";

export type Keybinding = {
  id: string;
  chord: KeyChord;
  scope: KeybindingScope;
  handler: (event: KeyboardEvent) => void;
  /** Allow when focus is in textarea/input/select/contenteditable */
  allowInTypingTarget?: boolean;
  /** Only fire when focus is in a typing target (composer scope) */
  requireTypingTarget?: boolean;
  /** Sequence binding: must follow previous chord within window */
  sequence?: KeyChord;
  /** Optional guard evaluated at dispatch time */
  when?: () => boolean;
  preventDefault?: boolean;
};

export type RegisteredBindings = Map<KeybindingScope, Keybinding[]>;