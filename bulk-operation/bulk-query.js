import { performOperation } from "../shopify-client.js";
import { GET_PRODUCTS_QUERY } from "./get-products.js";

const INIT_BULK_QUERY = `
  mutation ($query: String!) {
    bulkOperationRunQuery(query: $query) {
      bulkOperation {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const GET_BULK_STATUS = `
  query ($bulkId: ID!) {
    bulkOperation(id: $bulkId) {
      id
      status
      errorCode
      createdAt
      completedAt
      objectCount
      fileSize
      url
      partialDataUrl
    }
  }
`;

const POLLING_INTERVAL = 3000;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const executeGraphQL = async (query, variables) => {
  const { data, errors } = await performOperation(query, variables);

  if (errors?.length) throw new Error(errors.map(error => error.message).join('\n'));
  return data;
};

const getBulkOperation = async (operationId) => {
  const result = await executeGraphQL(GET_BULK_STATUS, { bulkId: operationId });
  return result.bulkOperation;
};

const runBulkQuery = async () => {
  const data = await executeGraphQL(INIT_BULK_QUERY, { query: GET_PRODUCTS_QUERY });

  const bulkResult = data.bulkOperationRunQuery;
  if (bulkResult?.userErrors?.length) {
    throw new Error(bulkResult.userErrors.map(error => error.message).join('\n'));
  }

  let bulkOperation = bulkResult?.bulkOperation;
  if (!bulkOperation) throw new Error('Shopify did not return a bulk operation.');

  console.log(`Bulk operation started: ${bulkOperation.id}`);

  while (['CREATED', 'RUNNING'].includes(bulkOperation.status)) {
    await delay(POLLING_INTERVAL);
    bulkOperation = await getBulkOperation(bulkOperation.id);
    console.log(`Status: ${bulkOperation.status} | Objects: ${bulkOperation.objectCount}`);
  }

  if (bulkOperation.status !== 'COMPLETED') throw new Error(`Bulk operation failed: ${bulkOperation.status} (${bulkOperation.errorCode})`);

  const response = await fetch(bulkOperation.url);
  if (!response.ok) throw new Error(`Failed to download bulk data file: ${response.statusText}`);

  return response.text();
};

export default runBulkQuery;