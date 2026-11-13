import {createAdminApiClient} from '@shopify/admin-api-client';
import { getToken } from './shopify-oauth';
import { existsSync } from 'node:fs';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const API_VERSION = process.env.SHOPIFY_API_VERSION;
const SHOP = process.env.SHOPIFY_STORE_URL || process.env.SHOPIFY_SHOP;

let client;
let cachedToken;

export const performOperation = async (operation, variables = {}) => {
  const token = await getToken();
  if (!client || cachedToken !== token) {
    cachedToken = token;
    client = createAdminApiClient({
      storeDomain: `${SHOP}`,
      apiVersion: `${API_VERSION}`,
      accessToken: `${token}`,
    });
  }
  return client.request(operation, { variables });
};