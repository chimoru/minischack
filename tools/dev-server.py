"""Enkel webbserver för att testa MiniSchack på datorn.

Som `python3 -m http.server`, men säger åt webbläsaren att aldrig spara filerna,
så att en ändring i koden alltid syns direkt vid omladdning.

Kör:  python3 tools/dev-server.py [port]
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
root = Path(__file__).resolve().parent.parent
handler = partial(NoCacheHandler, directory=str(root))
print(f"MiniSchack på http://localhost:{port}")
ThreadingHTTPServer(("", port), handler).serve_forever()
