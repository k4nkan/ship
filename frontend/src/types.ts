export type PostInput = {
  team: string;
  nickname: string;
  comment: string;
  photoDataUrl: string;
};

export type PostResult = {
  gyan: number;
  level: string;
  reaction: string;
  facebookText: string;
};

export type AdventurePost = PostInput &
  PostResult & {
    id: string;
    createdAt: string;
  };

export type PostSummary = {
  posts: AdventurePost[];
  totalGyan: number;
  lastPost: AdventurePost | null;
  currentSpeed: number;
};
