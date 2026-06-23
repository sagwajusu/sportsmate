from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent


class SportsmateHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        if path == "/":
            path = "/templates/index.html"
        return str(ROOT / path.lstrip("/"))


def run(host="127.0.0.1", port=8000):
    server = ThreadingHTTPServer((host, port), SportsmateHandler)
    print(f"Sportsmate is running at http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
