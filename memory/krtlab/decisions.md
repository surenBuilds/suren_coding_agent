# KrtLab Engineering Decisions

## Persistence: Firebase, not Supabase (CONFIRMED)
A prior audit assumed Supabase based on file/dependency presence without
verifying runtime usage, and incorrectly flagged Firebase+Supabase coexistence
as a P0. Direct inspection found zero Supabase references anywhere in the repo.
Firebase/Firestore + LocalStorage is the only active persistence layer.
**Decision: never assume Supabase for this project; never attempt a Firebase ->
Supabase migration unless explicitly and separately requested with fresh
evidence.**

## AI output validation schemas match the REAL contract, not the aspirational one
`src/types.ts`'s `PracticalTask`/`PracticalScenario` declare fields (context,
role, mission, constraints, win_condition, lose_condition) as required, but the
actual Gemini prompt in `learning.ts` never requests them, and the existing
`getFallbackLesson()` fills practicalTask/game string fields with `""`.
**Decision: the Zod schemas (server/schemas/aiResponses.ts) validate what Gemini
is actually asked for and actually returns today — richer type-declared fields
are accepted-if-present but not required. The type/prompt/consumer mismatch is
tracked as a separate, real follow-up (not silently patched by loosening the
type or quietly changing the prompt) — see PR #2 description.**

## Protected-branch pushes require approval
The coding agent's `github_commit` tool can commit directly to any branch via
the GitHub API, bypassing PR review entirely. On 2026-08-22 this was used to
push directly to `main` and delete the committed `package-lock.json`, which was
restored. **Decision: `github_commit` targeting `main`/`master` now always
requires explicit approval (escalated to DEPLOY permission level), regardless of
the MODIFY auto-approve setting.** Default workflow for KrtLab changes is:
branch -> implement -> test -> commit -> push branch -> open PR, not direct
commits to main.

## No caching/prompt-redesign/personalization bundled into validation work
Explicitly deferred per the original task scope (STEP 7). Do not combine these
into future validation-related work without a separate, explicit request.
