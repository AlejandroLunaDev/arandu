import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';

export const careerNotFound = () =>
  new NotFoundException({
    code: 'career_not_found',
    message: 'No such career',
  });

/** Also a stop the person has not opened yet: a response never reveals what is ahead. */
export const stopNotFound = () =>
  new NotFoundException({ code: 'stop_not_found', message: 'No such stop' });

export const explainNotFound = () =>
  new NotFoundException({
    code: 'explain_not_found',
    message: 'This stop has no "Explique para o Arandu"',
  });

export const stopUnavailable = () =>
  new ServiceUnavailableException({
    code: 'stop_unavailable',
    message:
      'Arandu could not prepare this stop with checked sources; try again later',
  });

export const aranduUnavailable = () =>
  new ServiceUnavailableException({
    code: 'model_unavailable',
    message: 'Arandu could not answer now; try again',
  });
