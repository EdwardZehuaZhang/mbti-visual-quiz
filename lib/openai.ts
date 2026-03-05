import OpenAI from 'openai'
import type { PersonalityState, SceneResponse, MBTIAxis } from './types'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateScene(state: PersonalityState): Promise<SceneResponse> {
  // Find the axis with lowest confidence
  const axes: MBTIAxis[] = ['EI', 'SN', 'TF', 'JP']
  const targetAxis = axes.reduce((a, b) =>
    state.confidence[a] <= state.confidence[b] ? a : b
  )

  const prompt = `You are generating scenes for an MBTI visual quiz. The user selects images based on intuition.

Current personality state:
- Signals (range -1 to 1): ${JSON.stringify(state.signals)}
- Confidence (range 0 to 1): ${JSON.stringify(state.confidence)}
- Turn: ${state.turn + 1}

Target axis: ${targetAxis} (this has the lowest confidence, focus here)

Generate a single evocative scene description that will surface ${targetAxis} differences through visual imagery.
The scene should be atmospheric and open to interpretation.

Return ONLY valid JSON in this exact format:
{
  "scene": "A brief evocative scene description (1-2 sentences)",
  "pinterestQuery": "aesthetic search query for Unsplash (3-5 words)",
  "axis": "${targetAxis}",
  "intent": "brief description of what visual choices reveal about this axis"
}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.8,
  })

  const content = response.choices[0].message.content
  if (!content) throw new Error('No content from OpenAI')
  return JSON.parse(content) as SceneResponse
}

export async function interpretChoice(
  chosenImageUrl: string,
  allImageUrls: string[],
  scene: string,
  axis: MBTIAxis,
  intent: string,
  state: PersonalityState
): Promise<{ interpretation: string; signalDelta: number; confidenceDelta: number }> {
  const chosenIndex = allImageUrls.indexOf(chosenImageUrl)

  const prompt = `You are interpreting an MBTI visual quiz choice.

Scene presented: "${scene}"
Axis being measured: ${axis}
Intent: ${intent}
Number of images shown: ${allImageUrls.length}
User chose: image #${chosenIndex + 1} of ${allImageUrls.length}

Current state:
- ${axis} signal: ${state.signals[axis]} (negative = first letter, positive = second letter)
- ${axis} confidence: ${state.confidence[axis]}

Based on the choice position and axis:
- For EI: earlier images tend toward E, later toward I
- For SN: earlier images tend toward S (concrete), later toward N (abstract)  
- For TF: earlier images tend toward T (structured), later toward F (emotional)
- For JP: earlier images tend toward J (ordered), later toward P (spontaneous)

Return ONLY valid JSON:
{
  "interpretation": "A brief insight about what this choice suggests (1 sentence)",
  "signalDelta": <number between -0.3 and 0.3>,
  "confidenceDelta": <number between 0.1 and 0.3>
}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.6,
  })

  const content = response.choices[0].message.content
  if (!content) throw new Error('No content from OpenAI')
  return JSON.parse(content)
}

export async function generateResults(state: PersonalityState): Promise<{
  type: string
  narrative: string
  traits: string[]
}> {
  const type = [
    state.signals.EI <= 0 ? 'E' : 'I',
    state.signals.SN <= 0 ? 'S' : 'N',
    state.signals.TF <= 0 ? 'T' : 'F',
    state.signals.JP <= 0 ? 'J' : 'P',
  ].join('')

  const choicesSummary = state.choices
    .map((c, i) => `Turn ${i + 1} (${c.axis}): ${c.interpretation}`)
    .join('\n')

  const prompt = `You are writing a personalised MBTI result for someone who completed a visual quiz.

Their MBTI type: ${type}
Their journey through the quiz:
${choicesSummary}

Write a personalised narrative (3-4 sentences) that:
1. Names their MBTI type: ${type}
2. Connects their actual visual choices back to their personality
3. Highlights what their image selections reveal about how they see the world
4. Feels intimate and specific, not generic

Return ONLY valid JSON:
{
  "type": "${type}",
  "narrative": "personalised narrative here",
  "traits": ["trait1", "trait2", "trait3", "trait4"]
}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  })

  const content = response.choices[0].message.content
  if (!content) throw new Error('No content from OpenAI')
  return JSON.parse(content)
}

