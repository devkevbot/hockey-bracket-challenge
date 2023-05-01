import {
  faClock,
  faDollarSign,
  faListCheck,
  faLock,
  faMedal,
  faSquareCheck,
  faSquareXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type Winner } from "@prisma/client";
import { type InferGetStaticPropsType } from "next";
import { signIn, useSession } from "next-auth/react";
import Head from "next/head";
import Image from "next/image";
import { toast } from "react-toastify";
import {
  BOTTOM_SEED_SERIES_WIN_SCORES,
  TOP_SEED_SERIES_WIN_SCORES,
  WINS_REQUIRED_IN_SERIES,
  type NhlTeamName,
  type SeriesPossibleScore,
  type SeriesWinScore,
} from "~/globals";
import { fetchPlayoffData } from "~/server/api/external/nhl";
import { upsertSeries } from "~/server/db/series";
import { api, type RouterInputs, type RouterOutputs } from "~/utils/api";

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
              2 points
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
      <SeriesList roundNumber={data.number} />
    </div>
  );
}

function SeriesList({ roundNumber }: { roundNumber: number }) {
  const predictionsQuery = api.prediction.getByPlayoffRound.useQuery({
    round: roundNumber,
  });
  const seriesQuery = api.series.getByPlayoffRound.useQuery({
    round: roundNumber,
  });

  if (predictionsQuery.isLoading || seriesQuery.isLoading) {
    return <SeriesItemSkeletonLoader />;
  }

  if (!predictionsQuery.data || !seriesQuery.data) {
    return <SeriesItemSkeletonLoader />;
  }

  return (
    <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {seriesQuery.data.map((s, index) => {
        const prediction = predictionsQuery.data.find((p) => p.slug === s.slug);
        return <SeriesItem key={index} series={s} prediction={prediction} />;
      })}
    </div>
  );
}

