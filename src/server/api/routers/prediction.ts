import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { z } from "zod";

export const predictionRouter = createTRPCRouter({
  upsert: protectedProcedure
    .input(z.object({ slug: z.string(), score: z.string() }))
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
        where: { userId: ctx.session.user.id, slug: input.slug },
      });
    }),
});
