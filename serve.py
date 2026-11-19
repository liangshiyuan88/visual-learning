"""Local static server with clean URLs for the Visual Learning mirror."""
from __future__ import annotations

import argparse
import functools
import http.server
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def translate_path(self, path: str) -> str:
        clean = urllib.parse.unquote(urllib.parse.urlsplit(path).path)
        rel = clean.lstrip("/").replace("\\", "/")
        target = (ROOT / rel).resolve()
        try:
            target.relative_to(ROOT)
        except ValueError:
            return str(ROOT / "index.html")
        if target.is_dir():
            target = target / "index.html"
        elif not target.exists() and (ROOT / (rel + ".html")).exists():
            target = ROOT / (rel + ".html")
        return str(target)

    def log_message(self, fmt: str, *args: object) -> None:
        pass


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the local Visual Learning clone")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    handler = functools.partial(Handler, directory=str(ROOT))
    with http.server.ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        print(f"Serving at http://127.0.0.1:{args.port}/", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
