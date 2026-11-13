import { z } from "zod";

const tagList = z.array(z.string().min(1).max(80)).max(30);

export const detectProblemSchema = z.object({
  leetcodeId: z.number().int().positive().optional(),
  neetcodeId: z.string().max(200).optional(),
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[\w-]+$/, "slug may only contain letters, digits, _ and -"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  // Ignored: the server builds the link from the slug. Kept optional so older
  // extension builds that still send it are accepted.
  url: z.string().max(500).optional(),
  platform: z.enum(["leetcode", "neetcode"]).default("leetcode"),
  topics: tagList.optional(),
  lists: tagList.optional(),
});

export const logAttemptSchema = z.object({
  problemId: z.string().min(1).max(100),
  timeMinutes: z.number().int().positive().max(10_000).optional(),
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
  approach: z.string().max(10_000).optional(),
  notes: z.string().max(10_000).optional(),
  solution: z.string().max(100_000).optional(),
  language: z.string().max(40).optional(),
  patterns: tagList.optional(),
});

export const updateAttemptSchema = z.object({
  timeMinutes: z.number().int().positive().max(10_000).nullable().optional(),
  result: logAttemptSchema.shape.result.optional(),
  confidence: logAttemptSchema.shape.confidence.optional(),
  helpUsed: z.enum(["none", "hint", "solution", "discussion"]).optional(),
  notes: z.string().max(10_000).nullable().optional(),
  solution: z.string().max(100_000).nullable().optional(),
  language: z.string().max(40).nullable().optional(),
});

export type DetectProblemInput = z.infer<typeof detectProblemSchema>;
export type LogAttemptInput = z.infer<typeof logAttemptSchema>;
export type UpdateAttemptInput = z.infer<typeof updateAttemptSchema>;
