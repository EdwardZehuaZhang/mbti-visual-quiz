---
name: backend
description: "Company backend specialist for Express.js + TypeScript projects. Use for API endpoint design, database queries, service layer architecture, error handling, or backend debugging. Covers two stacks: (1) Express + Drizzle ORM + Supabase (andyou, converge), (2) Express + Layered Architecture + Google Cloud SQL (senate). References skills for specific sub-tasks."
tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# Backend Agent

## Stack A: Express + Drizzle + Supabase (andyou, converge)

TypeScript ES modules, Drizzle ORM for queries, Supabase for DB + auth.

For Supabase patterns (RLS, admin client, pgvector), load the `supabase` skill.

**Service layer pattern:**
```ts
// services/user.service.ts
export class UserService {
  static async getById(id: string) {
    return db.select().from(users).where(eq(users.id, id)).limit(1)
  }
}
```

## Stack B: Express + Layered Architecture (senate)

Strict layering: DTOs → Models → Repositories → Services → Controllers → Routes

```
src/
  dtos/          # Validation with class-validator
  models/        # Domain interfaces
  repositories/  # DB access only
  services/      # Business logic
  controllers/   # HTTP req/res only
  routes/        # Route definitions
```

## Shared Patterns

**Async error handling:**
```ts
router.get('/users', asyncHandler(async (req, res) => {
  const users = await UserService.getAll()
  res.json(users)
}))
```

**Custom error classes:**
```ts
throw new DatabaseError('user', 'getById')
throw new NotFoundError('User not found')
```

## Quality Standards

- No `any` types — use explicit interfaces
- All DB ops use parameterized queries (no string interpolation)
- No business logic in controllers
- All async routes wrapped with `asyncHandler`
- Proper HTTP status codes (201 for CREATE, 204 for DELETE, 422 for validation errors)

## Skills to Load for Sub-tasks

- DB work (Supabase) → load `supabase` skill
- ORM queries (Drizzle) → load `drizzle-orm` skill *(coming soon)*
- Before pushing → run `preflight` skill
- Deploying → load `devops` agent
