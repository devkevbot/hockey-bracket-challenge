import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const seriesRouter = createTRPCRouter({
  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.series.findMany({
      select: { id: true, startDate: true, teams: true },
    });
  }),
});
