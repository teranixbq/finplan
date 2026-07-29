import { Hono } from 'hono';
import type { Env } from './auth';
import { handleGithubLogin, handleGithubCallback, handleLogout, getSession } from './auth';
import { authMiddleware } from './middleware';
import monthsRoute from './routes/months';
import assetsRoute from './routes/assets';
import investmentsRoute from './routes/investments';
import expensesRoute from './routes/expenses';
import incomesRoute from './routes/incomes';
import dailyRoute from './routes/daily';
import projectionsRoute from './routes/projections';

interface AppEnv extends Env {
  ASSETS: Fetcher;
}

const app = new Hono<{ Bindings: AppEnv }>();

app.get('/auth/github', handleGithubLogin);
app.get('/auth/github/callback', handleGithubCallback);
app.post('/auth/logout', handleLogout);

app.get('/login', async (c) => {
  return c.env.ASSETS.fetch(new Request(new URL('/login.html', c.req.url).toString()));
});

app.get('/unauthorized', async (c) => {
  return c.env.ASSETS.fetch(new Request(new URL('/unauthorized.html', c.req.url).toString()));
});

app.use('/api/*', authMiddleware);
app.route('/api/months', monthsRoute);
app.route('/api/assets', assetsRoute);
app.route('/api/investments', investmentsRoute);
app.route('/api/expenses', expensesRoute);
app.route('/api/incomes', incomesRoute);
app.route('/api/daily', dailyRoute);
app.route('/api/projections', projectionsRoute);

app.get('/api/me', authMiddleware, async (c) => {
  const cookie = c.req.header('Cookie') || '';
  const session = await getSession(c.env.DB, cookie);
  return c.json({ name: session?.githubName, email: session?.githubEmail });
});

app.use('/*', authMiddleware);

app.get('/', async (c) => {
  return c.env.ASSETS.fetch(new Request(new URL('/index.html', c.req.url).toString()));
});

app.get('/*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
