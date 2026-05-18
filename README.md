# CineLink

A web-based game that challenges players to find the shortest path between two actors through their movie connections. Similar to "Six Degrees of Kevin Bacon," players build alternating actor-movie routes and compete against the optimal path calculated by the API.

## Features

- **Interactive Route Building**: Select actors and movies to build your path from a starting actor to a target Hollywood actor
- **Smart Validation**: Every connection is verified against TMDB's official credits database
- **Optimal Pathfinding**: The backend calculates the shortest available route using intelligent search algorithms
- **Scoring System**: Compete against the optimal path to earn a score based on route efficiency
- **Autocomplete Search**: Real-time suggestions for actors and movies as you type
- **Intelligent Filtering**: Filters out documentaries, interviews, and archival content to focus on mainstream feature films
- **Curated Challenges**: Random Hollywood target actors from the database
- **Timeout Protection**: If pathfinding takes too long, you're scored against your valid submitted route

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework for building APIs
- **TMDB API Integration** - The Movie Database for authentic film and actor credits
- **Uvicorn** - ASGI server for production deployment
- **Python 3.8+**

### Frontend
- **Next.js 16** - React framework with server-side rendering
- **React 19** - UI component library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Node.js 18+**

## Prerequisites

- Python 3.8 or higher
- Node.js 18 or higher
- npm, yarn, pnpm, or bun (for frontend)
- TMDB API key (free from [themoviedb.org](https://www.themoviedb.org/settings/api))

## Installation & Setup

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
```bash
# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Create a `.env` file in the backend directory with your configuration:
```env
TMDB_API_KEY=your_api_key_here
TMDB_BASE_URL=https://api.themoviedb.org/3
FRONTEND_ORIGIN=http://localhost:3000
```

6. Run the development server:
```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. API documentation is at `http://localhost:8000/docs`.

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
# or yarn install, pnpm install, bun install
```

3. Run the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## How to Play

1. **Start the Game**: The frontend presents you with a target Hollywood actor
2. **Choose Your Starting Actor**: Search for and select an actor to begin your route
3. **Build Your Route**: Alternate between selecting movies and actors:
   - Select a movie the current actor appeared in
   - Select an actor who appeared in that movie
   - Repeat until you reach the target actor
4. **Submit Your Route**: When you've connected to the target actor, submit your answer
5. **View Your Score**: The backend validates your route and compares it to the optimal path

**Example Route**:
```
Leonardo DiCaprio → Inception → Joseph Gordon-Levitt → The Dark Knight Rises → Christian Bale → American Psycho → Jared Leto
```


## Project Structure

```
CineLink/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py           # FastAPI application with all endpoints
│   ├── requirements.txt       # Python dependencies
│   ├── README.md             # Backend documentation
│   └── .env.example          # Environment configuration template
├── frontend/
│   ├── app/
│   │   ├── layout.tsx        # Root layout component
│   │   ├── page.tsx          # Home page
│   │   ├── globals.css       # Global styles
│   │   ├── components/
│   │   │   └── cinelink-app.tsx  # Main game component
│   │   ├── lib/
│   │   │   ├── api.ts        # API client
│   │   │   └── mock-data.ts  # Development mock data
│   │   ├── actors/           # Actor-related pages
│   │   ├── movies/           # Movie-related pages
│   ├── public/               # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── postcss.config.mjs
│   ├── eslint.config.mjs
│   └── README.md             # Frontend documentation
├── LICENSE                   # Project license
└── README.md                # This file
```

## Game Algorithm Details

### Pathfinding Strategy
The backend uses breadth-first search (BFS) with intelligent filtering to find the shortest route between actors:

- **Mainstream Focus**: Filters movies with vote count ≥ 250 and popularity ≥ 2.0
- **Quality Control**: Excludes documentaries, interviews, behind-the-scenes, and archival content
- **Performance Optimization**:
  - Movie limit: 35 movies per actor
  - Cast limit: 18 actors per movie
  - Scoring search limits are more restrictive to balance performance
- **Timeout Protection**: If pathfinding exceeds time limits, scoring uses the submitted route instead

### Validation Process
When you submit a route, the backend:
1. Verifies each connection against TMDB's broader feature-film credit set
2. Confirms the final actor matches the target actor
3. Validates that the route follows the alternating actor-movie pattern
4. Calculates the optimal route using the pathfinding algorithm
5. Compares your route length to the optimal length for scoring


## License

This project is licensed under the MIT License.

