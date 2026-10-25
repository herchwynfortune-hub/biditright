import { z } from "zod";

export const SUBJECTS = [
  { value: "english_grammar", label: "English grammar" },
  { value: "vocabulary", label: "Vocabulary" },
  { value: "maths", label: "Maths" },
  { value: "science", label: "Science" },
  { value: "history", label: "History" },
  { value: "other", label: "Other" },
] as const;

export const ERROR_TAGS = ["tense", "article", "agreement", "form", "fact", "other"] as const;

export const generateSetInputSchema = z.object({
  subject: z.enum(SUBJECTS.map((s) => s.value) as [string, ...string[]]),
  level: z.string().trim().min(1).max(40),
  topic: z.string().trim().min(1).max(200),
  count: z.number().int().min(8).max(15),
  wrongPercent: z.number().int().min(10).max(90),
  commonErrors: z.string().trim().max(300).optional(),
});

export type GenerateSetInput = z.infer<typeof generateSetInputSchema>;

export const generatedStatementSchema = z
  .object({
    text: z.string().trim().min(1).max(300),
    is_correct: z.boolean(),
    correction: z.string().trim().min(1).max(300).nullable(),
    explanation: z.string().trim().min(1).max(300).nullable(),
    error_tag: z.enum(ERROR_TAGS).nullable(),
  })
  .refine((s) => s.is_correct || (s.correction && s.error_tag), {
    message: "Incorrect statements need a correction and an error_tag",
  })
  .refine((s) => !s.is_correct || (!s.correction && !s.error_tag), {
    message: "Correct statements must not have a correction or error_tag",
  });

export const generatedSetSchema = z.object({
  statements: z.array(generatedStatementSchema).min(8).max(15),
});

export type GeneratedStatement = z.infer<typeof generatedStatementSchema>;
