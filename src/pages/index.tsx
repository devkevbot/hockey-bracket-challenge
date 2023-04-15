import { useCallback, useState } from "react";
import Head from "next/head";
import { signIn, useSession } from "next-auth/react";
import { api } from "~/utils/api";
import { type Prediction, type Series, type Team } from "@prisma/client";
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
  const getsSeriesInfo = useCallback(
    (
      roundNumber: string,
      highSeedTeamName: string,
      lowSeedTeamName: string
    ) => {
      const defaultSeriesInfo = {
        highSeedScore: 0,
        lowSeedScore: 0,
        currentGame: {
          seriesSummary: {
            gameLabel: "",
            gameTime: new Date().toISOString(),
            necessary: false,
          },
        },
      };

      const round = props.nhlPlayoffsDataByRound.find(
        (round) => round.number === roundNumber
      );
      if (!round) {
        return defaultSeriesInfo;
      }

      const series = round?.series.find((item) => {
        return item.matchupTeams?.some((t) => t.team.name === highSeedTeamName);
      });
      if (!series) {
        return defaultSeriesInfo;
      }

      const highSeedScore =
        series.matchupTeams?.find((t) => t.team.name === highSeedTeamName)
          ?.seriesRecord.wins ?? 0;
      const lowSeedScore =
        series.matchupTeams?.find((t) => t.team.name === lowSeedTeamName)
          ?.seriesRecord.wins ?? 0;

      const currentGame = series?.currentGame;
      if (!currentGame) {
        return defaultSeriesInfo;
      }

      return {
        highSeedScore,
        lowSeedScore,
        currentGame,
      };
    },
    [props.nhlPlayoffsDataByRound]
  );

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
          <ProtectedContent getSeriesInfo={getsSeriesInfo} />
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
    rounds: z.array(
      z.object({
        number: z.coerce.string(),
        series: z.array(
          z.object({
            currentGame: z.object({
              seriesSummary: z.object({
                gameLabel: z.string(),
                gameTime: z.string().optional(),
                necessary: z.boolean().optional(),
              }),
            }),
            matchupTeams: z
              .array(
                z.object({
                  team: z.object({
                    name: z.string(),
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
      nhlPlayoffsDataByRound: data.rounds,
    },
    revalidate: 60 * 60,
  };
}

type GetSeriesInfo = (
  round: string,
  highSeedTeamName: string,
  lowSeedTeamName: string
) => {
  highSeedScore: number;
  lowSeedScore: number;
  currentGame: {
    seriesSummary: {
      gameLabel: string;
      gameTime?: string;
      necessary?: boolean;
    };
  };
};

type ProtectedContentProps = {
  getSeriesInfo: GetSeriesInfo;
};

function ProtectedContent(props: ProtectedContentProps) {
  const { data: sessionData, status } = useSession();
  const { data: predictions } = api.prediction.getAll.useQuery();

  if (status === "loading") {
    return <span className="text-4xl font-bold">Loading...</span>;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {!sessionData && (
        <button
          className="rounded-lg bg-black px-10 py-3 font-semibold text-white no-underline transition hover:bg-black/20"
          onClick={() => void signIn()}
        >
          {"Sign in"}
        </button>
      )}

      {sessionData && (
        <RoundGrid
          round="1"
          predictions={predictions}
          getSeriesInfo={props.getSeriesInfo}
        />
      )}
    </div>
  );
}

type RoundKind = Pick<Series, "round">;

type RoundGridProps = RoundKind & {
  predictions?: Prediction[];
  getSeriesInfo: GetSeriesInfo;
};

function RoundGrid(props: RoundGridProps) {
  const { data: series } = api.series.getAllByRound.useQuery({
    round: props.round,
  });

  if (!series || series?.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center p-2">
      <h3 className="mb-8 mt-4 w-fit rounded-lg bg-black px-8 py-4 text-center text-4xl font-bold uppercase text-white">
        Round {props.round}
      </h3>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
        {series.map((series, index) => {
          const userPredictedScore = props.predictions?.find(
            (p) => p.seriesId === series.id
          )?.score;
          const highSeed = series.teams.find((t) => t.isHighSeed);
          const lowSeed = series.teams.find((t) => t.id !== highSeed?.id);
          const seriesInfo = props.getSeriesInfo(
            props.round,
            highSeed?.fullName || "",
            lowSeed?.fullName || ""
          );

          return (
            <SeriesCard
              {...series}
              {...seriesInfo}
              userPredictedScore={userPredictedScore}
              key={index}
            />
          );
        })}
      </div>
    </div>
  );
}

type ScoreKind = Pick<Prediction, "score">["score"];

type SeriesProps = Series &
  ReturnType<GetSeriesInfo> & {
    teams: Team[];
    userPredictedScore?: ScoreKind;
  };

const shortNameToColor: Record<string, string> = {
  BOS: "bg-amber-400",
  FLA: "bg-red-700",
  CAR: "bg-red-600",
  NYI: "bg-orange-600",
  NJ: "bg-red-600",
  NYR: "bg-blue-800",
  TOR: "bg-blue-600",
  TB: "bg-blue-700",
  VGK: "bg-yellow-500",
  WPG: "bg-blue-900",
  EDM: "bg-orange-500",
  LAK: "bg-black",
  COL: "bg-red-950",
  SEA: "bg-sky-300",
  DAL: "bg-green-600",
  MIN: "bg-green-800",
};

function SeriesCard(props: SeriesProps) {
  const [prediction, setPrediction] = useState<string>(
    props.userPredictedScore || ""
  );

  const predictionMutation = api.prediction.upsert.useMutation();
  function onChangePrediction(seriesId: string, score: string) {
    setPrediction(score);
    predictionMutation.mutate({ seriesId, score });
  }

  let hasSeriesStarted = false;
  const currentGameStartTime = props.currentGame.seriesSummary.gameTime;
  if (currentGameStartTime) {
    hasSeriesStarted = new Date(currentGameStartTime) <= new Date();
  }

  const winsRequiredToAdvance = 4;
  const isSeriesOver = [props.highSeedScore, props.lowSeedScore].some(
    (value) => value === winsRequiredToAdvance
  );

  const isPredictionCorrect = checkPrediction(
    prediction,
    props.highSeedScore,
    props.lowSeedScore
  );

  const highSeed = props.teams.find((t) => t.isHighSeed);
  const lowSeed = props.teams.find((t) => t.id !== highSeed?.id);

  if (!highSeed || !lowSeed) {
    return null;
  }

  const highSeedScore = `${highSeed.shortName} ${props.highSeedScore}`;
  const lowSeedScore = `${lowSeed.shortName} ${props.lowSeedScore}`;

  const highSeedColor = shortNameToColor[highSeed.shortName] || "bg-black";
  const lowSeedColor = shortNameToColor[lowSeed.shortName] || "bg-black";

  return (
    <div className="flex transform flex-col items-center gap-4 rounded-md bg-gradient-to-tl from-sky-200 to-white p-4 drop-shadow-lg duration-100 ease-in-out md:hover:scale-105">
      <div className="flex w-full flex-col gap-2 text-center">
        <span className="text-xl font-semibold">{highSeed.fullName}</span>

        <div className="flex w-full items-center">
          <hr className="w-full border-2 border-black" />
          <span className="px-2 font-bold italic">VS</span>
          <hr className="w-full border-2 border-black" />
        </div>

        <span className="text-xl font-semibold">{lowSeed.fullName}</span>
      </div>

      <div className="grid w-full grid-cols-2 rounded-md text-center text-lg font-semibold text-white">
        <span
          className={`rounded-bl-md rounded-tl-md border-b-2 border-l-2 border-t-2 ${highSeedColor} py-2`}
        >
          {highSeedScore}
        </span>
        <span
          className={`w-full rounded-br-md rounded-tr-md border-b-2 border-r-2 border-t-2 ${lowSeedColor} py-2`}
        >
          {lowSeedScore}
        </span>
      </div>

      <h3 className="-mb-2 text-xl font-semibold">Series Prediction</h3>
      <select
        className="w-full cursor-pointer rounded-md bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        value={prediction}
        onChange={(event) => onChangePrediction(props.id, event.target.value)}
        disabled={hasSeriesStarted}
      >
        <option disabled value="">
          Choose prediction
        </option>
        <optgroup label={`${highSeed.shortName} wins`}></optgroup>
        <option value="4-0">4-0 {highSeed.shortName}</option>
        <option value="4-1">4-1 {highSeed.shortName}</option>
        <option value="4-2">4-2 {highSeed.shortName}</option>
        <option value="4-3">4-3 {highSeed.shortName}</option>
        <optgroup label={`${lowSeed.shortName} wins`}></optgroup>
        <option value="0-4">4-0 {lowSeed.shortName}</option>
        <option value="1-4">4-1 {lowSeed.shortName} </option>
        <option value="2-4">4-2 {lowSeed.shortName} </option>
        <option value="3-4">4-3 {lowSeed.shortName} </option>
      </select>

      {predictionMutation.error && (
        <p className="text-md font-semibold text-red-600">
          Couldn&apos;t save prediction! {predictionMutation.error.message}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {hasSeriesStarted ? (
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faLock}
              className="aspect-square w-8 text-yellow-500"
            />
            <span className="font-semibold">Prediction locked</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faSquarePen}
              className="aspect-square w-8 text-blue-800"
            />
            <span className="font-semibold">Prediction editable</span>
          </div>
        )}
        {isSeriesOver &&
          (isPredictionCorrect ? (
            <div className="flex items-center gap-2">
              <FontAwesomeIcon
                icon={faSquareCheck}
                className="aspect-square w-8 text-green-500"
              />
              <span className="font-semibold">You were right!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <FontAwesomeIcon
                icon={faSquareXmark}
                className="aspect-square w-8 text-red-600"
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
  highSeedScore: number,
  lowSeedScore: number
) {
  if (!prediction) {
    return false;
  }

  const [highSeedPredictedScore, lowSeedPredictedScore] = prediction.split("-");
  if (!highSeedPredictedScore || !lowSeedPredictedScore) {
    return false;
  }

  return (
    highSeedPredictedScore === highSeedScore.toString() &&
    lowSeedPredictedScore === lowSeedScore.toString()
  );
}