const teamNameToBorderTop: Record<NhlTeamName, string> = {
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

type PredictionGetByRoundOutput =
  RouterOutputs["prediction"]["getByPlayoffRound"][number];
type SeriesGetByRoundOutput =
  RouterOutputs["series"]["getByPlayoffRound"][number];
type PredictionUpsertInput = RouterInputs["prediction"]["upsert"];

function SeriesItem({
  series,
  prediction,
}: {
  series: SeriesGetByRoundOutput;
  prediction?: PredictionGetByRoundOutput;
}) {
  const utils = api.useContext();
  const predictionMutation = api.prediction.upsert.useMutation({
    onSuccess() {
      toast.success("Saved prediction");
      void utils.prediction.getByPlayoffRound.invalidate();
    },
    onError() {
      toast.error("Failed to save prediction");
    },
  });

  function onChangePrediction(params: PredictionUpsertInput) {
    predictionMutation.mutate({ ...params });
  }

  const predictionState = derivePredictionState({
    predScore: prediction?.score,
    actualScore: series.score,
    currGameStartTime: series.currGameStartTime,
  });

  const predictedWinner = getPredictedWinnerName({
    predScore: prediction?.score,
    topSeedTeamName: series.topSeedTeamName,
    bottomSeedTeamName: series.bottomSeedTeamName,
  });
  const predictedWinnerBgColor = predictedWinner
    ? teamNameToBgColor[predictedWinner]
    : "bg-sky-700";

  const actualWinner = getActualWinnerName({
    winner: series.winner,
    topSeedTeamName: series.topSeedTeamName,
    bottomSeedTeamName: series.bottomSeedTeamName,
  });
  const actualWinnerBorderTopColor = actualWinner
    ? teamNameToBorderTop[actualWinner]
    : "border-t-transparent";

  const topSeedBgColor = teamNameToBgColor[series.topSeedTeamName];
  const bottomSeedBgColor = teamNameToBgColor[series.bottomSeedTeamName];

  return (
    <div
      className={`max-w-xs transform rounded-2xl bg-sky-100 p-4 shadow-lg focus:border-sky-800 ${actualWinnerBorderTopColor} border-t-8`}
    >
      <div className="mb-4 flex w-full flex-col gap-1 text-center md:mb-8">
        <div className="text-md flex items-baseline justify-center gap-2 md:text-lg">
          <span className={`${topSeedBgColor} rounded-full p-1.5`}></span>
          <span className="font-semibold">{series.topSeedTeamName}</span>
        </div>
        <div className="flex w-full items-center">
          <hr className="border-1 w-full border-slate-500" />
          <span className="px-2 text-xs text-slate-500">VS</span>
          <hr className="border-1 w-full border-slate-500" />
        </div>
        <div className="text-md flex items-baseline justify-center gap-2 md:text-lg">
          <span className={`${bottomSeedBgColor} rounded-full p-1.5`}></span>
          <span className="font-semibold">{series.bottomSeedTeamName}</span>
        </div>
      </div>
      <div className="text-md mb-4 grid w-full grid-cols-2 rounded-md text-center font-semibold text-white md:mb-8 md:text-lg">
        <div
          className={`${topSeedBgColor} flex items-center justify-center gap-2 rounded-l-full py-2`}
        >
          <span className="drop-shadow">{series.topSeedTeamNameShort}</span>
          <span className="drop-shadow">{series.topSeedWins}</span>
        </div>
        <div
          className={`${bottomSeedBgColor} flex items-center justify-center gap-2 rounded-r-full py-2`}
        >
          <span className="drop-shadow">{series.bottomSeedTeamNameShort}</span>
          <span className="drop-shadow">{series.bottomSeedWins}</span>
        </div>
      </div>
      <div className="mb-8 rounded-md text-center">
        <label
          className="mb-1 inline-block text-slate-700"
          htmlFor={series.slug}
        >
          Series Prediction
        </label>
        <select
          id={series.slug}
          className={`w-full cursor-pointer rounded-full px-5 py-3 text-center font-semibold text-white drop-shadow disabled:cursor-not-allowed ${predictedWinnerBgColor}`}
          value={prediction?.score}
          onChange={(event) => {
            onChangePrediction({
              slug: series.slug,
              score: event.target.value as SeriesWinScore,
            });
          }}
          disabled={predictionState !== "prediction-can-be-made"}
        >
          <option disabled className="hidden" value="no-prediction">
            {predictionState === "prediction-can-be-made" &&
              "Choose prediction"}
            {predictionState !== "prediction-locked-in" &&
              "Prediction unavailable"}
          </option>
          <optgroup label={`${series.topSeedTeamName} win`}></optgroup>
          {TOP_SEED_SERIES_WIN_SCORES.map((score) => {
            return (
              <option key={score} value={score}>
                {score} {series.topSeedTeamName}
              </option>
            );
          })}
          <optgroup label={`${series.bottomSeedTeamName} win`}></optgroup>
          {BOTTOM_SEED_SERIES_WIN_SCORES.map((score) => {
            return (
              <option key={score} value={score}>
                {score} {series.bottomSeedTeamName}
              </option>
            );
          })}
        </select>
      </div>
      <SeriesItemStateBadge state={predictionState} />
    </div>
  );
}

type PredictionState =
  | "prediction-can-be-made"
  | "prediction-locked-in"
  | "prediction-correct-no-bonus"
  | "prediction-correct-with-bonus"
  | "prediction-incorrect";

function derivePredictionState({
  predScore,
  actualScore,
  currGameStartTime,
}: {
  predScore?: SeriesWinScore;
  actualScore: SeriesPossibleScore;
  currGameStartTime: string | null;
}): PredictionState {
  const isSeriesStarted = seriesStarted({ actualScore, currGameStartTime });
  if (!isSeriesStarted) return "prediction-can-be-made";

  const isSeriesOver = seriesOver({ actualScore });
  if (!isSeriesOver) return "prediction-locked-in";

  const isWinnerCorrect = seriesWinnerCorrect({ predScore, actualScore });
  if (!isWinnerCorrect) return "prediction-incorrect";

  const isLengthCorrect = seriesLengthCorrect({ predScore, actualScore });
  if (!isLengthCorrect) return "prediction-correct-no-bonus";

  return "prediction-correct-with-bonus";
}

function seriesStarted({
  actualScore,
  currGameStartTime,
}: {
  actualScore: string;
  currGameStartTime: string | null;
}): boolean {
  const actual = parseScoreString(actualScore);
  if (!actual) {
    return false;
  }

  const [topWins, botWins] = actual;

  const topHasWonGame = topWins > 0;
  const botHasWonGame = botWins > 0;
  const currGameStarted = Boolean(
    currGameStartTime && new Date() >= new Date(currGameStartTime)
  );
  return topHasWonGame || botHasWonGame || currGameStarted;
}

function seriesOver({ actualScore }: { actualScore: string }): boolean {
  const actual = parseScoreString(actualScore);
  if (!actual) {
    return false;
  }

  const [topWins, botWins] = actual;

  const topHasWonSeries = topWins === WINS_REQUIRED_IN_SERIES;
  const botHasWonSeries = botWins === WINS_REQUIRED_IN_SERIES;
  return topHasWonSeries || botHasWonSeries;
}

function seriesWinnerCorrect({
  actualScore,
  predScore,
}: {
  actualScore: SeriesPossibleScore;
  predScore?: SeriesWinScore;
}): boolean {
  if (!predScore) return false;
  return actualScore === predScore;
}

function seriesLengthCorrect({
  actualScore,
  predScore,
}: {
  actualScore: SeriesPossibleScore;
  predScore?: SeriesWinScore;
}): boolean {
  const predicted = parseScoreString(predScore);
  if (!predicted) {
    return false;
  }

  const actual = parseScoreString(actualScore);
  if (!actual) {
    return false;
  }

  const [predTop, predBot] = predicted;
  const [actualTop, actualBot] = actual;
  return predTop === actualTop && predBot === actualBot;
}

function parseScoreString(score?: string) {
  if (!score || score.length === 0) {
    return null;
  }

  const [topWins, botWins] = score.split("-");
  if (!topWins || !botWins) {
    return null;
  }

  const topWinsNumeric = parseInt(topWins, 10);
  const botWinsNumeric = parseInt(botWins, 10);
  return [topWinsNumeric, botWinsNumeric] as [number, number];
}

function getPredictedWinnerName({
  topSeedTeamName,
  bottomSeedTeamName,
  predScore,
}: {
  topSeedTeamName: NhlTeamName;
  bottomSeedTeamName: NhlTeamName;
  predScore?: SeriesWinScore;
}) {
  const predicted = parseScoreString(predScore);
  if (!predicted) {
    return false;
  }

  const [predTop, predBot] = predicted;
  if (predTop > predBot) {
    return topSeedTeamName;
  } else if (predBot > predTop) {
    return bottomSeedTeamName;
  }
  return null;
}

function getActualWinnerName({
  winner,
  topSeedTeamName,
  bottomSeedTeamName,
}: {
  winner: Winner;
  topSeedTeamName: NhlTeamName;
  bottomSeedTeamName: NhlTeamName;
}) {
  if (winner === "TOP") {
    return topSeedTeamName;
  }
  if (winner === "BOTTOM") {
    return bottomSeedTeamName;
  }
  return null;
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

function SeriesItemStateBadge({ state }: { state: PredictionState }) {
  return (
    <div className="md:text-md flex justify-center text-center">
      {state === "prediction-can-be-made" && (
        <div className="flex items-center gap-2 rounded-full bg-blue-200 px-4 py-2 text-slate-800">
          <FontAwesomeIcon icon={faClock} className="aspect-square h-6" />
          <span className="font-semibold">Series not started</span>
        </div>
      )}
      {state === "prediction-locked-in" && (
        <div className="flex items-center gap-2 rounded-full bg-yellow-300 px-4 py-2 text-slate-800">
          <FontAwesomeIcon icon={faLock} className="aspect-square h-6" />
          <span className="font-semibold">Series in progress</span>
        </div>
      )}
      {state === "prediction-correct-no-bonus" && (
        <div className="flex items-center gap-2 rounded-full bg-green-300 px-4 py-2 text-slate-800">
          <FontAwesomeIcon icon={faSquareCheck} className="aspect-square h-6" />
          <span className="font-semibold">Correct</span>
        </div>
      )}
      {state === "prediction-correct-with-bonus" && (
        <div className="relative flex items-center gap-2 rounded-full bg-green-300 px-4 py-2 text-slate-800">
          <FontAwesomeIcon icon={faSquareCheck} className="aspect-square h-6" />
          <span className="font-semibold">Correct</span>
          <span className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2 rotate-12 rounded-full bg-yellow-300 px-2 py-1 text-sm">
            +1 Bonus
          </span>
        </div>
      )}
      {state === "prediction-incorrect" && (
        <div className="flex items-center gap-2 rounded-full bg-red-300 px-4 py-2 text-slate-800">
          <FontAwesomeIcon icon={faSquareXmark} className="aspect-square h-6" />
          <span className="font-semibold">Incorrect</span>
        </div>
      )}
    </div>
  );
}
