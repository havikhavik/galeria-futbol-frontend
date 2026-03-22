import type { TeamType } from "./common";

export type CategoryResponse = {
  id: number;
  code: string;
  name: string;
  teamType: TeamType;
  thumbnail?: string | null;
};
