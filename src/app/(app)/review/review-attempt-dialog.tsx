"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AttemptForm } from "@/components/attempt-form";

interface ReviewAttemptDialogProps {
  problemId: string;
  problemTitle: string;
}

export function ReviewAttemptDialog({
  problemId,
  problemTitle,
}: ReviewAttemptDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="flex-1" />}>
        Log attempt
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{problemTitle}</DialogTitle>
        </DialogHeader>
        <AttemptForm
          problemId={problemId}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
