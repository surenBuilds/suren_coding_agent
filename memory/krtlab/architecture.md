# KrtLab Architecture

> Last verified against actual repository content (surenBuilds/Krtlab-appp) during
> a direct code audit. Previous version of this file incorrectly described Supabase
> as the backend -- that was never verified against real code and was wrong. Treat
> anything in this file as CONFIRMED only if it cites a real file path; otherwise
> re-verify before relying on it, per the agent's evidence & confidence standard.

## Overview
KrtLab (Կրթլաբ) is an educational web application for interactive learning,
progress tracking, streaks, certificates, and an AI Mentor / AI-generated lesson
content feature, targeting Armenian-language vocational/professional learners.

## Technology Stack (CONFIRMED)
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, react-router-dom
- **Backend**: Express server (server.ts), Vite dev middleware in non-production
- **Persistence**: **Firebase/Firestore + LocalStorage** -- CONFIRMED. Zero Supabase
  references exist anywhere in the codebase (grep -rli supabase across all
  .ts/.tsx/.json returns nothing). Do not assume Supabase for this project.
- **AI Engine**: Server-proxied Gemini API (@google/genai), routes under
  server/routes/gemini.ts, service logic in server/services/gemini/*.ts
- **Output validation**: Zod schemas (server/schemas/aiResponses.ts) +
  server/utils/validateAIResponse.ts -- added to harden AI Learning Engine output
  against malformed/structurally-invalid Gemini responses. See PR #2.
- **Deployment**: Vercel (project name krt-lab, domain krt-lab.vercel.app),
  auto-deploys from main

## Core AI Learning Content Contract (CONFIRMED -- server/services/gemini/learning.ts)
generateLessonContent() returns a Level-shaped object (see src/types.ts):
title, topicId, topicName, orderIndex, introduction, keyConcepts[],
detailedExplanation, examples[], exercises[], miniSummary, recommendedReading[],
quiz[{question,options[],correctAnswer,explanation}], practicalTask{title,
scenario,instructions,deliverable,evaluationCriteria}, game{title,scenario,
player_role,steps[]}, completion{message,total_xp}, requiredScore.

**KNOWN CONFIRMED GAP** (not yet fixed, flagged in PR #2 description): src/types.ts
declares PracticalTask/PracticalScenario with REQUIRED fields (context, role,
mission, constraints, win_condition, lose_condition) that the Gemini prompt never
actually requests. LearningModule.tsx reads practicalTask.constraints.map(...),
which will throw if constraints is undefined -- a real, live crash risk. Needs a
follow-up: either update the prompt to request these fields, or make the
consumer defensive.

generatePracticeLabTask() (server/routes/gemini.ts, inline in the route) had
essentially NO shape contract -- prompt was the literal string "Generate practice
lab" with zero structure instructions. Its old fallback ({id, steps: []}) did
not match PracticeLabTask (src/types.ts) at all. Fixed with Zod validation in
PR #2; the prompt itself is still unstructured (prompt redesign was explicitly
out of scope for that task -- a real follow-up item).

## Core Directories (CONFIRMED via direct listing)
- server/routes/gemini.ts -- all AI generation HTTP endpoints
- server/services/gemini/ -- learning.ts, certificates.ts, mentor.ts, games.ts,
  languages.ts, index.ts
- server/schemas/aiResponses.ts -- Zod validation schemas (added)
- server/utils/validateAIResponse.ts -- validation pipeline (added)
- src/types.ts -- canonical TypeScript contracts consumers actually import
- src/hooks/useLessonStore.ts, src/features/courses/AICourseEngine.tsx,
  src/components/LearningModule.tsx, src/components/PracticeLab.tsx -- primary
  AI-content consumers, all with existing try/catch error handling around API calls

## Testing
vitest + zod added (were not previously installed -- no test suite existed
before PR #2). vitest.config.ts at repo root, tests co-located as *.test.ts
under server/.
