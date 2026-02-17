import type { Request } from 'express';

export type CurrentUser = {
  id: number;
  email: string;
  username: string;
};

export type AuthenticatedRequest = Request & {
  user?: CurrentUser;
};
