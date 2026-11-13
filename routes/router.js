import runBulkMutation from "../bulk-operation/bulk-mutation";
import runBulkQuery from "../bulk-operation/bulk-query";
import { PRODUCT_CREATE_MUTATION } from "../bulk-operation/product-create";

const handleRouteError = (error, reply, request) => {
  request.log.error(error);
  if (/already in progress|already running/i.test(error.message)) {
    return reply.code(409).send({
      success: false,
      error: "A bulk operation is already in progress. Please retry shortly.",
    });
  }
  if (/timed out/i.test(error.message)) {
    return reply.code(504).send({ success: false, error: error.message });
  }
  return reply.code(500).send({ success: false, error: error.message });
};

const routes = async (fastify, options) => {

  fastify.get('/', async (request, reply) => {
    return reply.send({ status: "ok" }); 
  });

  fastify.get('/products', async (request, reply) => {
    try {
      const products = await runBulkQuery();
      return reply.type("text/jsonl").send(products);
    } catch (error) {
      return handleRouteError(error, reply, request);
    }
  });

  fastify.post('/product/create', async (request, reply) => {
    try {
      const rawJsonl = request.body;
      if (typeof rawJsonl !== "string" || !rawJsonl.trim()) {
        return reply.code(400).send({
          success: false,
          error: "Request body must be non-empty text/jsonl data",
        });
      }

      const fileBlob = new Blob([rawJsonl], { type: "text/jsonl" });
      const result = await runBulkMutation(fileBlob, PRODUCT_CREATE_MUTATION);

      return reply.send({ success: true, bulkOperation: result });
    } catch (error) {
      return handleRouteError(error, reply, request);
    }
  });
}

export default routes;