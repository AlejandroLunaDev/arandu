import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

export const lessonLocked = () =>
  new ConflictException({
    code: 'lesson_locked',
    message: 'Finish the lessons before this one first',
  });

export const careerNotFound = () =>
  new NotFoundException({
    code: 'career_not_found',
    message: 'No such career',
  });

/** Also a chapter the person has not opened yet: a response never reveals what is ahead. */
export const chapterNotFound = () =>
  new NotFoundException({
    code: 'chapter_not_found',
    message: 'No such chapter',
  });

export const explainNotFound = () =>
  new NotFoundException({
    code: 'explain_not_found',
    message: 'This chapter has no "Explique para o Arandu"',
  });

export const chapterUnavailable = () =>
  new ServiceUnavailableException({
    code: 'chapter_unavailable',
    message:
      'Arandu could not prepare this chapter with checked sources; try again later',
  });

export const aranduUnavailable = () =>
  new ServiceUnavailableException({
    code: 'model_unavailable',
    message: 'Arandu could not answer now; try again',
  });
