import { createTRPCRouter } from "~/server/api/trpc";
import { seriesRouter } from "~/server/api/routers/series";
import { predictionRouter } from "./routers/prediction";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  series: seriesRouter,
  prediction: predictionRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
