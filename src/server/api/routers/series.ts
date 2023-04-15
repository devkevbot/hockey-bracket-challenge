import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { z } from "zod";

export const seriesRouter = createTRPCRouter({
  getAllByRound: publicProcedure
    .input(z.object({ round: z.number() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.series.findMany({
        where: { round: input.round },
        select: { id: true, round: true, slug: true },
      });
    }),
});
