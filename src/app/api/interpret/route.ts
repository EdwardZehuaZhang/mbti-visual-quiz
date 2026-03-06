import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { PersonalityState, InterpretResponse } from "@/types/quiz";

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

const INTERPRETATION_PROMPT = `You are a personality psychologist. Write a brief 1-2 sentence insight about what a person's image choice reveals about their personality.

You receive the scene, the chosen image description, the MBTI axis being probed, and which pole the choice signals. Be specific and insightful — reference what about this image likely resonated with them.

Respond with valid JSON only, no markdown:
{ "interpretation": "string" }`;

// Maps each pole letter to the signal direction (+1 or -1)
const POLE_DIRECTION: Record<string, number> = {
  E: 1, I: -1,
  N: 1, S: -1,
  F: 1, T: -1,
  P: 1, J: -1,
};

const SIGNAL_DELTA = 0.15;
const CONFIDENCE_DELTA = 0.10;

export async function POST(request: Request) {
  try {
    const { state, scene, chosenImage, axis, chosenPole, apiKey } = (await request.json()) as {
      state: PersonalityState;
      scene: string;
      chosenImage: { description: string; alt: string };
      axis?: string;
      chosenPole?: string;
      apiKey?: string;
    };

    // Deterministic signal update — no LLM involved
    const newSignals = { ...state.signals };
    const newConfidence = { ...state.confidence };

    if (axis && chosenPole && axis in newSignals && POLE_DIRECTION[chosenPole] !== undefined) {
      const axisKey = axis as keyof typeof newSignals;
      const direction = POLE_DIRECTION[chosenPole];
      newSignals[axisKey] = Math.max(-1, Math.min(1, newSignals[axisKey] + direction * SIGNAL_DELTA));
      newConfidence[axisKey] = Math.min(1, newConfidence[axisKey] + CONFIDENCE_DELTA);
    }

    // LLM only for the interpretation text
    const userMessage = `Scene: "${scene}"
Chosen image: "${chosenImage.description}"
Axis probed: ${axis ?? "unknown"}, signals ${chosenPole ?? "unknown"}

Write a 1-2 sentence personality insight about this choice.`;

    const completion = await callWithFallback(apiKey, (client) => client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: INTERPRETATION_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 150,
    })) as OpenAI.Chat.Completions.ChatCompletion;

    const content = completion.choices[0].message.content || "";
    const parsed = JSON.parse(content);

    const updatedState: PersonalityState = {
      signals: newSignals,
      confidence: newConfidence,
      choices: [
        ...state.choices,
        {
          scene,
          imageDescription: chosenImage.description,
          interpretation: parsed.interpretation,
        },
      ],
      turn: state.turn + 1,
      selectedImages: state.selectedImages || [],
    };

    const response: InterpretResponse = {
      state: updatedState,
      interpretation: parsed.interpretation,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Interpret error:", error);
    return NextResponse.json(
      { error: "Failed to interpret choice" },
      { status: 500 }
    );
  }
}
