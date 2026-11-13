import runBulkQuery from "../bulk-operation/bulk-query";

const routes = async (fastify, options) => {

  fastify.get('/', async (request, reply) => {
    return; 
  });


  fastify.get('/products', async (request, reply) => {
    const products = await runBulkQuery();
    return reply.send(products);
  });

}

export default routes;