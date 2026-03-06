import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { PersonalityState } from "@/types/quiz";

function getOpenAI() { return new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); }

const SYSTEM_PROMPT = `You are a personality psychologist who creates evocative visual scenes to probe MBTI personality dimensions. You generate richly atmospheric scene descriptions and corresponding image search queries.

Your goal is to create scenes where the 4 images a user chooses between will reveal something meaningful about their personality along the MBTI axes:
- E/I (Extraversion vs Introversion): social energy, stimulation preference, inner vs outer world
- S/N (Sensing vs Intuition): concrete vs abstract, detail vs pattern, present vs future
- T/F (Thinking vs Feeling): logic vs empathy, systems vs people, justice vs mercy
- J/P (Judging vs Perceiving): structure vs spontaneity, planning vs adapting, closure vs openness

Create scenes that are:
- Deeply atmospheric and sensory (not generic aesthetic labels)
- Like the opening line of a literary novel
- Specific enough to evoke a mood, open enough to allow varied visual interpretations

Example scenes:
- "A late afternoon in a high-ceilinged library. Dust motes float in the amber light. The smell of old paper and wood polish."
- "A rooftop party at sunset in a coastal city. String lights sway. Someone is laughing somewhere below."
- "A workshop table covered in half-finished projects. Tools scattered with purpose. Morning coffee going cold."

You must respond with valid JSON only, no markdown. The JSON should have these fields:
- scene: the evocative scene description (2-3 sentences)
- imageQuery: a single specific visual category for the 4 images (e.g. "dense forest", "golden retriever", "neon city street", "minimalist desk"). All 4 images must be from the SAME category - different examples of the same thing, not a mix. 2-3 words max, be specific not generic.
- axis: which MBTI axis this scene primarily targets (EI, SN, TF, or JP)
- intent: a brief note on what personality signal you hope to extract from the user's choice`;

export async function POST(request: Request) {
  try {
    const { state } = (await request.json()) as { state: PersonalityState };

    const lowestConfidenceAxis = Object.entries(state.confidence).sort(
      ([, a], [, b]) => a - b
    )[0][0];

    const userMessage = `Current personality state:
- Signals: EI=${state.signals.EI.toFixed(2)}, SN=${state.signals.SN.toFixed(2)}, TF=${state.signals.TF.toFixed(2)}, JP=${state.signals.JP.toFixed(2)}
- Confidence: EI=${state.confidence.EI.toFixed(2)}, SN=${state.confidence.SN.toFixed(2)}, TF=${state.confidence.TF.toFixed(2)}, JP=${state.confidence.JP.toFixed(2)}
- Turn: ${state.turn + 1} of 15
- Lowest confidence axis: ${lowestConfidenceAxis}
- Previous choices: ${state.choices.length > 0 ? state.choices.slice(-3).map((c) => c.interpretation).join("; ") : "None yet"}

Generate a new scene that primarily targets the ${lowestConfidenceAxis} axis (but can touch others). Make it different from any previous scenes. Prioritize probing the axis where confidence is lowest.`;

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
