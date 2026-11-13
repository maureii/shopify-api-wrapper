import runBulkMutation from "../bulk-operation/bulk-mutation";
import runBulkQuery from "../bulk-operation/bulk-query";
import { PRODUCT_CREATE_MUTATION } from "../bulk-operation/product-create";

const routes = async (fastify, options) => {

  fastify.get('/', async (request, reply) => {
    return; 
  });

  fastify.get('/products', async (request, reply) => {
    const products = await runBulkQuery();
    return reply.send(products);
  });

  fastify.post('/product/create', async (request, reply) => {
    try {
      const rawJsonl = request.body; 
      
      const fileBlob = new Blob([rawJsonl], { type: "text/jsonl" });

      const result = await runBulkMutation(fileBlob, PRODUCT_CREATE_MUTATION);

      return reply.send({ success: true, bulkOperation: result });
    } catch (error) {
      return reply.code(500).send({ success: false, error: error.message });
    }
  });
}

export default routes;