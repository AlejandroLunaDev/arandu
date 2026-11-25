import { ConflictException, NotFoundException } from '@nestjs/common';

export const subjectNotFound = () =>
  new NotFoundException({
    code: 'subject_not_found',
    message: 'No such subject',
  });

export const noNovelosLeft = () =>
  new ConflictException({
    code: 'no_novelos_left',
    message: 'No novelos left',
  });

export const novelosLeft = () =>
  new ConflictException({
    code: 'novelos_left',
    message: 'Re-reading gives a novelo only at 0',
  });

export const rereadUsed = () =>
  new ConflictException({
    code: 'reread_used',
    message: 'This chapter already gave its novelo',
  });

export const chapterNotOpen = () =>
  new ConflictException({
    code: 'chapter_not_open',
    message: 'This chapter is not open yet',
  });
