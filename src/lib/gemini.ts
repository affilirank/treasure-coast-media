import "server-only";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

type GeminiPart = { text?: string };

/** Minimal Gemini generateContent call that returns the first text part. */
export async function geminiGenerate(prompt: string, options: { system?: string; json?: boolean } = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini is not configured.");

  const body = {
    ...(options.system ? { system_instruction: { parts: [{ text: options.system }] } } : {}),
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      ...(options.json ? { responseMimeType: "application/json" } : {}),
    },
  };

  const response = await fetch(`${ENDPOINT}/${MODEL}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  const result = (await response.json()) as {
    candidates?: { content?: { parts?: GeminiPart[] } }[];
    error?: { message?: string };
  };
  if (!response.ok || result.error) throw new Error(result.error?.message ?? "Gemini request failed.");

  const text = (result.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("").trim();
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}
