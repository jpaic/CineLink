"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { fetchActorDetail, fetchActorMovies, fetchChallenge, fetchMovieCast, scoreChallenge } from "../lib/api";
import logo from "../logo.png";
import {
  actorSuggestions,
  hardWaypoints,
  hollywoodActors,
  movieSuggestions,
  sampleChallenge,
} from "../lib/mock-data";
import type {
  ActorSuggestion,
  Challenge,
  HardWaypoint,
  MovieSuggestion,
  PathStep,
  ScoreResult,
} from "../lib/mock-data";

type PlayStatus = "building" | "loading" | "scored" | "error";
type GameMode = "classic" | "gauntlet";
const FAST_START_COUNT = 6;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function actorToStep(actor: ActorSuggestion, subtitle = "Actor"): PathStep {
  return {
    id: actor.id,
    type: "actor",
    name: actor.name,
    slug: actor.slug || String(actor.id ?? slugify(actor.name)),
    subtitle,
    posterPath: actor.profilePath,
  };
}

function movieToStep(movie: MovieSuggestion): PathStep {
  return {
    id: movie.id,
    type: "movie",
    name: movie.title,
    slug: movie.slug || String(movie.id ?? slugify(movie.title)),
    subtitle: movie.releaseYear ?? undefined,
    posterPath: movie.posterPath,
  };
}

function tmdbImage(path?: string | null, size = "w185") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

