import { useEffect, useState } from "react";
import Head from "next/head";
import { signIn, useSession } from "next-auth/react";
import { type RouterInputs, api } from "~/utils/api";
import { type InferGetStaticPropsType } from "next";
import { z } from "zod";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSquareCheck,
  faLock,
  faSquareXmark,
  faSquareMinus,
  faClock,
  faMinus,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";

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
              seriesSlug: z.coerce.string(),
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

  const playoffsData = NhlApiSchema.parse(await response.json());

  return {
    props: {
      playoffsData,
    },
    revalidate: 60 * 60,
  };
}

type StaticProps = InferGetStaticPropsType<typeof getStaticProps>;

function Home(props: StaticProps) {
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
              <RoundsList data={props.playoffsData} />
            )}
          </div>
        </div>
      </main>
    </>
  );
}

export default Home;

type PlayoffsData = StaticProps["playoffsData"];

function RoundsList({ data }: { data: PlayoffsData }) {
  const currentRound = data.defaultRound;

  const roundsInDescOrd = data.rounds.sort((a, b) => {
    if (a.number > b.number) return -1;
    if (a.number < b.number) return 1;
    return 0;
  });

  return (
    <div className="flex flex-col">
      {roundsInDescOrd.map((round, index) => {
        if (round.number > currentRound) return null;
        return <RoundItem data={round} key={index} />;
      })}
    </div>
  );
}

type PlayoffRound = PlayoffsData["rounds"][number];

function RoundItem({ data }: { data: PlayoffRound }) {
  return (
    <div className="flex flex-col items-center p-2">
      <h3 className="mb-8 mt-4 w-fit rounded-lg bg-black px-8 py-4 text-center text-4xl font-bold uppercase text-white">
        {data.names.name}
      </h3>
      <SeriesList data={data.series} />
    </div>
  );
}

type PlayoffSeries = PlayoffRound["series"];

