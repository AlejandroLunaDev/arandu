import { z } from 'zod';

/** One message from the person, at the trust boundary: bounded so one request's prompt, and its cost, stay small. */
export const message = z.string().trim().min(1).max(2000);
