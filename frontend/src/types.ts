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
};

export type JourneyState = {
  totalGyan: number;
  progress: number;
  speed: number;
  updatedAt: string;
};
