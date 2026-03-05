# MBTI Visual Quiz

An adaptive MBTI personality quiz that determines your personality type through intuitive visual image selection — not a traditional questionnaire.

## How It Works

1. GPT-4 generates an evocative scene description targeting a specific MBTI axis
2. Unsplash serves 4 images matching the scene aesthetic
3. You pick the image that resonates intuitively
4. GPT-4 interprets your choice and updates your personality model
5. The quiz adapts, steering toward axes it's least confident about
6. Quiz ends when all confidence values exceed 0.75 or after 15 turns
7. GPT-4 writes a personalised narrative connecting your choices to your type

## Setup

```bash
cp .env.local.example .env.local
# Fill in your API keys
npm install
npm run dev
```

## API Keys Required

- **OPENAI_API_KEY** — from [platform.openai.com](https://platform.openai.com/api-keys)
- **UNSPLASH_ACCESS_KEY** — from [unsplash.com/developers](https://unsplash.com/developers)

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/quiz` | Main quiz experience |
| `/results` | Personalised MBTI results |
| `/api/scene` | POST — generates scene + image query |
| `/api/pinterest` | GET — fetches 4 images from Unsplash |
| `/api/interpret` | POST — interprets choice, updates personality state |
| `/api/results` | POST — generates final MBTI narrative |

## Personality State

```json
{
  "signals": { "EI": 0, "SN": 0, "TF": 0, "JP": 0 },
  "confidence": { "EI": 0, "SN": 0, "TF": 0, "JP": 0 },
  "choices": [],
  "turn": 0
}
```

Signals range from -1 (first letter) to +1 (second letter).  
Confidence ranges from 0 to 1.
