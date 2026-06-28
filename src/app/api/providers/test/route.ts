import { testProvider } from "@/lib/providers";
import { PROVIDER_IDS, type ProviderId } from "@/lib/types";

export const maxDuration = 30;

function readKey(req: Request, provider: ProviderId): string {
  const headers: Record<ProviderId, string> = {
    openai: "x-openai-key",
    anthropic: "x-anthropic-key",
    google: "x-google-key",
    openrouter: "x-openrouter-key",
    xai: "x-xai-key",
  };

  const header = headers[provider];
  const fromHeader = req.headers.get(header) ?? "";

  const envMap: Partial<Record<ProviderId, string | undefined>> = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    google: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    xai: process.env.XAI_API_KEY,
  };

  return fromHeader || envMap[provider] || "";
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    provider?: ProviderId;
    apiKey?: string;
  };
  const provider = body.provider;

  if (!provider || !PROVIDER_IDS.includes(provider)) {
    return Response.json({ ok: false, error: "Invalid provider" }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim() || readKey(req, provider);
  const result = await testProvider(provider, apiKey);

  return Response.json(result, { status: result.ok ? 200 : 400 });
}