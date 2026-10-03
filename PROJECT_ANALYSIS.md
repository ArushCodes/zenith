> Baseline analysis before the October 3 revamp. For changes and remaining deployment requirements, see REVAMP_NOTES.md.

# Zenith project analysis

Reviewed on 3 October 2026. This document describes the checked-out implementation, rather than assuming the README or roadmap represents the deployed application. No production accounts, database records, emails or deployments were changed during this review.

## 1. What the application does

Zenith is a student academic dashboard for TAPMI's Integrated Programme in Management. Its central unit is a batch. Students see their batch's timetable, deadlines, examinations, announcements and members, and maintain their own attendance and examination marks. Representatives manage shared academic records; global administrators manage users and roles.

The configured cohorts are IPM 1 (2026–2031), IPM 2 (2025–2030) and IPM 3 (2024–2029). The database hierarchy is more general than these three cohorts: institution → school → programme → batch → section. An administrator can create additional hierarchy levels and batches.

The implementation is uneven across cohorts: the timetable and board query by batch, but roster verification only contains IPM 1 records, and the active grading screen always uses the hardcoded IPM 1 curriculum.

## 2. Architecture and request flow

The application uses React 19, TanStack Start and Router, React Query, Vite 8, and Nitro 3 beta. Tailwind CSS 4 provides styling, Radix-based UI primitives live under `src/components/ui`, Lucide provides icons, and Framer Motion provides animations. Supabase supplies PostgreSQL, authentication and realtime notifications. Vercel is the configured build target.

There are two distinct data-access paths:

1. Most components call the browser Supabase client directly. The browser sends its session token and PostgreSQL row-level security determines which records can be read or changed.
2. Privileged operations use TanStack server functions or API routes. These dynamically import a server-side Supabase service-role client, which bypasses RLS. Explicit authorization in these handlers is therefore essential.

`src/router.tsx` creates a QueryClient per router with a 60-second stale time, ten-minute garbage collection, one retry and no window-focus refetch. `src/routes/__root.tsx` installs QueryClientProvider, SessionProvider and BatchProvider, the nested route outlet, toast notifications, metadata, fonts and the service worker registration.

`src/start.ts` attaches the browser session bearer token to server-function calls, catches request errors, and explicitly reinstates CSRF protection for server functions. `src/server.ts` loads TanStack's server entry lazily and converts certain swallowed Nitro/h3 errors into an HTML error page. The React root also has error and 404 views.

The public landing page renders before session resolution. The complete StudentBoard is lazy loaded when a user signs in or clicks preview. Protected profile and admin routes use a pathless authenticated parent with SSR disabled and a `getUser()` check. Dashboard tabs are component state, rather than independent URLs, so reloads reset navigation to the feed.

### Route inventory

| URL | Behavior |
| --- | --- |
| `/` | Landing page, authenticated dashboard, or guest preview shell |
| `/auth` | Sign-in, registration, OTP verification, welcome and recovery flows |
| `/profile` | Authenticated profile editing and password management |
| `/admin` | Authenticated moderator/admin interface; further access decisions occur in components and handlers |
| `/api/public/sync-timetable` | Secret-protected POST that synchronizes configured feeds |
| `/api/public/email-intake` | Secret-protected POST for forwarded email extraction |
| `/sitemap.xml` | Sitemap containing the root URL |

The generated `src/routeTree.gen.ts` wires these routes. It should be treated as generated output.

## 3. Feature map

### Feed and live timetable

`src/components/board/StudentBoard.tsx` is the main orchestration component. It loads deadlines, sessions and courses; manages tabs, filters, search, event drawers, density preferences and secondary overlays; and updates `now` once per second. The feed groups work by urgency and phase, supports a local completion checklist, and shows current classes and breaks through the live-class components.

Deadlines subscribe to Supabase `postgres_changes` filtered by batch; notifications debounce query invalidation by 300 ms. The migration history publishes deadlines to Supabase realtime. Other board data largely uses queries and explicit mutation invalidation; “live” countdowns do not imply every table has realtime subscriptions.

### Deadlines, examinations and syllabus

`src/lib/deadlines.ts` centralizes types, display labels, search, urgency, phase, date formatting and exports. Critical urgency is less than 24 hours away; “soon” is less than 72 hours. Phase uses the start and optional end of an event, including end-of-day treatment for all-day records.

