import { useState } from "react";
import Head from "next/head";
import { signIn, useSession } from "next-auth/react";
import { api } from "~/utils/api";
import { type Prediction, type Series, type Team } from "@prisma/client";
import { type InferGetServerSidePropsType } from "next";
import { z } from "zod";

export async function getServerSideProps() {
  const response = await fetch(
    "https://statsapi.web.nhl.com/api/v1/tournaments/playoffs?expand=round.series,schedule.game.seriesSummary&season=20222023"
  );

  const NhlApiSchema = z.object({
    rounds: z.array(
      z.object({
        number: z.number(),
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
  };
}

function Home(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  function getsSeriesInfo(
    roundNumber: string,
    highSeed: string,
    lowSeed: string
  ) {
    const round = props.nhlPlayoffsDataByRound.find(
      (round) => round.number.toString() === roundNumber
    );

    const series = round?.series.find((item) => {
      return item.matchupTeams?.some((t) => t.team.name === highSeed);
    });

    if (!series) {
      return {
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
    }

    const highSeedScore =
      series.matchupTeams?.find((t) => t.team.name === highSeed)?.seriesRecord
        .wins || 0;
    const lowSeedScore =
      series.matchupTeams?.find((t) => t.team.name === lowSeed)?.seriesRecord
        .wins || 0;

    const currentGame = series?.currentGame;
    if (!currentGame)
      return {
        highSeedScore,
        lowSeedScore,
        currentGame: {
          seriesSummary: {
            gameLabel: "",
            gameTime: new Date().toISOString(),
            necessary: false,
          },
        },
      };

    return {
      highSeedScore,
      lowSeedScore,
      currentGame,
    };
  }

  getsSeriesInfo("1", "Carolina Hurricanes", "New York Islanders");

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
      <main className="flex min-h-screen flex-col items-center justify-center bg-sky-500">
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

          const info = props.getSeriesInfo(
            props.round,
            highSeed?.fullName || "",
            lowSeed?.fullName || ""
          );

          return (
            <SeriesCard
              {...series}
              {...info}
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
  const defaultPrediction = "Choose an option";

  const [prediction, setPrediction] = useState<string>(
    props.userPredictedScore || defaultPrediction
  );
  const mutation = api.prediction.upsert.useMutation();

  function onChangePrediction(seriesId: string, score: string) {
    setPrediction(score);
    mutation.mutate({ seriesId, score });
  }

  const hasSeriesStarted = false;

  const highSeed = props.teams.find((t) => t.isHighSeed);
  const lowSeed = props.teams.find((t) => t.id !== highSeed?.id);

  if (!highSeed || !lowSeed) {
    return null;
  }

  const highScore = `${highSeed.shortName} ${props.highSeedScore}`;
  const lowScore = `${lowSeed.shortName} ${props.lowSeedScore}`;

  return (
    <div className="flex transform flex-col items-center gap-4 rounded-md border-4 border-white bg-gradient-to-tl from-sky-200 to-white p-4 drop-shadow-lg duration-100 ease-in-out md:hover:scale-105 md:hover:border-black">
      <div className="flex w-full flex-col gap-2 text-center">
        <span className="text-xl font-semibold">{highSeed.fullName}</span>

        <div className="flex w-full items-center">
          <hr className="w-full border-2 border-black" />
          <span className="px-2 font-bold">VS</span>
          <hr className="w-full border-2 border-black" />
        </div>

        <span className="text-xl font-semibold">{lowSeed.fullName}</span>
      </div>

      <div className="w-full text-center">
        {props.currentGame.seriesSummary.necessary && (
          <span>{props.currentGame.seriesSummary.gameLabel}</span>
        )}
        <br />
        <span>
          {props.currentGame.seriesSummary.gameTime &&
            new Date(props.currentGame.seriesSummary.gameTime).toLocaleString()}
        </span>
      </div>

      <div className="grid w-full grid-cols-2 rounded-md text-center text-lg font-semibold text-white">
        <span
          className={`rounded-bl-md rounded-tl-md border-b-2 border-l-2 border-t-2 ${
            shortNameToColor[highSeed.shortName] || "bg-black"
          } py-2`}
        >
          {highScore}
        </span>
        <span
          className={`w-full rounded-br-md rounded-tr-md border-b-2 border-r-2 border-t-2 ${
            shortNameToColor[lowSeed.shortName] || "bg-black"
          } py-2`}
        >
          {lowScore}
        </span>
      </div>

      <h3 className="-mb-2 text-xl font-semibold">Prediction</h3>
      <select
        className="w-full cursor-pointer rounded-md bg-black px-4 py-2 text-white"
        value={prediction}
        onChange={(event) => onChangePrediction(props.id, event.target.value)}
        disabled={hasSeriesStarted}
      >
        <option disabled>{defaultPrediction}</option>
        <option>4-0 {highSeed.shortName}</option>
        <option>4-1 {highSeed.shortName}</option>
        <option>4-2 {highSeed.shortName}</option>
        <option>4-3 {highSeed.shortName}</option>
        <option>4-0 {lowSeed.shortName}</option>
        <option>4-1 {lowSeed.shortName} </option>
        <option>4-2 {lowSeed.shortName} </option>
        <option>4-3 {lowSeed.shortName} </option>
      </select>
    </div>
  );
}
