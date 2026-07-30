import type { MiddlewareHandler } from 'hono';
import type { Env } from './auth';
import { getSession } from './auth';

// Extend Hono's Variables type to include the session object
declare module 'hono' {
  interface ContextVariableMap {
    session: Awaited<ReturnType<typeof getSession>>;
  }
}

export const authMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const cookie = c.req.header('Cookie') || '';
  const session = await getSession(c.env.DB, cookie);
  if (!session) return c.redirect('/login');
  c.set('session', session);
  await next();
};
