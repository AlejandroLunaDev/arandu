import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/** Opens a route to anyone: every other route needs a signed-in person. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