Shared events include quizzes, assignments, presentations, midterms, endterms, guest lectures and miscellaneous entries. They can carry course identifiers, locations, individual/group work, links, notes, syllabus information and approval state. The main feed filters for approved entries. Moderation overlays approve or reject pending deadlines. The ExamsPanel separates midterms and endterms and groups them into ongoing, upcoming and completed phases; quiz cards can display personal marks.

DeadlineDialog and EventDrawer handle shared editing and details. Calendar export creates a Google Calendar URL or a downloadable event `.ics`; this is separate from importing a timetable feed.

### Calendar and subject normalization

CalendarPanel merges deadlines, timetable sessions and day markers. SessionEditDialog supports shared/custom and private session concepts; DayMarkDialog supports batch date annotations.

`src/lib/courses.ts` centralizes subject aliases, canonical names, colors, session labels, faculty/room metadata and breaks. Its shared `isTeachingClass()` excludes holidays, academic-calendar milestones and assessment-like titles, and requires a course name or code. Sunday is treated as a day off by a helper. This classification matters because it drives attendance and live-class presentation; text-based assessment detection can also misclassify unusual course names.

### Attendance

Attendance records have a student, session, batch, status, mark source and leave type. Students write self marks; authorized batch representatives can write rep marks. Rep marks take precedence over self marks for the same session. Batch members can read attendance records under the checked-in policies, so the database privacy boundary is broader than “only my attendance.”

The system assumes unmarked held classes were attended. It counts explicit absences, separates personal and institutional leave, and computes both held-to-date and planned-course figures. Planned classes come from inferred credits × 8, rather than the calendar: one, two and three credits yield 8, 16 and 24 sessions. Course credits are inferred from hardcoded names and substring rules, defaulting to three.

Implemented policies/calculations include:

- 85% safe line and 70% incomplete line.
- A separate 75% current-attendance debarment line and recovery/buffer calculations.
- Personal leave capped at 15%, institutional leave at a base 15%, and combined leave at 30%; unused personal allocation extends institutional allowance.
- One safe absence per credit, then a 0.5 grade-point penalty per excess absence.
- A warning for more than 13 consecutive calendar days across an absence run.
- A bunk simulator for hypothetical outcomes.

These are application assumptions observed in code, not independently verified university regulations. The mixed thresholds need an authoritative product decision before treating outputs as official eligibility advice. Planned-minus-absent figures include future classes, whereas held-minus-absent figures describe completed classes; labels should keep this distinction clear.

### Marks, grading and GPA

There are two grading implementations:

- **Active:** `src/components/grading/GradingPanel.tsx`, imported by StudentBoard, contains eight hardcoded IPM 1 courses and component weightages, plus GpaSimulator. It does not switch curriculum with the selected batch.
- **Alternative:** `src/components/board/GradingPanel.tsx` uses `course_components`, personal `component_marks`, and `src/lib/grading.ts`. This component is not imported by the active board.

The database-backed helper calculates weighted earned points, graded weight, running percentage, projected final score and best case. It encodes separate 40% overall and endterm pass lines, except for MLC courses. The active GPA simulator uses a letter-grade-to-point mapping, credit-weighted TGPA, prior-credit-weighted CGPA and the TGPA required for a target CGPA. It is hypothetical, rather than an official grade import.

`exam_marks` is a separate personal marks model attached to deadlines. Do not confuse exam marks with course-component marks or simulated letter grades.

### Members, announcements, feedback and activity

MembersPanel queries a visible membership directory, displays identity and cohort information, and exposes role/member changes where permitted. AnnouncementsPanel handles batch announcements. FeedbackPanel supports feedback submissions and moderation. ActivityPanel derives a notification feed from member joins, announcements and deadlines.

`src/lib/telemetry.ts` also records user actions to a local 50-item buffer and attempts insertion into `user_activity_logs`. AdminConsolePanel reads activity and student management data and offers password reset and inactive-user cleanup. User-submitted telemetry is not a trustworthy security audit by itself: clients can supply descriptive details and insertion failures are not surfaced.

## 4. Authentication and identity

### Session and roles

SessionProvider centralizes session initialization and auth events. `useAuth()` queries `user_roles`, but also grants frontend administrator status using email/name/metadata substring matches for a particular person. BatchProvider filters ordinary students' visible batches by approved memberships; global admins see all loaded batches. Active batch selection persists under `mahe.batch` in localStorage.

The client-side role flags control available UI, but cannot secure service-role operations. Database policies use explicit role and approved membership helpers under a private schema; some server admin handlers use much weaker overrides.

### Email OTP registration

