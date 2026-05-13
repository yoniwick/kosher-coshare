import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompt";
import { aiRecipeOutputSchema, type AiRecipeOutput } from "@/lib/validators/ai";

type GenerateArgs = {
  rawText: string;
  kosherCategory: "MEAT" | "DAIRY" | "PAREVE";
  specialBadges: Array<"NUT_FREE" | "PESACH" | "GLUTEN_FREE">;
  tags: string[];
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
    throw new Error("Model returned non-JSON output");
  }

  const validated = aiRecipeOutputSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error("Model JSON failed validation. Try again or edit manually.");
  }

  return validated.data;
}
