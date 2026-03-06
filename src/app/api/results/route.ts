import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { PersonalityState } from "@/types/quiz";

async function callWithFallback(apiKey: string | undefined, fn: (client: OpenAI) => Promise<unknown>) {
  if (apiKey) {
    try {
      return await fn(new OpenAI({ apiKey }));
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status !== 401 && status !== 403) throw err;
    }
  }
  return fn(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));
}

const SYSTEM_PROMPT = `You are a personality psychologist writing the final results of an MBTI visual personality assessment. You have access to the full history of a person's image choices and the personality signals derived from them.

Your job is to:
1. Determine the final MBTI type (e.g., "INFP", "ESTJ") based on the signals:
   - EI: negative = I, positive = E
   - SN: negative = S, positive = N
   - TF: negative = T, positive = F
   - JP: negative = J, positive = P

2. Write a rich, personalized paragraph (4-6 sentences) that:
   - References specific choices the person made during the quiz
   - Connects their visual preferences to their personality type
   - Feels insightful and personal, not generic
   - Uses warm, affirming language without being saccharine

3. Provide a trait breakdown with labels and scores for each axis.

Respond with valid JSON only, no markdown:
{
  "type": "XXXX",
  "paragraph": "Your personalized description...",
  "traitBreakdown": {
    "EI": { "label": "Extraversion/Introversion", "score": 0 },
    "SN": { "label": "Sensing/Intuition", "score": 0 },
    "TF": { "label": "Thinking/Feeling", "score": 0 },
    "JP": { "label": "Judging/Perceiving", "score": 0 }
  }
}`;

async function generateResults(model: string, userMessage: string, apiKey?: string) {
  const completion = await callWithFallback(apiKey, (client) => client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    temperature: 0.8,
    max_tokens: 800,
  })) as OpenAI.Chat.Completions.ChatCompletion;
  const content = completion.choices[0].message.content || "";
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(cleaned);
}

export async function POST(request: Request) {
  try {
    const { state, apiKey } = (await request.json()) as { state: PersonalityState; apiKey?: string };

    const choicesSummary = state.choices
      .map(
        (c, i) =>
          `Round ${i + 1}: Scene: "${c.scene}" | Chose: "${c.imageDescription}" | Insight: ${c.interpretation}`
      )
      .join("\n");

    const userMessage = `Final personality signals:
- EI: ${state.signals.EI.toFixed(3)} (confidence: ${state.confidence.EI.toFixed(3)})
- SN: ${state.signals.SN.toFixed(3)} (confidence: ${state.confidence.SN.toFixed(3)})
- TF: ${state.signals.TF.toFixed(3)} (confidence: ${state.confidence.TF.toFixed(3)})
- JP: ${state.signals.JP.toFixed(3)} (confidence: ${state.confidence.JP.toFixed(3)})

Complete choice history:
${choicesSummary}

Based on all of this data, determine the MBTI type, write a personalized paragraph that references their actual choices, and provide the trait breakdown.`;

    // Try models in order of preference
    const models = ["gpt-5.4", "gpt-4.5-preview", "gpt-4o"];
    let lastError: unknown;
    for (const model of models) {
      try {
        const results = await generateResults(model, userMessage, apiKey);
        return NextResponse.json(results);
      } catch (err) {
        console.error(`Results error with ${model}:`, err);
        lastError = err;
      }
    }

    throw lastError;
  } catch (error) {
    console.error("Results error:", error);
    return NextResponse.json(
      { error: "Failed to generate results" },
      { status: 500 }
    );
  }
}