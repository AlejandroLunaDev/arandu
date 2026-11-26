import { ConflictException, NotFoundException } from '@nestjs/common';

export const subjectNotFound = () =>
  new NotFoundException({
    code: 'subject_not_found',
    message: 'No such subject',
  });

export const notEnoughPeixinhos = () =>
  new ConflictException({
    code: 'not_enough_peixinhos',
    message: 'Not enough peixinhos',
  });

export const notEnoughCurrency = () =>
  new ConflictException({
    code: 'not_enough_currency',
    message: 'Not enough currency',
  });
