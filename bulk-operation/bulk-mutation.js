import { performOperation } from "../shopify-client.js";

const POLLING_INTERVAL_MS = 3000;

const BULK_STATUS = Object.freeze({
  CREATED: "CREATED",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
});

const ACTIVE_BULK_STATUSES = new Set([BULK_STATUS.CREATED, BULK_STATUS.RUNNING]);

const UPLOAD_FILENAME = "bulk_mutations.jsonl";
const UPLOAD_MIME_TYPE = "text/jsonl";

const CREATE_STAGED_UPLOAD_MUTATION = `
  mutation($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      userErrors { field message }
      stagedTargets {
        url
        parameters { name value }
      }
    }
  }
`;

const RUN_BULK_MUTATION = `
  mutation($mutation: String!, $stagedUploadPath: String!) {
    bulkOperationRunMutation(
      mutation: $mutation,
      stagedUploadPath: $stagedUploadPath
    ) {
      bulkOperation { id status }
      userErrors { field message }
    }
  }
`;

const GET_BULK_OPERATION_STATUS_QUERY = `
  query($bulkId: ID!) {
    bulkOperation(id: $bulkId) {
      id
      status
      errorCode
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

const assertNoUserErrors = (userErrors) => {
  if (userErrors?.length) {
    throw new Error(joinMessages(userErrors));
  }
};

const isBulkOperationActive = ({ status }) => ACTIVE_BULK_STATUSES.has(status);

const executeGraphQLRequest = async (query, variables) => {
  const { data, errors } = await performOperation(query, variables);

  if (errors?.length) {
    throw new Error(joinMessages(errors));
  }

  return data;
};

const createStagedUploadTarget = async (fileBlob) => {
  const { stagedUploadsCreate } = await executeGraphQLRequest(
    CREATE_STAGED_UPLOAD_MUTATION,
    {
      input: [
        {
          resource: "BULK_MUTATION_VARIABLES",
          filename: UPLOAD_FILENAME,
          mimeType: UPLOAD_MIME_TYPE,
          fileSize: String(fileBlob.size),
          httpMethod: "POST",
        },
      ],
    }
  );

  assertNoUserErrors(stagedUploadsCreate.userErrors);

  const target = stagedUploadsCreate.stagedTargets?.[0];

  if (!target) {
    throw new Error("Shopify did not return a staged upload target.");
  }

  return target;
};

const startBulkMutation = async (bulkMutation, stagedUploadPath) => {
  const { bulkOperationRunMutation } = await executeGraphQLRequest(
    RUN_BULK_MUTATION,
    { mutation: bulkMutation, stagedUploadPath }
  );

  assertNoUserErrors(bulkOperationRunMutation.userErrors);

  const { bulkOperation } = bulkOperationRunMutation;

  if (!bulkOperation) {
    throw new Error("Shopify did not return a bulk mutation operation.");
  }

  return bulkOperation;
};

const fetchBulkOperation = async (bulkOperationId) => {
  const { bulkOperation } = await executeGraphQLRequest(
    GET_BULK_OPERATION_STATUS_QUERY,
    { bulkId: bulkOperationId }
  );

  if (!bulkOperation) {
    throw new Error("Shopify did not return the bulk operation status.");
  }

  return bulkOperation;
};

const getStagedUploadPath = ({ parameters }) => {
  const key = parameters.find(({ name }) => name === "key")?.value;

  if (!key) {
    throw new Error("Shopify did not provide a staged upload key.");
  }

  return key;
};

// **Updated:** Directly appends the incoming Blob/File to FormData.
const uploadJsonlFile = async (fileBlob, target) => {
  const stagedUploadPath = getStagedUploadPath(target);
  const formData = new FormData();

  target.parameters.forEach(({ name, value }) => formData.append(name, value));
  formData.append("file", fileBlob, UPLOAD_FILENAME);

  const response = await fetch(target.url, { method: "POST", body: formData });

  if (!response.ok) {
    throw new Error(
      `Staged upload failed: ${response.status} ${response.statusText}`
    );
  }

  return stagedUploadPath;
};

const waitForBulkOperation = async (initialOperation) => {
  let operation = initialOperation;

  while (isBulkOperationActive(operation)) {
    await wait(POLLING_INTERVAL_MS);
    operation = await fetchBulkOperation(operation.id);
    console.log(
      `Status: ${operation.status} | Objects processed: ${operation.objectCount}`
    );
  }

  return operation;
};

const assertBulkOperationCompleted = ({ status, errorCode }) => {
  if (status !== BULK_STATUS.COMPLETED) {
    throw new Error(
      `Bulk mutation failed: ${status} (${errorCode ?? "Unknown error"})`
    );
  }
};

const runBulkMutation = async (fileBlob, bulkMutation) => {
  const uploadTarget = await createStagedUploadTarget(fileBlob);
  const stagedUploadPath = await uploadJsonlFile(fileBlob, uploadTarget);

  const startedOperation = await startBulkMutation(
    bulkMutation,
    stagedUploadPath
  );
  console.log(`Bulk mutation started: ${startedOperation.id}`);

  const finishedOperation = await waitForBulkOperation(startedOperation);
  assertBulkOperationCompleted(finishedOperation);

  return finishedOperation;
};

export default runBulkMutation;