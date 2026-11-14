import { z } from 'zod';

// Configure before schema creation; strict CSP must not probe dynamic code.
z.config({ jitless: true });

export { z };
