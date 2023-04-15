import { useEffect, useState } from "react";
import Head from "next/head";
import { signIn, useSession } from "next-auth/react";
import { api } from "~/utils/api";
import { type Prediction } from "@prisma/client";
import { type InferGetStaticPropsType } from "next";
import { z } from "zod";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSquareCheck,
  faLock,
  faSquareXmark,
  faSquarePen,
} from "@fortawesome/free-solid-svg-icons";

function Home(props: InferGetStaticPropsType<typeof getStaticProps>) {
  const { data: sessionData, status } = useSession();

  return (
    <>
      <Head>
        <title>Hockey Bracket Challenge - 2023 Edition</title>
        <meta
          name="description"
          content="Hockey Bracket Challenge - 2023 Edition"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-sky-500 to-sky-200">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
          <h1 className="text-center  text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
            NHL Playoff Predictions
          </h1>
          <h2 className="text-4xl font-bold tracking-tight text-black sm:text-[4rem]">
            2023 Edition
          </h2>

          <div className="flex flex-col items-center justify-center gap-4">
            {status === "unauthenticated" && (
              <button
                className="rounded-lg bg-black px-10 py-3 font-semibold text-white no-underline transition hover:bg-black/20"
                onClick={() => void signIn()}
              >
                {"Sign in"}
              </button>
            )}
            {status === "loading" && (
              <span className="text-4xl font-bold">Loading...</span>
            )}
            {status === "authenticated" && sessionData && (
              <RoundsList playoffsData={props.playoffsData} />
            )}
          </div>
        </div>
      </main>
    </>
  );
}

export default Home;

export async function getStaticProps() {
  const response = await fetch(
    "https://statsapi.web.nhl.com/api/v1/tournaments/playoffs?expand=round.series,schedule.game.seriesSummary&season=20222023"
  );

  const NhlApiSchema = z.object({
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
              seriesSlug: z.string().optional(),
            }),
            currentGame: z.object({
              seriesSummary: z.object({
                gameLabel: z.string(),
                gameTime: z.string().optional(),
                necessary: z.boolean().optional(),
                seriesStatus: z.string().optional(),
                seriesStatusShort: z.string().optional(),
              }),
            }),
            matchupTeams: z
              .array(
                z.object({
                  team: z.object({
                    name: z.string(),
                  }),
                  seed: z.object({
                    type: z.string(),
                    isTop: z.boolean(),
                  }),
                  seriesRecord: z.object({
                    wins: z.number(),
                    losses: z.number(),
                  }),
                })
              )
              .optional(),
          })
        ),
      })
    ),
  });

  const data = NhlApiSchema.parse(await response.json());

  return {
    props: {
      playoffsData: data,
    },
    revalidate: 60 * 60,
  };
}

