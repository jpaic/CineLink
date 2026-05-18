import { actorSuggestions, hollywoodActors, movieSuggestions, samplePath } from "./mock-data";
import { sampleChallenge } from "./mock-data";
import type { ActorSuggestion, Challenge, HardWaypoint, MovieSuggestion, PathStep, ScoreResult } from "./mock-data";

const DEFAULT_API_BASE_URL = process.env.NODE_ENV === "production" ? "/_/backend" : "http://127.0.0.1:8000";
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  DEFAULT_API_BASE_URL;
const SCORE_TIMEOUT_MS = 120000;

type BackendActor = {
  id: number;
  name: string;
  known_for?: string;
  profile_path?: string | null;
};

type BackendMovie = {
  id: number;
  title: string;
  release_year?: string | null;
  poster_path?: string | null;
};

type BackendPathStep = {
  id: number;
  type: "actor" | "movie";
  name: string;
  subtitle?: string;
  poster_path?: string | null;
};

type BackendChallenge = {
  id: string;
  target_actor: BackendActor;
  difficulty: Challenge["difficulty"];
  par_degrees: number;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function mapActor(actor: BackendActor): ActorSuggestion {
  return {
    id: actor.id,
    name: actor.name,
    slug: String(actor.id),
    knownFor: actor.known_for ?? "Filmography",
    profilePath: actor.profile_path ?? null,
  };
}

function mapPathStep(step: BackendPathStep): PathStep {
  return {
    id: step.id,
    type: step.type,
    name: step.name,
    slug: String(step.id),
    subtitle: step.subtitle,
    posterPath: step.poster_path ?? null,
  };
}

function mapMovie(movie: BackendMovie): MovieSuggestion {
  return {
    id: movie.id,
    title: movie.title,
    slug: String(movie.id),
    releaseYear: movie.release_year ?? null,
    posterPath: movie.poster_path ?? null,
  };
}

function mapChallenge(challenge: BackendChallenge): Challenge {
  return {
    id: challenge.id,
    targetActor: mapActor(challenge.target_actor),
    difficulty: challenge.difficulty,
    parDegrees: challenge.par_degrees,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function requestWithTimeout<T>(
  path: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await request<T>(path, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function searchActors(query: string): Promise<ActorSuggestion[]> {
  if (query.trim().length < 2) {
    return actorSuggestions;
  }

  try {
    const data = await request<{ results: BackendActor[] }>(
      `/api/search/actors?q=${encodeURIComponent(query)}`,
    );
    return data.results.map(mapActor);
  } catch {
    return actorSuggestions.filter((actor) =>
      actor.name.toLowerCase().includes(query.toLowerCase()),
    );
  }
}

export async function fetchMovieCast(
  movie: PathStep,
  query: string,
): Promise<ActorSuggestion[]> {
  try {
    const params = new URLSearchParams();

    if (movie.id) {
      params.set("movie_id", String(movie.id));
    } else {
      params.set("movie_name", movie.name);
    }

    if (query.trim()) {
      params.set("q", query.trim());
    }

    const data = await request<{ results: BackendActor[] }>(
      `/api/movies/cast?${params.toString()}`,
    );
    return data.results.map(mapActor);
  } catch {
    if (query.trim().length >= 2) {
      return searchActors(query);
    }

    return actorSuggestions;
  }
}

export async function fetchTrendingActors(): Promise<ActorSuggestion[]> {
  try {
    const data = await request<{ results: BackendActor[] }>("/api/trending/actors");
    return data.results.map(mapActor);
  } catch {
    return hollywoodActors;
  }
}

export async function fetchActorDetail(actorId: number): Promise<ActorSuggestion | null> {
  try {
    const data = await request<BackendActor>(`/api/actors/${actorId}`);
    return mapActor(data);
  } catch {
    return (
      actorSuggestions.find((actor) => actor.id === actorId) ??
      hollywoodActors.find((actor) => actor.id === actorId) ??
      null
    );
  }
}

export async function searchMovies(query: string): Promise<MovieSuggestion[]> {
  if (query.trim().length < 2) {
    return movieSuggestions;
  }

  try {
    const data = await request<{ results: BackendMovie[] }>(
      `/api/search/movies?q=${encodeURIComponent(query)}`,
    );
    return data.results.map(mapMovie);
  } catch {
    return movieSuggestions.filter((movie) =>
      movie.title.toLowerCase().includes(query.toLowerCase()),
    );
  }
}

export async function fetchActorMovies(
  actor: PathStep,
  query: string,
): Promise<MovieSuggestion[]> {
  try {
    const params = new URLSearchParams();

    if (actor.id) {
      params.set("actor_id", String(actor.id));
    } else {
      params.set("actor_name", actor.name);
    }

    if (query.trim()) {
      params.set("q", query.trim());
    }

    const data = await request<{ results: BackendMovie[] }>(
      `/api/actors/movies?${params.toString()}`,
    );
    return data.results.map(mapMovie);
  } catch {
    if (query.trim().length >= 2) {
      return searchMovies(query);
    }

    return movieSuggestions;
  }
}

export async function findConnection(fromActor: string, toActor: string): Promise<PathStep[]> {
  try {
    const params = new URLSearchParams({
      from_actor: fromActor,
      to_actor: toActor,
    });
    const data = await request<{ path: BackendPathStep[] }>(
      `/api/connections?${params.toString()}`,
    );
    return data.path.map(mapPathStep);
  } catch {
    return samplePath.map((step) => ({
      ...step,
      slug: step.id ? String(step.id) : slugify(step.name),
    }));
  }
}

export async function fetchChallenge(): Promise<Challenge> {
  try {
    const data = await request<BackendChallenge>("/api/challenges/random");
    return mapChallenge(data);
  } catch {
    return sampleChallenge;
  }
}

export async function scoreChallenge(
  playerPath: PathStep[],
  targetActor: ActorSuggestion,
  parDegrees: number,
  waypoint?: HardWaypoint,
): Promise<ScoreResult> {
  const data = await requestWithTimeout<{
    score: number;
    rating: string;
    valid: boolean;
    issues: string[];
    player_degrees: number;
    optimal_degrees: number;
    par_degrees: number;
    player_path: BackendPathStep[];
    optimal_path: BackendPathStep[];
  }>("/api/challenges/score", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target_actor: {
        id: targetActor.id,
        type: "actor",
        name: targetActor.name,
        poster_path: targetActor.profilePath,
      },
      par_degrees: parDegrees,
      waypoint: waypoint
        ? {
            type: waypoint.type,
            name: waypoint.name,
            movie_ids: waypoint.movieIds,
          }
        : null,
      player_path: playerPath.map((step) => ({
        id: step.id,
        type: step.type,
        name: step.name,
        subtitle: step.subtitle,
        poster_path: step.posterPath,
      })),
    }),
  }, SCORE_TIMEOUT_MS);

  return {
    score: data.score,
    rating: data.rating,
    valid: data.valid,
    issues: data.issues,
    playerDegrees: data.player_degrees,
    optimalDegrees: data.optimal_degrees,
    parDegrees: data.par_degrees,
    playerPath: data.player_path.map(mapPathStep),
    optimalPath: data.optimal_path.map(mapPathStep),
  };
}
