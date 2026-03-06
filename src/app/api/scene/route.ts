import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { PersonalityState } from "@/types/quiz";

function getOpenAI() { return new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); }

const SYSTEM_PROMPT = [
  "You are a personality psychologist designing a visual MBTI quiz.",
  "Each round shows the user 4 images, each of a DIFFERENT but related subject, and asks them to pick the one that appeals most.",
  "Which of the 4 subjects they choose reveals their personality.",
  "",
  "MBTI axes you are probing:",
  "- E/I: social energy, crowds vs solitude, stimulation vs quiet",
  "- S/N: concrete/literal vs abstract/symbolic, detail vs big picture",
  "- T/F: logic/structure vs emotion/warmth, systems vs people",
  "- J/P: order vs chaos, planned vs spontaneous, minimal vs maximalist",
  "",
  "Your job: pick a broad theme, then generate 4 specific image search queries — one per image.",
  "Each query should be a distinct variation within the theme that reveals a different personality trait.",
  "The personality signal comes from WHICH subject they prefer.",
  "",
  "RULES for imageQueries:",
  "- 4 queries, each 2-3 words, each a specific searchable subject",
  "- All 4 should be clearly related (same theme) but meaningfully different from each other",
  "- Each query should map to a different personality signal within the axis",
  "- GOOD theme 'water': ['mountain lake', 'ocean storm', 'gentle stream', 'rain puddle']",
  "- GOOD theme 'workspace': ['minimalist desk', 'cluttered creative studio', 'outdoor cafe table', 'library reading nook']",
  "- BAD: queries that are too similar to each other, or too vague",
  "",
  "Respond with valid JSON only, no markdown:",
  "{",
  "  \"scene\": \"evocative 1-2 sentence question asking which of the 4 speaks to them\",",
  "  \"imageQueries\": [\"query1\", \"query2\", \"query3\", \"query4\"],",
  "  \"axis\": \"EI | SN | TF | JP\",",
  "  \"intent\": \"what each choice reveals — e.g. query1=E, query2=I, etc.\"",
  "}",
  "",
  "Example:",
  "{",
  "  \"scene\": \"Four places to spend a Sunday afternoon. Which one pulls you in?\",",
  "  \"imageQueries\": [\"rooftop party crowd\", \"cozy reading corner\", \"busy farmers market\", \"solo hiking trail\"],",
  "  \"axis\": \"EI\",",
  "  \"intent\": \"party/market=E, reading corner/hiking=I\"",
  "}"
].join("\n");

export async function POST(request: Request) {
  try {
    const { state } = (await request.json()) as { state: PersonalityState };

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

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.9,
      max_tokens: 200,
    });

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