`requestSignupVerification` validates a learner-domain suffix, password, name, batch and optional roll number; checks existing profiles and the first 1,000 auth users; creates a Supabase signup link/OTP using the admin API; and sends the OTP through custom mail delivery. The browser verifies the code using Supabase and calls `finalizeSignup` to upsert the profile and approved membership.

`finalizeSignup` checks caller UUID and claimed email against the payload, but accepts the batch, name and roll from the request and uses service-role upserts. It does not restrict itself to a one-time completion of verified signup metadata. A signed-in user can therefore request approved membership in another existing batch through this function, subject to database constraints.

### Roster registration

`registerWithRoster` checks a 12-digit MAHE identifier and DOB against `IPM1_ROSTER`. It derives the student's name, short roll and batch, checks duplicates and creates an account with `email_confirm: true`. The browser then signs in with the chosen password.

This path checks knowledge of roster values but does not prove ownership of the supplied learner email. Worse, the roster is directly imported into the browser auth page. The production build contains the MAHE IDs and DOB records in a public JavaScript asset. Treat these values as exposed; they cannot safely serve as secret identity-verification factors.

The roster only supports IPM 1 despite three displayed cohort options. Manual email registration remains a separate path.

### Recovery and password administration

Sign-in accepts email, email prefix, short roll or MAHE ID. The public resolver looks up profile identity and can indicate whether a student is registered. Recovery generates an admin recovery OTP, sends it through the same mailer, and lets Supabase verify the code before password update.

Admin password reset validates the caller token, then accepts explicit admin roles **or** weak email/name/roll overrides. The same pattern appears in inactive-user listing and purge. This is a critical authorization flaw because `profiles.full_name` is editable by students.

### Database identity safeguards

The latest signup trigger checks the email domain, creates profile and student role, fills the roll number from metadata and inserts approved membership if the metadata references an existing batch. A partial unique index prohibits duplicate nonempty `registration_no` values. Profile update protection freezes identity fields for ordinary authenticated users.

The trigger still allows several non-learner test addresses. The roll index is case-sensitive and indexes the stored value without normalization, so case/whitespace variants are not equivalent at the constraint level. Manual and roster routes also use different identifier forms: a typed MAHE ID and the short student roll can represent the same person without being equal strings.

## 5. Database model

There are 29 migration files. Generated TypeScript types describe 22 tables; the later activity-log table is absent from those types and is accessed using `as any`.

| Area | Tables | Responsibility |
| --- | --- | --- |
| Identity | `profiles`, `user_roles` | Student identity/preferences and global permissions |
| Hierarchy | `institutions`, `schools`, `programmes`, `batches`, `sections` | Institutional organization and batch configuration |
| Access | `batch_memberships` | User-to-batch roles and status |
| Board | `deadlines`, `announcements`, `batch_day_marks` | Shared events, notices and calendar annotations |
| Timetable | `courses`, `class_sessions`, `batch_sync_state` | Course catalog, scheduled classes and sync bookkeeping |
| Integration configuration | `batch_registro_credentials`, `batch_feed_tokens` | Legacy Registro credentials and private feed tokens |
| Personal academic data | `attendance_marks`, `exam_marks`, `component_marks` | Attendance and user-entered marks |
| Assessment definitions | `course_components` | Weighted grading components per batch/course |
| Mail intake | `email_ingest` | Raw messages, extraction candidates and review state |
| Support/activity | `feedback`, `user_activity_logs` | Feedback and telemetry |

Private security-definer helpers implement global roles, batch membership, batch management and shared-batch visibility. Later migrations restrict formerly public courses, sessions, announcements and deadlines to batch membership and protect private sessions. Profiles are visible to the owner, approved batchmates and global moderators. RLS filters rows, not individual columns: a visible profile row can expose contact/preferences fields beyond those selected by the directory UI.

Migration chronology matters. Policies often replace earlier definitions, and some policy names differ between revisions. A fresh migration replay and inspection of deployed policies are still needed to prove the effective live permission model.

## 6. External integrations

### Timetable import

Moderators save an HTTPS ICS URL and invoke a server sync. The scheduled POST endpoint checks a shared secret, loads up to 50 configured batches and synchronizes them sequentially. There is no scheduler declaration in `vercel.json`; actual recurring invocation must be configured elsewhere.

The custom ICS parser unfolds continuation lines and extracts VEVENT property maps. It derives UID, title, course, faculty, section, classroom and lecture number. Sync processes at most 5,000 events, upserts chunks of 200 using `(batch_id, external_uid)`, and derives the course catalog.

