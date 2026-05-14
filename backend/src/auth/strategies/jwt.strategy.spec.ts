import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('maps a valid JWT payload to the authenticated user shape', () => {
    const config = {
      getOrThrow: vi.fn().mockReturnValue('test-secret-at-least-16-chars'),
    };
    const strategy = new JwtStrategy(config as never);

    expect(
      strategy.validate({
        sub: 'seed-admin',
        username: 'admin',
        roles: ['admin'],
      }),
    ).toEqual({
      id: 'seed-admin',
      username: 'admin',
      roles: ['admin'],
    });
  });
});
