"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface AttemptFormProps {
  problemId: string;
  onSuccess?: () => void;
}

const resultOptions = [
  { value: "solved_independently", label: "Solved independently" },
  { value: "solved_with_hint", label: "Solved with hint" },
  { value: "needed_solution", label: "Needed solution" },
  { value: "could_not_solve", label: "Could not solve" },
];

const helpOptions = [
  { value: "none", label: "None" },
  { value: "hint", label: "Used hint" },
  { value: "solution", label: "Looked at solution" },
  { value: "discussion", label: "Read discussion" },
];

export function AttemptForm({ problemId, onSuccess }: AttemptFormProps) {
  const [result, setResult] = useState("solved_independently");
  const [confidence, setConfidence] = useState(3);
  const [timeMinutes, setTimeMinutes] = useState("");
  const [helpUsed, setHelpUsed] = useState("none");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problemId,
        result,
        confidence,
        timeMinutes: timeMinutes ? parseInt(timeMinutes) : undefined,
        helpUsed,
        notes: notes || undefined,
      }),
    });

    if (res.ok) {
      onSuccess?.();
      setResult("solved_independently");
      setConfidence(3);
      setTimeMinutes("");
      setHelpUsed("none");
      setNotes("");
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Result</Label>
        <Select value={result} onValueChange={(v) => v && setResult(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {resultOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Confidence (1-5)</Label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setConfidence(n)}
              className={cn(
                "h-10 w-10 rounded-md border font-mono text-sm font-medium transition-colors",
                confidence === n
                  ? "border-foreground bg-foreground text-background"
                  : "hover:bg-accent"
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {confidence === 1 && "No idea how to approach"}
          {confidence === 2 && "Struggled significantly"}
          {confidence === 3 && "Solved with some difficulty"}
          {confidence === 4 && "Solved well"}
          {confidence === 5 && "Could do this in my sleep"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="time">Time (minutes)</Label>
          <Input
            id="time"
            type="number"
            min="1"
            placeholder="e.g. 25"
            value={timeMinutes}
            onChange={(e) => setTimeMinutes(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Help used</Label>
          <Select value={helpUsed} onValueChange={(v) => v && setHelpUsed(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {helpOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Key insight, approach used, mistakes to avoid..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Logging..." : "Log attempt"}
      </Button>
    </form>
  );
}
