import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { PersonalityState } from "@/types/quiz";

function getOpenAI() { return new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); }

const SYSTEM_PROMPT = [
  "You are a personality psychologist designing a visual MBTI quiz.",
  "Each round shows the user 4 images of THE EXACT SAME THING and asks them to pick the one that appeals most.",
  "The difference between the 4 images reveals personality, not the subject itself.",
  "",
  "MBTI axes you are probing:",
  "- E/I: social energy, crowds vs solitude, stimulation vs quiet",
  "- S/N: concrete/literal vs abstract/symbolic, detail vs big picture",
  "- T/F: logic/structure vs emotion/warmth, systems vs people",
  "- J/P: order vs chaos, planned vs spontaneous, minimal vs maximalist",
  "",
  "Your job: pick ONE very specific visual subject. All 4 images will be that same subject, just different versions of it.",
  "The personality signal comes from WHICH version they choose.",
  "",
  "RULES for imageQuery:",
  "- Must be ONE specific thing: a single noun or tight noun phrase",
  "- GOOD: 'tabby cat', 'espresso cup', 'mountain lake', 'brutalist building', 'wildflower field', 'vintage typewriter', 'library shelf', 'wooden cabin'",
  "- BAD: 'nature', 'cozy spaces', 'aesthetic rooms', 'dark moody', 'animals' -- too vague, will show mixed results",
  "- NEVER combine multiple subjects. Not 'cats and dogs', not 'forest and mountains'",
  "- 2-3 words maximum",
  "- Test: if you searched this on Pinterest and saw 20 results, would they ALL be the same type of thing? If yes, specific enough.",
  "",
  "Respond with valid JSON only, no markdown:",
  "{",
  "  \"scene\": \"evocative 1-2 sentence prompt asking the user which version speaks to them\",",
  "  \"imageQuery\": \"the single specific subject (2-3 words)\",",
  "  \"axis\": \"EI | SN | TF | JP\",",
  "  \"intent\": \"what personality signal this choice reveals\"",
  "}",
  "",
  "Example:",
  "{",
  "  \"scene\": \"Four cats, each in their own world. Which one feels most like you?\",",
  "  \"imageQuery\": \"cat portrait\",",
  "  \"axis\": \"EI\",",
  "  \"intent\": \"Playful/social cat signals E; solitary/aloof cat signals I\"",
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