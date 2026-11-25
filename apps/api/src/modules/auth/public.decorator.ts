import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';
export const OPEN_TO_BROWSERS = 'openToBrowsers';

/** Opens a route without a session (sign-in, refresh). It still needs the web server's internal secret. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Opens a route to anyone, browsers included: no session and no internal secret (health check, landing books). */
export const OpenToBrowsers = () => SetMetadata(OPEN_TO_BROWSERS, true);
