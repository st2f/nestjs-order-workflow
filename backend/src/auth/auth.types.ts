export type AdminRole = 'admin';

export type AuthenticatedUser = {
  id: string;
  username: string;
  roles: AdminRole[];
};

export type JwtPayload = {
  sub: string;
  username: string;
  roles: AdminRole[];
};