Sync has a ten-minute lease and pauses after five consecutive failures. However, acquiring the lease is a read then upsert, not an atomic lock, and forced sync skips lease protection. It updates/adds feed events without deleting removed ones. Recurrence rules, exceptions and cancellations are not implemented, and TZID parameters are discarded; non-UTC timestamps are treated as UTC. DST or IST-local feeds can therefore be shifted.

The URL guard requires HTTPS/standard port, rejects embedded credentials and many local/private host literals, and revalidates redirects. It does not resolve DNS to verify destination IPs or bound response time/body size. Private-address DNS resolution remains a risk requiring server-side network controls or stronger destination validation.

### Forwarded mail

Email intake authenticates with `EMAIL_INTAKE_SECRET`, validates a message payload, finds a batch by slug, checks deduplication, and calls an OpenAI-compatible AI gateway using a function-tool extraction schema. The configured default is Lovable's gateway and a Google model string. Raw input is clipped to 12,000 characters for inference and 20,000 for storage.

Messages are stored as pending candidates even if inference fails. A moderator edits/reviews the candidate and publishes a deadline. The publication and review-state update are separate writes, so a failed second write can leave a published deadline with a still-pending email; retries can duplicate the deadline. Parsed AI output is not validated against a runtime schema before persistence.

### Email delivery

The custom OTP mailer tries SMTP and/or Resend depending on configuration, with fallback attempts. If delivery is unavailable, it logs the OTP to the server console and returns a console provider result. The browser still reports that verification was sent. This should fail clearly in production, and OTPs should not be written to routine logs.

## 7. Configuration and operations

