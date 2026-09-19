/**
 * OpenAI provider wrapper — server-side ONLY. The API key never reaches the browser.
 * All calls are validated with Zod and have deterministic fallbacks upstream.
 */
import type { ZodSchema } from "zod";

export type ProviderMode = "openai" | "offline-engine";

export function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 10);
}

/** Resolves the effective AI provider (auto → OpenAI when a key exists). */
export function resolveProvider(): ProviderMode {
  const configured = (process.env.AI_PROVIDER ?? "auto").toLowerCase();
  if (configured === "offline" || configured === "offline-engine") return "offline-engine";
  if (configured === "openai") return hasOpenAIKey() ? "openai" : "offline-engine";
  return hasOpenAIKey() ? "openai" : "offline-engine";
}

export function aiModel() {
  return process.env.AI_MODEL?.trim() || "gpt-4o-mini";
}

type ChatArgs = {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
};

type ChatSuccess = { ok: true; content: string; model: string };
type ChatFailure = { ok: false; error: string; retryable: boolean };

async function callOpenAI(args: ChatArgs, jsonMode: boolean): Promise<ChatSuccess | ChatFailure> {
  if (!hasOpenAIKey()) {
    return { ok: false, error: "OPENAI_API_KEY is not configured.", retryable: false };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs ?? 30_000);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: aiModel(),
        temperature: args.temperature ?? 0.7,
        max_tokens: args.maxTokens ?? 2000,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const retryable = response.status === 429 || response.status >= 500;
      return {
        ok: false,
        error: `AI request failed (HTTP ${response.status}). ${text.slice(0, 300)}`,
        retryable,
      };
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      model?: string;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) return { ok: false, error: "AI returned an empty response.", retryable: true };
    return { ok: true, content, model: payload.model ?? aiModel() };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI error";
    const aborted = message.toLowerCase().includes("abort");
    return {
      ok: false,
      error: aborted ? "AI request timed out. Please retry." : `AI request error: ${message}`,
      retryable: true,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Requests structured JSON and validates it before returning. */
export async function chatJson<T>(
  args: ChatArgs,
  schema: ZodSchema<T>,
): Promise<{ ok: true; data: T; model: string } | { ok: false; error: string; retryable: boolean }> {
  const result = await callOpenAI(args, true);
  if (!result.ok) return result;
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(result.content));
  } catch {
    return { ok: false, error: "AI returned malformed JSON.", retryable: true };
  }
  const validated = schema.safeParse(parsed);
  if (!validated.success) {
    console.warn("[ai] output failed schema validation", validated.error.issues.slice(0, 5));
    return { ok: false, error: "AI output did not match the expected structure.", retryable: true };
  }
  return { ok: true, data: validated.data, model: result.model };
}

/** Requests plain text (short summaries, follow-up probes). */
export async function chatText(
  args: ChatArgs,
): Promise<{ ok: true; content: string; model: string } | { ok: false; error: string; retryable: boolean }> {
  const result = await callOpenAI(args, false);
  if (!result.ok) return result;
  return { ok: true, content: stripCodeFence(result.content).trim(), model: result.model };
}

function stripCodeFence(content: string) {
  return content
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
}