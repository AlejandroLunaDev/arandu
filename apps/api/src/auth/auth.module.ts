import { Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';

/** Sign-in is Supabase Auth's: the web signs the person in, and this module checks their token on every request. */
@Module({
  providers: [AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}
