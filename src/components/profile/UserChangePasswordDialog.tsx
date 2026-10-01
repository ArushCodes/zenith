import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { db as supabase } from "@/lib/backend";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail?: string;
}

function generateStrongPassword(): string {
  const words = ["Solar", "Zenith", "Quantum", "Falcon", "Apex", "Orbit", "Pulse", "Cyber", "Nova", "Aero"];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(100 + Math.random() * 900);
  const chars = "!@#$%&*";
  const char = chars[Math.floor(Math.random() * chars.length)];
  const suffix = Math.random().toString(36).substring(2, 5);
  return `${word}#${num}${char}${suffix}`;
}

export function UserChangePasswordDialog({ open, onOpenChange, userEmail }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const resetState = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setBusy(false);
  };

  const handleGenerate = () => {
    const pwd = generateStrongPassword();
    setNewPassword(pwd);
    setConfirmPassword(pwd);
    setShowNew(true);
    setShowConfirm(true);
    toast.info("Secure password generated! Remember to note it down.", {
      icon: <Sparkles className="size-4 text-cyan" />,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword) {
      toast.error("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      // If current password was provided and email is known, verify it first for safety
      if (currentPassword && userEmail) {
        const { error: verifyErr } = await supabase.auth.signInWithPassword({
          email: userEmail.trim().toLowerCase(),
          password: currentPassword,
        });

        if (verifyErr) {
          throw new Error("Current password is incorrect. Please verify your old password.");
        }
      }

      // Update password for the currently signed-in user
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateErr) {
        throw new Error(updateErr.message || "Failed to update password.");
      }

      toast.success("Password changed successfully!", {
        icon: <CheckCircle2 className="size-4 text-emerald-500" />,
      });
      resetState();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md border border-border bg-surface/95 backdrop-blur-2xl shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="space-y-1.5 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-cyan/12 text-cyan ring-1 ring-cyan/30">
              <KeyRound className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg font-bold text-ink">
                Change Password
              </DialogTitle>
              <DialogDescription className="font-mono text-xs text-dim">
                Update credentials for {userEmail || "your account"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          {/* Current Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="user-current-pwd"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint"
              >
                Current Password
              </label>
              <a
                href="/auth?mode=forgot"
                className="font-mono text-[10px] text-cyan hover:underline transition-all"
              >
                Forgot?
              </a>
            </div>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 size-4 text-faint pointer-events-none" />
              <input
                id="user-current-pwd"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password (if set)"
                className="w-full rounded-xl bg-surface2/60 pl-10 pr-10 py-2.5 text-sm text-ink ring-1 ring-border outline-none transition-all placeholder:text-faint hover:ring-cyan/25 focus:bg-surface2 focus:ring-2 focus:ring-cyan/50"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                tabIndex={-1}
                className="absolute right-3 text-faint hover:text-ink transition-colors cursor-pointer"
              >
                {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* New Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="user-new-pwd"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint"
              >
                New Password
              </label>
              <button
                type="button"
                onClick={handleGenerate}
                className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-cyan hover:underline transition-all cursor-pointer"
              >
                <Sparkles className="size-3" /> Generate strong
              </button>
            </div>
            <div className="relative flex items-center">
              <KeyRound className="absolute left-3.5 size-4 text-faint pointer-events-none" />
              <input
                id="user-new-pwd"
                type={showNew ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full rounded-xl bg-surface2/60 pl-10 pr-10 py-2.5 text-sm text-ink ring-1 ring-border outline-none transition-all placeholder:text-faint hover:ring-cyan/25 focus:bg-surface2 focus:ring-2 focus:ring-cyan/50"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                tabIndex={-1}
                className="absolute right-3 text-faint hover:text-ink transition-colors cursor-pointer"
              >
                {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label
              htmlFor="user-confirm-pwd"
              className="block mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-faint"
            >
              Confirm New Password
            </label>
            <div className="relative flex items-center">
              <ShieldCheck className="absolute left-3.5 size-4 text-faint pointer-events-none" />
              <input
                id="user-confirm-pwd"
                type={showConfirm ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full rounded-xl bg-surface2/60 pl-10 pr-10 py-2.5 text-sm text-ink ring-1 ring-border outline-none transition-all placeholder:text-faint hover:ring-cyan/25 focus:bg-surface2 focus:ring-2 focus:ring-cyan/50"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                tabIndex={-1}
                className="absolute right-3 text-faint hover:text-ink transition-colors cursor-pointer"
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/80">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              className="rounded-xl px-4 py-2 font-mono text-xs text-dim hover:text-ink ring-1 ring-border transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <motion.button
              type="submit"
              disabled={busy}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 rounded-xl bg-cyan px-4 py-2 text-xs font-semibold text-ground shadow-sm hover:bg-cyan/90 disabled:opacity-50 transition-all cursor-pointer"
            >
              {busy ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Updating…</span>
                </>
              ) : (
                <>
                  <KeyRound className="size-3.5" />
                  <span>Update Password</span>
                </>
              )}
            </motion.button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
