# Zenith revamp — October 3, 2026

## Local review

Run `npm run dev -- --host 127.0.0.1 --port 3010 --strictPort` and open `http://127.0.0.1:3010/?preview=true`. The preview uses explicitly labelled synthetic data and requires no student account. The signed-in board shares the new theme, sidebar and workspace shell. Account screens are available at `/auth?mode=signup` and `/auth?mode=forgot`.

## Changes

- Graphite surfaces with mint, lilac and amber accents; responsive navigation and redesigned account screens.
- Roster matching runs only on the server. Signup uses MAHE ID and DOB without signup email OTP; IPM 2/3 signup waits for their rosters.
- Privileged handlers require explicit database admin roles. Editable names no longer grant privileges. Server secrets have no embedded fallback.
- Signup identity, role and membership are created in one database transaction. Normalized roll and MAHE ID uniqueness prevent duplicate registration races.
- Shared database limits protect roster lookup, signup and recovery attempts. Recovery delivery fails closed instead of printing OTPs. Password changes verify the old password and require eight characters.
- IPM 1 safe allowances count one absence per credit. Penalties describe course grade points. Future absences do not reduce current tracking. IPM 1 policy and grade references are not applied to IPM 2/3.
- Timetable parsing supports timezone, recurrence, exclusions and cancellations. Fetches validate DNS addresses and pin connections, with size/time limits. Atomic sync leases and transactional replacement preserve attendance history when classes disappear.
- Email review publishes and updates review state atomically. Intake validates malformed JSON and extraction data, bounds payloads and times out gateway calls.
- Personal checklists and attendance query caches include student identity. Attendance reads and activity visibility are restricted by the migration. Static-only service-worker caching avoids retaining account pages.
- Automatic deletion based solely on missing sign-in history is disabled.

## Required before production rollout

1. Rotate the credentials previously pasted in chat. Authenticate Git through Git Credential Manager; store Supabase and mail secrets in ignored local `.env` and Vercel environment settings. `.env.example` lists names only. Never put a privileged key in a `VITE_` variable.
2. Confirm the intended Supabase project: the existing CLI configuration and runtime fallback project references differ. Do not apply migrations to an unverified target.
3. Review and apply `supabase/migrations/20261003120000_roster_and_integration_guards.sql` on a staging database first. This migration was not executed against a live database during local work. Duplicate historical roll values intentionally cause migration failure rather than merging identities. Existing auth accounts are retained.
4. Run staging integration checks for concurrent registration, existing-account sign-in, password recovery delivery, RLS as student/rep/admin, recurrence replacement and simultaneous email approvals. These require database and mail configuration; the synthetic preview does not prove them.
5. Supply the IPM 2/3 rosters and their policies before enabling those registrations. Roster/DOB verification does not independently establish ownership of the learner mailbox; avoiding signup OTP is an explicit product choice.

## Verification

`npm run test:regressions` checks credit allowances, penalty boundaries, representative precedence, URL guards, floating and explicit IST times, recurrence exclusions and cancellations. `npx tsc --noEmit` checks types. `NITRO_PRESET=vercel npm run build` is required before pushing. Changed source files pass ESLint with only four Fast Refresh export warnings; the repository-wide formatting baseline was not reformatted.

Remaining areas requiring a separate review include historical broad profile-row visibility (RLS filters rows rather than contact columns), legacy dependency audit findings, manually verifying course credit mappings against the catalogue, and applying/testing database changes. This is not a claim that every historical bug has been eliminated.
