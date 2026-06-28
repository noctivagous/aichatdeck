import type { ModelOption } from "../types";

export type ProviderTestResult =
  | { ok: true; models: ModelOption[] }
  | { ok: false; error: string };