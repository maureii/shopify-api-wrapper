import { performOperation } from "../shopify-client.js";
import { GET_PRODUCTS_QUERY } from "./product-fetch.js";

const POLLING_INTERVAL_MS = 3000;

const BULK_STATUS = Object.freeze({
  CREATED: "CREATED",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
});

const ACTIVE_BULK_STATUSES = new Set([BULK_STATUS.CREATED, BULK_STATUS.RUNNING]);

const RUN_BULK_QUERY_MUTATION = `
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

const GET_BULK_OPERATION_QUERY = `
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

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const joinMessages = (items) => items.map(({ message }) => message).join("\n");

const isBulkOperationActive = ({ status }) => ACTIVE_BULK_STATUSES.has(status);

const executeGraphQLRequest = async (query, variables) => {
  const { data, errors } = await performOperation(query, variables);

  if (errors?.length) {
    throw new Error(joinMessages(errors));
  }

  return data;
};

// Submits the products query as a bulk operation and returns its initial state.
const startBulkOperation = async () => {
  const { bulkOperationRunQuery } = await executeGraphQLRequest(
    RUN_BULK_QUERY_MUTATION,
    { query: GET_PRODUCTS_QUERY }
  );

  const { bulkOperation, userErrors } = bulkOperationRunQuery ?? {};

  if (userErrors?.length) {
    throw new Error(joinMessages(userErrors));
  }

  if (!bulkOperation) {
    throw new Error("Shopify did not return a bulk operation.");
  }

  return bulkOperation;
};

// Fetches the current state of a bulk operation.
const fetchBulkOperation = async (bulkOperationId) => {
  const { bulkOperation } = await executeGraphQLRequest(
    GET_BULK_OPERATION_QUERY,
    { bulkId: bulkOperationId }
  );

  if (!bulkOperation) {
    throw new Error(`Bulk operation not found: ${bulkOperationId}`);
  }

  return bulkOperation;
};

// Polls until the bulk operation leaves the CREATED / RUNNING states.
const waitForBulkOperation = async (initialOperation) => {
  let operation = initialOperation;

  while (isBulkOperationActive(operation)) {
    await wait(POLLING_INTERVAL_MS);

    operation = await fetchBulkOperation(operation.id);

    console.log(
      `Status: ${operation.status} | Objects: ${operation.objectCount}`
    );
  }

  return operation;
};

// Throws unless the bulk operation finished successfully. 
const assertBulkOperationCompleted = ({ status, errorCode }) => {
  if (status !== BULK_STATUS.COMPLETED) {
    throw new Error(
      `Bulk operation failed: ${status} (${errorCode ?? "Unknown error"})`
    );
  }
};

// Downloads the result file (JSONL) produced by a completed bulk operation.
const downloadBulkOperationFile = async (downloadUrl) => {
  if (!downloadUrl) {
    throw new Error("Bulk operation has no download URL.");
  }

  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to download bulk data: ${response.status} ${response.statusText}`
    );
  }

  return response.text();
};

const runBulkQuery = async () => {
  const startedOperation = await startBulkOperation();
  console.log(`Bulk operation started: ${startedOperation.id}`);

  const finishedOperation = await waitForBulkOperation(startedOperation);
  assertBulkOperationCompleted(finishedOperation);

  console.log(
    `Bulk operation completed: ${finishedOperation.objectCount} objects`
  );

  return downloadBulkOperationFile(finishedOperation.url);
};

export default runBulkQuery;