import {
  ForbiddenException,
  RequestTimeoutException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthErrorCode } from '@arandu/contracts';

const body = (code: AuthErrorCode, message: string) => ({ code, message });

export const unauthorized = () =>
  new UnauthorizedException(body('unauthorized', 'Sign in again'));

export const invalidIdentityToken = () =>
  new UnauthorizedException(
    body('invalid_identity_token', 'Invalid identity token'),
  );

export const invalidRefreshToken = () =>
  new UnauthorizedException(
    body('invalid_refresh_token', 'Invalid refresh token'),
  );

export const refreshDeadlinePassed = () =>
  new RequestTimeoutException(
    body('refresh_deadline_passed', 'The refresh deadline has passed'),
  );

export const userBanned = () =>
  new ForbiddenException(body('user_banned', 'This account is banned'));

export const identityUnavailable = () =>
  new ServiceUnavailableException(
    body(
      'identity_unavailable',
      'Sign-in is unavailable right now, try again in a moment',
    ),
  );
