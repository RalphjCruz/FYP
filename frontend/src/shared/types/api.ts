export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export const parseApiErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error && err.message) {
    return err.message;
  }

  return fallback;
};
