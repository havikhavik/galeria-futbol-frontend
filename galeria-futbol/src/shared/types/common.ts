export type TeamType = "CLUB" | "NATIONAL";

export type PageResponse<T> = {
  content: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
  first?: boolean;
  last?: boolean;
};

export type ApiErrorPayload = {
  message?: string;
  errors?: string[];
};

export type HttpClientError = Error & {
  status?: number;
  detail?: string;
};
