import { executeCode } from './runner';

const PORT = parseInt(process.env.EXECUTOR_PORT ?? '8000');

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === 'POST' && url.pathname === '/execute') {
      try {
        const body = await req.json();
        const result = await executeCode(body);
        return Response.json(result);
      } catch (err) {
        console.error('Execution error:', err);
        return Response.json({ error: String(err) }, { status: 500 });
      }
    }

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok' });
    }

    return new Response('Not found', { status: 404 });
  },
});

console.log(`Executor listening on port ${server.port}`);
