import { NotFoundException } from '@nestjs/common';

export const bookNotFound = () =>
  new NotFoundException({ code: 'book_not_found', message: 'No such book' });
