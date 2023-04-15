import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { z } from "zod";

export const seriesRouter = createTRPCRouter({
  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.series.findMany({
      select: { id: true, startDate: true, teams: true },
    });
  }),
  getAllByRound: publicProcedure
    .input(z.object({ round: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.series.findMany({
        where: { round: input.round },
        select: { id: true, startDate: true, teams: true, round: true },
      });
    }),
});
