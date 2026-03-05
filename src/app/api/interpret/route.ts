import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { PersonalityState, InterpretResponse } from "@/types/quiz";

function getOpenAI() { return new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); }

const SYSTEM_PROMPT = `You are a personality psychologist interpreting image choices in an MBTI personality assessment. You analyze what a person's visual preference reveals about their personality.

You receive:
- The scene that was presented
- The image the user chose (its description)
- The current personality state (signals and confidence for each axis)

Your job is to:
1. Interpret what this specific image choice reveals about the person's personality. Be nuanced - don't just map "minimalist = Thinking" or "colorful = Feeling". Consider the full context of the scene, what this particular image suggests about how they engage with the world, what draws their attention, what resonates with them emotionally and cognitively.

2. Update the personality signals and confidence. Signals range from -1.0 to 1.0:
   - EI: -1.0 = strong Introversion, +1.0 = strong Extraversion
   - SN: -1.0 = strong Sensing, +1.0 = strong iNtuition
   - TF: -1.0 = strong Thinking, +1.0 = strong Feeling
   - JP: -1.0 = strong Judging, +1.0 = strong Perceiving

   Adjust signals incrementally (typically by 0.05-0.2 per choice). Confidence should increase with each choice (typically by 0.05-0.15), more if the signal is consistent with previous choices, less if contradictory.

3. Write a brief interpretation (1-2 sentences) that captures the personality insight from this choice.

Respond with valid JSON only, no markdown:
{
  "signals": { "EI": number, "SN": number, "TF": number, "JP": number },
  "confidence": { "EI": number, "SN": number, "TF": number, "JP": number },
  "interpretation": "string"
}`;

export async function POST(request: Request) {
  try {
    const { state, scene, chosenImage } = (await request.json()) as {
      state: PersonalityState;
      scene: string;
      chosenImage: { description: string; alt: string };
    };

    const userMessage = `Scene presented: "${scene}"

Image chosen by the user: "${chosenImage.description}" (alt: "${chosenImage.alt}")

Current personality state:
- Signals: EI=${state.signals.EI.toFixed(3)}, SN=${state.signals.SN.toFixed(3)}, TF=${state.signals.TF.toFixed(3)}, JP=${state.signals.JP.toFixed(3)}
- Confidence: EI=${state.confidence.EI.toFixed(3)}, SN=${state.confidence.SN.toFixed(3)}, TF=${state.confidence.TF.toFixed(3)}, JP=${state.confidence.JP.toFixed(3)}
- Turn: ${state.turn + 1}
- Previous interpretations: ${state.choices.map((c) => c.interpretation).join(" | ") || "None yet"}

Interpret this choice and return updated signals and confidence values. Remember to adjust incrementally from the current values.`;

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 400,
    });

    const content = completion.choices[0].message.content || "";
    const parsed = JSON.parse(content);

    const updatedState: PersonalityState = {
      signals: parsed.signals,
      confidence: parsed.confidence,
      choices: [
        ...state.choices,
        {
          scene,
          imageDescription: chosenImage.description,
          interpretation: parsed.interpretation,
        },
      ],
      turn: state.turn + 1,
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
