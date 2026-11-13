import Fastify from 'fastify';
import router from "./routes/router.js";

const fastify = Fastify({
  logger: true,
  bodyLimit: 50 * 1024 * 1024
});

fastify.addContentTypeParser('text/jsonl', { parseAs: 'string' }, (req, body, done) => {
  done(null, body);
});

fastify.register(router);

const start = async () => {
  try {
    await fastify.listen({ port: 6100, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}
start();