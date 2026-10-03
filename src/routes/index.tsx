import { lazy, Suspense, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Landing } from "@/components/landing/Landing";

// Lazy load the full student dashboard so guests, audits & crawlers get a feather-light landing page bundle
const StudentBoard = lazy(() => import("@/components/board/StudentBoard"));
const DemoBoard = lazy(() => import("@/components/board/DemoBoard"));

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { preview?: boolean } => ({
    preview:
      search["preview"] === true ||
      search["preview"] === "true" ||
      search["preview"] === 1 ||
      search["preview"] === "1",
  }),
  head: () => ({
    meta: [
      { title: "Zenith — Deadlines, Timetable & Attendance" },
      {
        name: "description",
        content:
          "Zenith is the student command center: quizzes, assignments, exams sorted by time left, live timetable, and real-time attendance margin tracking.",
      },
      { property: "og:title", content: "Zenith — Student Command Center" },
      {
        property: "og:description",
        content:
          "Every deadline, class and attendance mark for your batch, maintained live by your class reps.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.zenithfor.me/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Zenith — Student Command Center" },
      {
        name: "twitter:description",
        content:
          "Every deadline, class and attendance mark for your batch, maintained live by your class reps.",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://www.zenithfor.me/",
      },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  const { user, loading } = useAuth();
  const search = Route.useSearch();
  const [guestPreview, setGuestPreview] = useState(!!search.preview);

  // If loading and we don't have a cached session or guest preview, render Landing immediately.
  // This ensures server-side rendering (SSR) paints the complete Landing page instantaneously,
  // preventing layout shifts, blank screens, and LCP delays.
  if (loading && !guestPreview) {
    return <Landing onPreview={() => setGuestPreview(true)} />;
  }

  if (!user && !guestPreview) {
    return <Landing onPreview={() => setGuestPreview(true)} />;
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-xs text-muted-foreground font-mono">Loading dashboard…</span>
          </div>
        </div>
      }
    >
      {guestPreview ? <DemoBoard /> : <StudentBoard />}
    </Suspense>
  );
}
