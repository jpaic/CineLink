export type PathStep = {
  id?: number;
  type: "actor" | "movie";
  name: string;
  slug: string;
  subtitle?: string;
  posterPath?: string | null;
};

export type ActorSuggestion = {
  id?: number;
  name: string;
  slug: string;
  knownFor: string;
  profilePath?: string | null;
};

export type MovieSuggestion = {
  id?: number;
  title: string;
  slug: string;
  releaseYear?: string | null;
  posterPath?: string | null;
};

export type Challenge = {
  id: string;
  targetActor: ActorSuggestion;
  difficulty: "easy" | "medium" | "hard";
  parDegrees: number;
};

export type HardWaypoint =
  | {
      id: string;
      type: "movie";
      name: string;
      subtitle: string;
      movieIds: number[];
    }
  | {
      id: string;
      type: "director";
      name: string;
      subtitle: string;
      movieIds: number[];
      movieNames: string[];
    };

export type ScoreResult = {
  score: number;
  rating: string;
  valid: boolean;
  issues: string[];
  playerDegrees: number;
  optimalDegrees: number;
  parDegrees: number;
  playerPath: PathStep[];
  optimalPath: PathStep[];
};

export const samplePath: PathStep[] = [
  {
    id: 6193,
    type: "actor",
    name: "Leonardo DiCaprio",
    slug: "leonardo-dicaprio",
    subtitle: "Actor",
  },
  {
    type: "movie",
    name: "Django Unchained",
    slug: "django-unchained",
    subtitle: "2012",
  },
  {
    type: "actor",
    name: "Jamie Foxx",
    slug: "jamie-foxx",
    subtitle: "Actor",
  },
  {
    type: "movie",
    name: "Collateral",
    slug: "collateral",
    subtitle: "2004",
  },
  {
    type: "actor",
    name: "Tom Cruise",
    slug: "tom-cruise",
    subtitle: "Actor",
  },
];

export const samplePlayerPath: PathStep[] = [
  {
    type: "actor",
    name: "Leonardo DiCaprio",
    slug: "leonardo-dicaprio",
    subtitle: "Start",
  },
  {
    id: 640,
    type: "movie",
    name: "Catch Me If You Can",
    slug: "catch-me-if-you-can",
    subtitle: "2002",
  },
  {
    id: 31,
    type: "actor",
    name: "Tom Hanks",
    slug: "tom-hanks",
    subtitle: "Target",
  },
];

export const movieSuggestions: MovieSuggestion[] = [
  {
    title: "Catch Me If You Can",
    slug: "catch-me-if-you-can",
    releaseYear: "2002",
  },
  {
    title: "Django Unchained",
    slug: "django-unchained",
    releaseYear: "2012",
  },
  {
    title: "Collateral",
    slug: "collateral",
    releaseYear: "2004",
  },
  {
    title: "Ocean's Eleven",
    slug: "oceans-eleven",
    releaseYear: "2001",
  },
];

export const sampleChallenge: Challenge = {
  id: "demo-tom-hanks",
  targetActor: {
    name: "Tom Hanks",
    slug: "tom-hanks",
    knownFor: "Forrest Gump",
  },
  difficulty: "easy",
  parDegrees: 2,
};

