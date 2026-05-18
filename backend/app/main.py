from __future__ import annotations

import asyncio
import os
import random
from collections import deque
from dataclasses import dataclass
from typing import Any, Literal

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
TMDB_BASE_URL = os.getenv("TMDB_BASE_URL", "https://api.themoviedb.org/3").rstrip("/")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://127.0.0.1:3000")
PATHFINDING_MIN_VOTE_COUNT = 250
PATHFINDING_MIN_POPULARITY = 2.0
PATHFINDING_MOVIE_LIMIT = 35
PATHFINDING_CAST_LIMIT = 18
SCORE_TWO_DEGREE_MOVIE_LIMIT = 16
SCORE_WAYPOINT_CAST_LIMIT = 10
SCORE_WAYPOINT_TWO_DEGREE_MOVIE_LIMIT = 8

app = FastAPI(title="CineLink API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ActorSummary(BaseModel):
    id: int
    name: str
    known_for: str | None = None
    profile_path: str | None = None


class MovieSummary(BaseModel):
    id: int
    title: str
    release_year: str | None = None
    poster_path: str | None = None


class PathStep(BaseModel):
    id: int
    type: Literal["actor", "movie"]
    name: str
    subtitle: str | None = None
    poster_path: str | None = None


class SearchResponse(BaseModel):
    results: list[ActorSummary]


class MovieSearchResponse(BaseModel):
    results: list[MovieSummary]


class TrendingResponse(BaseModel):
    results: list[ActorSummary]


class ConnectionResponse(BaseModel):
    path: list[PathStep]
    degrees: int
    source: str = "tmdb"


class ChallengeResponse(BaseModel):
    id: str
    target_actor: ActorSummary
    difficulty: Literal["easy", "medium", "hard"]
    par_degrees: int


class ChallengeScoreResponse(BaseModel):
    score: int
    rating: str
    valid: bool
    issues: list[str]
    player_degrees: int
    optimal_degrees: int
    par_degrees: int
    player_path: list[PathStep]
    optimal_path: list[PathStep]


class SubmittedPathStep(BaseModel):
    id: int | None = None
    type: Literal["actor", "movie"]
    name: str
    subtitle: str | None = None
    poster_path: str | None = None


class SubmittedWaypoint(BaseModel):
    type: Literal["movie", "director"]
    name: str
    movie_ids: list[int]


class ChallengeScoreRequest(BaseModel):
    target_actor: SubmittedPathStep
    par_degrees: int = 3
    player_path: list[SubmittedPathStep]
    waypoint: SubmittedWaypoint | None = None
    max_depth: int = 6


@dataclass(frozen=True)
class ActorNode:
    id: int
    name: str
    profile_path: str | None = None


@dataclass(frozen=True)
class MovieNode:
    id: int
    title: str
    release_year: str | None = None
    poster_path: str | None = None
    popularity: float = 0
    vote_count: int = 0
    genre_ids: tuple[int, ...] = ()


HOLLYWOOD_TARGETS: tuple[dict[str, Any], ...] = (
    {
        "id": 31,
        "name": "Tom Hanks",
        "known_for": "Forrest Gump",
        "difficulty": "easy",
        "par_degrees": 2,
    },
    {
        "id": 6193,
        "name": "Leonardo DiCaprio",
        "known_for": "Inception",
        "difficulty": "easy",
        "par_degrees": 2,
    },
    {
        "id": 5064,
        "name": "Meryl Streep",
        "known_for": "The Devil Wears Prada",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 5292,
        "name": "Denzel Washington",
        "known_for": "Training Day",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 1204,
        "name": "Julia Roberts",
        "known_for": "Pretty Woman",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 287,
        "name": "Brad Pitt",
        "known_for": "Once Upon a Time in Hollywood",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 3,
        "name": "Harrison Ford",
        "known_for": "Raiders of the Lost Ark",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 18277,
        "name": "Sandra Bullock",
        "known_for": "The Blind Side",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 134,
        "name": "Jamie Foxx",
        "known_for": "Ray",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 500,
        "name": "Tom Cruise",
        "known_for": "Mission: Impossible",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 1245,
        "name": "Scarlett Johansson",
        "known_for": "Lost in Translation",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 3223,
        "name": "Robert Downey Jr.",
        "known_for": "Iron Man",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 2231,
        "name": "Samuel L. Jackson",
        "known_for": "Pulp Fiction",
        "difficulty": "easy",
        "par_degrees": 2,
    },
    {
        "id": 192,
        "name": "Morgan Freeman",
        "known_for": "The Shawshank Redemption",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 6384,
        "name": "Keanu Reeves",
        "known_for": "The Matrix",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 524,
        "name": "Natalie Portman",
        "known_for": "Black Swan",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 30614,
        "name": "Ryan Gosling",
        "known_for": "La La Land",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 54693,
        "name": "Emma Stone",
        "known_for": "La La Land",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 72129,
        "name": "Jennifer Lawrence",
        "known_for": "The Hunger Games",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 3894,
        "name": "Christian Bale",
        "known_for": "The Dark Knight",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 1813,
        "name": "Anne Hathaway",
        "known_for": "The Devil Wears Prada",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 112,
        "name": "Cate Blanchett",
        "known_for": "Carol",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 1461,
        "name": "George Clooney",
        "known_for": "Ocean's Eleven",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 1892,
        "name": "Matt Damon",
        "known_for": "Good Will Hunting",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 19492,
        "name": "Viola Davis",
        "known_for": "Fences",
        "difficulty": "hard",
        "par_degrees": 4,
    },
    {
        "id": 2888,
        "name": "Will Smith",
        "known_for": "Men in Black",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 234352,
        "name": "Margot Robbie",
        "known_for": "Barbie",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 8691,
        "name": "Zoe Saldana",
        "known_for": "Avatar",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 6968,
        "name": "Hugh Jackman",
        "known_for": "Logan",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 6885,
        "name": "Charlize Theron",
        "known_for": "Mad Max: Fury Road",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 1158,
        "name": "Al Pacino",
        "known_for": "The Godfather",
        "difficulty": "medium",
        "par_degrees": 3,
    },
    {
        "id": 380,
        "name": "Robert De Niro",
        "known_for": "Taxi Driver",
        "difficulty": "easy",
        "par_degrees": 2,
    },
)


def require_tmdb_key() -> None:
    if not TMDB_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="TMDB_API_KEY is missing. Add it to backend/.env and restart the API.",
        )


