import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const config = {
    getOrThrow: vi.fn((key: string) => {
      const values: Record<string, string> = {
        'auth.adminUsername': 'admin',
        'auth.adminPassword': 'secret-password',
      };

      return values[key];
    }),
  };
  const jwt = {
    signAsync: vi.fn().mockResolvedValue('signed-token'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates the seeded admin credentials', () => {
    const service = new AuthService(
      config as never,
      jwt as unknown as JwtService,
    );

    expect(
      service.validateAdminCredentials('admin', 'secret-password'),
    ).toEqual({
      id: 'seed-admin',
      username: 'admin',
      roles: ['admin'],
    });
  });

  it('rejects invalid credentials', () => {
    const service = new AuthService(
      config as never,
      jwt as unknown as JwtService,
    );

    expect(() =>
      service.validateAdminCredentials('admin', 'wrong-password'),
    ).toThrow(UnauthorizedException);
  });

  it('signs a JWT payload for login', async () => {
    const service = new AuthService(
      config as never,
      jwt as unknown as JwtService,
    );

    await expect(
      service.login({
        id: 'seed-admin',
        username: 'admin',
        roles: ['admin'],
      }),
    ).resolves.toEqual({
      accessToken: 'signed-token',
      user: {
        id: 'seed-admin',
        username: 'admin',
        roles: ['admin'],
      },
    });

    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: 'seed-admin',
      username: 'admin',
      roles: ['admin'],
    });
  });
});
