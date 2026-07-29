import type { MiddlewareHandler } from 'hono';
import { getSession } from './auth';
import type { Env } from './auth';

export const authMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const cookie = c.req.header('Cookie') || '';
  const session = await getSession(c.env.DB, cookie);
  if (!session) return c.redirect('/login');
  c.set('session' as never, session);
  await next();
};
