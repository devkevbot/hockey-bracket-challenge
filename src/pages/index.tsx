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

const WINS_REQUIRED_IN_SERIES = 4;

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

  const result = NhlApiSchema.safeParse(await response.json());
  if (!result.success) {
    console.error(result.error);
  }

  return {
    props: {
      playoffsData: result.success ? result.data : null,
    },
    revalidate: 60 * 15,
  };
}

type StaticProps = InferGetStaticPropsType<typeof getStaticProps>;

function Home(props: StaticProps) {
  const { data: sessionData, status } = useSession();

  return (
    <div className="bg-gradient-to-b from-sky-500 to-sky-200">
      <Head>
        <title>Hockey Bracket Challenge - 2023 Edition</title>
        <meta
          name="description"
          content="Hockey Bracket Challenge - 2023 Edition"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="container flex flex-col items-center justify-center gap-4 px-4 py-16">
          <div className="flex flex-col items-center gap-4 xl:flex-row xl:gap-8">
            <picture>
              <source media="(min-width: 640px)" srcSet="puck-128.png" />
              <img alt="" src="puck-64.png" />
            </picture>
            <h1 className="text-center text-5xl font-extrabold tracking-tight text-white xl:text-[5rem]">
              NHL Playoff Predictions
            </h1>
          </div>
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
              <div className="animate-pulse rounded-md bg-black px-4 py-3 text-white">
                <span className="text-2xl font-bold md:text-3xl">
                  Loading...
                </span>
              </div>
            )}
            {status === "authenticated" &&
              sessionData &&
              props.playoffsData && <RoundsList data={props.playoffsData} />}
            {status === "authenticated" &&
              sessionData &&
              props.playoffsData === null && (
                <h3 className="text-cl text-center md:text-2xl">
                  We&apos;re experiencing technical difficulties, please try
                  again later.
                </h3>
              )}
          </div>
        </div>
      </main>
      <footer className="bg-sky-300 py-4 text-center font-semibold">
        <a href="https://www.flaticon.com/free-icons/puck" title="puck icons">
          Puck icons created by Freepik - Flaticon
        </a>
      </footer>
    </div>
  );
}

export default Home;

type PlayoffsData = Exclude<StaticProps["playoffsData"], null>;

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
      <h3 className="mb-8 mt-4 w-fit rounded-full bg-sky-800 px-8 py-4 text-center text-4xl font-bold text-white">
        {data.names.name}
      </h3>
      <SeriesList data={data.series} />
    </div>
  );
}

type PlayoffSeries = PlayoffRound["series"];

function SeriesList({ data }: { data: PlayoffSeries }) {
  return (
    <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {data.map((series, index) => {
        return <SeriesItem data={series} key={index} />;
      })}
    </div>
  );
}

const NHL_TEAM_NAMES = [
  "Boston Bruins",
  "Florida Panthers",
  "Carolina Hurricanes",
  "New York Islanders",
  "New Jersey Devils",
  "New York Rangers",
  "Toronto Maple Leafs",
  "Tampa Bay Lightning",
  "Vegas Golden Knights",
  "Winnipeg Jets",
  "Edmonton Oilers",
  "Los Angeles Kings",
  "Colorado Avalanche",
  "Seattle Kraken",
  "Dallas Stars",
  "Minnesota Wild",
] as const;

type NhlTeamName = (typeof NHL_TEAM_NAMES)[number];

