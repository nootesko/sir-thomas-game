#!/usr/bin/env python3
"""Static server for development: like `python3 -m http.server`, but tells the browser never to cache, so edited modules
(src/*.js) are always reloaded together and an old cached file never breaks an import of a new one."""
import json, os, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()
    # the model viewer (viewer.html) saves the user's notes here, so they can be read back while fixing the models
    def do_POST(self):
        if self.path != '/api/notas-modelos':
            self.send_error(404); return
        n = int(self.headers.get('Content-Length', 0))
        if n > 2_000_000:
            self.send_error(413); return
        try:
            data = json.loads(self.rfile.read(n) or b'{}')
        except ValueError:
            self.send_error(400); return
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs', 'notas-modelos.json')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
        self.send_response(200); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(b'{"ok":true}')
    def log_message(self, fmt, *args):
        if '404' in (args[1] if len(args) > 1 else ''):
            return   # missing optional assets are expected; keep the log quiet
        super().log_message(fmt, *args)

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
print(f'Servindo em http://localhost:{port} (sem cache)')
ThreadingHTTPServer(('0.0.0.0', port), Handler).serve_forever()
