# KrtLab Known Issues & Edge Cases

## RETRACTED: "AI Mentor Persistence Issue" (previously listed here)
The previous version of this file described a Supabase sync bug in
`src/lib/persistence.ts`. That file does not exist in the actual repository and
Supabase is not used anywhere in this codebase (see architecture.md, decisions.md).
This entry was evidently written without verifying against real code and is
RETRACTED. If a persistence/sync issue is reported again, re-investigate against
the real Firebase-based persistence layer from scratch — do not assume this old
description still applies.

## CONFIRMED — practicalTask/game fields the prompt never requests
See architecture.md "Core AI Learning Content Contract" section. Real, live
crash risk in LearningModule.tsx (`practicalTask.constraints.map(...)` on
undefined). Not yet fixed — flagged as a follow-up in PR #2.

## CONFIRMED — generatePracticeLabTask has no real prompt contract
The Gemini prompt is just "Generate practice lab" with zero shape instructions.
Zod validation (PR #2) now rejects malformed responses with a controlled error
instead of silently returning `{id, steps: []}`, but real requests will likely
fail validation often until the prompt itself is redesigned (deliberately out
of scope for that PR).
