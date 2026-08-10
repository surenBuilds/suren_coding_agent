# KrtLab Architecture

## Overview
KrtLab (Կրթլաբ) is an educational Web application designed for interactive learning, progress tracking, streaks, certificates, and an AI Mentor feature.

## Technology Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4
- **State Management**: React Context + Custom Hooks + LocalStorage sync fallback
- **Backend/Database**: Supabase (PostgreSQL, Auth, RLS)
- **AI Engine**: Server-proxied Gemini API for AI Mentor
- **Deployment**: Vercel Serverless Functions + Frontend static bundle

## Core Components & Modules
- `src/components/AiMentor.tsx`: Interactive AI tutor interface with real-time streaming answers.
- `src/lib/persistence.ts`: Unified persistence manager handling dual synchronization (LocalStorage fallback + Supabase database sync).
- `src/lib/progress.ts`: Student streaks, completion certificates, points, and lesson milestones.
- `src/lib/supabaseClient.ts`: Lazy-initialized Supabase JS client.
