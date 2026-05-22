const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const { initSocket } = require('./lib/socketServer');
  const { connectDB } = require('./lib/db');
  const { backfillFriendshipsFromConversations } = require('./lib/friendshipBackfill');

  await connectDB();
  try {
    await backfillFriendshipsFromConversations();
  } catch (err) {
    console.error('[boot] friend backfill failed (non-fatal)', err);
  }

  const httpServer = createServer((req, res) => handle(req, res));

  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/socket.io',
  });

  initSocket(io);

  httpServer.listen(port, () => {
    console.log(`> chatme ready on http://localhost:${port}`);
  });
}).catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
