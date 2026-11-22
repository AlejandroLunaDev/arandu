import { NotFoundException } from '@nestjs/common';

export const professionNotFound = () =>
  new NotFoundException({
    code: 'profession_not_found',
    message: 'No such profession',
  });

/** Nothing real to ground on: Arandu does not talk about it rather than invent it. */
export const curriculumNotFound = () =>
  new NotFoundException({
    code: 'curriculum_not_found',
    message: 'No curriculum yet for this profession',
  });
