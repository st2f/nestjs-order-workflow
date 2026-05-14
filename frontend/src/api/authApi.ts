import { request } from './apiClient';

export type AuthenticatedUser = {
  id: string;
  username: string;
  roles: string[];
};

export type LoginResponse = {
  accessToken: string;
  user: AuthenticatedUser;
};

export const authApi = {
  login: (credentials: { username: string; password: string }) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
};
