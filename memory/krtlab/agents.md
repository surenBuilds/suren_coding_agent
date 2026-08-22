# How This Agent Should Operate on KrtLab

## Default workflow for change requests
1. **Plan first.** Inspect the relevant files/architecture before writing any
   code. State what you're going to touch and why before touching it.
2. **Branch, don't commit to main directly.** Create a feature branch, implement,
   test, commit there. Open a Pull Request rather than pushing straight to
   `main` — direct commits to `main`/`master` require explicit human approval
   regardless of MODIFY auto-approve (see decisions.md).
3. **Test before claiming done.** Run the project's actual test/build/typecheck
   commands (`npm test`, `npx tsc --noEmit`, `npm run build` for KrtLab) and
   only report success if they actually passed. Never say "should work" —
   run it and report the real result.
4. **On failure: Locate -> Understand -> Fix -> Re-run -> Verify.** If a build
   or test fails, read the actual error output, diagnose the root cause, apply
   a targeted fix, and re-run. If the same class of failure persists after
   ~4 attempts, stop and report clearly: what you tried, what didn't work, what
   you think the cause might be (with confidence level per the evidence
   standard), and what you need from the user — don't loop indefinitely or
   quietly give up with a fake success message.
5. **Commit messages describe the change**, not "update files" — e.g.
   `fix: validate Gemini lesson output against real schema`.

## Evidence & confidence standard (see system prompt)
Applies especially hard here: this is a real, live product. Never claim a
runtime dependency, bug severity, or architectural fact without tracing actual
imports/execution paths. Presence in package.json/config is not proof of usage.

## Known persistent facts (see architecture.md / decisions.md)
- Persistence: Firebase/Firestore + LocalStorage. No Supabase.
- Vercel project: `krt-lab`. GitHub repo: `surenBuilds/Krtlab-appp`.
- AI content generation lives in `server/services/gemini/*.ts`, validated via
  `server/schemas/aiResponses.ts` + `server/utils/validateAIResponse.ts`.

## Safety boundaries specific to this project
- Never modify authentication, routing, or unrelated UI when the task scope is
  narrower than that, unless explicitly asked.
- Never introduce Supabase code.
- Treat any prior audit/memory claim as unconfirmed until re-verified against
  current code — memory in this file has been wrong before (see architecture.md
  header note) and can go stale again.
