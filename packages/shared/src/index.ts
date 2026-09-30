import { z } from 'zod';

export const categorySchema = z.union([z.literal('random'), z.string().trim().min(1).max(20)]);
export const modeSchema = z.enum(['both', 'attack', 'defense']);
export const roleSchema = z.enum(['player', 'assistant']);
export const replySchema = z.enum(['yes', 'no', 'unknown']);
export const statusSchema = z.enum(['playing', 'won', 'lost']);

export const historyEntrySchema = z.object({
  role: roleSchema,
  kind: z.enum(['question', 'answer', 'guess']),
  text: z.string(),
});

export const publicGameSchema = z.object({
  id: z.string().uuid(),
  category: categorySchema,
  mode: modeSchema,
  phase: z.enum(['attack', 'defense']),
  attackResult: z.enum(['won', 'lost']).optional(),
  status: statusSchema,
  questionCount: z.number().int().nonnegative(),
  maxQuestions: z.number().int().positive(),
  history: z.array(historyEntrySchema),
});

export const startRequestSchema = z.object({
  category: categorySchema,
  maxQuestions: z.number().int().min(1).max(50),
  mode: modeSchema,
  word: z.string().trim().min(1).optional(),
});

export const actionRequestSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('question'), text: z.string().trim().min(1).max(300) }),
  z.object({ kind: z.literal('guess'), text: z.string().trim().min(1).max(100) }),
  z.object({ kind: z.literal('answer'), reply: replySchema }),
  z.object({ kind: z.literal('next') }),
]);

export const gameResponseSchema = z.object({ game: publicGameSchema });

export const tossLoginRequestSchema = z.object({
  authorizationCode: z.string().min(1).max(2048),
  referrer: z.enum(['DEFAULT', 'SANDBOX']),
});

export const authResponseSchema = z.object({ authenticated: z.boolean() });

export const statusResponseSchema = z.object({
  total: z.number().int().nonnegative(),
  playing: z.number().int().nonnegative(),
  won: z.number().int().nonnegative(),
  lost: z.number().int().nonnegative(),
  animals: z.number().int().nonnegative(),
  food: z.number().int().nonnegative(),
});

export type Category = z.infer<typeof categorySchema>;
export type GameMode = z.infer<typeof modeSchema>;
export type GameRole = z.infer<typeof roleSchema>;
export type Reply = z.infer<typeof replySchema>;
export type PublicGame = z.infer<typeof publicGameSchema>;
export type StartRequest = z.infer<typeof startRequestSchema>;
export type ActionRequest = z.infer<typeof actionRequestSchema>;
export type TossLoginRequest = z.infer<typeof tossLoginRequestSchema>;
export type StatusResponse = z.infer<typeof statusResponseSchema>;