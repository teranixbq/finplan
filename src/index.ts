import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';
import type { Env } from './auth';
import { handleGithubLogin, handleGithubCallback, handleLogout, getSession } from './auth';
import { authMiddleware } from './middleware';
import monthsRoute from './routes/months';
import assetsRoute from './routes/assets';
import investmentsRoute from './routes/investments';
import expensesRoute from './routes/expenses';

const app = new Hono<{ Bindings: Env }>();

app.get('/auth/github', handleGithubLogin);
app.get('/auth/github/callback', handleGithubCallback);
app.post('/auth/logout', handleLogout);

app.get('/login', serveStatic({ path: './public/login.html' }));
app.get('/unauthorized', serveStatic({ path: './public/unauthorized.html' }));

app.use('/api/*', authMiddleware);
app.route('/api/months', monthsRoute);
app.route('/api/assets', assetsRoute);
app.route('/api/investments', investmentsRoute);
app.route('/api/expenses', expensesRoute);

app.get('/api/me', authMiddleware, async (c) => {
  const cookie = c.req.header('Cookie') || '';
  const session = await getSession(c.env.DB, cookie);
  return c.json({ name: session?.githubName, email: session?.githubEmail });
});

app.use('/*', authMiddleware);
app.get('/', serveStatic({ path: './public/index.html' }));
app.get('/*', serveStatic({ root: './public' }));

export default app;
