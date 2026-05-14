import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { OpsController } from './ops.controller';

describe('OpsController auth metadata', () => {
  it('requires JWT auth and admin role for ops routes', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      OpsController,
    ) as unknown[];
    const roles = Reflect.getMetadata(ROLES_KEY, OpsController) as unknown[];

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    expect(roles).toEqual(['admin']);
  });
});
