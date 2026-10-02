import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  let filename;
  try { filename = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); }
  catch { res.writeHead(400).end(); return; }
  if (filename !== root && !filename.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (filename === root) filename = path.join(root, 'prototype', 'index.html');
  fs.stat(filename, (error, stat) => {
    if (error || !stat.isFile()) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    const stream = fs.createReadStream(filename);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  });
}).listen(Number(process.env.PORT || 5173), '127.0.0.1', () => console.log('FRAME UI prototype: http://127.0.0.1:' + (process.env.PORT || 5173)));
