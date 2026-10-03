import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronDown, LogOut, Moon, ShieldCheck, Sun, UserRound } from "lucide-react";
import { db as supabase } from "@/lib/backend";
import { useAuth } from "@/hooks/use-auth";
import { useMe } from "@/hooks/use-me";
import { useTheme } from "@/hooks/use-theme";
import { BatchSelector } from "@/components/board/BatchSelector";
import { GlobalSearch } from "@/components/board/GlobalSearch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const spring = { type: "spring" as const, stiffness: 420, damping: 32 };

export type HeaderMenuItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | undefined;
};

type Props = {
  /** Secondary board sections surfaced from the profile menu instead of the tab bar. */
  menuItems?: HeaderMenuItem[];
  onMenuSelect?: (key: string) => void;
  onLogoClick?: () => void;
};

const LOGO_LETTERS = ["z", "e", "n", "i", "t", "h"];

export function BoardHeader({ menuItems = [], onMenuSelect, onLogoClick }: Props) {
  const { user, isModerator, isAdmin, isArush } = useAuth();
  const me = useMe();
  const { theme, toggle } = useTheme();

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [scrolled, setScrolled] = useState(false);
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const initials = (user?.user_metadata?.["full_name"] ?? user?.email ?? "")
    .toString()
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase())
    .join("");

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    window.localStorage.removeItem("zenith.telemetry_stream");
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`sticky top-0 z-40 border-b border-border bg-ground/85 backdrop-blur-xl transition-shadow duration-300 ${
        scrolled ? "shadow-lg shadow-black/[0.06] dark:shadow-black/20" : ""
      }`}
    >
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between gap-1.5 sm:gap-3 px-3 sm:px-6 lg:px-8">
        {/* Kinetic Animated Zenith Logo */}
        <Link
          to="/"
          onClick={(e) => {
            if (onLogoClick) {
              e.preventDefault();
              onLogoClick();
            }
          }}
          onMouseEnter={() => setIsLogoHovered(true)}
          onMouseLeave={() => setIsLogoHovered(false)}
          className="header-brand group relative flex shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 rounded-xl py-1 px-1 -ml-1 select-none cursor-pointer"
        >
          <motion.div
            whileTap={{ scale: 0.94 }}
            className="relative flex items-center leading-none"
          >
            {/* Luminous ambient glow on hover */}
            <motion.div
              animate={{
                opacity: isLogoHovered ? 0.35 : 0,
                scale: isLogoHovered ? 1.3 : 0.8,
                filter: "blur(14px)",
              }}
              transition={{ duration: 0.25 }}
              className="absolute -inset-1 rounded-full bg-cyan pointer-events-none -z-10"
            />

            {/* Letter-by-letter kinetic spring wave */}
            <div className="flex items-baseline">
              {LOGO_LETTERS.map((letter, i) => (
                <motion.span
                  key={i}
                  animate={
                    isLogoHovered
                      ? {
                          y: [0, -5, 0],
                          scale: [1, 1.14, 1],
                          rotate: i % 2 === 0 ? [0, -4, 0] : [0, 4, 0],
                        }
                      : { y: 0, scale: 1, rotate: 0 }
                  }
                  transition={{
                    delay: i * 0.04,
                    type: "spring",
                    stiffness: 600,
                    damping: 14,
                  }}
                  className="font-display text-2xl sm:text-[28px] font-black italic tracking-[-0.05em] text-cyan transition-colors"
                >
                  {letter}
                </motion.span>
              ))}

              {/* Animated pulse dot */}
              <motion.span
                animate={
                  isLogoHovered
                    ? {
                        scale: [1, 1.6, 1],
                        y: [0, -3, 0],
                      }
                    : { scale: 1, y: 0 }
                }
                transition={{
                  delay: 0.24,
                  type: "spring",
                  stiffness: 700,
                  damping: 12,
                }}
                className="ml-0.5 size-1.5 sm:size-2 rounded-full bg-cyan inline-block shadow-xs shadow-cyan/60"
              />
            </div>
          </motion.div>
        </Link>

        <div className="board-header-actions flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2">
          {user && (
            <div className="board-header-search min-w-0 mr-auto">
              <GlobalSearch />
            </div>
          )}
          <BatchSelector />

          {(isAdmin || isArush) && (
            <div
              title="Master Administrator Mode Active"
              className="hidden md:flex items-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shadow-2xs cursor-default"
            >
              <ShieldCheck className="size-3" />
              <span>ADMIN</span>
            </div>
          )}

          <button
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            className="grid size-8 sm:size-9 shrink-0 place-items-center rounded-xl border border-border bg-surface text-dim transition-colors hover:border-cyan/40 hover:text-ink cursor-pointer"
          >
            {theme === "dark" ? (
              <Sun className="size-3.5 sm:size-4" />
            ) : (
              <Moon className="size-3.5 sm:size-4" />
            )}
          </button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-border bg-surface py-1 sm:py-1.5 pl-1 sm:pl-1.5 pr-2 sm:pr-2.5 transition-colors hover:border-cyan/40 cursor-pointer shrink-0">
                <span className="grid size-6 sm:size-7 place-items-center rounded-lg bg-cyan/12 font-display text-[10px] sm:text-[11px] font-semibold text-cyan">
                  {initials || "Z"}
                </span>
                <span className="hidden max-w-[90px] sm:max-w-[120px] truncate text-[12px] sm:text-[13px] font-medium sm:inline">
                  {me.name || "Account"}
                </span>
                <ChevronDown className="size-3 sm:size-3.5 text-faint" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={6}
                collisionPadding={12}
                className="w-56 z-50"
              >
                <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                  Account
                </DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2">
                    <UserRound className="size-4 text-dim" /> Profile
                  </Link>
                </DropdownMenuItem>
                {isAdmin || isArush ? (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-emerald-400" /> Admin console
                    </Link>
                  </DropdownMenuItem>
                ) : isModerator ? (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-dim" /> Moderator console
                    </Link>
                  </DropdownMenuItem>
                ) : null}

                {menuItems.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                      Batch
                    </DropdownMenuLabel>
                    {menuItems.map((m) => (
                      <DropdownMenuItem
                        key={m.key}
                        onSelect={() => onMenuSelect?.(m.key)}
                        className="flex items-center gap-2"
                      >
                        <span className="text-dim">{m.icon}</span>
                        {m.label}
                        {m.badge ? (
                          <span className="ml-auto rounded-full bg-cyan/15 px-1.5 py-0.5 font-mono text-[10px] leading-none text-cyan">
                            {m.badge}
                          </span>
                        ) : null}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => void signOut()}
                  className="flex items-center gap-2 text-rose"
                >
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-2 rounded-xl bg-cyan px-3.5 py-2 text-[13px] font-semibold text-white"
            >
              <UserRound className="size-3.5" /> Sign in
            </Link>
          )}
        </div>
      </div>
    </motion.header>
  );
}
