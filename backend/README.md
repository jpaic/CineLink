# CineLink Backend

FastAPI service for the CineLink route challenge. The app gives the player a
Hollywood target actor, the player chooses a starting actor, and the API
calculates the optimal actor-movie path plus a score.

## API Shape

- `GET /api/challenges/random` returns a curated Hollywood target actor.
- `POST /api/challenges/score` validates the player's route, calculates the optimal route, and returns a score.
- `GET /api/search/actors` powers autocomplete.
- `GET /api/search/movies` powers movie-step autocomplete.
- `GET /api/actors/movies` powers movie suggestions for the current actor at the head of the route.
- `GET /api/movies/cast` powers actor suggestions for the current movie at the head of the route.
- `GET /api/connections` remains available for direct actor-to-actor lookup.

## How The Game Works

The frontend gives the player a Hollywood target actor. The player chooses a
starting actor, then builds an alternating route:

```text
Actor -> Movie -> Actor -> Movie -> Target Actor
```

When the player submits, the backend checks every edge against TMDB credits:

- the previous actor must appear in the selected movie
- the next actor must appear in the selected movie
- the final actor must be the target actor

The backend also calculates the shortest available route and scores the player
against that optimal path.

Pathfinding is tuned toward mainstream feature films. Documentary, interview,
making-of, featurette, behind-the-scenes, compilation, and supercut-style credits
are filtered out so the optimal route does not prefer odd archival appearances
over recognizable movies. Validation checks the broader feature-film credit set,
so older valid movies are still accepted.

Scoring validates the submitted route before running optimal search. The optimal
search is timeboxed, and if it takes too long the API returns a score against the
submitted valid route instead of leaving the frontend stuck.

## Setup

1. Create a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy `.env.example` to `.env`.
4. Put your TMDB v3 API key in `backend/.env`:

```env
TMDB_API_KEY=your_tmdb_api_key_here
```

5. Run the API:

```bash
uvicorn app.main:app --reload --port 8000
```

The frontend expects the backend at `http://127.0.0.1:8000` by default. To
change it, create `frontend/.env.local` and set:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```