async def tmdb_get(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    require_tmdb_key()
    request_params = {"api_key": TMDB_API_KEY, **(params or {})}

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(f"{TMDB_BASE_URL}{path}", params=request_params)

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="TMDB resource not found.")
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    return response.json()


def release_year(value: str | None) -> str | None:
    if not value:
        return None
    return value[:4]


def known_for(person: dict[str, Any]) -> str | None:
    titles = [
        item.get("title") or item.get("name")
        for item in person.get("known_for", [])
        if item.get("media_type") == "movie" and (item.get("title") or item.get("name"))
    ]
    return ", ".join(titles[:2]) if titles else None


def to_actor_summary(person: dict[str, Any]) -> ActorSummary:
    return ActorSummary(
        id=person["id"],
        name=person["name"],
        known_for=known_for(person),
        profile_path=person.get("profile_path"),
    )


def fallback_challenge() -> ChallengeResponse:
    target = random.choice(HOLLYWOOD_TARGETS)
    return ChallengeResponse(
        id=f"hollywood-{target['id']}",
        target_actor=ActorSummary(
            id=target["id"],
            name=target["name"],
            known_for=target["known_for"],
        ),
        difficulty=target["difficulty"],
        par_degrees=target["par_degrees"],
    )


def to_movie_summary(movie: dict[str, Any]) -> MovieSummary:
    return MovieSummary(
        id=movie["id"],
        title=movie.get("title") or movie.get("name") or "Untitled movie",
        release_year=release_year(movie.get("release_date")),
        poster_path=movie.get("poster_path"),
    )


def is_feature_movie(movie: dict[str, Any]) -> bool:
    genre_ids = set(movie.get("genre_ids") or [])
    title = (movie.get("title") or movie.get("name") or "").lower()

    if 99 in genre_ids:
        return False

    blocked_title_parts = (
        "behind the scenes",
        "making of",
        "documentary",
        "interview",
        "featurette",
        "blooper",
        "red carpet",
        "supercut",
        "final cut: ladies and gentlemen",
        "clint eastwood : la légende",
    )
    if any(part in title for part in blocked_title_parts):
        return False

    return bool(movie.get("id") and (movie.get("title") or movie.get("name")))