function RoundsList({
  playoffsData,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const currentRound = playoffsData.defaultRound;

  return (
    <div className="flex flex-col">
      {playoffsData.rounds.map((round, index) => {
        if (round.number > currentRound) return null;
        return <RoundItem data={round} key={index} />;
      })}
    </div>
  );
}

function RoundItem({
  data,
}: {
  data: InferGetStaticPropsType<
    typeof getStaticProps
  >["playoffsData"]["rounds"][number];
}) {
  return (
    <div className="flex flex-col items-center p-2">
      <h3 className="mb-8 mt-4 w-fit rounded-lg bg-black px-8 py-4 text-center text-4xl font-bold uppercase text-white">
        {data.names.name}
      </h3>
      <SeriesList series={data.series} />
    </div>
  );
}

function SeriesList({
  series,
}: {
  series: InferGetStaticPropsType<
    typeof getStaticProps
  >["playoffsData"]["rounds"][number]["series"];
  predictions?: Prediction[];
}) {
  return (
    <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
      {series.map((series, index) => {
        return <SeriesItem data={series} key={index} />;
      })}
    </div>
  );
}

const teamNameToColor: Record<string, string> = {
  ["Boston Bruins"]: "bg-amber-400",
  ["Florida Panthers"]: "bg-red-700",
  ["Carolina Hurricanes"]: "bg-red-600",
  ["New York Islanders"]: "bg-orange-600",
  ["New Jersey Devils"]: "bg-red-600",
  ["New York Rangers"]: "bg-blue-800",
  ["Toronto Maple Leafs"]: "bg-blue-600",
  ["Tampa Bay Lightning"]: "bg-blue-700",
  ["Vegas Golden Knights"]: "bg-yellow-500",
  ["Winnipeg Jets"]: "bg-blue-900",
  ["Edmonton Oilers"]: "bg-orange-500",
  ["Los Angeles Kings"]: "bg-black",
  ["Colorado Avalanche"]: "bg-red-950",
  ["Seattle Kraken"]: "bg-sky-300",
  ["Dallas Stars"]: "bg-green-600",
  ["Minnesota Wild"]: "bg-green-800",
};

function SeriesItem({
  data,
}: {
  data: InferGetStaticPropsType<
    typeof getStaticProps
  >["playoffsData"]["rounds"][number]["series"][number];
}) {
  const { data: prediction } = api.prediction.getBySlug.useQuery({
    slug: data.names.seriesSlug || "",
  });

  useEffect(() => {
    if (!prediction?.score) {
      return;
    }
    setSeriesPrediction(prediction.score);
  }, [prediction]);

  const [seriesPrediction, setSeriesPrediction] = useState<string>(
    prediction?.score || ""
  );

  const predictionMutation = api.prediction.upsert.useMutation();
  function onChangePrediction(slug: string | undefined, score: string) {
    if (typeof slug === "undefined") {
      return;
    }

    setSeriesPrediction(score);
    predictionMutation.mutate({ slug, score });
  }

  const topSeed = data.matchupTeams?.find((team) => team.seed.isTop);
  const bottomSeed = data.matchupTeams?.find((team) => !team.seed.isTop);
  if (!topSeed || !bottomSeed || !data.names.seriesSlug) {
    return null;
  }

  let hasSeriesStarted = false;
  const currentGameStartTime = data.currentGame.seriesSummary.gameTime;
  if (currentGameStartTime) {
    hasSeriesStarted = new Date(currentGameStartTime) <= new Date();
  }
  const winsRequiredToAdvance = 4;
  const isSeriesOver = [
    topSeed.seriesRecord.wins,
    bottomSeed.seriesRecord.wins,
  ].some((value) => value === winsRequiredToAdvance);

  const isPredictionCorrect = checkPrediction(
    prediction?.score || "",
    topSeed.seriesRecord.wins,
    bottomSeed.seriesRecord.wins
  );

  const topSeedColor = teamNameToColor[topSeed.team.name] ?? "";
  const bottomSeedColor = teamNameToColor[bottomSeed.team.name] ?? "";

  return (
    <div className="flex w-full transform flex-col items-center gap-4 rounded-md bg-gradient-to-tl from-sky-200 to-white p-4 drop-shadow-lg duration-100 ease-in-out md:hover:scale-105">
      <div className="flex w-full flex-col gap-2 text-center">
        <span className="text-xl font-semibold">{topSeed.team.name}</span>
        <div className="flex w-full items-center">
          <hr className="w-full border-2 border-black" />
          <span className="px-2 font-bold italic">VS</span>
          <hr className="w-full border-2 border-black" />
        </div>
        <span className="text-xl font-semibold">{bottomSeed.team.name}</span>
      </div>
      <div className="grid w-full grid-cols-2 rounded-md text-center text-lg font-semibold text-white">
        <span
          className={`rounded-bl-md rounded-tl-md border-b-2 border-l-2 border-t-2 ${topSeedColor} py-2`}
        >
          {topSeed.seriesRecord.wins}
        </span>
        <span
          className={`w-full rounded-br-md rounded-tr-md border-b-2 border-r-2 border-t-2 ${bottomSeedColor} py-2`}
        >
          {bottomSeed.seriesRecord.wins}
        </span>
      </div>

      <h3 className="-mb-2 text-xl font-semibold">Series Prediction</h3>
      <select
        className="w-full cursor-pointer rounded-md bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        value={seriesPrediction}
        onChange={(event) =>
          onChangePrediction(data.names.seriesSlug, event.target.value)
        }
        disabled={hasSeriesStarted}
      >
        <option disabled value="">
          Choose prediction
        </option>
        <optgroup label={`${topSeed.team.name} win`}></optgroup>
        <option value="4-0">4-0 {topSeed.team.name}</option>
        <option value="4-1">4-1 {topSeed.team.name}</option>
        <option value="4-2">4-2 {topSeed.team.name}</option>
        <option value="4-3">4-3 {topSeed.team.name}</option>
        <optgroup label={`${bottomSeed.team.name} win`}></optgroup>
        <option value="0-4">4-0 {bottomSeed.team.name}</option>
        <option value="1-4">4-1 {bottomSeed.team.name}</option>
        <option value="2-4">4-2 {bottomSeed.team.name}</option>
        <option value="3-4">4-3 {bottomSeed.team.name}</option>
      </select>

      {predictionMutation.error && (
        <p className="text-md font-semibold text-red-600">
          Couldn&apos;t save prediction! {predictionMutation.error.message}
        </p>
      )}

      <div className="flex w-full flex-col gap-4">
        {hasSeriesStarted ? (
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faLock}
              className="aspect-square h-8 text-yellow-500"
            />
            <span className="font-semibold">Prediction locked</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faSquarePen}
              className="aspect-square h-8 text-blue-800"
            />
            <span className="font-semibold">Prediction editable</span>
          </div>
        )}
        {isSeriesOver &&
          (isPredictionCorrect ? (
            <div className="flex items-center gap-2">
              <FontAwesomeIcon
                icon={faSquareCheck}
                className="aspect-square h-8 text-green-500"
              />
              <span className="font-semibold">You were right!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <FontAwesomeIcon
                icon={faSquareXmark}
                className="aspect-square h-8 text-red-600"
              />
              <span className="font-semibold">You were wrong!</span>
            </div>
          ))}
      </div>
    </div>
  );
}

function checkPrediction(
  prediction: string,
  topSeedWins: number,
  bototmSeedWins: number
) {
  if (!prediction) {
    return false;
  }

  const [topSeedPredictedWins, lowSeedPredictedWins] = prediction.split("-");
  if (!topSeedPredictedWins || !lowSeedPredictedWins) {
    return false;
  }

  return (
    topSeedPredictedWins === topSeedWins.toString() &&
    lowSeedPredictedWins === bototmSeedWins.toString()
  );
}
