import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { z } from "zod";
import { SERIES_WIN_SCORES } from "~/globals";

export const predictionRouter = createTRPCRouter({
  upsert: protectedProcedure
    .input(z.object({ slug: z.string(), score: z.enum(SERIES_WIN_SCORES) }))
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
  getByPlayoffRound: protectedProcedure
    .input(z.object({ round: z.number().min(1).max(4) }))
    .query(async ({ ctx, input }) => {
      const series = await ctx.prisma.series.findMany({
        where: {
          round: input.round,
        },
      });

      const slugs = series.map((s) => s.slug);

      const data = await ctx.prisma.prediction.findMany({
        where: {
          userId: ctx.session.user.id,
          slug: {
            in: slugs,
          },
        },
      });
      return data.map((d) => {
        return {
          ...d,
          score: z.enum(SERIES_WIN_SCORES).parse(d.score),
        };
      });
    }),
});
