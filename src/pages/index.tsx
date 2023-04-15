import { useState } from "react";
import Head from "next/head";
import { signIn, useSession } from "next-auth/react";
import { api } from "~/utils/api";
import { type Prediction, type Series, type Team } from "@prisma/client";

function Home() {
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
          <ProtectedContent />
        </div>
      </main>
    </>
  );
}

export default Home;

function ProtectedContent() {
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

      {sessionData && <RoundGrid round="1" predictions={predictions} />}
    </div>
  );
}

type RoundKind = Pick<Series, "round">;

type RoundGridProps = RoundKind & { predictions?: Prediction[] };

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
          return (
            <SeriesCard
              {...series}
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

type SeriesProps = Series & {
  teams: Team[];
  userPredictedScore?: ScoreKind;
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

  const hasSeriesStarted = props.startDate <= new Date();

  const highSeed = props.teams.find((t) => t.isHighSeed);
  const lowSeed = props.teams.find((t) => t.id !== highSeed?.id);

  if (!highSeed || !lowSeed) {
    return null;
  }

  const seriesScore = `${highSeed.shortName} 0 - ${lowSeed.shortName} 0`;

  return (
    <>
      <div className="flex flex-col items-center gap-4 rounded-md bg-gradient-to-tl from-sky-200 to-white p-4 drop-shadow-lg">
        <div className="flex w-full flex-col gap-2 text-center">
          <span className="text-xl font-semibold">{highSeed.fullName}</span>

          <div className="flex w-full items-center">
            <hr className="w-full border-2 border-black" />
            <span className="px-2 font-bold">VS</span>
            <hr className="w-full border-2 border-black" />
          </div>

          <span className="text-xl font-semibold">{lowSeed.fullName}</span>
        </div>

        <span className="w-full rounded-md bg-black px-4 py-2 text-center text-white">
          {seriesScore}
        </span>

        <h3 className="-mb-2 text-xl font-semibold">Prediction</h3>
        <select
          className="w-full cursor-pointer rounded-md bg-black px-4 py-2 text-white"
          value={prediction}
          onChange={(event) => onChangePrediction(props.id, event.target.value)}
          disabled={hasSeriesStarted}
        >
          <option disabled selected>
            {defaultPrediction}
          </option>
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
    </>
  );
}
