import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

const encrypt = (text: string) => {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error('ENCRYPTION_KEY is not set.');
  const key = Buffer.from(encryptionKey, 'base64');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

const decrypt = (encryptedText: string) => {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error('ENCRYPTION_KEY is not set.');
  const key = Buffer.from(encryptionKey, 'base64');
  const [ivHex, authTagHex, encryptedHex] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Retrieves a valid LinkedIn access token for a user, refreshing it if necessary.
 * @param userId The UUID of the user.
 * @returns A valid LinkedIn access token.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const { data: connection, error } = await supabaseAdmin
    .from('social_connections')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('provider', 'linkedin')
    .single();

  if (error || !connection) {
    throw new Error('LinkedIn connection not found for this user.');
  }

  const expiresAt = new Date(connection.expires_at!).getTime();
  const isExpired = Date.now() > expiresAt - 60 * 1000; // 1-minute buffer

  if (!isExpired) {
    return decrypt(connection.access_token);
  }

  // --- Token is expired, refresh it ---
  console.log(`Refreshing expired LinkedIn token for user ${userId}`);
  const decryptedRefreshToken = decrypt(connection.refresh_token!);

  const refreshResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: decryptedRefreshToken,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  });

  if (!refreshResponse.ok) {
    const errorBody = await refreshResponse.text();
    console.error('Failed to refresh LinkedIn token:', errorBody);
    throw new Error('Could not refresh LinkedIn token. The user may need to reconnect.');
  }

  const newTokens = await refreshResponse.json();
  const newExpiresAt = new Date();
  newExpiresAt.setSeconds(newExpiresAt.getSeconds() + newTokens.expires_in);

  const { error: updateError } = await supabaseAdmin
    .from('social_connections')
    .update({
      access_token: encrypt(newTokens.access_token),
      refresh_token: encrypt(newTokens.refresh_token), // LinkedIn provides a new refresh token
      expires_at: newExpiresAt.toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'linkedin');

  if (updateError) {
    console.error('Error saving refreshed LinkedIn token:', updateError);
    // Still return the new token, as the refresh itself was successful
  }

  return newTokens.access_token;
}

/**
 * Fetches the basic profile of the connected LinkedIn user.
 * @param userId The UUID of the user.
 * @returns The user's LinkedIn profile data.
 */
export async function fetchLinkedInProfile(userId: string) {
  const accessToken = await getValidAccessToken(userId);

  const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileResponse.ok) {
    throw new Error('Failed to fetch data from LinkedIn API.');
  }

  return await profileResponse.json();
}