function SeriesList({ data }: { data: PlayoffSeries }) {
  return (
    <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
      {data.map((series, index) => {
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

type PredictionUpsertInput = RouterInputs["prediction"]["upsert"];

function SeriesItem({ data }: { data: PlayoffSeries[number] }) {
  const {
    data: prediction,
    isLoading: isLoadingPrediction,
    isSuccess: isSuccessPrediction,
  } = api.prediction.getBySlug.useQuery({
    slug: data.names.seriesSlug,
  });

  const [seriesPrediction, setSeriesPrediction] = useState<string>(
    prediction?.score || ""
  );

  useEffect(() => {
    if (!isSuccessPrediction || !prediction?.score) return;
    setSeriesPrediction(prediction.score);
  }, [prediction, isSuccessPrediction]);

  const predictionMutation = api.prediction.upsert.useMutation({
    onSuccess({ score }) {
      setSeriesPrediction(score);
      toast.success("Saved prediction");
    },
    onError() {
      toast.error("Failed to save prediction");
    },
  });

  function onChangePrediction(params: PredictionUpsertInput) {
    predictionMutation.mutate({ slug: params.slug, score: params.score });
  }

  const topSeed = data.matchupTeams?.find((team) => team.seed.isTop);
  const bottomSeed = data.matchupTeams?.find((team) => !team.seed.isTop);
  if (!topSeed || !bottomSeed || !data.names.seriesSlug) {
    return null;
  }

  const seriesProgression = getSeriesProgression({
    topSeedWins: topSeed.seriesRecord.wins,
    bottomSeedWins: bottomSeed.seriesRecord.wins,
    currentGameStartTime: data.currentGame.seriesSummary.gameTime,
  });

  const predictionOutcome = getPredictionOutcome({
    seriesProgression,
    predictedScore: prediction?.score || "",
    topSeedTeamName: topSeed.team.name,
    topSeedTeamScore: topSeed.seriesRecord.wins.toString(),
    bottomSeedTeamName: bottomSeed.team.name,
    bottomSeedTeamScore: bottomSeed.seriesRecord.wins.toString(),
  });

  const topSeedColor = teamNameToColor[topSeed.team.name] ?? "";
  const bottomSeedColor = teamNameToColor[bottomSeed.team.name] ?? "";

  return (
    <div className="flex w-full transform flex-col items-center gap-4 rounded-md bg-gradient-to-tl from-sky-200 to-white p-4 drop-shadow-lg duration-100 ease-in-out md:hover:scale-105">
      <div className="flex w-full flex-col gap-2 text-center">
        <div className="text-md flex items-center justify-center gap-2 font-semibold md:text-lg">
          <span className={`${topSeedColor} rounded-full p-1.5`}></span>
          <span>
            {topSeed.team.name} ({topSeed.seed.type})
          </span>
        </div>
        <div className="flex w-full items-center">
          <hr className="w-full border-2 border-black" />
          <span className="px-2 font-bold italic">VS</span>
          <hr className="w-full border-2 border-black" />
        </div>
        <div className="text-md flex items-center justify-center gap-2 font-semibold md:text-lg">
          <span className={`${bottomSeedColor} rounded-full p-1.5`}></span>
          <span>
            {bottomSeed.team.name} ({bottomSeed.seed.type})
          </span>
        </div>
      </div>
      <div className="text-md grid w-full grid-cols-2 rounded-md text-center font-semibold text-white md:text-lg">
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

      <h3 className="text-md -mb-2 font-semibold md:text-lg">
        Series Prediction
      </h3>
      {isLoadingPrediction ? (
        <div className="w-full animate-pulse cursor-progress rounded-md bg-black px-4 py-1 text-white">
          Loading prediction...
        </div>
      ) : (
        <select
          className="w-full cursor-pointer rounded-md bg-black px-4 py-1 text-white disabled:cursor-not-allowed disabled:opacity-50"
          value={seriesPrediction}
          onChange={(event) =>
            onChangePrediction({
              slug: data.names.seriesSlug,
              score: event.target.value,
            })
          }
          disabled={seriesProgression !== "not-started"}
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
      )}

      <div className="md:text-md flex flex-col gap-4 text-sm">
        {predictionOutcome === "series-in-progress" && (
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faLock}
              className="aspect-square h-8 text-yellow-500"
            />
            <span className="font-semibold">Series in progress</span>
          </div>
        )}
        {predictionOutcome === "series-not-started" && (
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faClock}
              className="aspect-square h-8 text-blue-500"
            />
            <span className="font-semibold">Series not started</span>
          </div>
        )}
        {predictionOutcome === "no-prediction-made" && (
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faMinus}
              className="aspect-square h-8 text-yellow-500"
            />
            <span className="font-semibold">
              No prediction prior to series start
            </span>
          </div>
        )}
        {predictionOutcome === "exactly-correct" && (
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faSquareCheck}
              className="aspect-square h-8 text-green-500"
            />
            <span className="font-semibold">Correct prediction</span>
          </div>
        )}

        {predictionOutcome === "only-series-length-correct" && (
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faSquareMinus}
              className="aspect-square h-8 text-orange-500"
            />
            <span className="font-semibold">
              Correct series length but not winner
            </span>
          </div>
        )}
        {predictionOutcome === "only-winner-correct" && (
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faSquareMinus}
              className="aspect-square h-8 text-orange-500"
            />
            <span className="font-semibold">
              Correct winner but not series length
            </span>
          </div>
        )}
        {predictionOutcome === "incorrect" && (
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faSquareXmark}
              className="aspect-square h-8 text-red-600"
            />
            <span className="font-semibold">Incorrect prediction</span>
          </div>
        )}
      </div>
    </div>
  );
}

type SeriesProgression = "not-started" | "started" | "finished";
type SeriesProgressionInputs = {
  topSeedWins: number;
  bottomSeedWins: number;
  currentGameStartTime?: string;
};

function getSeriesProgression({
  topSeedWins,
  bottomSeedWins,
  currentGameStartTime,
}: SeriesProgressionInputs): SeriesProgression {
  const isSeriesOver = getIsSeriesOver(topSeedWins, bottomSeedWins);
  if (isSeriesOver) return "finished";

  const isSeriesStarted = getIsSeriesStarted(currentGameStartTime);
  if (isSeriesStarted) return "started";

  return "not-started";
}

