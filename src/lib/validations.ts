import { z } from "zod";

export const detectProblemSchema = z.object({
  leetcodeId: z.number().int().positive().optional(),
  neetcodeId: z.string().optional(),
  title: z.string().min(1),
  slug: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  url: z.string().url(),
  platform: z.enum(["leetcode", "neetcode"]).default("leetcode"),
  topics: z.array(z.string()).optional(),
  lists: z.array(z.string()).optional(),
});

export const logAttemptSchema = z.object({
  problemId: z.string().min(1),
  timeMinutes: z.number().int().positive().optional(),
  result: z.enum([
    "solved_independently",
    "solved_with_hint",
    "needed_solution",
    "could_not_solve",
  ]),
  confidence: z.number().int().min(1).max(5),
  helpUsed: z
    .enum(["none", "hint", "solution", "discussion"])
    .default("none"),
  approach: z.string().optional(),
  notes: z.string().optional(),
  patterns: z.array(z.string()).optional(),
});

export type DetectProblemInput = z.infer<typeof detectProblemSchema>;
export type LogAttemptInput = z.infer<typeof logAttemptSchema>;