def is_pathfinding_movie(movie: MovieNode) -> bool:
    return (
        movie.vote_count >= PATHFINDING_MIN_VOTE_COUNT
        and movie.popularity >= PATHFINDING_MIN_POPULARITY
    )


def movie_sort_key(movie: MovieNode) -> tuple[float, int, str]:
    return (movie.popularity, movie.vote_count, movie.release_year or "0000")


def movie_from_credit(movie: dict[str, Any]) -> MovieNode:
    return MovieNode(
        id=movie["id"],
        title=movie.get("title") or movie.get("name") or "Untitled movie",
        release_year=release_year(movie.get("release_date")),
        poster_path=movie.get("poster_path"),
        popularity=float(movie.get("popularity") or 0),
        vote_count=int(movie.get("vote_count") or 0),
        genre_ids=tuple(movie.get("genre_ids") or ()),
    )


def actor_from_cast(person: dict[str, Any]) -> ActorNode:
    return ActorNode(
        id=person["id"],
        name=person.get("name") or "Unknown actor",
        profile_path=person.get("profile_path"),
    )


def submitted_to_path_step(step: SubmittedPathStep) -> PathStep:
    fallback_id = abs(hash((step.type, step.name))) % 10_000_000
    return PathStep(
        id=step.id or fallback_id,
        type=step.type,
        name=step.name,
        subtitle=step.subtitle,
        poster_path=step.poster_path,
    )


actor_movies_cache: dict[int, list[MovieNode]] = {}
actor_all_movies_cache: dict[int, list[MovieNode]] = {}
actor_movie_ids_cache: dict[int, set[int]] = {}
movie_cast_cache: dict[int, list[ActorNode]] = {}
movie_cast_ids_cache: dict[int, set[int]] = {}
actor_cache: dict[int, ActorNode] = {}
movie_cache: dict[int, MovieNode] = {}


async def async_actor_movies(actor_id: int) -> list[MovieNode]:
    if actor_id in actor_movies_cache:
        return actor_movies_cache[actor_id]

    payload = await tmdb_get(f"/person/{actor_id}/movie_credits")
    movies = [
        movie_from_credit(movie)
        for movie in payload.get("cast", [])
        if is_feature_movie(movie)
    ]
    movies.sort(key=movie_sort_key, reverse=True)
    actor_all_movies_cache[actor_id] = movies
    actor_movie_ids_cache[actor_id] = {movie.id for movie in movies}
    pathfinding_movies = [movie for movie in movies if is_pathfinding_movie(movie)]
    actor_movies_cache[actor_id] = pathfinding_movies[:PATHFINDING_MOVIE_LIMIT]

    for movie in movies:
        movie_cache[movie.id] = movie

    return actor_movies_cache[actor_id]


async def async_actor_all_movies(actor_id: int) -> list[MovieNode]:
    if actor_id not in actor_all_movies_cache:
        await async_actor_movies(actor_id)

    return actor_all_movies_cache[actor_id]


async def async_actor_movie_ids(actor_id: int) -> set[int]:
    if actor_id not in actor_movie_ids_cache:
        await async_actor_movies(actor_id)

    return actor_movie_ids_cache[actor_id]


async def async_movie_cast(movie_id: int) -> list[ActorNode]:
    if movie_id in movie_cast_cache:
        return movie_cast_cache[movie_id]

    payload = await tmdb_get(f"/movie/{movie_id}/credits")
    cast = [
        actor_from_cast(person)
        for person in payload.get("cast", [])
        if person.get("id") and person.get("name")
    ]
    movie_cast_ids_cache[movie_id] = {actor.id for actor in cast}
    movie_cast_cache[movie_id] = cast[:PATHFINDING_CAST_LIMIT]

    for actor in movie_cast_cache[movie_id]:
        actor_cache[actor.id] = actor

    return movie_cast_cache[movie_id]


