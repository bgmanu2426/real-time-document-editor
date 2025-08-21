const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO server
  const { CollaborativeSocketServer } = require('./lib/socket/server.ts');
  new CollaborativeSocketServer(server);
  console.log('🚀 Socket.IO server initialized');

  const port = process.env.PORT || 3000;
  
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`🚀 Ready on http://localhost:${port}`);
  });
});