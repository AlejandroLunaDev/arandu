import { ConflictException, NotFoundException } from '@nestjs/common';

export const levelNotFound = () =>
  new NotFoundException({ code: 'level_not_found', message: 'No such level' });

export const levelNotReached = () =>
  new ConflictException({
    code: 'level_not_reached',
    message: 'This level is not reached yet',
  });

export const levelClaimed = () =>
  new ConflictException({
    code: 'level_claimed',
    message: 'This level was already claimed',
  });

export const caixaNotFound = () =>
  new NotFoundException({ code: 'caixa_not_found', message: 'No such caixa' });

export const caixaOpen = () =>
  new ConflictException({
    code: 'caixa_open',
    message: 'This caixa is already open',
  });

export const shopItemNotFound = () =>
  new NotFoundException({
    code: 'shop_item_not_found',
    message: 'No such shop item',
  });

export const novelosFull = () =>
  new ConflictException({
    code: 'novelos_full',
    message: 'Novelos are already full',
  });

export const marcadoresFull = () =>
  new ConflictException({
    code: 'marcadores_full',
    message: 'Page markers are already at the maximum',
  });

export const notEnoughPeixinhos = () =>
  new ConflictException({
    code: 'not_enough_peixinhos',
    message: 'Not enough peixinhos',
  });

export const outfitNotOwned = () =>
  new ConflictException({
    code: 'outfit_not_owned',
    message: 'This outfit is not owned yet',
  });