async def async_movie_cast_ids(movie_id: int) -> set[int]:
    if movie_id not in movie_cast_ids_cache:
        await async_movie_cast(movie_id)

    return movie_cast_ids_cache[movie_id]


async def resolve_actor_id(actor_name: str) -> ActorNode:
    payload = await tmdb_get(
        "/search/person",
        {"query": actor_name, "include_adult": "false", "page": 1},
    )
    people = [
        person
        for person in payload.get("results", [])
        if person.get("known_for_department") in (None, "Acting")
    ]

    if not people:
        raise HTTPException(status_code=404, detail=f"No actor found for '{actor_name}'.")

    actor = actor_from_cast(people[0])
    actor_cache[actor.id] = actor
    return actor


async def resolve_movie_id(movie_name: str) -> MovieNode:
    payload = await tmdb_get(
        "/search/movie",
        {"query": movie_name, "include_adult": "false", "page": 1},
    )
    movies = [movie for movie in payload.get("results", []) if movie.get("id")]

    if not movies:
        raise HTTPException(status_code=404, detail=f"No movie found for '{movie_name}'.")

    movie = movie_from_credit(movies[0])
    movie_cache[movie.id] = movie
    return movie


async def resolve_movie_by_id(movie_id: int) -> MovieNode:
    if movie_id in movie_cache:
        return movie_cache[movie_id]

    payload = await tmdb_get(f"/movie/{movie_id}")
    movie = MovieNode(
        id=payload["id"],
        title=payload.get("title") or "Untitled movie",
        release_year=release_year(payload.get("release_date")),
        poster_path=payload.get("poster_path"),
        popularity=float(payload.get("popularity") or 0),
        vote_count=int(payload.get("vote_count") or 0),
    )
    movie_cache[movie.id] = movie
    return movie


def build_path(
    target_actor_id: int,
    parents: dict[tuple[str, int], tuple[str, int] | None],
) -> list[PathStep]:
    current: tuple[str, int] | None = ("actor", target_actor_id)
    reversed_steps: list[PathStep] = []

    while current is not None:
      node_type, node_id = current
      if node_type == "actor":
          actor = actor_cache[node_id]
          reversed_steps.append(
              PathStep(
                  id=actor.id,
                  type="actor",
                  name=actor.name,
                  subtitle="Actor",
                  poster_path=actor.profile_path,
              )
          )
      else:
          movie = movie_cache[node_id]
          reversed_steps.append(
              PathStep(
                  id=movie.id,
                  type="movie",
                  name=movie.title,
                  subtitle=movie.release_year,
                  poster_path=movie.poster_path,
              )
          )
      current = parents[current]

    return list(reversed(reversed_steps))


def actor_path_step(actor: ActorNode, subtitle: str = "Actor") -> PathStep:
    return PathStep(
        id=actor.id,
        type="actor",
        name=actor.name,
        subtitle=subtitle,
        poster_path=actor.profile_path,
    )


def movie_path_step(movie: MovieNode) -> PathStep:
    return PathStep(
        id=movie.id,
        type="movie",
        name=movie.title,
        subtitle=movie.release_year,
        poster_path=movie.poster_path,
    )


async def direct_actor_connection(start: ActorNode, target: ActorNode) -> ConnectionResponse | None:
    start_movie_ids = await async_actor_movie_ids(start.id)
    target_movie_ids = await async_actor_movie_ids(target.id)
    shared_movie_ids = start_movie_ids & target_movie_ids

    if not shared_movie_ids:
        return None

    shared_movies = [movie_cache[movie_id] for movie_id in shared_movie_ids if movie_id in movie_cache]
    shared_movies.sort(key=movie_sort_key, reverse=True)
    movie = shared_movies[0] if shared_movies else movie_cache[next(iter(shared_movie_ids))]

    return ConnectionResponse(
        path=[
            actor_path_step(start),
            movie_path_step(movie),
            actor_path_step(target),
        ],
        degrees=1,
    )


