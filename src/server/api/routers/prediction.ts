import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { z } from "zod";

const POSSIBLE_SCORES = [
  "4-0",
  "4-1",
  "4-2",
  "4-3",
  "0-4",
  "1-4",
  "2-4",
  "3-4",
  "no-prediction",
] as const;

export const predictionRouter = createTRPCRouter({
  upsert: protectedProcedure
    .input(z.object({ slug: z.string(), score: z.enum(POSSIBLE_SCORES) }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.prediction.upsert({
        create: {
          score: input.score,
          userId: ctx.session.user.id,
          slug: input.slug,
        },
        update: {
          score: input.score,
        },
        where: {
          userId_slug: {
            userId: ctx.session.user.id,
            slug: input.slug,
          },
        },
      });
    }),
  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.prediction.findFirst({
        where: {
          userId: ctx.session.user.id,
          slug: input.slug,
        },
      });
    }),
});
