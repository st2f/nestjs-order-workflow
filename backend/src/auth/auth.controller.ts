import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, type LoginResponse } from './auth.service';
import type { AuthenticatedUser } from './auth.types';
import { LocalAuthGuard } from './guards/local-auth.guard';

type LoginRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Req() request: LoginRequest): Promise<LoginResponse> {
    return this.auth.login(request.user);
  }
}