async def two_degree_actor_connection(
    start: ActorNode,
    target: ActorNode,
    movie_limit: int = SCORE_TWO_DEGREE_MOVIE_LIMIT,
) -> ConnectionResponse | None:
    start_movies = (await async_actor_movies(start.id))[:movie_limit]
    target_movies = (await async_actor_movies(target.id))[:movie_limit]
    start_casts = await asyncio.gather(
        *(async_movie_cast(movie.id) for movie in start_movies),
    )
    target_casts = await asyncio.gather(
        *(async_movie_cast(movie.id) for movie in target_movies),
    )

    start_cast_by_actor: dict[int, tuple[ActorNode, MovieNode]] = {}
    for movie, cast in zip(start_movies, start_casts, strict=False):
        for actor in cast:
            start_cast_by_actor.setdefault(actor.id, (actor, movie))

    for target_movie, cast in zip(target_movies, target_casts, strict=False):
        for actor in cast:
            start_match = start_cast_by_actor.get(actor.id)
            if not start_match:
                continue

            middle_actor, start_movie = start_match
            return ConnectionResponse(
                path=[
                    actor_path_step(start),
                    movie_path_step(start_movie),
                    actor_path_step(middle_actor),
                    movie_path_step(target_movie),
                    actor_path_step(target),
                ],
                degrees=2,
            )

    return None


