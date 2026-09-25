// pages/api/github/start.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';
import { randomBytes } from 'crypto';

const CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
// Request 'repo' scope to analyze public repository data for the trust score.
const SCOPE = encodeURIComponent('read:user repo');
const REDIRECT_URI = encodeURIComponent(`${process.env.NEXT_PUBLIC_SITE_URL}/api/github/callback`);

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Server-side validation to ensure the environment variable is set.
  if (!CLIENT_ID) {
    console.error("Missing NEXT_PUBLIC_GITHUB_CLIENT_ID environment variable.");
    return res.status(500).send("Configuration error: GitHub Client ID is not set on the server.");
  }

  // Generate a secure, random state value to prevent CSRF attacks.
  const state = randomBytes(16).toString('hex');

  // Store the state in a secure, httpOnly cookie that expires in 15 minutes.
  res.setHeader('Set-Cookie', serialize('github_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    path: '/',
    maxAge: 60 * 15, // 15 minutes
  }));

  const url = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=${SCOPE}&redirect_uri=${REDIRECT_URI}&state=${state}`;
  res.redirect(url);
}