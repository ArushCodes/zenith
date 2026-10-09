# Zenith student-site audit — 9 October 2026

Three independent agents reviewed student workflows, data consistency and permissions, and interface accessibility. This is a source-code audit, not a certification of accessibility or a live database-policy audit. Browser visual checks remain unavailable. Duplicate findings are consolidated below.

## Fixed in this pass

Upcoming and ongoing Midterms/Endterms no longer offer Mark done. The feed ignores previously saved premature exam-completion flags, and the toggle handler checks the exam window again at click time. Coursework completion remains available. Regression checks cover future, ongoing and finished exams.

## Highest priority: student-record accuracy

1. **Enter marks once, use them everywhere.** Quiz/exam editors write `exam_marks`, while Grading reads `component_marks`; no bridge was found. A result saved under Quizzes can leave Grading blank. Link each assessment to its course component and reuse its score. Combined quizzes need an explicit mapping rather than automatic guessing. Evidence: `src/components/board/ExamMarks.tsx`, `src/components/board/GradingPanel.tsx`, `src/lib/grading.ts`.

2. **Separate overdue work from finished work.** The feed moves a deadline into completed history when its time window closes, even without a personal completion mark. Keep unsubmitted assignments/projects in Overdue; label expired exam windows Past. A date passing must not imply that a student submitted work. Evidence: `src/components/board/StudentBoard.tsx` upcoming/completed filters; `src/lib/deadlines.ts` phaseOf.

3. **Use one attendance status across the site.** Feed and timetable controls inspect self marks; allowance calculations resolve representative marks first. Green Present can coexist with a representative absence counted in the tracker. Display the resolved status consistently and distinguish a representative record from a personal estimate. An overriding record needs a clear indicator rather than an ineffective personal toggle. Evidence: `LiveClassHero.tsx` myMarks; `TimetablePanel.tsx` absentIds; `src/lib/course-attendance.ts`; `src/lib/attendance.ts` resolveMarks.

4. **Separate actual attendance from a full-term projection.** Attendance displays `(planned sessions - absences) / planned sessions`, which includes future sessions. One absence in a 24-session subject appears as about 96%, even if only two classes were held. Lead with safe absences remaining; show attended/held for the actual percentage. Label a projection explicitly. Evidence: `src/components/attendance/AttendancePanel.tsx` statistics and percentage display.

## Workflow and data correctness

5. **Use approved events in the timetable.** The feed filters approved deadlines, but the timetable loops through all readable deadlines. Owners/moderators who can read pending or rejected submissions can see them as scheduled events. Apply the same approved filter; keep review items in the inbox. Evidence: `src/components/timetable/TimetablePanel.tsx` deadline query and grouping loops; `StudentBoard.tsx` approved.

6. **Preserve unknown times during email review.** Email notice review requires a datetime and publication does not carry all_day/end_at. Date-known, time-unknown notices therefore need an invented time and exam windows can be lost. Use date plus optional time, preserve end times, and publish Time TBA where appropriate. Evidence: `src/components/board/EmailInboxPanel.tsx`, `src/lib/notice-drafts.ts`, `review_email_candidate` migration.

7. **Use catalog credits for absence allowances.** Credit inference uses substring matches, including `ai`; Retail Management can be classified as a two-credit AI course. Read credits from the course catalog and show an explicit unknown state for unmatched courses. Evidence: `src/lib/attendance.ts` courseCredits; `AttendancePanel.tsx` statistics.

8. **Use India dates consistently.** Timetable times are formatted in IST, but day grouping, month bounds and Today use device-local dates. Calendar slot assignment also uses getHours rather than the shared IST slot helper and overwrites multiple sessions assigned to one slot. Use dayKey/IST boundaries and arrays per slot. Evidence: `TimetablePanel.tsx` todayKey and grouping; `CalendarPanel.tsx` ClassDots.

9. **Distinguish query failure from an empty record.** Grading ignores component/mark query errors and personal-mark loading. A failed request can look like no marks were saved. Add Retry states and keep score editing disabled while personal marks are unresolved. Apply the same treatment to timetable/attendance queries. Evidence: `src/components/board/GradingPanel.tsx` queries and empty state; `TimetablePanel.tsx` queries.

10. **Centralize deletion confirmation.** Feed cards request confirmation, but assessment rows and the event drawer call deletion immediately. Deleting an event can cascade its saved exam marks. Use one confirmation naming the event and warning when recorded marks will be removed. Evidence: `FeedCard.tsx`, `AssessmentAgenda.tsx`, `EventDrawer.tsx`, `StudentBoard.tsx` delete mutation and exam_marks foreign key.

11. **Source assessment weight from its course component.** Quiz entry defaults to zero weight, while the generic exam editor defaults to 20%. These are editor defaults, not a reliable link to confirmed grading weights. Show Weight not set when the mapping is unknown; reuse the component weight after linking. Evidence: `AssessmentAgenda.tsx` defaultWeight; `ExamMarks.tsx` defaultWeight.

12. **Make same-subject tasks distinguishable.** Subject-only feed rows can make Quiz 1 and Quiz 2 look identical on phones. Keep the subject as main text, but use Quiz 1/Quiz 2 in the type badge and a short meaningful topic for assignments/presentations. The full title should remain available without relying on hover. Evidence: `src/components/board/FeedCard.tsx` compact labels.

13. **Calculate preparation progress before filtering done items.** `allUpcoming` removes personally completed items, and the prepared counter then counts completed flags in that already-filtered list. It therefore cannot reflect preparation progress. Compute the counter from all still-relevant coursework before hiding done rows. Keep future exams out of completion counts. Evidence: `src/components/board/StudentBoard.tsx` allUpcoming and completedUpcomingCount.
## Accessibility and interaction

14. **Give the event drawer real modal behavior.** It declares aria-modal but uses a manual aside without focus trapping, initial/return focus, Escape handling or background inertness. Reuse the existing Radix Sheet/Dialog shell while retaining its appearance. Evidence: `src/components/board/EventDrawer.tsx`.

15. **Finish keyboard access in calendar cells.** ClassDots uses clickable divs for manager editing; day-style controls depend on hover. Use native buttons, reveal controls on keyboard focus, and keep nested actions independent of day navigation. Evidence: `src/components/calendar/CalendarPanel.tsx` ClassDots and day-style action.

16. **Give attendance subject selection a useful result.** Clicking a subject only changes its highlight. Either open that subject's class history or make the rows static. Evidence: `src/components/attendance/AttendancePanel.tsx` focus/SubjectRow.

17. **Make prediction sliders identifiable to assistive technology.** Every component forecast is labelled Predict. Keep the visible label short, but include the course/component in its accessible name and announce percent score plus weighted contribution. Evidence: `src/components/board/GradingPanel.tsx` prediction range input.

18. **Unify attendance controls.** The attendance tab still uses Mark Absent/Official IL while feed and timetable use Present/Absent. Reuse the shared control, show leave type only when needed, and expose selection with aria-pressed. Evidence: `src/components/attendance/AttendancePanel.tsx` absence/leave controls.

## Recommended order

First unify score storage and attendance status, then separate Overdue/Past/Done. Next fix approval filtering, optional notice times, catalog credits and IST date grouping. Finish the drawer, calendar keyboard controls, task labels and prediction names. These changes improve trust and everyday use without a visual overhaul.

The review did not establish a live RLS/authentication vulnerability. Source ownership filters and reviewed-notice publication appeared scoped; live database policies were not tested.
