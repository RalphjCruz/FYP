export type AuthUser = {
  id: number;
  email: string;
  username: string;
  createdAt: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export type AuthMode = 'login' | 'register';
