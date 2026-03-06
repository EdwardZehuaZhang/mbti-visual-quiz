# Architecture Overview — MBTI Visual Quiz

## What It Is

A visual personality quiz that determines a user's MBTI type through image selection. Each round presents 4 curated photos; the user picks the one that appeals most. An LLM interprets each choice and incrementally updates personality signals across the 4 MBTI axes. After 11 rounds (or earlier if confidence is high enough on all axes), a final result page reveals the MBTI type with a personalized description.

---

## Tech Stack

| Layer      | Technology                                     |
|------------|------------------------------------------------|
| Framework  | Next.js 14 (App Router)                        |
| UI         | React 18, Framer Motion, Tailwind CSS          |
| AI         | OpenAI API (`gpt-4o-mini`, `gpt-4o`, `gpt-5.4`) |
| Images     | Pexels API → Unsplash API → picsum (fallback)  |
| Language   | TypeScript                                     |

---

## File Structure

```
src/
  app/
    page.tsx              # Landing page — click to start
    quiz/page.tsx         # Main quiz UI (11 rounds)
    results/page.tsx      # Results display
    privacy/page.tsx      # Privacy page
    api/
      scene/route.ts      # POST — generate a scene + 4 image queries
      images/route.ts     # GET  — fetch one photo for a query
      interpret/route.ts  # POST — interpret user's choice, update state
      results/route.ts    # POST — generate final MBTI type + description
  types/
    quiz.ts               # Shared TypeScript types + pure state helpers
```

---

## Core Data Model

Defined in `src/types/quiz.ts`. The `PersonalityState` object is the single source of truth for the quiz and is passed between client and all API routes:

```ts
interface PersonalityState {
  signals:    { EI: number; SN: number; TF: number; JP: number };  // -1.0 to +1.0
  confidence: { EI: number; SN: number; TF: number; JP: number };  // 0.0 to 1.0
  choices: Array<{ scene: string; imageDescription: string; interpretation: string }>;
  turn: number;
  lastPinId?: string;
  selectedImages: Array<{ url: string; pinId: string }>;
}
```

**Signal convention:** negative = first letter of pair (I, S, T, J); positive = second (E, N, F, P).

**Quiz ends** when `turn >= 11` OR all four confidence values exceed `0.75`.

---

## Request Flow

```
Landing page (/):
  → prefetchFirstRound()
      → POST /api/scene  (with empty initial state)
      → GET  /api/images x4  (parallel, one per query)
      → store in sessionStorage

Quiz page (/quiz):
  On mount:
    → consume sessionStorage prefetch if available
    → maintain a queue of 3 prefetched rounds ahead

  Per round:
    1. Show 4 images in 2x2 grid
    2. User taps image → POST /api/interpret
       (scene description + chosen image description + current state)
    3. LLM returns updated signals/confidence + 1-sentence interpretation
    4. newState merged → check isQuizComplete()
       - complete → sessionStorage.setItem("mbti-state") → /results
       - continue → loadRound(newState)

Results page (/results):
  → reads "mbti-state" from sessionStorage
  → POST /api/results (full state with choice history)
  → displays: MBTI type, 4 trait bars, personalized paragraph, image collage
```

---

## API Routes

### `POST /api/scene`

Uses `gpt-4o-mini` to generate one quiz round. Input: current `PersonalityState`. Output:

```json
{
  "scene": "Evocative question for the user",
  "imageQueries": ["query1", "query2", "query3", "query4"],
  "axis": "EI | SN | TF | JP",
  "intent": "what each query choice reveals"
}
```

The prompt selects the **lowest-confidence axis** from the current state to target, ensuring the quiz always probes wherever information is weakest.

### `GET /api/images?q=...&orientation=...`

Fetches one photo for a given search query. Priority:

1. **Pexels** (`PEXELS_API_KEY`) — `per_page=1`, orientation-aware
2. **Unsplash** (`UNSPLASH_ACCESS_KEY`) — `per_page=1`, popular ordering
3. **picsum.photos** — deterministic seed fallback (no key required)

Returns `ImageResult`: `{ id, url, description, alt }`.

### `POST /api/interpret`

Uses `gpt-4o-mini` to interpret a single image choice. Input: scene text, chosen image description, current state. Output: updated `signals`, `confidence`, and a one-sentence `interpretation`. Signals adjust incrementally (±0.05–0.20 per turn); confidence grows more when choices are consistent.

### `POST /api/results`

Generates the final result. Input: full `PersonalityState` including complete choice history. Tries models in order: `gpt-5.4` → `gpt-4.5-preview` → `gpt-4o`. Output:

```json
{
  "type": "INFP",
  "paragraph": "Personalized 4-6 sentence description referencing actual choices...",
  "traitBreakdown": {
    "EI": { "label": "...", "score": -0.4 },
    ...
  }
}
```

---

## Performance Strategy

The app uses aggressive prefetching to eliminate perceived wait time:

1. **Landing page** starts fetching round 1 (scene + 4 images) the moment it renders, before the user taps.
2. **Quiz page** maintains a rolling queue of up to **3 prefetched rounds** ahead of the current one.
3. All 4 image fetches per round run **in parallel** (`Promise.all`).
4. Images are **preloaded into browser cache** via `new Image()` before the round is shown, so the grid appears instantly.
5. After the user makes a choice, a 450ms timer switches to the loading screen — in most cases the next round is already ready before this fires.

---

## State Management

There is no global state library. All state lives in:

- **React `useState`** in `quiz/page.tsx` during the quiz
- **`sessionStorage`** for cross-page handoff:
  - `"prefetch-scene"` / `"prefetch-images"` — landing → quiz
  - `"mbti-state"` — quiz → results

The `PersonalityState` object is serialized and passed as JSON to every API call so the server remains stateless.

---

## Environment Variables

```
OPENAI_API_KEY        # Required — powers /api/scene, /api/interpret, /api/results
PEXELS_API_KEY        # Recommended — primary image source
UNSPLASH_ACCESS_KEY   # Optional  — secondary image source
```

If neither image key is set, the app falls back to random picsum photos (functional but not thematic).
