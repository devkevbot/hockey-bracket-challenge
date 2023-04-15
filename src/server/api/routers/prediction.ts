import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { z } from "zod";

export const predictionRouter = createTRPCRouter({
  upsert: protectedProcedure
    .input(z.object({ seriesId: z.string(), score: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.prediction.upsert({
        create: {
          score: input.score,
          userId: ctx.session.user.id,
          seriesId: input.seriesId,
        },
        update: {
          score: input.score,
        },
        where: {
          userId_seriesId: {
            userId: ctx.session.user.id,
            seriesId: input.seriesId,
          },
        },
      });
    }),
  getAll: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.prediction.findMany({
      where: { userId: ctx.session.user.id },
    });
  }),
});
