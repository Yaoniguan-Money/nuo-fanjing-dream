from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import contextlib
import os
import socket
import threading
import webbrowser

BUILD = "20260828-offline-file-v5"

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("X-Nuo-Build", BUILD)
        super().end_headers()

    def log_message(self, fmt, *args):
        print("[NUO]", fmt % args)

def free_port():
    with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    port = free_port()
    url = f"http://127.0.0.1:{port}/index.html?build={BUILD}"
    httpd = ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler)

    print("=" * 60)
    print("NUO REWORK V2")
    print("Build:", BUILD)
    print("URL:", url)
    print("这个端口每次都会变化，不会再打开旧版本。")
    print("=" * 60)

    threading.Timer(0.45, lambda: webbrowser.open(url)).start()
    httpd.serve_forever()
