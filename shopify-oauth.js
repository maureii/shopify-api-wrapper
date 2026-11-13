import { URLSearchParams } from 'node:url';
import { existsSync } from 'node:fs';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const rawShop = process.env.SHOPIFY_SHOP || process.env.SHOPIFY_STORE_URL;
const SHOP = rawShop?.replace(/^https?:\/\//, '').replace(/\.myshopify\.com\/?$/, '');
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

if (!SHOP || !CLIENT_ID || !CLIENT_SECRET) {
  throw new Error(
    'Set SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, and SHOPIFY_CLIENT_SECRET in your .env'
  );
}

let token = null;
let tokenExpiresAt = 0;

export const getToken = async () => {
  if (token && Date.now() < tokenExpiresAt - 60_000) {
    return token;
  }

  const response = await fetch(
    `https://${SHOP}.myshopify.com/admin/oauth/access_token`,
    {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded',},
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    }
  );

  if (!response.ok) {
  const error = await response.text();

  console.error('HTTP Status:', response.status);
  console.error('Shopify Response:', error);

  throw new Error('Token request failed');
}

  const { access_token, expires_in } = await response.json();
  token = access_token;
  tokenExpiresAt = Date.now() + expires_in * 1000;

  return token;
};