async def shortest_connection_from_nodes(
    start: ActorNode,
    target: ActorNode,
    max_depth: int,
) -> ConnectionResponse:
    if start.id == target.id:
        return ConnectionResponse(
            path=[actor_path_step(start)],
            degrees=0,
        )

    start_key = ("actor", start.id)
    parents: dict[tuple[str, int], tuple[str, int] | None] = {start_key: None}
    queue: deque[tuple[tuple[str, int], int]] = deque([(start_key, 0)])
    visited = {start_key}

    while queue:
        (node_type, node_id), depth = queue.popleft()
        if depth >= max_depth:
            continue

        if node_type == "actor":
            neighbors = [("movie", movie.id) for movie in await async_actor_movies(node_id)]
        else:
            neighbors = [("actor", actor.id) for actor in await async_movie_cast(node_id)]

        for neighbor in neighbors:
            if neighbor in visited:
                continue

            visited.add(neighbor)
            parents[neighbor] = (node_type, node_id)

            if neighbor == ("actor", target.id):
                path = build_path(target.id, parents)
                return ConnectionResponse(path=path, degrees=max(0, (len(path) - 1) // 2))

            queue.append((neighbor, depth + 1))

    return ConnectionResponse(path=[], degrees=0)


async def shortest_connection(
    from_actor: str,
    to_actor: str,
    max_depth: int,
) -> ConnectionResponse:
    start = await resolve_actor_id(from_actor)
    target = await resolve_actor_id(to_actor)
    return await shortest_connection_from_nodes(start, target, max_depth)


async def best_connection_for_score(
    player_path: list[PathStep],
    target_actor: ActorNode,
    player_degrees: int,
) -> ConnectionResponse:
    start_step = player_path[0]
    start_actor = ActorNode(
        id=start_step.id,
        name=start_step.name,
        profile_path=start_step.poster_path,
    )
    submitted_connection = ConnectionResponse(
        path=player_path,
        degrees=player_degrees,
        source="submitted-route",
    )

    if player_degrees <= 1:
        return submitted_connection

    direct_connection = await direct_actor_connection(start_actor, target_actor)
    if direct_connection:
        return direct_connection

    if player_degrees <= 2:
        return submitted_connection

    two_degree_connection = await two_degree_actor_connection(start_actor, target_actor)
    if two_degree_connection:
        return two_degree_connection

    if player_degrees == 3:
        return submitted_connection

    return ConnectionResponse(
        path=player_path,
        degrees=player_degrees,
        source="submitted-route-no-quick-shorter-route",
    )


async def quick_connection_to_any_actor(
    start: ActorNode,
    targets: list[ActorNode],
) -> list[PathStep]:
    unique_targets = list({actor.id: actor for actor in targets}.values())
    target_ids = {actor.id for actor in unique_targets}

    if start.id in target_ids:
        return [actor_path_step(start)]

    direct_connections = await asyncio.gather(
        *(direct_actor_connection(start, target) for target in unique_targets),
    )
    direct_paths = [connection.path for connection in direct_connections if connection]
    if direct_paths:
        return min(direct_paths, key=len)

    two_degree_connections = await asyncio.gather(
        *(
            two_degree_actor_connection(
                start,
                target,
                SCORE_WAYPOINT_TWO_DEGREE_MOVIE_LIMIT,
            )
            for target in unique_targets
        ),
    )
    two_degree_paths = [connection.path for connection in two_degree_connections if connection]
    if two_degree_paths:
        return min(two_degree_paths, key=len)

    return []


async def constrained_connection_for_waypoint(
    start_actor: ActorNode,
    target_actor: ActorNode,
    waypoint: SubmittedWaypoint,
) -> ConnectionResponse:
    candidate_paths: list[list[PathStep]] = []

    for movie_id in waypoint.movie_ids[:5]:
        movie = await resolve_movie_by_id(movie_id)
        cast = (await async_movie_cast(movie.id))[:SCORE_WAYPOINT_CAST_LIMIT]
        if not cast:
            continue

        left_path = await quick_connection_to_any_actor(
            start_actor,
            cast,
        )
        right_path = await quick_connection_to_any_actor(
            target_actor,
            cast,
        )

        if not left_path or not right_path:
            continue

        candidate_paths.append(
            [
                *left_path,
                movie_path_step(movie),
                *reversed(right_path),
            ]
        )

    if not candidate_paths:
        return ConnectionResponse(path=[], degrees=0, source="waypoint-unresolved")

    best_path = min(candidate_paths, key=len)
    return ConnectionResponse(
        path=best_path,
        degrees=max(0, (len(best_path) - 1) // 2),
        source="waypoint-constrained",
    )


def rating_for_score(score: int) -> str:
    if score >= 920:
        return "Director's Cut"
    if score >= 780:
        return "Festival Run"
    if score >= 620:
        return "Studio Cut"
    if score >= 420:
        return "Matinee"
    return "Box Office Bomb"


async def hydrated_player_path(player_path: list[SubmittedPathStep]) -> list[PathStep]:
    steps: list[PathStep] = []

    for step in player_path:
        if step.type == "actor":
            if step.id is None:
                actor = await resolve_actor_id(step.name)
            else:
                actor = ActorNode(id=step.id, name=step.name, profile_path=step.poster_path)
                actor_cache[actor.id] = actor
            steps.append(
                PathStep(
                    id=actor.id,
                    type="actor",
                    name=actor.name,
                    subtitle="Actor",
                    poster_path=actor.profile_path,
                )
            )
        else:
            if step.id is None:
                movie = await resolve_movie_id(step.name)
            else:
                movie = MovieNode(
                    id=step.id,
                    title=step.name,
                    release_year=step.subtitle,
                    poster_path=step.poster_path,
                )
                movie_cache[movie.id] = movie
            steps.append(
                PathStep(
                    id=movie.id,
                    type="movie",
                    name=movie.title,
                    subtitle=movie.release_year,
                    poster_path=movie.poster_path,
                )
            )

    return steps


async def validate_player_path(
    player_path: list[PathStep],
    target_actor_id: int,
) -> list[str]:
    issues: list[str] = []

    if len(player_path) < 3:
        issues.append("Add at least one movie and one connected actor.")
        return issues

    if player_path[0].type != "actor":
        issues.append("The route must start with an actor.")

    if player_path[-1].type != "actor":
        issues.append("The route must end with the target actor.")
    elif player_path[-1].id != target_actor_id:
        issues.append("The last actor in the route is not the target actor.")

    for index, step in enumerate(player_path):
        expected_type = "actor" if index % 2 == 0 else "movie"
        if step.type != expected_type:
            issues.append(f"Step {index + 1} should be a {expected_type}.")

    for index in range(0, len(player_path) - 2, 2):
        actor = player_path[index]
        movie = player_path[index + 1]
        next_actor = player_path[index + 2]

        if actor.type != "actor" or movie.type != "movie" or next_actor.type != "actor":
            continue

        actor_movie_ids = await async_actor_movie_ids(actor.id)
        if movie.id not in actor_movie_ids:
            issues.append(f"{actor.name} does not appear in {movie.name}.")

        movie_cast_ids = await async_movie_cast_ids(movie.id)
        if next_actor.id not in movie_cast_ids:
            issues.append(f"{next_actor.name} is not listed in the cast of {movie.name}.")

    return issues


@app.get("/health")
async def health() -> dict[str, Any]:
    return {"ok": True, "tmdb_configured": bool(TMDB_API_KEY)}


@app.get("/api/search/actors", response_model=SearchResponse)
async def search_actors(q: str = Query(..., min_length=2), limit: int = Query(8, ge=1, le=20)):
    payload = await tmdb_get(
        "/search/person",
        {"query": q, "include_adult": "false", "page": 1},
    )
    people = [
        person
        for person in payload.get("results", [])
        if person.get("known_for_department") in (None, "Acting")
    ]
    return SearchResponse(results=[to_actor_summary(person) for person in people[:limit]])


@app.get("/api/search/movies", response_model=MovieSearchResponse)
async def search_movies(q: str = Query(..., min_length=2), limit: int = Query(8, ge=1, le=20)):
    payload = await tmdb_get(
        "/search/movie",
        {"query": q, "include_adult": "false", "page": 1},
    )
    movies = [movie for movie in payload.get("results", []) if is_feature_movie(movie)]
    movies.sort(
        key=lambda movie: (
            float(movie.get("popularity") or 0),
            int(movie.get("vote_count") or 0),
            release_year(movie.get("release_date")) or "0000",
        ),
        reverse=True,
    )
    return MovieSearchResponse(results=[to_movie_summary(movie) for movie in movies[:limit]])


@app.get("/api/actors/movies", response_model=MovieSearchResponse)
async def actor_movies(
    actor_id: int | None = Query(None),
    actor_name: str | None = Query(None, min_length=2),
    q: str = "",
    limit: int = Query(8, ge=1, le=20),
):
    if actor_id is None and not actor_name:
        raise HTTPException(status_code=400, detail="Provide actor_id or actor_name.")

    actor = (
        ActorNode(id=actor_id, name=actor_name or "Selected actor")
        if actor_id is not None
        else await resolve_actor_id(actor_name or "")
    )
    movies = await async_actor_all_movies(actor.id)
    query = q.strip().lower()

    if query:
        movies = [movie for movie in movies if query in movie.title.lower()]

    return MovieSearchResponse(
        results=[
            MovieSummary(
                id=movie.id,
                title=movie.title,
                release_year=movie.release_year,
                poster_path=movie.poster_path,
            )
            for movie in movies[:limit]
        ]
    )


@app.get("/api/movies/cast", response_model=SearchResponse)
async def movie_cast(
    movie_id: int | None = Query(None),
    movie_name: str | None = Query(None, min_length=2),
    q: str = "",
    limit: int = Query(8, ge=1, le=20),
):
    if movie_id is None and not movie_name:
        raise HTTPException(status_code=400, detail="Provide movie_id or movie_name.")

    movie = (
        MovieNode(id=movie_id, title=movie_name or "Selected movie")
        if movie_id is not None
        else await resolve_movie_id(movie_name or "")
    )
    cast = await async_movie_cast(movie.id)
    query = q.strip().lower()

    if query:
        cast = [actor for actor in cast if query in actor.name.lower()]

    return SearchResponse(
        results=[
            ActorSummary(
                id=actor.id,
                name=actor.name,
                known_for="Cast",
                profile_path=actor.profile_path,
            )
            for actor in cast[:limit]
        ]
    )


@app.get("/api/trending/actors", response_model=TrendingResponse)
async def trending_actors(limit: int = Query(8, ge=1, le=20)):
    payload = await tmdb_get("/trending/person/week", {"page": 1})
    people = [
        person
        for person in payload.get("results", [])
        if person.get("known_for_department") in (None, "Acting")
    ]
    return TrendingResponse(results=[to_actor_summary(person) for person in people[:limit]])


@app.get("/api/challenges/random", response_model=ChallengeResponse)
async def random_challenge():
    return fallback_challenge()


@app.post("/api/challenges/score", response_model=ChallengeScoreResponse)
async def score_challenge(payload: ChallengeScoreRequest):
    if not payload.player_path:
        return ChallengeScoreResponse(
            score=0,
            rating="No Route",
            valid=False,
            issues=["Build a route before submitting."],
            player_degrees=0,
            optimal_degrees=0,
            par_degrees=payload.par_degrees,
            player_path=[],
            optimal_path=[],
        )

    target_actor = (
        ActorNode(
            id=payload.target_actor.id,
            name=payload.target_actor.name,
            profile_path=payload.target_actor.poster_path,
        )
        if payload.target_actor.id
        else await resolve_actor_id(payload.target_actor.name)
    )
    actor_cache[target_actor.id] = target_actor

    player_path = await hydrated_player_path(payload.player_path)
    issues = await validate_player_path(player_path, target_actor.id)
    if payload.waypoint:
        hit_waypoint = any(
            step.type == "movie" and step.id in payload.waypoint.movie_ids
            for step in player_path
        )
        if not hit_waypoint:
            issues.append(f"Route must include {payload.waypoint.name}.")

    start_actor = player_path[0]
    player_degrees = max(0, (len(player_path) - 1) // 2)

    if issues:
        return ChallengeScoreResponse(
            score=0,
            rating="Invalid Route",
            valid=False,
            issues=issues,
            player_degrees=player_degrees,
            optimal_degrees=0,
            par_degrees=payload.par_degrees,
            player_path=player_path,
            optimal_path=[],
        )

    if target_actor.profile_path is None and player_path[-1].type == "actor":
        target_actor = ActorNode(
            id=target_actor.id,
            name=target_actor.name,
            profile_path=player_path[-1].poster_path,
        )

    start_actor_node = ActorNode(
        id=start_actor.id,
        name=start_actor.name,
        profile_path=start_actor.poster_path,
    )

    if payload.waypoint:
        connection = await constrained_connection_for_waypoint(
            start_actor_node,
            target_actor,
            payload.waypoint,
        )
        score_issues: list[str] = (
            [
                "Constrained optimal search could not resolve this waypoint quickly, so the submitted route was used for scoring.",
            ]
            if not connection.path
            else []
        )
        if not connection.path:
            connection = ConnectionResponse(
                path=player_path,
                degrees=player_degrees,
                source="submitted-route-waypoint-fallback",
            )
    else:
        connection = await best_connection_for_score(
            player_path,
            target_actor,
            player_degrees,
        )
        score_issues = (
            [
                "Long routes use a quick optimal search that checks for direct and 2-degree shortcuts.",
            ]
            if connection.source == "submitted-route-no-quick-shorter-route"
            else []
        )

    if not connection.path:
        return ChallengeScoreResponse(
            score=0,
            rating="No Route",
            valid=False,
            issues=["No optimal route was found within the search limit."],
            player_degrees=player_degrees,
            optimal_degrees=0,
            par_degrees=payload.par_degrees,
            player_path=player_path,
            optimal_path=[],
        )

    optimal_delta = max(0, player_degrees - connection.degrees)
    par_delta = max(0, player_degrees - payload.par_degrees)
    score = max(100, min(1000, 1000 - (player_degrees * 90) - (optimal_delta * 140) - (par_delta * 80)))

    return ChallengeScoreResponse(
        score=score,
        rating=rating_for_score(score),
        valid=True,
        issues=score_issues,
        player_degrees=player_degrees,
        optimal_degrees=connection.degrees,
        par_degrees=payload.par_degrees,
        player_path=player_path,
        optimal_path=connection.path,
    )


@app.get("/api/actors/{actor_id}", response_model=ActorSummary)
async def actor_detail(actor_id: int):
    payload = await tmdb_get(f"/person/{actor_id}")
    return ActorSummary(
        id=payload["id"],
        name=payload["name"],
        known_for=payload.get("known_for_department"),
        profile_path=payload.get("profile_path"),
    )


@app.get("/api/movies/{movie_id}", response_model=MovieSummary)
async def movie_detail(movie_id: int):
    payload = await tmdb_get(f"/movie/{movie_id}")
    return MovieSummary(
        id=payload["id"],
        title=payload.get("title") or "Untitled movie",
        release_year=release_year(payload.get("release_date")),
        poster_path=payload.get("poster_path"),
    )


@app.get("/api/connections", response_model=ConnectionResponse)
async def find_connection(
    from_actor: str = Query(..., min_length=2),
    to_actor: str = Query(..., min_length=2),
    max_depth: int = Query(6, ge=2, le=8),
):
    return await shortest_connection(from_actor, to_actor, max_depth)