function getIsSeriesOver(
  topSeedWins: SeriesProgressionInputs["topSeedWins"],
  bottomSeedWins: SeriesProgressionInputs["bottomSeedWins"]
) {
  const winsRequiredToAdvance = 4;
  const isSeriesOver = [topSeedWins, bottomSeedWins].some(
    (value) => value === winsRequiredToAdvance
  );
  return isSeriesOver;
}

function getIsSeriesStarted(
  currentGameStartTime: SeriesProgressionInputs["currentGameStartTime"]
) {
  if (currentGameStartTime) {
    return new Date() >= new Date(currentGameStartTime);
  }
  return false;
}

type PredictionOutcome =
  | "series-in-progress"
  | "series-not-started"
  | "no-prediction-made"
  | "only-winner-correct"
  | "only-series-length-correct"
  | "incorrect"
  | "exactly-correct";

function getPredictionOutcome({
  seriesProgression,
  predictedScore,
  topSeedTeamName,
  topSeedTeamScore,
  bottomSeedTeamName,
  bottomSeedTeamScore,
}: {
  seriesProgression: SeriesProgression;
  predictedScore: string;
  topSeedTeamName: string;
  topSeedTeamScore: string;
  bottomSeedTeamName: string;
  bottomSeedTeamScore: string;
}): PredictionOutcome {
  if (predictedScore && seriesProgression === "started") {
    return "series-in-progress";
  }

  if (seriesProgression === "not-started") {
    return "series-not-started";
  }

  if (!predictedScore && seriesProgression === "started") {
    return "no-prediction-made";
  }

  const [topSeedPredictedWins, lowSeedPredictedWins] =
    predictedScore.split("-");
  if (!topSeedPredictedWins || !lowSeedPredictedWins) {
    return "no-prediction-made";
  }

  const predictedWinningTeamName =
    topSeedPredictedWins > lowSeedPredictedWins
      ? topSeedTeamName
      : bottomSeedTeamName;
  const predictedLosingTeamName =
    topSeedPredictedWins > lowSeedPredictedWins
      ? bottomSeedTeamName
      : topSeedTeamName;
  const predictedWinningTeamScore =
    topSeedPredictedWins > lowSeedPredictedWins
      ? topSeedPredictedWins
      : lowSeedPredictedWins;
  const predictedLosingTeamScore =
    topSeedPredictedWins > lowSeedPredictedWins
      ? lowSeedPredictedWins
      : topSeedPredictedWins;

  const actualWinningTeamName =
    topSeedTeamScore > bottomSeedTeamScore
      ? topSeedTeamName
      : bottomSeedTeamName;
  const actualLosingTeamName =
    topSeedTeamScore > bottomSeedTeamScore
      ? bottomSeedTeamName
      : topSeedTeamName;
  const actualWinningTeamScore =
    topSeedTeamScore > bottomSeedTeamScore
      ? topSeedTeamScore
      : bottomSeedTeamScore;
  const actualLosingTeamScore =
    topSeedTeamScore > bottomSeedTeamScore
      ? bottomSeedTeamScore
      : topSeedTeamScore;

  const isWinningTeamNameCorrect =
    predictedWinningTeamName === actualWinningTeamName;
  const isLosingTeamNameCorrect =
    predictedLosingTeamName === actualLosingTeamName;
  const isWinningTeamScoreCorrect =
    predictedWinningTeamScore === actualWinningTeamScore;
  const isLosingTeamScoreCorrect =
    predictedLosingTeamScore === actualLosingTeamScore;

  if (
    isWinningTeamNameCorrect &&
    isLosingTeamNameCorrect &&
    isWinningTeamScoreCorrect &&
    isLosingTeamScoreCorrect
  ) {
    return "exactly-correct";
  }

  if (isWinningTeamNameCorrect) {
    return "only-winner-correct";
  }

  if (isWinningTeamScoreCorrect && isLosingTeamScoreCorrect) {
    return "only-series-length-correct";
  }

  return "incorrect";
}
