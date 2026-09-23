# Zenith — Development Guidelines

Zenith is the student portal and board for TAPMI Manipal, providing real-time timetable tracking, exam schedules, syllabus scopes, academic deadlines, and attendance analytics across IPM 1, IPM 2, and IPM 3.

## Tech Stack
- **Framework**: TanStack Start (React 19) + Vite + Nitro SSR
- **Database & Auth**: Supabase (PostgreSQL with Row Level Security)
- **Styling**: Tailwind CSS v4 + Radix UI + Lucide Icons + Framer Motion
- **Hosting**: Vercel (Production: `https://www.zenithfor.me`)

## Development Rules
- Use semantic commit messages (`feat:`, `fix:`, `refactor:`, `perf:`).
- Always verify builds with `NITRO_PRESET=vercel npm run build` before pushing.
- Maintain strict domain restrictions (`@learner.manipal.edu`) and prevent account takeovers or duplicate student roll registrations.
