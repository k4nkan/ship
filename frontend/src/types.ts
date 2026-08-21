export type PostInput = {
  team: string;
  nickname: string;
  comment: string;
  photoDataUrl: string;
};

export type PostResult = {
  gyan: number;
  gyanLevel: string;
  reaction: string;
  facebookText: string;
};

export type AdventurePost = PostInput &
  PostResult & {
    id: string;
    createdAt: string;
    imagePath: string;
    resultImagePath: string | null;
    imageUrl: string;
  };

export type PostSummary = {
  posts: AdventurePost[];
  totalGyan: number;
  lastPost: AdventurePost | null;
  currentSpeed: number;
  currentProgress: number;
};

export type JourneyState = {
  totalGyan: number;
  progress: number;
  speed: number;
  updatedAt: string;
};

export type CurrencyTransaction = {
  id: string;
  amount: number;
  createdAt: string;
};

export type RaceState = {
  isRunning: boolean;
  elapsedSeconds: number;
  speedPerHour: number;
  updatedAt: string;
};

export type TeamStats = {
  id: string;
  name: string;
  color: string;
  icon: string;
  earnedCurrency: number;
  spentCurrency: number;
  balance: number;
  progress: number;
  rank: number;
  recentTransactions: CurrencyTransaction[];
};

export type TeamList = {
  goalCurrency: number;
  race: RaceState;
  teams: TeamStats[];
};
