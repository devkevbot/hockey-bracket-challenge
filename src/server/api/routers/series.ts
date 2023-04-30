import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { z } from "zod";
import { NHL_TEAM_NAMES, SERIES_POSSIBLE_SCORES } from "~/globals";

export const seriesRouter = createTRPCRouter({
  getByPlayoffRound: publicProcedure
    .input(z.object({ round: z.number().min(1).max(4) }))
    .query(async ({ ctx, input }) => {
      const data = await ctx.prisma.series.findMany({
        where: { round: input.round },
      });

      return data.map((d) => {
        return {
          ...d,
          topSeedTeamName: z.enum(NHL_TEAM_NAMES).parse(d.topSeedTeamName),
          bottomSeedTeamName: z
            .enum(NHL_TEAM_NAMES)
            .parse(d.bottomSeedTeamName),
          currGameStartTime: z.string().nullable().parse(d.currGameStartTime),
          score: z.enum(SERIES_POSSIBLE_SCORES).parse(d.score),
        };
      });
    }),
});
