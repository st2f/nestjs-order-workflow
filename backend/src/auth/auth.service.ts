import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedUser, JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  validateAdminCredentials(
    username: string,
    password: string,
  ): AuthenticatedUser {
    const expectedUsername =
      this.config.getOrThrow<string>('auth.adminUsername');
    const expectedPassword =
      this.config.getOrThrow<string>('auth.adminPassword');

    if (username !== expectedUsername || password !== expectedPassword) {
      throw new UnauthorizedException('Invalid username or password');
    }

    return {
      id: 'seed-admin',
      username,
      roles: ['admin'],
    };
  }

  async login(user: AuthenticatedUser): Promise<LoginResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      roles: user.roles,
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      user,
    };
  }
}

export type LoginResponse = {
  accessToken: string;
  user: AuthenticatedUser;
};