Browser configuration uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Server configuration uses `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. Hardcoded fallback connection settings exist. `supabase/config.toml` references a different project ID from the runtime default URL; migrations and deployment configuration need alignment before operating against a database.

Additional settings include `NITRO_PRESET`, SMTP host/port/user/password/from, `MAIL_DRIVER`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, legacy Lovable cron aliases, `EMAIL_INTAKE_SECRET`, and AI gateway URL/key with Gemini/Lovable aliases. A separate cron auth helper supports timing-safe secret comparison and previous-secret rotation, but the timetable endpoint does not use it.

The package scripts provide development, build, preview, lint and formatting. There is no test script or dedicated test suite found. The README's Windows build example uses cmd syntax; in PowerShell the equivalent is `$env:NITRO_PRESET = 'vercel'; npm run build`.

`public/sw.js` caches the landing shell and same-origin GET responses and revalidates cached resources. API/Supabase requests try the network without populating a dedicated offline data store. This is partial offline support, not full offline academic data synchronization. The cache is not user-scoped, and sign-out clears React Query but not local checklist/telemetry/service-worker caches. Checklist keys use only batch ID and are not account-specific; the hook does not actually subscribe to storage events despite its cross-tab comment.

The manifest uses favicon assets rather than dedicated large install icons. Root metadata, canonical URL, sitemap and robots provide basic SEO. Date helpers commonly use the browser/server local timezone rather than the saved profile timezone, despite intake assuming Asia/Kolkata.

## 8. Prioritized findings

### Critical

1. **Service-role credential in source:** `src/integrations/supabase/client.server.ts` embeds a complete privileged fallback key. Rotate/revoke it if active and require server environment configuration. The inspected static client build did not match the service-role markers searched for; source exposure is still sufficient to compromise an active key.
2. **User-editable admin authorization:** `adminResetUserPassword`, `getNeverLoggedInUsersCount` and `purgeNeverLoggedInUsers` accept an editable profile-name match. Remove all substring/metadata identity overrides and authorize using immutable user IDs and explicit database roles. The frontend override and broad SQL admin selection should also be removed.
3. **Public roster plus mailbox-verification bypass:** public bundles contain roster DOBs/MAHE IDs, and roster registration auto-confirms arbitrary learner emails. Move the roster to server-only storage, assume already shipped values are public, and require proof of mailbox ownership before identity claim.

### High

4. **Unrestricted signup finalization:** an authenticated caller can request arbitrary approved batch membership via service-role upsert. Finalization must bind to verified registration intent and authorized batch selection.
5. **Identity normalization gaps:** unique stored strings are insufficient to enforce one account per student across short rolls, MAHE IDs and formatting variations. Use one canonical identity and database-enforced mappings.
6. **OTP delivery failure reported as success:** console fallback exposes codes to logs and misleads users.
7. **Nontransactional account cleanup:** purge deletes profiles/memberships before auth deletion, ignores several database errors, and protects administrators with email heuristics rather than actual role checks. This can leave partially deleted accounts and can select real administrators who never signed in. It also only considers the first 1,000 auth users.

### Correctness and maintainability

8. **Wrong cohort grading data:** active grading is IPM 1 only; database-backed grading is disconnected.
9. **Timetable import drift:** deleted events persist; local timestamps/TZID and recurring events are unsupported; locking is not atomic.
10. **Mixed academic assumptions:** 70%, 75%, 85%, credit-derived budgets and grade deductions need one verified policy definition. The “one class left” warning says the next miss triggers a cut although it actually consumes the final safe allowance.
11. **Intake retries and output validation:** approval should be atomic/idempotent, and AI output should be validated.
12. **Permission/UI mismatches:** StudentBoard combines global moderator status with batch management, while many mutations require batch-specific RLS. A visible control may still fail; frontend identity overrides also do not grant matching database rights.
13. **Guest preview is incomplete:** StudentBoard accepts but does not use `guestPreview`; BatchProvider only loads the batch tree for signed-in users and academic data is membership protected. Preview lacks an explicit safe sample-data path.
14. **Configuration drift:** runtime and Supabase CLI project IDs differ; activity-log types lag migrations; no local cron declaration establishes automatic synchronization.
15. **Rendering/caching debt:** the large board rerenders every second, all dashboard panels are imported through it, and local per-batch checklist state is shared across accounts on the same browser.

## 9. Validation performed

- `npx --no-install tsc --noEmit`: passed with no diagnostics.
- Production build with `NITRO_PRESET=vercel`: passed after an approved rerun outside the sandbox. The initial attempt failed with Windows `EPERM` during Nitro dependency tracing, rather than a TypeScript or application compile failure.
- Source-focused ESLint (`src`, Vite and ESLint configuration): 2,380 problems, including 2,358 errors and 22 warnings. Of the errors, 2,329 are Prettier formatting, 23 are explicit-any violations and six are empty blocks.
- The repository-wide lint command also scans generated `.vercel` output because ESLint's ignore list omits it; this makes it unsuitable as a clean source-only quality gate after building.
- Build output inspection confirmed roster MAHE/DOB records in a public static asset. Privileged credentials were not printed in this report.
- Representative browser bundle sizes: entry 343.54 kB (106.01 kB gzip), StudentBoard 271.23 kB (61.77 kB gzip), BoardHeader 137.93 kB (45.12 kB gzip), stylesheet 167.39 kB (23.77 kB gzip). These are individual asset sizes, not measured page-transfer or performance scores.

No authenticated browser walkthrough, deployed policy inspection, migration replay, live email delivery or external gateway/scheduler validation was performed. The report distinguishes code-observed behavior from those unverified operational details.

## 10. Working map for future changes

| Change | Start here |
| --- | --- |
| Auth/registration/recovery | `src/routes/auth.tsx`, `src/lib/auth.functions.ts`, latest signup migration |
| Session or permissions | `src/hooks/use-auth.tsx`, `src/hooks/use-batch.tsx`, private RLS helper migrations |
| Dashboard/feed | `src/components/board/StudentBoard.tsx`, FeedCard/LiveClass components |
| Shared deadlines | `src/lib/deadlines.ts`, DeadlineDialog, EventDrawer, ApprovalsPanel |
| Timetable sync | `src/lib/ics-sync.server.ts`, `src/lib/timetable.functions.ts`, sync API route |
| Attendance calculations | `src/lib/attendance.ts`, AttendancePanel, BunkSimulatorModal |
| Subject matching | `src/lib/courses.ts` |
| Grading | Active grading component versus database-backed board component; choose one before extending |
| User management | AdminConsolePanel, MembersPanel, admin server functions |
| Mail intake | email-intake route, EmailInboxPanel, `email_ingest` policies |
| Profile | profile route, `src/lib/profile.ts`, immutable-field trigger |
| Appearance/PWA | `src/styles.css`, use-theme, root route, `public/sw.js`, manifest |
| Build/deployment | `vite.config.ts`, `vercel.json`, `package.json` |

Recommended order is to close credential, authorization and registration flaws first; align canonical identity and membership rules next; then reconcile grading/attendance policy and timetable synchronization. Add meaningful security and parser tests around those corrected behaviors before broad cosmetic cleanup.
