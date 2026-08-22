# KrtLab Engineering Decisions

> **Provenance**: Decisions below are dated and, where they rest on a
> factual claim (not just a policy choice), cite the commit/PR the claim was
> verified against. A decision resting on a stale/unverified claim should be
> re-checked, not assumed still valid.

## Persistence: Firebase, not Supabase (CONFIRMED — verified at commit `f325e00`, 2026-08-22)
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

## Protected-branch pushes require approval (decided 2026-08-22)
The coding agent's `github_commit` tool can commit directly to any branch via
the GitHub API, bypassing PR review entirely. On 2026-08-22 this was used to
push directly to `main` (commit `51ff2a8`) and delete the committed
`package-lock.json`, which was restored in commit `f325e00`. The same
`51ff2a8` commit also added `docs/KRTLAB_AGENT_WORK_HISTORY.md` with the same
false Supabase claim already present in this repo's memory at the time —
corrected in KrtLab commit `50e6a6c`. **Decision: `github_commit` targeting
`main`/`master` now always requires explicit approval (escalated to DEPLOY
permission level), regardless of the MODIFY auto-approve setting.** Default
workflow for KrtLab changes is: branch -> implement -> test -> commit -> push
branch -> open PR, not direct commits to main.

## No caching/prompt-redesign/personalization bundled into validation work
Explicitly deferred per the original task scope (STEP 7). Do not combine these
into future validation-related work without a separate, explicit request.
