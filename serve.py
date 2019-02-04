#!/usr/bin/env python3

import http.server

ADDRESS = ('localhost', 8000)

def main():
  httpd = http.server.ThreadingHTTPServer(
    ADDRESS,
    http.server.CGIHTTPRequestHandler
  )
  httpd.serve_forever()

if __name__ == "__main__":
  main()
