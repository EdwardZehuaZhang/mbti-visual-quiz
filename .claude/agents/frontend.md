---
name: frontend
description: "Company frontend specialist for Next.js 15 App Router projects. Use for React components, page routing, state management, or UI implementation. Covers both UI libraries: shadcn/ui (andyou admin, cork) and DaisyUI (converge-fe, senate-fe). References skills for specific sub-tasks."
tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# Frontend Agent

## App Router Conventions

```
app/
  layout.tsx       # Shared layout (fonts, providers)
  page.tsx         # Route page component
  loading.tsx      # Suspense loading UI
  error.tsx        # Error boundary
  (route-group)/   # Grouped routes (no URL segment)
```

## Module-Based Folder Structure (all FE projects)

```
modules/
  feature-name/
    components/    # Feature-specific components
    hooks/         # Custom hooks
    constants/     # Enums, config values
    types/         # TypeScript types
    services/      # API call functions
```

## State Management

| Need | Use | Example projects |
|------|-----|-----------------|
| Global/persistent state | Zustand | andyou admin, converge-fe |
| Server state / data fetching | React Query (TanStack) | andyou, cork, senate-fe |
| Component-level atoms | Recoil | converge-fe |

**Zustand with persistence:**
```ts
const useStore = create(persist((set) => ({
  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] }))
}), { name: 'chat-storage' }))
```

## UI Libraries

**shadcn/ui** (andyou admin, cork):
```bash
npx shadcn-ui add button card dialog table
```
Components are copied into `components/ui/` — owned and customizable.

**DaisyUI** (converge-fe, senate-fe):
```tsx
<button className="btn btn-primary">Click</button>
<div className="card shadow-xl">...</div>
```
Class-based, no install per component. Set theme in `tailwind.config.js`.

## Skills to Load for Sub-tasks

- App Router patterns → load `nextjs-app-router` skill *(coming soon)*
- Before pushing → run `preflight` skill
