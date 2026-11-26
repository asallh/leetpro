"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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

interface RemoveAttemptProps {
  attemptId: string;
  attemptNumber: number;
  /** True when this is the problem's only attempt, so removing it untracks the problem. */
  isOnly: boolean;
}

export function RemoveAttempt({ attemptId, attemptNumber, isOnly }: RemoveAttemptProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function remove() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/attempts/${attemptId}`, { method: "DELETE" });
      if (!res.ok) {
        setError(
          res.status === 404
            ? "That attempt is already gone. Refresh the page."
            : "Couldn't remove the attempt. Nothing was changed.",
        );
        return;
      }
      const { remaining } = (await res.json()) as { remaining: number };
      setOpen(false);
      if (remaining === 0) router.push("/problems");
      else router.refresh();
    } catch {
      setError("Couldn't reach LeetPro. Nothing was changed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-muted-foreground hover:text-destructive"
            aria-label={`Remove attempt ${attemptNumber}`}
          />
        }
      >
        Remove
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Remove attempt {attemptNumber}?</DialogTitle>
          <DialogDescription>
            {isOnly
              ? "This is the only attempt on this problem, so it will stop being tracked and leave your review queue."
              : "Its notes and confidence are deleted, and the review schedule is worked out again from your other attempts."}{" "}
            This can&rsquo;t be undone.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" size="lg" />}>Cancel</DialogClose>
          <Button type="button" variant="destructive" size="lg" disabled={pending} onClick={remove}>
            {pending ? "Removing…" : "Remove attempt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
