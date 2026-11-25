"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "done"; message: string } | { kind: "error"; message: string };

function StatusLine({ status }: { status: Status }) {
  if (status.kind === "done") {
    return (
      <p role="status" className="text-sm text-remembered">
        {status.message}
      </p>
    );
  }
  if (status.kind === "error") {
    return (
      <p role="alert" className="text-sm text-destructive">
        {status.message}
      </p>
    );
  }
  return null;
}

export function ProfileForm({ name: initialName }: { name: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const trimmed = name.trim();
  const unchanged = trimmed === initialName;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed || unchanged) return;
    setStatus({ kind: "saving" });
    const { error } = await authClient.updateUser({ name: trimmed });
    if (error) {
      setStatus({ kind: "error", message: error.message ?? "Couldn't save your name." });
      return;
    }
    setStatus({ kind: "done", message: "Name saved." });
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-2">
      <Label htmlFor="settings-name">Name</Label>
      <div className="flex max-w-md gap-3">
        <Input
          id="settings-name"
          value={name}
          maxLength={100}
          autoComplete="name"
          onChange={(e) => {
            setName(e.target.value);
            setStatus({ kind: "idle" });
          }}
          className="h-9"
        />
        <Button type="submit" variant="outline" size="lg" disabled={!trimmed || unchanged || status.kind === "saving"}>
          {status.kind === "saving" ? "Saving…" : "Save"}
        </Button>
      </div>
      <StatusLine status={status} />
    </form>
  );
}

export function PasswordForm() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) {
      setStatus({ kind: "error", message: "Use at least 8 characters for the new password." });
      return;
    }
    if (next !== confirm) {
      setStatus({ kind: "error", message: "The new passwords don't match." });
      return;
    }
    setStatus({ kind: "saving" });
    const { error } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    });
    if (error) {
      setStatus({
        kind: "error",
        message: error.code === "INVALID_PASSWORD" ? "Your current password is wrong." : (error.message ?? "Couldn't change your password."),
      });
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    setStatus({ kind: "done", message: "Password changed. Your other devices are signed out." });
    router.refresh();
  }

  return (
    <form onSubmit={save} className="max-w-md space-y-3">
      <div className="space-y-2">
        <Label htmlFor="settings-current-password">Current password</Label>
        <Input
          id="settings-current-password"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          className="h-9"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="settings-new-password">New password</Label>
          <Input
            id="settings-new-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="settings-confirm-password">Confirm new password</Label>
          <Input
            id="settings-confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="h-9"
          />
        </div>
      </div>
      <Button type="submit" variant="outline" size="lg" disabled={status.kind === "saving"}>
        {status.kind === "saving" ? "Changing…" : "Change password"}
      </Button>
      <StatusLine status={status} />
    </form>
  );
}

export function SignOutOthersButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function signOutOthers() {
    setStatus({ kind: "saving" });
    const { error } = await authClient.revokeOtherSessions();
    if (error) {
      setStatus({ kind: "error", message: error.message ?? "Couldn't sign out your other devices." });
      return;
    }
    setStatus({ kind: "done", message: "Your other devices are signed out." });
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" size="lg" onClick={signOutOthers} disabled={disabled || status.kind === "saving"}>
        {status.kind === "saving" ? "Signing out…" : "Sign out other devices"}
      </Button>
      <StatusLine status={status} />
    </div>
  );
}

const CONFIRM_PHRASE = "delete all my data";

type DeleteStep = "warn" | "confirm";

export function DeleteAccountDialog({
  email,
  hasPassword,
  attemptCount,
  problemCount,
}: {
  email: string;
  hasPassword: boolean;
  attemptCount: number;
  problemCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<DeleteStep>("warn");
  const [understood, setUnderstood] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // Exact match, case included, so the phrase has to be typed deliberately.
  const phraseMatches = phrase.trim() === CONFIRM_PHRASE;
  const ready = understood && phraseMatches && (!hasPassword || password.length > 0);

  function onOpenChange(next: boolean) {
    if (deleting) return;
    setOpen(next);
    if (!next) {
      setStep("warn");
      setUnderstood(false);
      setPhrase("");
      setPassword("");
      setError("");
    }
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setDeleting(true);
    setError("");
    const { error } = await authClient.deleteUser(hasPassword ? { password } : {});
    if (error) {
      setDeleting(false);
      if (error.code === "INVALID_PASSWORD") setError("That password is wrong. Nothing was deleted.");
      else if (error.code === "PASSWORD_REQUIRED") setError("Enter your password to delete your account.");
      else if (error.code === "SESSION_EXPIRED")
        setError("For your safety, sign out and sign back in, then delete your account within a day of signing in.");
      else setError(error.message ?? "Couldn't delete your account. Nothing was removed.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="destructive" size="lg" />}>Delete account…</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {step === "warn" ? (
          <div className="space-y-4">
            <DialogHeader>
              <p className="text-xs text-muted-foreground">Step 1 of 2</p>
              <DialogTitle className="text-lg font-semibold">Delete all of your LeetPro data?</DialogTitle>
              <DialogDescription>
                Deleting <span className="text-foreground">{email}</span> removes everything below, for good. LeetPro
                keeps no backup, so it cannot be restored.
              </DialogDescription>
            </DialogHeader>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>
                {attemptCount} logged {attemptCount === 1 ? "attempt" : "attempts"}, with every note and solution
              </li>
              <li>
                Progress and review schedule for {problemCount} {problemCount === 1 ? "problem" : "problems"}
              </li>
              <li>Your profile and every sign-in method</li>
              <li>Every signed-in device, including the extension</li>
            </ul>
            <label className="flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-destructive"
              />
              <span>I understand this permanently deletes my account and all of my data.</span>
            </label>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" size="lg" />}>Cancel</DialogClose>
              <Button type="button" variant="destructive" size="lg" disabled={!understood} onClick={() => setStep("confirm")}>
                Continue
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={deleteAccount} className="space-y-4">
            <DialogHeader>
              <p className="text-xs text-muted-foreground">Step 2 of 2</p>
              <DialogTitle className="text-lg font-semibold">Confirm you are deleting all your data</DialogTitle>
              <DialogDescription>
                This is the last step. Once you press Delete everything, your account and data are gone.
              </DialogDescription>
            </DialogHeader>
            {hasPassword && (
              <div className="space-y-2">
                <Label htmlFor="delete-password">Password</Label>
                <Input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-9"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="delete-confirm" className="block">
                Type <span className="font-semibold text-foreground">{CONFIRM_PHRASE}</span> to confirm
              </Label>
              <Input
                id="delete-confirm"
                value={phrase}
                autoComplete="off"
                spellCheck={false}
                onPaste={(e) => e.preventDefault()}
                onChange={(e) => setPhrase(e.target.value)}
                aria-invalid={phrase.length > 0 && !phraseMatches}
                className="h-9"
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" size="lg" disabled={deleting} onClick={() => setStep("warn")}>
                Back
              </Button>
              <Button type="submit" variant="destructive" size="lg" disabled={!ready || deleting}>
                {deleting ? "Deleting…" : "Delete everything"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
