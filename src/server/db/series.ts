import { type Winner } from "@prisma/client";
import { type fetchPlayoffData } from "../api/external/nhl";
import { prisma } from "../db";

export async function upsertSeries(
  result: Awaited<ReturnType<typeof fetchPlayoffData>>
) {
  if (!result.success) {
    return;
  }

  const defaultRound = result.data.defaultRound;
  const currRound = result.data.rounds.find(
    (round) => round.number === defaultRound
  );
  if (!currRound) {
    return;
  }

  const currRoundSlugs = currRound.series.map(
    (series) => series.names.seriesSlug
  );
  if (currRoundSlugs.length === 0) {
    return;
  }

  for await (const slug of currRoundSlugs) {
    const series = currRound?.series.find(
      (series) => series.names.seriesSlug === slug
    );
    const topSeed = series?.matchupTeams?.find((team) => team.seed.isTop);
    const bottomSeed = series?.matchupTeams?.find((team) => !team.seed.isTop);

    let winner: Winner = "UNKNOWN";
    if (topSeed?.seriesRecord.wins == 4) {
      winner = "TOP";
    } else if (bottomSeed?.seriesRecord.wins === 4) {
      winner = "BOTTOM";
    }

    await prisma.series.upsert({
      where: {
        slug,
      },
      update: {
        score: `${topSeed?.seriesRecord.wins ?? 0}-${
          bottomSeed?.seriesRecord.wins ?? 0
        }`,
        topSeedWins: topSeed?.seriesRecord.wins,
        topSeedTeamName: topSeed?.team.name,
        topSeedTeamNameShort: series?.names.teamAbbreviationA,
        bottomSeedWins: bottomSeed?.seriesRecord.wins,
        bottomSeedTeamName: bottomSeed?.team.name,
        bottomSeedTeamNameShort: series?.names.teamAbbreviationB,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        winner,
      },
      create: {
        round: currRound?.number ?? -1,
        slug,
        score: `${topSeed?.seriesRecord.wins ?? 0}-${
          bottomSeed?.seriesRecord.wins ?? 0
        }`,
        topSeedWins: topSeed?.seriesRecord.wins || 0,
        topSeedTeamName: topSeed?.team.name || "",
        topSeedTeamNameShort: series?.names.teamAbbreviationA || "",
        bottomSeedWins: bottomSeed?.seriesRecord.wins || 0,
        bottomSeedTeamName: bottomSeed?.team.name || "",
        bottomSeedTeamNameShort: series?.names.teamAbbreviationB || "",
        winner,
      },
    });
  }
}
