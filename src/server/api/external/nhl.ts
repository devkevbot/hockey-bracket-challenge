import { z } from "zod";
import { NHL_TEAM_NAMES, WINS_REQUIRED_IN_SERIES } from "~/globals";

export async function fetchPlayoffData() {
  const response = await fetch(
    "https://statsapi.web.nhl.com/api/v1/tournaments/playoffs?expand=round.series,schedule.game.seriesSummary&season=20222023"
  );

  const nhlApiSchema = z.object({
    defaultRound: z.number(),
    rounds: z.array(
      z.object({
        names: z.object({
          name: z.string(),
          shortName: z.string(),
        }),
        number: z.number(),
        series: z.array(
          z.object({
            names: z.object({
              matchupName: z.string(),
              matchupShortName: z.string(),
              teamAbbreviationA: z.string(),
              teamAbbreviationB: z.string(),
              seriesSlug: z.coerce.string(),
            }),
            currentGame: z.object({
              seriesSummary: z.object({
                gameLabel: z.string(),
                gameTime: z.string().datetime().optional(),
                necessary: z.coerce.boolean(),
                seriesStatus: z.string().optional(),
                seriesStatusShort: z.string().optional(),
              }),
            }),
            matchupTeams: z
              .array(
                z.object({
                  team: z.object({
                    name: z.enum(NHL_TEAM_NAMES),
                  }),
                  seed: z.object({
                    type: z.string(),
                    isTop: z.boolean(),
                  }),
                  seriesRecord: z.object({
                    wins: z.number().min(0).max(WINS_REQUIRED_IN_SERIES),
                    losses: z.number().min(0).max(WINS_REQUIRED_IN_SERIES),
                  }),
                })
              )
              .optional(),
          })
        ),
      })
    ),
  });

  return nhlApiSchema.safeParse(await response.json());
}
