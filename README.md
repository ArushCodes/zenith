# Zenith — TAPMI Student Board

Zenith is a modern, high-performance student board and academic tracking portal for TAPMI Manipal (MAHE), designed specifically for the Integrated Programme in Management (IPM Batches 1, 2, and 3).

**Live Application**: [https://www.zenithfor.me](https://www.zenithfor.me)

---

## Features

- **Live Animated Class Tracker**: Real-time period progression, attendance status, subject details, room locations, and faculty indicators.
- **Academic Deadlines & Exam Center**: Centralized repository for quizzes, assignments, midterm/endterm schedules, and verified course syllabus scopes.
- **Multi-Batch Architecture**: Dedicated boards and academic hierarchy for IPM 1 (2026–2031), IPM 2 (2025–2030), and IPM 3 (2024–2029).
- **Secure Verification**: Instant roster matching and learner email OTP verification restricted strictly to `@learner.manipal.edu`.
- **Timetable & ICS Sync**: Auto-syncs live class schedules and allows calendar exports directly to Google Calendar, Apple Calendar, and Outlook.

---

## Tech Stack

- **Frontend**: React 19, TanStack Start, TanStack Router, TanStack Query
- **Styling**: Tailwind CSS v4, Lucide Icons, Framer Motion
- **Backend & Database**: Supabase (PostgreSQL with RLS), Nitro Server Engine
- **Deployment**: Vercel Serverless Edge (`https://www.zenithfor.me`)

---

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for Vercel production
set NITRO_PRESET=vercel && npm run build
```
