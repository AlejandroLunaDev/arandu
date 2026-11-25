import { BadRequestException } from '@nestjs/common';

export const unknownJourney = () =>
  new BadRequestException({
    code: 'unknown_journey',
    message: 'No such career, course or subject',
  });
