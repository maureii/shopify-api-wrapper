import {createAdminApiClient} from '@shopify/admin-api-client';
import { getToken } from './shopify-oauth';
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
  return client.request(operation,{ variables });
}

const result = await performOperation(
  `
    query ProductQuery($id: ID!) {
      product(id: $id) {
        id
        title
        handle
      }
    }
  `,
  {
    id: 'gid://shopify/Product/9700217782497',
  }
);

console.log(result.data);