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

const AXIS_POLES: Record<string, [string, string]> = {
  EI: ["E", "I"],
  SN: ["S", "N"],
  TF: ["T", "F"],
  JP: ["J", "P"],
};

// Returns a shuffled [poleA, poleB, poleA, poleB] array (exactly 2 of each)
function makeBalancedPoles(axis: string): string[] {
  const [a, b] = AXIS_POLES[axis] ?? ["X", "Y"];
  const poles = [a, b, a, b];
  // Fisher-Yates shuffle
  for (let i = poles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [poles[i], poles[j]] = [poles[j], poles[i]];
  }
  return poles;
}

function buildSystemPrompt(axis: string, requiredPoles: string[]): string {
  const [a, b] = AXIS_POLES[axis] ?? ["X", "Y"];
  return [
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
    `You are targeting the ${axis} axis. The pole assignments are FIXED and provided to you:`,
    `queryPoles MUST be exactly: ${JSON.stringify(requiredPoles)}`,
    `This means: imageQueries[0] must clearly signal ${requiredPoles[0]}, imageQueries[1] must signal ${requiredPoles[1]}, imageQueries[2] must signal ${requiredPoles[2]}, imageQueries[3] must signal ${requiredPoles[3]}.`,
    `Write your queries to match these poles. For ${axis}: ${a} means ${a === "E" ? "extraverted/social/stimulating" : a === "I" ? "introverted/solitary/quiet" : a === "S" ? "concrete/detailed/literal/practical" : a === "N" ? "abstract/symbolic/conceptual/imaginative" : a === "T" ? "logical/structured/systematic/cool" : a === "F" ? "warm/emotional/personal/human" : a === "J" ? "ordered/planned/minimal/structured" : "spontaneous/chaotic/maximalist/flexible"}. ${b} means ${b === "E" ? "extraverted/social/stimulating" : b === "I" ? "introverted/solitary/quiet" : b === "S" ? "concrete/detailed/literal/practical" : b === "N" ? "abstract/symbolic/conceptual/imaginative" : b === "T" ? "logical/structured/systematic/cool" : b === "F" ? "warm/emotional/personal/human" : b === "J" ? "ordered/planned/minimal/structured" : "spontaneous/chaotic/maximalist/flexible"}.`,
    "",
    "Your job: pick ONE core subject (a single noun), then write 4 search queries matching the required poles.",
    "All 4 images must be instantly recognizable as the same type of thing — the variation is ONLY in mood, style, or context.",
    "",
    "RULES for imageQueries:",
    "- All 4 queries share the same core noun (bedroom, cat, desk, street, forest, etc.)",
    "- Each 2-4 words. The core noun must appear in every query.",
    "- GOOD: core='street' → ['empty foggy street', 'busy crowded street', 'colorful street market', 'quiet residential street']",
    "- BAD: ['rooftop party', 'reading corner', 'farmers market', 'hiking trail'] — all DIFFERENT subjects",
    "",
    "Respond with valid JSON only, no markdown:",
    "{",
    "  \"scene\": \"evocative 1-2 sentence question asking which version speaks to them\",",
    "  \"imageQueries\": [\"query1\", \"query2\", \"query3\", \"query4\"],",
    "  \"axis\": \"" + axis + "\",",
    "  \"intent\": \"brief description of what each pole reveals\",",
    "  \"queryPoles\": " + JSON.stringify(requiredPoles),
    "}",
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const { state, apiKey } = (await request.json()) as { state: PersonalityState; apiKey?: string };

    const lowestConfidenceAxis = Object.entries(state.confidence).sort(
      ([, a], [, b]) => a - b
    )[0][0];

    // Pre-assign poles so the LLM writes queries to match — not the other way around
    const requiredPoles = makeBalancedPoles(lowestConfidenceAxis);
    const systemPrompt = buildSystemPrompt(lowestConfidenceAxis, requiredPoles);

    const userMessage = [
      `- Turn: ${state.turn + 1} of 11`,
      `- Previous choices: ${state.choices.length > 0 ? state.choices.slice(-3).map((c) => c.interpretation).join("; ") : "None yet"}`,
      "",
      `Generate a scene targeting the ${lowestConfidenceAxis} axis with queryPoles ${JSON.stringify(requiredPoles)}. Pick ONE specific visual subject. Different from any previous scenes.`
    ].join("\n");

    const completion = await callWithFallback(apiKey, (client) => client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.9,
      max_tokens: 200,
    })) as OpenAI.Chat.Completions.ChatCompletion;

    const content = completion.choices[0].message.content || "";
    const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const scene = JSON.parse(cleaned);

    // Enforce the pre-assigned poles regardless of what the LLM returned
    scene.queryPoles = requiredPoles;

    return NextResponse.json(scene);
  } catch (error) {
    console.error("Scene generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate scene" },
      { status: 500 }
    );
  }
}