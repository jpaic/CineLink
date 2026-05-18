# CineLink

CineLink is a movie route challenge built as a Vercel monorepo with a Next.js frontend and a FastAPI backend. Players connect actors through movies to reach a target actor, then compare their route against the shortest available path.

---

## Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [License](#license)

---

## Live Demo

https://cinelink.vercel.app

---

## Overview

CineLink combines actor and movie search, route validation, and scoring in a single gameplay experience.

Players build alternating paths of:

- Actor → Movie → Actor → Movie → Target actor

Every step is validated against TMDB credits. The backend also calculates the optimal connection path so the player can compare performance and score accordingly.

---

## Key Features

- **Directed route building** with actor and movie autocomplete
- **Live validation** against real TMDB credits
- **Optimal score comparison** using pathfinding logic
- **Director’s Cut mode** with hard objectives and optional movie stops
- **Fast search performance** with filtered mainstream film credits
- **Modern interface** built for smooth gameplay

---

## Tech Stack

### Frontend
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS

### Backend
- FastAPI
- Uvicorn
- Python
- TMDB API integration

### Deployment
- Vercel (frontend + backend monorepo)

---

## License

This project is licensed under the MIT License.

