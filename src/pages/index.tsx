import { useEffect, useState } from "react";
import Head from "next/head";
import { signIn, useSession } from "next-auth/react";
import { type RouterInputs, api } from "~/utils/api";
import { type InferGetStaticPropsType } from "next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSquareCheck,
  faLock,
  faSquareXmark,
  faClock,
  faMinus,
  faMedal,
  faDollarSign,
  faListCheck,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import Image from "next/image";
import { fetchPlayoffData } from "~/server/api/external/nhl";
import { WINS_REQUIRED_IN_SERIES, type NhlTeamName } from "~/globals";
import { upsertSeries } from "~/server/db/series";

export async function getStaticProps() {
  const result = await fetchPlayoffData();
  if (!result.success) {
    console.error(result.error);
  }

  await upsertSeries(result);

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
        <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
          <div className="flex flex-col items-center gap-4 xl:flex-row xl:gap-8">
            <picture>
              <source media="(min-width: 640px)" srcSet="puck-128.png" />
              <img alt="" src="puck-64.png" />
            </picture>
            <h1 className="text-center text-5xl font-extrabold tracking-tight text-white xl:text-[5rem]">
              NHL Playoff Predictions
            </h1>
          </div>
          <div className="gap flex flex-col items-center justify-center">
            {status === "unauthenticated" && (
              <div className="flex flex-col gap-10">
                <button
                  className="flex flex-col items-center gap-4 rounded-full bg-[#5865F2] px-10 py-4 text-xl font-semibold text-white no-underline transition hover:bg-black/40 md:flex-row md:text-2xl"
                  onClick={() => void signIn("discord")}
                >
                  <span className="hidden md:inline-block">
                    {"Sign in with"}
                  </span>
                  <Image
                    className="hidden md:inline-block"
                    src="/discord_white.png"
                    alt=""
                    width={195}
                    height={37}
                  />
                  <span className="md:hidden">{"Sign in with Discord"}</span>
                </button>
                <ul className="flex flex-col gap-8 rounded-md text-2xl font-semibold text-white">
                  <li className="flex items-center gap-4">
                    <FontAwesomeIcon
                      icon={faDollarSign}
                      className="aspect-square h-12"
                    />
                    Completely free, play for $0
                  </li>
                  <li className="flex items-center gap-4">
                    <FontAwesomeIcon
                      icon={faListCheck}
                      className="aspect-square h-12"
                    />
                    Predict each series round-by-round
                  </li>
                  <li className="flex items-center gap-4">
                    <FontAwesomeIcon
                      icon={faMedal}
                      className="aspect-square h-12"
                    />
                    Earn bonus score for exact predictions
                  </li>
                </ul>
              </div>
            )}
            {status === "loading" && (
              <div className="animate-pulse rounded-full bg-sky-800 px-4 py-3 text-white">
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
    <div className="flex flex-col items-center">
      <div className="mx-auto mb-8 rounded-2xl bg-sky-800 px-6 py-6 text-center text-white md:px-10 md:py-8">
        <h3 className="mb-4 text-2xl font-bold md:mb-6 md:text-4xl">
          Scoring system
        </h3>
        <ul className="flex flex-col gap-2 text-left text-sm leading-8 md:gap-8 md:text-lg ">
          <li>
            <span className="rounded-full bg-slate-500 px-2 py-1 font-semibold">
              1 point
            </span>{" "}
            for predicting the series winner
          </li>
          <li>
            {" "}
            <span className="rounded-full bg-slate-500 px-2 py-1 font-semibold">
              1 point
            </span>{" "}
            for predicting both the series winner and length
          </li>
          <li>
            {" "}
            <span className="rounded-full bg-slate-500 px-2 py-1 font-semibold">
              0 points
            </span>{" "}
            for incorrect predictions
          </li>
        </ul>
      </div>
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

const teamNameToBorderColor: Record<NhlTeamName, string> = {
  ["Boston Bruins"]: "border-t-[#FFB81C]",
  ["Florida Panthers"]: "border-t-[#C8102E]",
  ["Carolina Hurricanes"]: "border-t-[#CE1126]",
  ["New York Islanders"]: "border-t-[#f47d30]",
  ["New Jersey Devils"]: "border-t-[#CE1126]",
  ["New York Rangers"]: "border-t-[#0038A8]",
  ["Toronto Maple Leafs"]: "border-t-[#00205B]",
  ["Tampa Bay Lightning"]: "border-t-[#002868]",
  ["Vegas Golden Knights"]: "border-t-[#333f42]",
  ["Winnipeg Jets"]: "border-t-[#041E42]",
  ["Edmonton Oilers"]: "border-t-[#FF4C00]",
  ["Los Angeles Kings"]: "border-t-[#111111]",
  ["Colorado Avalanche"]: "border-t-[#6F263D]",
  ["Seattle Kraken"]: "border-t-[#68a2b9]",
  ["Dallas Stars"]: "border-t-[#006847]",
  ["Minnesota Wild"]: "border-t-[#154734]",
};

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
  ["Edmonton Oilers"]: "bg-[#FF4C00]",
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

  const { predicted, actual } = getWinnerAndLoser({
    seriesProgression,
    predictedScore,
    topSeedTeamName: topSeed.team.name,
    topSeedActualScore: topSeed.seriesRecord.wins,
    bottomSeedTeamName: bottomSeed.team.name,
    bottomSeedActualScore: bottomSeed.seriesRecord.wins,
  });

  const predictedWinnerBgColor = predicted.winner
    ? teamNameToBgColor[predicted.winner.name]
    : "bg-sky-700";

  const actualWinnerBorderColor = actual.winner
    ? teamNameToBorderColor[actual.winner.name]
    : "border-t-transparent";

  const topSeedBgColor = teamNameToBgColor[topSeed.team.name];
  const bottomSeedBgColor = teamNameToBgColor[bottomSeed.team.name];

  if (isLoadingPrediction) {
    return <SeriesItemSkeletonLoader />;
  }

  return (
    <div
      className={`max-w-xs transform rounded-2xl bg-sky-100 p-4 shadow-lg focus:border-sky-800 ${actualWinnerBorderColor} border-t-8`}
    >
      <div className="mb-4 flex w-full flex-col gap-1 text-center md:mb-8">
        <div className="text-md flex items-baseline justify-center gap-2 md:text-lg">
          <span className={`${topSeedBgColor} rounded-full p-1.5`}></span>
          <span className="font-semibold">{topSeed.team.name}</span>
          <span className="text-sm text-slate-800">({topSeed.seed.type})</span>
        </div>
        <div className="flex w-full items-center">
          <hr className="border-1 w-full border-slate-500" />
          <span className="px-2 text-xs text-slate-500">VS</span>
          <hr className="border-1 w-full border-slate-500" />
        </div>
        <div className="text-md flex items-baseline justify-center gap-2 md:text-lg">
          <span className={`${bottomSeedBgColor} rounded-full p-1.5`}></span>
          <span className="font-semibold">{bottomSeed.team.name}</span>
          <span className="text-sm text-slate-800">
            ({bottomSeed.seed.type})
          </span>
        </div>
      </div>
      <div className="text-md mb-4 grid w-full grid-cols-2 rounded-md text-center font-semibold text-white md:mb-8 md:text-lg">
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
      <div className="mb-8 rounded-md text-center">
        <label
          className="mb-1 inline-block text-slate-700"
          htmlFor={data.names.seriesSlug}
        >
          Series Prediction
        </label>
        <select
          id={data.names.seriesSlug}
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
            {seriesProgression === "series-not-started" && "Choose prediction"}
            {seriesProgression !== "series-not-started" &&
              "No prediction available"}
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
      </div>
      <div className="md:text-md flex justify-center text-center">
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
            <span className="font-semibold">Series over</span>
          </div>
        )}
        {predictionOutcome === "prediction-exactly-correct" && (
          <div className="relative flex items-center gap-2 rounded-full bg-green-300 px-4 py-2 text-slate-800">
            <FontAwesomeIcon
              icon={faSquareCheck}
              className="aspect-square h-6"
            />
            <span className="font-semibold">Correct winner</span>
            <span className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2 rotate-12 rounded-full bg-yellow-300 px-2 py-1 text-sm">
              +1 Bonus
            </span>
          </div>
        )}
        {predictionOutcome === "only-winner-correct" && (
          <div className="flex items-center gap-2 rounded-full bg-green-300 px-4 py-2 text-slate-800">
            <FontAwesomeIcon
              icon={faSquareCheck}
              className="aspect-square h-6"
            />
            <span className="font-semibold">Correct winner</span>
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
  if (seriesProgression === "series-in-progress") {
    return seriesProgression;
  }

  if (
    predictedScore === "no-prediction" &&
    seriesProgression === "series-finished"
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
