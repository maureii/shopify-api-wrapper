import {createAdminApiClient} from '@shopify/admin-api-client';
import { getToken } from './authentication';
import { existsSync } from 'node:fs';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const API_VERSION = process.env.SHOPIFY_API_VERSION_NEW;
const SHOP = process.env.SHOPIFY_STORE_URL;
const ACCESS_TOKEN =  await getToken();


const client = createAdminApiClient({
  storeDomain: `${SHOP}`,
  apiVersion: `${API_VERSION}`,
  accessToken: `${ACCESS_TOKEN}`,
});


export const performOperation = async (operation, variables = {}) => {
  client.request(operation,{ variables, retries : 2 });
}