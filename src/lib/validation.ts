import { z } from "zod";

export const createGameSchema = z.object({
  mode: z.enum(["solo", "tutorial", "challenge"]),
  profileId: z.string().min(1),
  challengeId: z.string().min(1).optional(),
  difficulty: z.enum(["guided", "standard", "sharp"]).optional(),
  seed: z.number().int().positive().max(2_000_000_000).optional(),
  displayName: z.string().trim().min(1).max(40).optional(),
  avatarId: z.string().min(1).max(20).optional(),
  shareScore: z.boolean().optional(),
});

export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("roll"), idempotencyKey: z.string().min(8).max(80) }),
  z.object({
    type: z.literal("decide"),
    idempotencyKey: z.string().min(8).max(80),
    optionId: z.string().min(1).max(40),
  }),
  z.object({
    type: z.literal("repay"),
    idempotencyKey: z.string().min(8).max(80),
    liabilityId: z.string().min(1).max(80),
    amountCents: z.number().int().positive(),
  }),
  z.object({ type: z.literal("end_turn"), idempotencyKey: z.string().min(8).max(80) }),
]);

export const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  avatarId: z.string().min(1).max(20),
});

export const roomCreateSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  avatarId: z.string().min(1).max(20),
  profileId: z.string().min(1),
});

export const roomJoinSchema = roomCreateSchema;

export const coachSchema = z.object({
  questionId: z.enum(["cashflow", "net-worth", "vacancy", "debt", "next"]),
});
