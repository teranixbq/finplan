import type { Context } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { sessions } from './db/schema';
import { eq } from 'drizzle-orm';
import { getDb, now } from './lib/db';

export interface Env {
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  ALLOWED_EMAIL: string;
  SESSION_SECRET: string;
}

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function handleGithubLogin(c: Context<{ Bindings: Env }>) {
  const state = generateToken();
  const params = new URLSearchParams({
    client_id: c.env.GITHUB_CLIENT_ID,
    redirect_uri: `https://${c.req.header('host')}/auth/github/callback`,
    scope: 'user:email',
    state,
  });
  return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
}

export async function handleGithubCallback(c: Context<{ Bindings: Env }>) {
  const code = c.req.query('code');
  if (!code) return c.redirect('/unauthorized');

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) return c.redirect('/unauthorized');

  const emailRes = await fetch('https://api.github.com/user/emails', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'FinPlan-App',
    },
  });

  const emails = (await emailRes.json()) as Array<{
    email: string;
    primary: boolean;
    verified: boolean;
  }>;
  const primary = emails.find((e) => e.primary && e.verified);
  if (!primary || primary.email !== c.env.ALLOWED_EMAIL) return c.redirect('/unauthorized');

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'FinPlan-App',
    },
  });
  const user = (await userRes.json()) as { name?: string; login: string };

  const db = getDb(c.env.DB);
  const token = generateToken();
  const ts = now();
  const expires = ts + 60 * 60 * 24 * 30;

  await db.insert(sessions).values({
    token,
    githubEmail: primary.email,
    githubName: user.name || user.login,
    expiresAt: expires,
    createdAt: ts,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      'Set-Cookie': `fp_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
    },
  });
}

export async function handleLogout(c: Context<{ Bindings: Env }>) {
  const cookie = c.req.header('Cookie') || '';
  const match = cookie.match(/fp_session=([^;]+)/);
  if (match) {
    const db = getDb(c.env.DB);
    await db.delete(sessions).where(eq(sessions.token, match[1]));
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/auth/github',
      'Set-Cookie': 'fp_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    },
  });
}

export async function getSession(db: D1Database, cookie: string) {
  const match = cookie.match(/fp_session=([^;]+)/);
  if (!match) return null;

  const drizzleDb = getDb(db);
  const ts = now();
  const result = await drizzleDb.select().from(sessions).where(eq(sessions.token, match[1])).get();

  if (!result || result.expiresAt < ts) return null;
  return result;
}
