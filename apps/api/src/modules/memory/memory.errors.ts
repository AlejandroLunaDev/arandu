import { NotFoundException } from '@nestjs/common';

export const factNotFound = () =>
  new NotFoundException({ code: 'fact_not_found', message: 'No such fact' });

/** Also a session of someone else, or of another kind or career. */
export const sessionNotFound = () =>
  new NotFoundException({
    code: 'session_not_found',
    message: 'No such session',
  });
