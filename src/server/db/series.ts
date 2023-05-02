import { type Winner } from "@prisma/client";
import { type fetchPlayoffData } from "../api/external/nhl";
import { prisma } from "../db";
import { WINS_REQUIRED_IN_SERIES } from "~/globals";

export async function upsertSeries(
  result: Awaited<ReturnType<typeof fetchPlayoffData>>
) {
  if (!result) {
    return;
  }

  if (result.rounds.length === 0) {
    console.error("expected to find at least one playoffs series");
    return;
  }

  const seriesToUpsert = result.rounds
    .map((round) => {
      // Relying on the invariant that any series without a proper slug also has malformed data.
      const nonEmptySeries = round.series.filter(
        (series) =>
          series.names.seriesSlug && series.names.seriesSlug !== "undefined"
      );
      return nonEmptySeries.map((series) => ({
        ...series,
        roundNumber: round.number,
      }));
    })
    .flat();
  if (seriesToUpsert.length === 0) {
    return;
  }

  for await (const series of seriesToUpsert) {
    const top = series.matchupTeams?.find((team) => team.seed.isTop);
    const bot = series.matchupTeams?.find((team) => !team.seed.isTop);
    if (!top || !bot) {
      return;
    }

    let winner: Winner = "UNKNOWN";
    if (top.seriesRecord.wins === WINS_REQUIRED_IN_SERIES) {
      winner = "TOP";
    } else if (bot.seriesRecord.wins === WINS_REQUIRED_IN_SERIES) {
      winner = "BOTTOM";
    }

    const score = `${top.seriesRecord.wins}-${bot.seriesRecord.wins}`;

    await prisma.series.upsert({
      where: { slug: series.names.seriesSlug },
      update: {
        score,
        winner,
        topSeedWins: top.seriesRecord.wins,
        topSeedTeamName: top.team.name,
        topSeedTeamNameShort: series.names.teamAbbreviationA,
        bottomSeedWins: bot.seriesRecord.wins,
        bottomSeedTeamName: bot.team.name,
        bottomSeedTeamNameShort: series.names.teamAbbreviationB,
        currGameStartTime: series.currentGame.seriesSummary.gameTime,
      },
      create: {
        slug: series.names.seriesSlug,
        round: series.roundNumber,
        score,
        winner,
        topSeedWins: top.seriesRecord.wins,
        topSeedTeamName: top.team.name,
        topSeedTeamNameShort: series.names.teamAbbreviationA,
        bottomSeedWins: bot.seriesRecord.wins,
        bottomSeedTeamName: bot.team.name,
        bottomSeedTeamNameShort: series.names.teamAbbreviationB,
        currGameStartTime: series.currentGame.seriesSummary.gameTime,
      },
    });
  }
}