const teamNameToBgColor: Record<NhlTeamName, string> = {
  ["Boston Bruins"]: "bg-[#FFB81C]",
  ["Florida Panthers"]: "bg-[#C8102E]",
  ["Carolina Hurricanes"]: "bg-[#CE1126]",
  ["New York Islanders"]: "bg-[#f47d30]",
  ["New Jersey Devils"]: "bg-[#CE1126]",
  ["New York Rangers"]: "bg-[#0038A8]",
  ["Toronto Maple Leafs"]: "bg-[#00205B]",
  ["Tampa Bay Lightning"]: "bg-[#002868]",
  ["Vegas Golden Knights"]: "bg-[#333f42]",
  ["Winnipeg Jets"]: "bg-[#041E42]",
  ["Edmonton Oilers"]: "bg-orange-500",
  ["Los Angeles Kings"]: "bg-[#111111]",
  ["Colorado Avalanche"]: "bg-[#6F263D]",
  ["Seattle Kraken"]: "bg-[#68a2b9]",
  ["Dallas Stars"]: "bg-[#006847]",
  ["Minnesota Wild"]: "bg-[#154734]",
};

type PredictionUpsertInput = RouterInputs["prediction"]["upsert"];
type PredictionScore = PredictionUpsertInput["score"];

function SeriesItem({ data }: { data: PlayoffSeries[number] }) {
  const {
    data: prediction,
    isLoading: isLoadingPrediction,
    isSuccess: isSuccessPrediction,
  } = api.prediction.getBySlug.useQuery({
    slug: data.names.seriesSlug,
  });

  const [predictedScore, setPredictedScore] =
    useState<PredictionScore>("no-prediction");

  useEffect(() => {
    if (!isSuccessPrediction || !prediction?.score) return;
    setPredictedScore(prediction.score as PredictionScore);
  }, [prediction, isSuccessPrediction]);

  const predictionMutation = api.prediction.upsert.useMutation({
    onSuccess({ score }) {
      setPredictedScore(score as PredictionScore);
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
    topSeedScore: topSeed.seriesRecord.wins,
    bottomSeedScore: bottomSeed.seriesRecord.wins,
    currentGameStartTime: data.currentGame.seriesSummary.gameTime,
  });

  const predictionOutcome = getPredictionResult({
    seriesProgression,
    predictedScore,
    topSeedTeamName: topSeed.team.name,
    topSeedActualScore: topSeed.seriesRecord.wins,
    bottomSeedTeamName: bottomSeed.team.name,
    bottomSeedActualScore: bottomSeed.seriesRecord.wins,
  });

  const { predicted } = getWinnerAndLoser({
    seriesProgression,
    predictedScore,
    topSeedTeamName: topSeed.team.name,
    topSeedActualScore: topSeed.seriesRecord.wins,
    bottomSeedTeamName: bottomSeed.team.name,
    bottomSeedActualScore: bottomSeed.seriesRecord.wins,
  });

  const predictedWinnerBgColor = predicted.winner
    ? teamNameToBgColor[predicted.winner.name]
    : "bg-black";

  const topSeedBgColor = teamNameToBgColor[topSeed.team.name];
  const bottomSeedBgColor = teamNameToBgColor[bottomSeed.team.name];

  if (isLoadingPrediction) {
    return <SeriesItemSkeletonLoader />;
  }

  return (
    <div className="flex max-w-xs transform flex-col items-center gap-4 rounded-2xl border-2 bg-sky-100 p-4 shadow-lg">
      <div className="flex w-full flex-col gap-2 text-center">
        <div className="text-md flex items-center justify-center gap-2 font-semibold md:text-lg">
          <span className={`${topSeedBgColor} rounded-full p-1.5`}></span>
          <span>
            {topSeed.team.name} ({topSeed.seed.type})
          </span>
        </div>
        <div className="flex w-full items-center">
          <hr className="w-full border-2 border-black" />
          <span className="px-2 font-bold">VS</span>
          <hr className="w-full border-2 border-black" />
        </div>
        <div className="text-md flex items-center justify-center gap-2 font-semibold md:text-lg">
          <span className={`${bottomSeedBgColor} rounded-full p-1.5`}></span>
          <span>
            {bottomSeed.team.name} ({bottomSeed.seed.type})
          </span>
        </div>
      </div>
      <div className="text-md grid w-full grid-cols-2 divide-x rounded-md text-center font-semibold text-white md:text-lg">
        <div
          className={`${topSeedBgColor} flex items-center justify-center gap-2 rounded-l-full py-2`}
        >
          <span className="drop-shadow">{data.names.teamAbbreviationA}</span>
          <span className="drop-shadow">{topSeed.seriesRecord.wins}</span>
        </div>
        <div
          className={`${bottomSeedBgColor} flex items-center justify-center gap-2 rounded-r-full py-2`}
        >
          <span className="drop-shadow">{data.names.teamAbbreviationB}</span>
          <span className="drop-shadow">{bottomSeed.seriesRecord.wins}</span>
        </div>
      </div>
      <h3 className="text-md -mb-2 font-semibold md:text-lg">
        Series Prediction
      </h3>
      <select
        className={`w-full cursor-pointer rounded-full px-5 py-3 text-center font-semibold text-white drop-shadow disabled:cursor-not-allowed ${predictedWinnerBgColor}`}
        value={predictedScore}
        onChange={(event) =>
          onChangePrediction({
            slug: data.names.seriesSlug,
            score: event.target.value as PredictionScore,
          })
        }
        disabled={seriesProgression !== "series-not-started"}
      >
        <option disabled className="hidden" value="no-prediction">
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
      <div className="md:text-md flex flex-col gap-4 text-sm">
        {predictionOutcome === "series-not-started" && (
          <div className="flex items-center gap-2 rounded-full bg-blue-200 px-4 py-2 text-slate-800">
            <FontAwesomeIcon icon={faClock} className="aspect-square h-6" />
            <span className="font-semibold">Series not started</span>
          </div>
        )}
        {predictionOutcome === "series-in-progress" && (
          <div className="flex items-center gap-2 rounded-full bg-yellow-300 px-4 py-2 text-slate-800">
            <FontAwesomeIcon icon={faLock} className="aspect-square h-6" />
            <span className="font-semibold">Series in progress</span>
          </div>
        )}
        {predictionOutcome === "prediction-not-made" && (
          <div className="flex items-center gap-2 rounded-full bg-slate-300 px-4 py-2 text-slate-800">
            <FontAwesomeIcon icon={faMinus} className="aspect-square h-6" />
            <span className="font-semibold">Prediction not made</span>
          </div>
        )}
        {predictionOutcome === "prediction-exactly-correct" && (
          <div className="flex items-center gap-2 rounded-full bg-green-300 px-4 py-2 text-slate-800">
            <FontAwesomeIcon
              icon={faSquareCheck}
              className="aspect-square h-6"
            />
            <span className="font-semibold">Correct prediction</span>
          </div>
        )}
        {predictionOutcome === "only-series-length-correct" && (
          <div className="flex items-center gap-2 rounded-full bg-orange-300 px-4 py-2 text-slate-800">
            <FontAwesomeIcon
              icon={faSquareMinus}
              className="aspect-square h-6"
            />
            <span className="font-semibold">Only predicted series length</span>
          </div>
        )}
        {predictionOutcome === "only-winner-correct" && (
          <div className="flex items-center gap-2 rounded-full bg-orange-300 px-4 py-2 text-slate-800">
            <FontAwesomeIcon
              icon={faSquareMinus}
              className="aspect-square h-6"
            />
            <span className="font-semibold">Only predicted winner</span>
          </div>
        )}
        {predictionOutcome === "prediction-totally-incorrect" && (
          <div className="flex items-center gap-2 rounded-full bg-red-300 px-4 py-2 text-slate-800">
            <FontAwesomeIcon
              icon={faSquareXmark}
              className="aspect-square h-6"
            />
            <span className="font-semibold">Incorrect prediction</span>
          </div>
        )}
      </div>
    </div>
  );
}

type SeriesProgression =
  | "series-not-started"
  | "series-in-progress"
  | "series-finished";
type SeriesProgressionInputs = {
  topSeedScore: number;
  bottomSeedScore: number;
  currentGameStartTime?: string;
};

function getSeriesProgression({
  topSeedScore,
  bottomSeedScore,
  currentGameStartTime,
}: SeriesProgressionInputs): SeriesProgression {
  const isSeriesOver = getIsSeriesOver(topSeedScore, bottomSeedScore);
  if (isSeriesOver) return "series-finished";

  const isSeriesStarted = getIsSeriesStarted({
    topSeedScore,
    bottomSeedScore,
    currentGameStartTime,
  });
  if (isSeriesStarted) return "series-in-progress";

  return "series-not-started";
}

function getIsSeriesOver(
  topSeedScore: SeriesProgressionInputs["topSeedScore"],
  bottomSeedScore: SeriesProgressionInputs["bottomSeedScore"]
) {
  const isSeriesOver = [topSeedScore, bottomSeedScore].some(
    (value) => value === WINS_REQUIRED_IN_SERIES
  );
  return isSeriesOver;
}

function getIsSeriesStarted({
  topSeedScore,
  bottomSeedScore,
  currentGameStartTime,
}: SeriesProgressionInputs) {
  const currentGameStarted =
    currentGameStartTime && new Date() >= new Date(currentGameStartTime);
  const eitherTeamHasScore = topSeedScore > 0 || bottomSeedScore > 0;
  return currentGameStarted || eitherTeamHasScore;
}

type PredictionResult =
  | Extract<SeriesProgression, "series-not-started" | "series-in-progress">
  | "prediction-not-made"
  | "only-winner-correct"
  | "only-series-length-correct"
  | "prediction-totally-incorrect"
  | "prediction-exactly-correct";

function getPredictionResult({
  seriesProgression,
  predictedScore,
  topSeedTeamName,
  topSeedActualScore,
  bottomSeedTeamName,
  bottomSeedActualScore,
}: {
  seriesProgression: SeriesProgression;
  predictedScore: PredictionScore;
  topSeedTeamName: NhlTeamName;
  topSeedActualScore: number;
  bottomSeedTeamName: NhlTeamName;
  bottomSeedActualScore: number;
}): PredictionResult {
  if (seriesProgression === "series-not-started") {
    return seriesProgression;
  }

  // Locked: if the series has started, the user cannot change their prediction.
  if (
    predictedScore !== "no-prediction" &&
    seriesProgression === "series-in-progress"
  ) {
    return seriesProgression;
  }

  if (
    predictedScore === "no-prediction" &&
    seriesProgression === "series-in-progress"
  ) {
    return "prediction-not-made";
  }

  const { predicted, actual } = getWinnerAndLoser({
    seriesProgression,
    predictedScore,
    topSeedTeamName,
    topSeedActualScore,
    bottomSeedTeamName,
    bottomSeedActualScore,
  });

  // If we don't get data from getWinnerAndLoser(), that means the one or more
  // of the following is true:
  //
  // 1. The user didn't make a prediction prior to the series starting, in which
  //    case their prediction should be considered incorrect.
  // 2. We won't know the actual winner/loser because the series isn't finished.
  //    A check for the series being over should have been done in an above
  //    black of code.
  if (
    !predicted.winner ||
    !predicted.loser ||
    !actual.winner ||
    !actual.loser
  ) {
    return "prediction-totally-incorrect";
  }

  const isWinnerCorrect = predicted.winner.name === actual.winner.name;

  const predictedSeriesLength = predicted.winner.score + predicted.loser.score;
  const actualSeriesLength = actual.winner.score + actual.loser.score;
  const isSeriesLengthCorrect = predictedSeriesLength === actualSeriesLength;

  if (isWinnerCorrect && isSeriesLengthCorrect) {
    return "prediction-exactly-correct";
  }
  if (isWinnerCorrect) {
    return "only-winner-correct";
  }
  if (isSeriesLengthCorrect) {
    return "only-series-length-correct";
  }

  return "prediction-totally-incorrect";
}

type SeriesWinnerLoser = {
  predicted: {
    winner: TeamInSeries | null;
    loser: TeamInSeries | null;
  };
  actual: {
    winner: TeamInSeries | null;
    loser: TeamInSeries | null;
  };
};
type TeamInSeries = {
  name: NhlTeamName;
  score: number;
};

function getWinnerAndLoser({
  seriesProgression,
  predictedScore,
  topSeedTeamName,
  topSeedActualScore,
  bottomSeedTeamName,
  bottomSeedActualScore,
}: {
  seriesProgression: SeriesProgression;
  predictedScore: PredictionScore;
  topSeedTeamName: NhlTeamName;
  topSeedActualScore: number;
  bottomSeedTeamName: NhlTeamName;
  bottomSeedActualScore: number;
}) {
  const result: SeriesWinnerLoser = {
    predicted: {
      winner: null,
      loser: null,
    },
    actual: {
      winner: null,
      loser: null,
    },
  };

  // We only want to attempt to parse the user prediction if they cast one.
  if (predictedScore !== "no-prediction") {
    const [topSeedPredictedScore, bottomSeedPredictedScore] = predictedScore
      .split("-")
      .map((val) => parseInt(val, 10));
    if (
      topSeedPredictedScore === undefined ||
      bottomSeedPredictedScore === undefined
    ) {
      // We could also check if each score is a sane number, but if that's not
      // the case at this point, something very bad has happened.
      return result;
    }

    if (topSeedPredictedScore > bottomSeedPredictedScore) {
      result.predicted.winner = {
        name: topSeedTeamName,
        score: topSeedPredictedScore,
      };
      result.predicted.loser = {
        name: bottomSeedTeamName,
        score: bottomSeedPredictedScore,
      };
    } else if (bottomSeedPredictedScore > topSeedPredictedScore) {
      result.predicted.winner = {
        name: bottomSeedTeamName,
        score: bottomSeedPredictedScore,
      };
      result.predicted.loser = {
        name: topSeedTeamName,
        score: topSeedPredictedScore,
      };
    }
  }

  // Only lookup the actual winner/loser when the series is finished
  if (seriesProgression === "series-finished") {
    if (topSeedActualScore > bottomSeedActualScore) {
      result.actual.winner = {
        name: topSeedTeamName,
        score: topSeedActualScore,
      };
      result.actual.loser = {
        name: bottomSeedTeamName,
        score: bottomSeedActualScore,
      };
    } else if (bottomSeedActualScore > topSeedActualScore) {
      result.actual.winner = {
        name: bottomSeedTeamName,
        score: bottomSeedActualScore,
      };
      result.actual.loser = {
        name: topSeedTeamName,
        score: topSeedActualScore,
      };
    }
  }

  return result;
}

function SeriesItemSkeletonLoader() {
  return (
    <div className="mx-auto w-64 rounded-md bg-gradient-to-tl from-sky-200 to-white p-4 shadow drop-shadow-lg">
      <div className="flex animate-pulse space-x-4">
        <div className="flex-1 space-y-6 py-1">
          <div className="h-4 rounded bg-sky-500"></div>
          <div className="grid grid-cols-5">
            <div className="col-start-1 col-end-3 h-2 rounded bg-sky-500"></div>
            <div className="col-start-3 col-end-4 h-2 rounded bg-sky-500"></div>
            <div className="col-span-2 col-start-4 h-2 rounded bg-sky-500"></div>
          </div>

          <div className="h-4 rounded bg-sky-500"></div>
          <div className="space-y-3">
            <div className="grid grid-cols-1">
              <div className="col-span-1 h-6 rounded bg-sky-500"></div>
            </div>
          </div>
          <div className="grid grid-cols-5 grid-rows-3 gap-4">
            <div className="col-start-2 col-end-5 row-start-1 h-4 rounded bg-sky-500"></div>
            <div className="col-span-5 row-start-2 h-5 rounded bg-sky-500"></div>
            <div className="col-start-2 col-end-5 h-6 rounded bg-sky-500"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
