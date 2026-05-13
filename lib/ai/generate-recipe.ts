import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompt";
import { aiRecipeOutputSchema, type AiRecipeOutput } from "@/lib/validators/ai";

type GenerateArgs = {
  rawText: string;
  kosherCategory: "MEAT" | "DAIRY" | "PAREVE";
  specialBadges: Array<"NUT_FREE" | "PESACH" | "GLUTEN_FREE">;
};

export async function generateRecipeStructure(args: GenerateArgs): Promise<AiRecipeOutput> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const model = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";
  const referer = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": referer,
      "X-Title": "Kosher CoShare",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: buildUserPrompt(args),
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter error (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenRouter");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const t = content.trim();
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        parsed = JSON.parse(t.slice(start, end + 1));
      } catch {
        throw new Error("Model returned non-JSON output");
      }
    } else {
      throw new Error("Model returned non-JSON output");
    }
  }

  const validated = aiRecipeOutputSchema.safeParse(parsed);
  if (!validated.success) {
    const msg = validated.error.issues.map((i) => i.message).join("; ");
    throw new Error(
      msg ? `Model JSON failed validation: ${msg}` : "Model JSON failed validation. Try again or edit manually."
    );
  }

  return validated.data;
}