function tmdbPage(step: PathStep) {
  if (step.id) {
    return `https://www.themoviedb.org/${step.type === "actor" ? "person" : "movie"}/${step.id}`;
  }

  return `https://www.themoviedb.org/search?query=${encodeURIComponent(step.name)}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

function shuffleActors(
  actors: ActorSuggestion[],
  currentActors: ActorSuggestion[] = [],
  count = FAST_START_COUNT,
) {
  const shuffled = [...actors];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  const selected = shuffled.slice(0, count);

  if (
    selected.length > 1 &&
    currentActors.length === selected.length &&
    selected.every((actor, index) => actor.slug === currentActors[index]?.slug)
  ) {
    return [...selected.slice(1), selected[0]];
  }

  return selected;
}

function randomHardWaypoint(current?: HardWaypoint) {
  const options = current
    ? hardWaypoints.filter((waypoint) => waypoint.id !== current.id)
    : hardWaypoints;
  return options[Math.floor(Math.random() * options.length)] ?? hardWaypoints[0];
}

function routeHitsWaypoint(path: PathStep[], waypoint: HardWaypoint) {
  return path.some((step) => step.type === "movie" && step.id && waypoint.movieIds.includes(step.id));
}

function waypointHint(waypoint: HardWaypoint) {
  return waypoint.type === "movie"
    ? "Include this exact movie somewhere in your chain."
    : `Include one of: ${waypoint.movieNames.slice(0, 5).join(", ")}.`;
}

export function CineLinkApp() {
  const [gameMode, setGameMode] = useState<GameMode>("classic");
  const [challenge, setChallenge] = useState<Challenge>(sampleChallenge);
  const [hardWaypoint, setHardWaypoint] = useState<HardWaypoint>(() => randomHardWaypoint());
  const [playerPath, setPlayerPath] = useState<PathStep[]>([
    actorToStep(actorSuggestions[0], "Start"),
  ]);
  const [actorQuery, setActorQuery] = useState("");
  const [movieQuery, setMovieQuery] = useState("");
  const [actors, setActors] = useState<ActorSuggestion[]>(actorSuggestions);
  const [movies, setMovies] = useState<MovieSuggestion[]>(movieSuggestions);
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [status, setStatus] = useState<PlayStatus>("building");
  const [message, setMessage] = useState("Build an actor-movie-actor chain that ends on the target.");
  const [fastStartActors, setFastStartActors] = useState<ActorSuggestion[]>(
    hollywoodActors.slice(0, FAST_START_COUNT),
  );

  const nextType: "actor" | "movie" = playerPath[playerPath.length - 1]?.type === "actor" ? "movie" : "actor";
  const currentHead = playerPath[playerPath.length - 1];
  const endsOnTarget =
    playerPath[playerPath.length - 1]?.type === "actor" &&
    playerPath[playerPath.length - 1]?.name.toLowerCase() === challenge.targetActor.name.toLowerCase();
  const hitsHardWaypoint = routeHitsWaypoint(playerPath, hardWaypoint);
  const hardRequirementMet = gameMode === "classic" || hitsHardWaypoint;
  const playerDegrees = Math.max(0, Math.floor((playerPath.length - 1) / 2));

  const resetForChallenge = useCallback((nextChallenge: Challenge) => {
    setPlayerPath([actorToStep(actorSuggestions[0], "Start")]);
    setActorQuery("");
    setMovieQuery("");
    setScore(null);
    setStatus("building");
    setMessage(`Build a route from your start actor to ${nextChallenge.targetActor.name}.`);
  }, []);

  useEffect(() => {
    fetchChallenge().then((nextChallenge) => {
      setChallenge(nextChallenge);
      resetForChallenge(nextChallenge);
    });
  }, [resetForChallenge]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setFastStartActors((current) => shuffleActors(hollywoodActors, current));
    }, 0);

    return () => window.clearTimeout(handle);
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (nextType === "actor") {
        fetchMovieCast(currentHead, actorQuery).then(setActors);
      }
    }, 150);

    return () => window.clearTimeout(handle);
  }, [actorQuery, currentHead, nextType]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (nextType === "movie") {
        fetchActorMovies(currentHead, movieQuery).then(setMovies);
      }
    }, 150);

    return () => window.clearTimeout(handle);
  }, [currentHead, movieQuery, nextType]);

  useEffect(() => {
    const missingActorIds = Array.from(
      new Set(
        playerPath
          .filter((step) => step.type === "actor" && step.id && !step.posterPath)
          .map((step) => step.id as number),
      ),
    );

    if (!missingActorIds.length) {
      return;
    }

    let cancelled = false;

    Promise.all(missingActorIds.map(fetchActorDetail)).then((actorDetails) => {
      if (cancelled) {
        return;
      }

      const profilePaths = new Map(
        actorDetails
          .filter((actor): actor is ActorSuggestion => Boolean(actor?.profilePath))
          .map((actor) => [actor.id, actor.profilePath] as const),
      );

      if (!profilePaths.size) {
        return;
      }

      setPlayerPath((current) =>
        current.map((step) =>
          step.type === "actor" && step.id && !step.posterPath && profilePaths.has(step.id)
            ? { ...step, posterPath: profilePaths.get(step.id) ?? step.posterPath }
            : step,
        ),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [playerPath]);

  async function handleNewChallenge() {
    setStatus("loading");
    setMessage("Loading a new Hollywood target...");
    const nextChallenge = await fetchChallenge();
    setChallenge(nextChallenge);
    resetForChallenge(nextChallenge);
  }

  function switchGameMode(nextMode: GameMode) {
    setGameMode(nextMode);
    setScore(null);
    setStatus("building");
    setMessage(
      nextMode === "classic"
        ? `Build a route from your start actor to ${challenge.targetActor.name}.`
        : `Hit the side objective, then end on ${challenge.targetActor.name}.`,
    );

    if (nextMode === "gauntlet") {
      setHardWaypoint((current) => randomHardWaypoint(current));
    }
  }

  function addActor(actor: ActorSuggestion) {
    const isTarget = actor.name.toLowerCase() === challenge.targetActor.name.toLowerCase();
    setPlayerPath((current) => [...current, actorToStep(actor, isTarget ? "Target" : "Actor")]);
    setActorQuery("");
    setScore(null);
    setStatus("building");
  }

  function addTargetActor() {
    addActor(challenge.targetActor);
  }

  function addMovie(movie: MovieSuggestion) {
    setPlayerPath((current) => [...current, movieToStep(movie)]);
    setMovieQuery("");
    setScore(null);
    setStatus("building");
  }

  function removeLastStep() {
    setPlayerPath((current) => (current.length > 1 ? current.slice(0, -1) : current));
    setScore(null);
    setStatus("building");
  }

  function refreshFastStarts() {
    setFastStartActors((current) => shuffleActors(hollywoodActors, current));
  }

  function refreshHardWaypoint() {
    setHardWaypoint((current) => randomHardWaypoint(current));
    setScore(null);
    setStatus("building");
    setMessage(`Hit the side objective, then end on ${challenge.targetActor.name}.`);
  }

  async function submitRoute() {
    if (gameMode === "gauntlet" && !hitsHardWaypoint) {
      setScore({
        score: 0,
        rating: "Objective Missed",
        valid: false,
        issues: [`Hard mode requires ${hardWaypoint.name} before you submit.`],
        playerDegrees,
        optimalDegrees: 0,
        parDegrees: challenge.parDegrees,
        playerPath,
        optimalPath: [],
      });
      setStatus("scored");
      setMessage("Route rejected. The side objective has to be hit along the path.");
      return;
    }

    setStatus("loading");
    setMessage(
      gameMode === "classic"
        ? "Validating every cast connection and calculating the optimal route..."
        : "Validating every cast connection, side objective, and route score...",
    );

    try {
      const result = await scoreChallenge(
        playerPath,
        challenge.targetActor,
        challenge.parDegrees,
        gameMode === "gauntlet" ? hardWaypoint : undefined,
      );
      setScore(result);
      setStatus("scored");
      setMessage(
        result.valid
          ? gameMode === "classic"
            ? "Route accepted. Your score compares your chain against the optimal route."
            : "Gauntlet accepted. You hit the side objective and your chain was scored."
          : "Route rejected. Fix the highlighted issue, then submit again.",
      );
    } catch {
      setStatus("error");
      setMessage("Could not score the route. Check that the backend is running and TMDB is configured.");
    }
  }

  const resultPath = score?.optimalPath ?? [];

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#161719]">
      <section className="border-b border-white/10 bg-[#0e1117] text-white">
        <div className="mx-auto w-full max-w-7xl px-5 py-5 sm:px-8 lg:px-10">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src={logo}
                alt="CineLink logo"
                width={44}
                height={44}
                priority
                className="h-11 w-11 rounded-md object-contain"
              />
              <div>
                <p className="text-lg font-semibold leading-none">CineLink</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Build the route
                </p>
              </div>
            </Link>
            <div className="flex rounded-md border border-white/10 bg-white/6 p-1 text-xs font-semibold text-white/70 sm:text-sm">
              <button
                type="button"
                onClick={() => switchGameMode("classic")}
                className={[
                  "rounded px-3 py-2 transition hover:bg-white/10 hover:text-white",
                  gameMode === "classic" ? "bg-white text-[#161719]" : "",
                ].join(" ")}
              >
                Classic
              </button>
              <button
                type="button"
                onClick={() => switchGameMode("gauntlet")}
                className={[
                  "rounded px-3 py-2 transition hover:bg-white/10 hover:text-white",
                  gameMode === "gauntlet" ? "bg-[#efbd58] text-[#161719]" : "",
                ].join(" ")}
              >
                Director&apos;s Cut
              </button>
            </div>
          </nav>

          <div className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
            <div className="max-w-3xl">
              <h1 className="text-5xl font-semibold leading-[1.01] sm:text-6xl lg:text-7xl">
                Build a path to {challenge.targetActor.name}.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68">
                {gameMode === "classic"
                  ? "Alternate actors and movies until your final actor is the target. Submit your chain to validate it and see the optimal route."
                  : "Thread the target route while landing on the required movie or director stop along the way."}
              </p>
            </div>

            <div className="grid gap-4">
              <TargetCard challenge={challenge} onNewChallenge={handleNewChallenge} status={status} />
              {gameMode === "gauntlet" ? (
                <HardModeCard
                  hit={hitsHardWaypoint}
                  onRefresh={refreshHardWaypoint}
                  waypoint={hardWaypoint}
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-black/10 bg-[#fffdf8]">
        <div className="mx-auto w-full max-w-7xl px-5 py-4 sm:px-8 lg:px-10">
          <FastStarts
            actors={fastStartActors}
            compact
            onRefresh={refreshFastStarts}
            onPickActor={(actor) => setPlayerPath([actorToStep(actor, "Start")])}
          />
        </div>
      </section>

      <section id="builder" className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[430px_minmax(0,1fr)] lg:px-10">
        <BuilderCard
          actorQuery={actorQuery}
          actors={actors}
          canSubmit={endsOnTarget && hardRequirementMet && playerPath.length >= 3}
          challenge={challenge}
          gameMode={gameMode}
          hardRequirementMet={hardRequirementMet}
          movies={movies}
          movieQuery={movieQuery}
          nextType={nextType}
          onActorQueryChange={setActorQuery}
          onAddActor={addActor}
          onAddMovie={addMovie}
          onAddTarget={addTargetActor}
          onMovieQueryChange={setMovieQuery}
          onRemoveLast={removeLastStep}
          onReset={() => resetForChallenge(challenge)}
          onSubmit={submitRoute}
          status={status}
        />

        <RoutePanel
          title="Your route"
          eyebrow={`${playerDegrees} degree${playerDegrees === 1 ? "" : "s"} so far`}
          path={playerPath}
          tone="player"
        />
      </section>

      <section id="results" className="mx-auto grid w-full max-w-7xl gap-6 px-5 pb-12 sm:px-8 lg:grid-cols-[430px_minmax(0,1fr)] lg:px-10">
        <ResultCard
          challenge={challenge}
          message={message}
          score={score}
          status={status}
        />
        <RoutePanel
          title="Optimal route"
          eyebrow={score ? `${score.optimalDegrees} optimal degree${score.optimalDegrees === 1 ? "" : "s"}` : "Revealed after submit"}
          path={resultPath}
          placeholder="Submit a valid route to compare against the shortest path."
          tone="optimal"
        />
      </section>

    </main>
  );
}

function TargetCard({
  challenge,
  onNewChallenge,
  status,
}: {
  challenge: Challenge;
  onNewChallenge: () => void;
  status: PlayStatus;
}) {
  return (
    <div className="rounded-lg border border-white/12 bg-white p-5 text-[#161719] shadow-[0_28px_90px_rgba(0,0,0,0.38)]">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/42">Target actor</p>
      <h2 className="mt-2 text-3xl font-semibold">{challenge.targetActor.name}</h2>
      <p className="mt-2 text-sm font-semibold text-black/52">{challenge.targetActor.knownFor}</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Metric label="Par" value={challenge.parDegrees} />
        <Metric label="Difficulty" value={challenge.difficulty} />
      </div>
      <button
        type="button"
        onClick={onNewChallenge}
        disabled={status === "loading"}
        className="mt-5 h-11 w-full rounded-md bg-[#161719] px-4 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-black disabled:cursor-wait disabled:bg-black/55"
      >
        New target
      </button>
    </div>
  );
}

function HardModeCard({
  hit,
  onRefresh,
  waypoint,
}: {
  hit: boolean;
  onRefresh: () => void;
  waypoint: HardWaypoint;
}) {
  return (
    <div className="rounded-lg border border-[#efbd58]/30 bg-[#fff4cf] p-4 text-[#161719] shadow-[0_16px_46px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#805b15]">
            Director&apos;s Cut
          </p>
          <h2 className="mt-2 text-xl font-semibold">{waypoint.name}</h2>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh hard objective"
          title="Refresh hard objective"
          className="group grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#805b15]/18 bg-white/70 text-[#805b15] shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[#efbd58]/35"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4 transition group-hover:rotate-180"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.4"
          >
            <path d="M20 11a8.1 8.1 0 0 0-15.5-2" />
            <path d="M4 5v4h4" />
            <path d="M4 13a8.1 8.1 0 0 0 15.5 2" />
            <path d="M20 19v-4h-4" />
          </svg>
        </button>
      </div>
      <p className="mt-2 text-sm font-semibold text-black/58">{waypoint.subtitle}</p>
      <p className="mt-2 text-sm leading-6 text-black/62">{waypointHint(waypoint)}</p>
      <p
        className={[
          "mt-3 rounded-md border px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em]",
          hit
            ? "border-[#1f7a49]/20 bg-[#e7f6ed] text-[#1f7a49]"
            : "border-[#805b15]/18 bg-white/65 text-[#805b15]",
        ].join(" ")}
      >
        {hit ? "Objective hit" : "Objective pending"}
      </p>
    </div>
  );
}

function BuilderCard({
  actorQuery,
  actors,
  canSubmit,
  challenge,
  gameMode,
  hardRequirementMet,
  movies,
  movieQuery,
  nextType,
  onActorQueryChange,
  onAddActor,
  onAddMovie,
  onAddTarget,
  onMovieQueryChange,
  onRemoveLast,
  onReset,
  onSubmit,
  status,
}: {
  actorQuery: string;
  actors: ActorSuggestion[];
  canSubmit: boolean;
  challenge: Challenge;
  gameMode: GameMode;
  hardRequirementMet: boolean;
  movies: MovieSuggestion[];
  movieQuery: string;
  nextType: "actor" | "movie";
  onActorQueryChange: (value: string) => void;
  onAddActor: (actor: ActorSuggestion) => void;
  onAddMovie: (movie: MovieSuggestion) => void;
  onAddTarget: () => void;
  onMovieQueryChange: (value: string) => void;
  onRemoveLast: () => void;
  onReset: () => void;
  onSubmit: () => void;
  status: PlayStatus;
}) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-5 shadow-[0_18px_70px_rgba(20,21,25,0.08)]">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#805b15]">Route builder</p>
      <h2 className="mt-2 text-3xl font-semibold">Add the next {nextType}</h2>
      <p className="mt-3 text-sm leading-6 text-black/56">
        {gameMode === "classic"
          ? `The route must end with ${challenge.targetActor.name}. Each movie has to connect the actor before it and the actor after it.`
          : `Hit the gauntlet objective, then finish on ${challenge.targetActor.name}. Every movie still has to connect both neighboring actors.`}
      </p>

      {nextType === "movie" ? (
        <SearchPicker
          label="Movie"
          placeholder="Search this actor's movies"
          query={movieQuery}
          onQueryChange={onMovieQueryChange}
        >
          {movies.slice(0, 6).map((movie) => (
            <button
              key={`${movie.slug}-${movie.title}`}
              type="button"
              onClick={() => onAddMovie(movie)}
              className="flex w-full items-center gap-3 rounded-md border border-black/10 bg-[#f8f6ef] px-3 py-3 text-left transition hover:border-black/25 hover:bg-[#fff4cf]"
            >
              <SuggestionArtwork
                imagePath={movie.posterPath}
                name={movie.title}
                type="movie"
              />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{movie.title}</span>
                <span className="block text-sm text-black/45">{movie.releaseYear}</span>
              </span>
            </button>
          ))}
        </SearchPicker>
      ) : (
        <SearchPicker
          label="Actor"
          placeholder="Search this movie's cast"
          query={actorQuery}
          onQueryChange={onActorQueryChange}
        >
          <button
            type="button"
            onClick={onAddTarget}
            className="w-full rounded-md border border-[#1f5f7a]/25 bg-[#e8f3f7] px-3 py-3 text-left font-semibold text-[#174a60] transition hover:bg-[#d7edf5]"
          >
            Add target: {challenge.targetActor.name}
          </button>
          {actors.slice(0, 6).map((actor) => (
            <button
              key={`${actor.slug}-${actor.name}`}
              type="button"
              onClick={() => onAddActor(actor)}
              className="flex w-full items-center gap-3 rounded-md border border-black/10 bg-[#f8f6ef] px-3 py-3 text-left transition hover:border-black/25 hover:bg-[#fff4cf]"
            >
              <SuggestionArtwork
                imagePath={actor.profilePath}
                name={actor.name}
                type="actor"
              />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{actor.name}</span>
                <span className="block text-sm text-black/45">{actor.knownFor}</span>
              </span>
            </button>
          ))}
        </SearchPicker>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onRemoveLast}
          className="h-11 rounded-md border border-black/12 bg-white px-4 text-sm font-bold uppercase tracking-[0.12em] transition hover:bg-black/5"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={onReset}
          className="h-11 rounded-md border border-black/12 bg-white px-4 text-sm font-bold uppercase tracking-[0.12em] transition hover:bg-black/5"
        >
          Reset
        </button>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit || status === "loading"}
        className="mt-3 h-12 w-full rounded-md bg-[#1f5f7a] px-4 text-sm font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-[#1f5f7a]/20 transition hover:bg-[#174a60] disabled:cursor-not-allowed disabled:bg-black/35"
      >
        {status === "loading"
          ? "Checking route..."
          : gameMode === "gauntlet" && !hardRequirementMet
            ? "Hit objective first"
            : "Submit route"}
      </button>
    </div>
  );
}

function SearchPicker({
  children,
  label,
  onQueryChange,
  placeholder,
  query,
}: {
  children: React.ReactNode;
  label: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
  query: string;
}) {
  return (
    <div className="mt-5">
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-black/62">{label}</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="h-12 rounded-md border border-black/12 bg-[#fbfaf7] px-4 text-base outline-none transition focus:border-[#c98a16] focus:bg-white focus:ring-4 focus:ring-[#efbd58]/30"
          placeholder={placeholder}
        />
      </label>
      <div className="mt-3 grid max-h-80 gap-2 overflow-y-auto pr-1">{children}</div>
    </div>
  );
}

function ResultCard({
  challenge,
  message,
  score,
  status,
}: {
  challenge: Challenge;
  message: string;
  score: ScoreResult | null;
  status: PlayStatus;
}) {
  const validLabel = score ? (score.valid ? "Valid route" : "Invalid route") : "Not submitted";

  return (
    <div className="rounded-lg border border-black/10 bg-[#15171c] p-5 text-white shadow-[0_18px_70px_rgba(20,21,25,0.14)]">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#efbd58]">Score</p>
      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-5xl font-semibold">{score?.score ?? "--"}</h2>
          <p className="mt-2 text-sm font-semibold text-white/55">{score?.rating ?? validLabel}</p>
        </div>
        <span className="rounded-md border border-white/10 bg-white/7 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-white/62">
          {validLabel}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        <Metric dark label="Your deg." value={score?.playerDegrees ?? 0} />
        <Metric dark label="Optimal" value={score?.optimalDegrees ?? "--"} />
        <Metric dark label="Par" value={challenge.parDegrees} />
      </div>

      <p className="mt-5 rounded-md border border-white/10 bg-white/7 px-4 py-3 text-sm font-medium leading-6 text-white/68">
        {status === "error" ? "Backend unavailable. The demo fallback may be shown." : message}
      </p>

      {score?.issues.length ? (
        <div className="mt-4 rounded-md border border-[#f3a6a6]/20 bg-[#4a1717]/30 p-3">
          {score.issues.map((issue) => (
            <p key={issue} className="text-sm font-semibold text-[#ffd1d1]">
              {issue}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RoutePanel({
  eyebrow,
  path,
  placeholder,
  title,
  tone,
}: {
  eyebrow: string;
  path: PathStep[];
  placeholder?: string;
  title: string;
  tone: "player" | "optimal";
}) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-5 shadow-[0_18px_70px_rgba(20,21,25,0.08)]">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#805b15]">{eyebrow}</p>
          <h2 className="mt-2 text-3xl font-semibold">{title}</h2>
        </div>
      </div>

      {path.length ? (
        <div className="grid gap-3">
          {path.map((step, index) => (
            <a
              key={`${tone}-${step.type}-${step.slug}-${index}`}
              href={tmdbPage(step)}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-4 rounded-md border border-black/10 bg-[#fbfaf7] px-4 py-4 transition hover:-translate-y-0.5 hover:border-black/25 hover:bg-white hover:shadow-lg hover:shadow-black/8"
            >
              <span
                className={[
                  "grid h-8 w-8 shrink-0 place-items-center rounded-md border text-sm font-black",
                  step.type === "actor"
                    ? "border-[#efbd58]/45 bg-[#fff4cf] text-[#805b15]"
                    : "border-[#9fc7d8]/55 bg-[#e8f4f8] text-[#174a60]",
                ].join(" ")}
              >
                {index + 1}
              </span>
              <RouteArtwork step={step} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/40">
                  {step.type}
                </p>
                <p className="truncate text-lg font-semibold group-hover:underline">{step.name}</p>
              </div>
              {step.subtitle ? (
                <span className="hidden rounded-md border border-black/10 px-3 py-2 text-sm font-semibold text-black/54 sm:block">
                  {step.subtitle}
                </span>
              ) : null}
            </a>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-black/18 bg-[#fbfaf7] p-6 text-sm font-semibold text-black/48">
          {placeholder}
        </div>
      )}
    </div>
  );
}

function SuggestionArtwork({
  imagePath,
  name,
  type,
}: {
  imagePath?: string | null;
  name: string;
  type: "actor" | "movie";
}) {
  const imageUrl = tmdbImage(imagePath, "w92");

  return (
    <span
      className={[
        "relative grid h-12 w-10 shrink-0 place-items-center overflow-hidden rounded-md border text-xs font-black",
        type === "actor"
          ? "border-[#efbd58]/45 bg-[#fff4cf] text-[#805b15]"
          : "border-[#9fc7d8]/55 bg-[#e8f4f8] text-[#174a60]",
      ].join(" ")}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="40px"
          className="object-cover"
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}

function RouteArtwork({ step }: { step: PathStep }) {
  const imageUrl = tmdbImage(step.posterPath, step.type === "actor" ? "w185" : "w154");

  return (
    <span
      className={[
        "relative grid h-16 w-12 shrink-0 place-items-center overflow-hidden rounded-md border text-xs font-black shadow-sm",
        step.type === "actor"
          ? "border-[#efbd58]/45 bg-[#fff4cf] text-[#805b15]"
          : "border-[#9fc7d8]/55 bg-[#e8f4f8] text-[#174a60]",
      ].join(" ")}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="48px"
          className="object-cover"
        />
      ) : (
        initials(step.name)
      )}
    </span>
  );
}

function FastStarts({
  actors,
  compact = false,
  onRefresh,
  onPickActor,
}: {
  actors: ActorSuggestion[];
  compact?: boolean;
  onRefresh: () => void;
  onPickActor: (actor: ActorSuggestion) => void;
}) {
  return (
    <aside
      className={
        compact
          ? "flex flex-col gap-3 sm:flex-row sm:items-center"
          : "rounded-lg border border-black/10 bg-white p-5 shadow-[0_18px_70px_rgba(20,21,25,0.08)]"
      }
    >
      <div className={compact ? "flex shrink-0 items-center gap-3" : "mb-5 flex items-end justify-between gap-4"}>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#805b15]">Fast starts</p>
          <h2 className={compact ? "mt-1 text-lg font-semibold" : "mt-2 text-2xl font-semibold"}>
            Hollywood actors
          </h2>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh fast starts"
          title="Refresh fast starts"
          className="group grid h-9 w-9 shrink-0 place-items-center rounded-md border border-black/10 bg-white text-black/55 shadow-sm transition hover:-translate-y-0.5 hover:border-[#efbd58]/60 hover:bg-[#fff4cf] hover:text-[#805b15] hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[#efbd58]/25"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4 transition group-hover:rotate-180"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.4"
          >
            <path d="M20 11a8.1 8.1 0 0 0-15.5-2" />
            <path d="M4 5v4h4" />
            <path d="M4 13a8.1 8.1 0 0 0 15.5 2" />
            <path d="M20 19v-4h-4" />
          </svg>
        </button>
      </div>
      <div
        className={
          compact
            ? "flex gap-2 overflow-x-auto pb-1 sm:pb-0"
            : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        }
      >
        {actors.map((actor) => (
          <button
            key={actor.slug}
            type="button"
            onClick={() => onPickActor(actor)}
            className={
              compact
                ? "shrink-0 rounded-md border border-black/10 bg-white px-3 py-2 text-left text-sm font-semibold transition hover:border-black/25 hover:bg-[#fff4cf]"
                : "flex items-center justify-between gap-4 rounded-md border border-black/10 bg-[#f7f5ef] px-4 py-3 text-left transition hover:border-black/25 hover:bg-[#fff4cf]"
            }
          >
            <span className="font-semibold">{actor.name}</span>
            {!compact ? <span className="text-sm text-black/48">{actor.knownFor}</span> : null}
          </button>
        ))}
      </div>
    </aside>
  );
}

function Metric({
  dark = false,
  label,
  value,
}: {
  dark?: boolean;
  label: string;
  value: number | string;
}) {
  return (
    <div
      className={[
        "rounded-md border px-3 py-2 text-center",
        dark ? "border-white/10 bg-white/7" : "border-black/10 bg-[#f7f5ef]",
      ].join(" ")}
    >
      <p className="text-lg font-black capitalize">{value}</p>
      <p className={["text-xs font-bold uppercase tracking-[0.14em]", dark ? "text-white/45" : "text-black/45"].join(" ")}>
        {label}
      </p>
    </div>
  );
}
