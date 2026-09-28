import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  Copy,
  Check,
  Search,
  User,
  ShieldAlert,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { adminResetUserPassword } from "@/lib/auth.functions";
import type { DirectoryRow } from "@/lib/batches";

export type PasswordTarget = {
  userId?: string;
  name?: string;
  email?: string;
  roll?: string;
  batchName?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser?: PasswordTarget | null;
  allMembers?: DirectoryRow[];
};

function generateSecurePassword(): string {
  const words = ["Zenith", "Tapmi", "Solar", "Falcon", "Quantum", "Apex", "Nova", "Aero", "Pulse", "Cyber"];
  const word1 = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(100 + Math.random() * 900);
  const specials = ["#", "!", "@", "$", "*"];
  const special = specials[Math.floor(Math.random() * specials.length)];
  const suffix = Math.random().toString(36).substring(2, 4);
  return `${word1}#${num}${special}${suffix}`;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
  targetUser = null,
  allMembers = [],
}: Props) {
  const queryClient = useQueryClient();

  const [selectedUser, setSelectedUser] = useState<PasswordTarget | null>(targetUser ?? null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isManualInput, setIsManualInput] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [manualRoll, setManualRoll] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync targetUser when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedUser(targetUser ?? null);
      setPassword("");
      setConfirmPassword("");
      setSearchQuery("");
      setIsManualInput(false);
      setManualEmail("");
      setManualRoll("");
      setCopied(false);
    }
  }, [open, targetUser]);

  // Filter members for selection
  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return allMembers.slice(0, 8);
    const q = searchQuery.toLowerCase().trim();
    return allMembers
      .filter((m) => {
        const name = (m.profiles?.full_name ?? "").toLowerCase();
        const email = (m.profiles?.email ?? "").toLowerCase();
        const reg = (m.profiles?.registration_no ?? "").toLowerCase();
        return name.includes(q) || email.includes(q) || reg.includes(q);
      })
      .slice(0, 10);
  }, [allMembers, searchQuery]);

  const resetMutation = useMutation({
    mutationFn: async () => {
      const targetUserId = selectedUser?.userId;
      const targetEmail = isManualInput ? manualEmail.trim() : selectedUser?.email;
      const targetRollNo = isManualInput ? manualRoll.trim() : selectedUser?.roll;

      if (!targetUserId && !targetEmail && !targetRollNo) {
        throw new Error("Please select a student or enter their email address.");
      }

      if (!password || password.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }

      if (confirmPassword && password !== confirmPassword) {
        throw new Error("Passwords do not match. Please verify.");
      }

      return await adminResetUserPassword({
        data: {
          targetUserId,
          targetEmail: targetEmail || undefined,
          targetRollNo: targetRollNo || undefined,
          newPassword: password,
        },
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-activity-logs"] });
      toast.success(res.message || "Password updated successfully!");
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update password");
    },
  });

  function handleGeneratePassword() {
    const pwd = generateSecurePassword();
    setPassword(pwd);
    setConfirmPassword(pwd);
    setShowPassword(true);
    navigator.clipboard?.writeText(pwd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Generated & copied new password to clipboard!");
    }).catch(() => {
      // fallback
    });
  }

  function handleCopy() {
    if (!password) return;
    navigator.clipboard?.writeText(password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Password copied to clipboard");
    });
  }

  const isSelected = !!selectedUser || (isManualInput && !!manualEmail.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg overflow-hidden rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-2xl">
        <DialogHeader className="space-y-1.5 text-left">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-cyan/15 text-cyan border border-cyan/30">
              <KeyRound className="size-4" />
            </span>
            <div>
              <DialogTitle className="font-display text-base sm:text-lg font-bold tracking-tight text-ink">
                Admin Password Reset
              </DialogTitle>
              <DialogDescription className="text-xs text-dim">
                Reset student login credentials with Supabase service authentication.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 1. Target Student Selection / Display */}
          <div className="rounded-xl border border-border bg-surface2/40 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-dim">
                Target Student
              </span>
              {selectedUser && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setIsManualInput(false);
                  }}
                  className="text-[11px] font-medium text-cyan hover:underline"
                >
                  Change student
                </button>
              )}
            </div>

            {selectedUser ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-surface p-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-cyan/15 font-display text-xs font-bold text-cyan">
                    {(selectedUser.name || selectedUser.email || "S")
                      .substring(0, 2)
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-ink">
                      {selectedUser.name || "Student"}
                    </p>
                    <p className="truncate font-mono text-[10px] text-dim">
                      {selectedUser.email}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {selectedUser.roll && (
                    <span className="rounded bg-surface2 px-1.5 py-0.5 font-mono text-[10px] text-dim border border-border">
                      {selectedUser.roll}
                    </span>
                  )}
                  {selectedUser.batchName && (
                    <span className="rounded bg-cyan/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan border border-cyan/20">
                      {selectedUser.batchName}
                    </span>
                  )}
                </div>
              </div>
            ) : !isManualInput ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by student name, roll number, or email..."
                    className="w-full rounded-lg border border-border bg-surface pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-faint focus:border-cyan focus:outline-hidden"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1 divide-y divide-border/40 rounded-lg border border-border/60 bg-surface p-1">
                  {filteredCandidates.length === 0 ? (
                    <p className="p-3 text-center text-[11px] text-dim">
                      No matching students found in directory.
                    </p>
                  ) : (
                    filteredCandidates.map((m) => {
                      const name =
                        m.profiles?.full_name ??
                        m.profiles?.email?.split("@")[0] ??
                        "Student";
                      const email = m.profiles?.email ?? "";
                      const reg = m.profiles?.registration_no ?? "";
                      const batch = m.batches?.name ?? "";

                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setSelectedUser({
                              userId: m.user_id,
                              name,
                              email,
                              roll: reg,
                              batchName: batch,
                            });
                          }}
                          className="flex w-full items-center justify-between p-2 text-left hover:bg-surface2/60 rounded-md transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="truncate text-xs font-semibold text-ink">{name}</p>
                            <p className="truncate font-mono text-[10px] text-dim">{email}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1 font-mono text-[10px] text-faint">
                            {reg && <span>{reg}</span>}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsManualInput(true)}
                  className="text-[11px] text-dim hover:text-cyan underline"
                >
                  Or enter learner email manually
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-medium text-dim">
                    Learner Email Address
                  </label>
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="student.tapmimpl2026@learner.manipal.edu"
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-ink placeholder:text-faint focus:border-cyan focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-dim">
                    Roll No / Reg No (Optional)
                  </label>
                  <input
                    type="text"
                    value={manualRoll}
                    onChange={(e) => setManualRoll(e.target.value)}
                    placeholder="e.g. 26U17 or 261600130020"
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-ink placeholder:text-faint focus:border-cyan focus:outline-hidden"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsManualInput(false)}
                  className="text-[11px] text-dim hover:text-cyan underline"
                >
                  Back to student list search
                </button>
              </div>
            )}
          </div>

          {/* 2. New Password Field */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-ink">
                New Password <span className="text-cyan">*</span>
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="flex items-center gap-1 text-[11px] font-semibold text-cyan hover:text-cyan/80 transition-colors"
              >
                <Sparkles className="size-3" />
                <span>Generate Random</span>
              </button>
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-xl border border-border bg-surface pl-3 pr-20 py-2 text-xs font-mono text-ink placeholder:text-faint focus:border-cyan focus:outline-hidden"
              />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                {password && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    title="Copy password"
                    className="rounded p-1 text-dim hover:text-ink transition-colors"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="rounded p-1 text-dim hover:text-ink transition-colors"
                >
                  {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (only needed if typed manually) */}
            {password && confirmPassword !== password && (
              <div>
                <label className="text-[11px] font-medium text-dim">Confirm Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-mono text-ink placeholder:text-faint focus:border-cyan focus:outline-hidden"
                />
              </div>
            )}

            {/* Helpful security tip */}
            <div className="flex items-start gap-2 rounded-xl bg-cyan/5 border border-cyan/15 p-2.5 text-[11px] text-dim">
              <ShieldAlert className="size-4 shrink-0 text-cyan mt-0.5" />
              <span>
                The password will update immediately in Supabase Auth. The student will be able to log in with this new password right away.
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center justify-end gap-2 border-t border-border/60 pt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={resetMutation.isPending}
            className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-dim hover:bg-surface2 hover:text-ink transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending || !isSelected || !password || password.length < 6}
            className="flex items-center gap-2 rounded-xl bg-cyan px-4 py-2 text-xs font-semibold text-ground ring-1 ring-cyan hover:bg-cyan/90 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resetMutation.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <KeyRound className="size-3.5" />
                <span>Update Password</span>
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
