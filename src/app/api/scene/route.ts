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
      // Invalid key — fall back to env key
    }
  }
  return fn(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));
}

const SYSTEM_PROMPT = [
  "You are a personality psychologist designing a visual MBTI quiz.",
  "Each round shows the user 4 images of THE SAME TYPE OF THING in different moods/styles, and asks which appeals most.",
  "The personality signal comes from which VERSION they prefer, not which subject.",
  "",
  "MBTI axes you are probing:",
  "- E/I: social energy, crowds vs solitude, stimulation vs quiet",
  "- S/N: concrete/literal vs abstract/symbolic, detail vs big picture",
  "- T/F: logic/structure vs emotion/warmth, systems vs people",
  "- J/P: order vs chaos, planned vs spontaneous, minimal vs maximalist",
  "",
  "Your job: pick ONE core subject (a single noun), then write 4 search queries that are all that same subject but with different personality-revealing attributes.",
  "All 4 images must be instantly recognizable as the same type of thing — the variation is ONLY in mood, style, or context.",
  "",
  "RULES for imageQueries:",
  "- All 4 queries share the same core noun (bedroom, cat, desk, street, forest, etc.)",
  "- Vary with adjectives that signal personality: busy/quiet, structured/wild, minimal/maximal, warm/cool",
  "- Each 2-4 words. The core noun must appear in every query.",
  "- GOOD: core='bedroom' → ['minimalist white bedroom', 'maximalist eclectic bedroom', 'cozy dark bedroom', 'bright airy bedroom']",
  "- GOOD: core='street' → ['empty foggy street', 'busy crowded street', 'colorful street market', 'quiet residential street']",
  "- GOOD: core='bookshelf' → ['neat organized bookshelf', 'overflowing chaotic bookshelf', 'sparse minimalist bookshelf', 'cozy reading bookshelf']",
  "- BAD: ['rooftop party', 'reading corner', 'farmers market', 'hiking trail'] — all DIFFERENT subjects, will look unrelated",
  "- BAD: ['mountain lake', 'ocean storm', 'forest stream', 'rain puddle'] — all different types of water, still look unrelated",
  "",
  "Respond with valid JSON only, no markdown:",
  "{",
  "  \"scene\": \"evocative 1-2 sentence question asking which version speaks to them\",",
  "  \"imageQueries\": [\"query1\", \"query2\", \"query3\", \"query4\"],",
  "  \"axis\": \"EI | SN | TF | JP\",",
  "  \"intent\": \"what each choice reveals — e.g. query1=E, query2=I, etc.\",",
  "  \"queryPoles\": [\"X\", \"X\", \"X\", \"X\"]",
  "}",
  "",
  "queryPoles must be a 4-element array where each element is the pole letter for the corresponding imageQuery.",
  "For EI: use 'E' or 'I'. For SN: use 'S' or 'N'. For TF: use 'T' or 'F'. For JP: use 'J' or 'P'.",
  "Aim for 2 images per pole (balanced split). Randomize which queries get which pole — do NOT always put the same pole first.",
  "",
  "Example:",
  "{",
  "  \"scene\": \"Four bedrooms, each a different world. Which one feels like yours?\",",
  "  \"imageQueries\": [\"maximalist eclectic bedroom\", \"minimalist white bedroom\", \"bright airy bedroom\", \"cozy dark bedroom\"],",
  "  \"axis\": \"JP\",",
  "  \"intent\": \"eclectic/cozy=P, minimalist/airy=J\",",
  "  \"queryPoles\": [\"P\", \"J\", \"J\", \"P\"]",
  "}"
].join("\n");

export async function POST(request: Request) {
  try {
    const { state, apiKey } = (await request.json()) as { state: PersonalityState; apiKey?: string };

    const lowestConfidenceAxis = Object.entries(state.confidence).sort(
      ([, a], [, b]) => a - b
    )[0][0];

    const userMessage = [
      "Current personality state:",
      `- Signals: EI=${state.signals.EI.toFixed(2)}, SN=${state.signals.SN.toFixed(2)}, TF=${state.signals.TF.toFixed(2)}, JP=${state.signals.JP.toFixed(2)}`,
      `- Confidence: EI=${state.confidence.EI.toFixed(2)}, SN=${state.confidence.SN.toFixed(2)}, TF=${state.confidence.TF.toFixed(2)}, JP=${state.confidence.JP.toFixed(2)}`,
      `- Turn: ${state.turn + 1} of 11`,
      `- Lowest confidence axis: ${lowestConfidenceAxis}`,
      `- Previous choices: ${state.choices.length > 0 ? state.choices.slice(-3).map((c) => c.interpretation).join("; ") : "None yet"}`,
      "",
      `Generate a scene targeting the ${lowestConfidenceAxis} axis. Pick ONE specific visual subject. Different from any previous scenes.`
    ].join("\n");

    const completion = await callWithFallback(apiKey, (client) => client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.9,
      max_tokens: 200,
    })) as OpenAI.Chat.Completions.ChatCompletion;

    const content = completion.choices[0].message.content || "";
    const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const scene = JSON.parse(cleaned);

    return NextResponse.json(scene);
  } catch (error) {
    console.error("Scene generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate scene" },
      { status: 500 }
    );
  }
}