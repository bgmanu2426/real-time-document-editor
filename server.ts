import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { CollaborativeSocketServer } from './lib/socket/server';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO server
  new CollaborativeSocketServer(server);
  console.log('🚀 Socket.IO server initialized');

  const port = process.env.PORT || 3000;
  
  server.listen(port, (err?: Error) => {
    if (err) throw err;
    console.log(`🚀 Ready on http://localhost:${port}`);
  });
});