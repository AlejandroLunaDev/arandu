import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { SessionsService } from './sessions.service.js';
import { SupabaseIdentity } from './supabase-identity.js';

/** The API owns users and sessions; Supabase Auth only proves the Google identity at sign-in. */
@Module({
  controllers: [AuthController],
  providers: [
    AuthGuard,
    AuthRepository,
    AuthService,
    SessionsService,
    SupabaseIdentity,
  ],
  exports: [AuthGuard],
})
export class AuthModule {}