export const hollywoodActors: ActorSuggestion[] = [
  {
    id: 31,
    name: "Tom Hanks",
    slug: "tom-hanks",
    knownFor: "Forrest Gump",
  },
  {
    id: 6193,
    name: "Leonardo DiCaprio",
    slug: "leonardo-dicaprio",
    knownFor: "Inception",
  },
  {
    id: 5064,
    name: "Meryl Streep",
    slug: "meryl-streep",
    knownFor: "The Devil Wears Prada",
  },
  {
    id: 5292,
    name: "Denzel Washington",
    slug: "denzel-washington",
    knownFor: "Training Day",
  },
  {
    id: 1204,
    name: "Julia Roberts",
    slug: "julia-roberts",
    knownFor: "Pretty Woman",
  },
  {
    id: 287,
    name: "Brad Pitt",
    slug: "brad-pitt",
    knownFor: "Once Upon a Time in Hollywood",
  },
  {
    id: 18277,
    name: "Sandra Bullock",
    slug: "sandra-bullock",
    knownFor: "The Blind Side",
  },
  {
    id: 500,
    name: "Tom Cruise",
    slug: "tom-cruise",
    knownFor: "Mission: Impossible",
  },
  {
    id: 1245,
    name: "Scarlett Johansson",
    slug: "scarlett-johansson",
    knownFor: "Lost in Translation",
  },
  {
    id: 3223,
    name: "Robert Downey Jr.",
    slug: "robert-downey-jr",
    knownFor: "Iron Man",
  },
  {
    id: 2231,
    name: "Samuel L. Jackson",
    slug: "samuel-l-jackson",
    knownFor: "Pulp Fiction",
  },
  {
    id: 192,
    name: "Morgan Freeman",
    slug: "morgan-freeman",
    knownFor: "The Shawshank Redemption",
  },
  {
    id: 6384,
    name: "Keanu Reeves",
    slug: "keanu-reeves",
    knownFor: "The Matrix",
  },
  {
    id: 524,
    name: "Natalie Portman",
    slug: "natalie-portman",
    knownFor: "Black Swan",
  },
  {
    id: 30614,
    name: "Ryan Gosling",
    slug: "ryan-gosling",
    knownFor: "La La Land",
  },
  {
    id: 54693,
    name: "Emma Stone",
    slug: "emma-stone",
    knownFor: "La La Land",
  },
  {
    id: 72129,
    name: "Jennifer Lawrence",
    slug: "jennifer-lawrence",
    knownFor: "The Hunger Games",
  },
  {
    id: 3894,
    name: "Christian Bale",
    slug: "christian-bale",
    knownFor: "The Dark Knight",
  },
  {
    id: 1813,
    name: "Anne Hathaway",
    slug: "anne-hathaway",
    knownFor: "The Devil Wears Prada",
  },
  {
    id: 112,
    name: "Cate Blanchett",
    slug: "cate-blanchett",
    knownFor: "Carol",
  },
  {
    id: 1461,
    name: "George Clooney",
    slug: "george-clooney",
    knownFor: "Ocean's Eleven",
  },
  {
    id: 1892,
    name: "Matt Damon",
    slug: "matt-damon",
    knownFor: "Good Will Hunting",
  },
  {
    id: 19492,
    name: "Viola Davis",
    slug: "viola-davis",
    knownFor: "Fences",
  },
  {
    id: 2888,
    name: "Will Smith",
    slug: "will-smith",
    knownFor: "Men in Black",
  },
  {
    id: 234352,
    name: "Margot Robbie",
    slug: "margot-robbie",
    knownFor: "Barbie",
  },
  {
    id: 8691,
    name: "Zoe Saldana",
    slug: "zoe-saldana",
    knownFor: "Avatar",
  },
  {
    id: 6968,
    name: "Hugh Jackman",
    slug: "hugh-jackman",
    knownFor: "Logan",
  },
  {
    id: 6885,
    name: "Charlize Theron",
    slug: "charlize-theron",
    knownFor: "Mad Max: Fury Road",
  },
  {
    id: 1158,
    name: "Al Pacino",
    slug: "al-pacino",
    knownFor: "The Godfather",
  },
  {
    id: 380,
    name: "Robert De Niro",
    slug: "robert-de-niro",
    knownFor: "Taxi Driver",
  },
  {
    id: 3,
    name: "Harrison Ford",
    slug: "harrison-ford",
    knownFor: "Indiana Jones",
  },
];

export const actorSuggestions: ActorSuggestion[] = [
  ...hollywoodActors,
  {
    id: 134,
    name: "Jamie Foxx",
    slug: "jamie-foxx",
    knownFor: "Ray",
  },
];

export const hardWaypoints: HardWaypoint[] = [
  {
    id: "movie-the-departed",
    type: "movie",
    name: "The Departed",
    subtitle: "2006 crime classic",
    movieIds: [1422],
  },
  {
    id: "movie-oceans-eleven",
    type: "movie",
    name: "Ocean's Eleven",
    subtitle: "2001 ensemble caper",
    movieIds: [161],
  },
  {
    id: "movie-pulp-fiction",
    type: "movie",
    name: "Pulp Fiction",
    subtitle: "1994 cult landmark",
    movieIds: [680],
  },
  {
    id: "movie-the-dark-knight",
    type: "movie",
    name: "The Dark Knight",
    subtitle: "2008 superhero epic",
    movieIds: [155],
  },
  {
    id: "director-scorsese",
    type: "director",
    name: "Martin Scorsese",
    subtitle: "Hit a Scorsese film",
    movieIds: [1422, 769, 103, 11324, 3131, 398978],
    movieNames: ["The Departed", "Goodfellas", "Taxi Driver", "Shutter Island", "Gangs of New York", "The Irishman"],
  },
  {
    id: "director-nolan",
    type: "director",
    name: "Christopher Nolan",
    subtitle: "Hit a Nolan film",
    movieIds: [155, 27205, 157336, 49026, 1124, 872585],
    movieNames: ["The Dark Knight", "Inception", "Interstellar", "The Dark Knight Rises", "The Prestige", "Oppenheimer"],
  },
  {
    id: "director-spielberg",
    type: "director",
    name: "Steven Spielberg",
    subtitle: "Hit a Spielberg film",
    movieIds: [640, 857, 424, 85, 329, 89],
    movieNames: ["Catch Me If You Can", "Saving Private Ryan", "Schindler's List", "Raiders of the Lost Ark", "Jurassic Park", "Indiana Jones and the Last Crusade"],
  },
  {
    id: "director-tarantino",
    type: "director",
    name: "Quentin Tarantino",
    subtitle: "Hit a Tarantino film",
    movieIds: [680, 68718, 16869, 24, 466272, 500],
    movieNames: ["Pulp Fiction", "Django Unchained", "Inglourious Basterds", "Kill Bill: Vol. 1", "Once Upon a Time in Hollywood", "Reservoir Dogs"],
  },
];
