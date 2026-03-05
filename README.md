# MBTI Visual Quiz

Discover your MBTI personality type through visual image selection, powered by GPT-4o and Unsplash.

## How It Works

1. GPT-4o generates an evocative scene description
2. Unsplash fetches 4 matching images
3. You pick the image that resonates with you
4. GPT-4o interprets your choice and updates your personality model
5. Repeat until confidence > 75% on all axes or 15 turns
6. Receive a personalized MBTI result narrative

## Setup

```bash
cp .env.local.example .env.local
# Fill in your API keys in .env.local

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

- `OPENAI_API_KEY` — from [platform.openai.com](https://platform.openai.com/api-keys)
- `UNSPLASH_ACCESS_KEY` — from [unsplash.com/developers](https://unsplash.com/developers)

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- OpenAI GPT-4o
- Unsplash API