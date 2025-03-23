#!/usr/bin/env node

import fs from 'fs';
import proxy from 'http-proxy';
import { red, bold, green, blue } from 'ansi-colors';
import { isProxy, parse } from './lib';
import { createServer } from "node:http"

const parsed = parse();

const config = isProxy(parsed) ? { proxy: parsed } : parsed;

for (const name of Object.keys(config)) {
  const { hostname, target, key, cert, source, defaultTarget, targetPath } = config[name]!;

  const proxyServer = proxy
    .createServer({
      xfwd: true,
      ws: true,
      target: {
        host: hostname,
        port: target
      },
      ssl: {
        key: fs.readFileSync(key, 'utf8'),
        cert: fs.readFileSync(cert, 'utf8')
      }
    })
    .on('error', (e: any) => {
      console.error(red('Request failed to ' + name + ': ' + bold(e.code)));
    });

  if (defaultTarget !== undefined && targetPath !== undefined) {
    const targetRegex = new RegExp(`^${targetPath}`);
    const server = createServer(function(req, res) {
      if (targetRegex.test(req.url || "")) {
        proxyServer.web(req, res, { target: 'http://127.0.0.1:' + target });
      } else {
        proxyServer.web(req, res, { target: 'http://127.0.0.1:' + defaultTarget });
      }
    });
    server.listen(source);
    console.log(
      blue(`Started ${isProxy(parsed) ? 'proxy' : bold(name)}:\n`),
      green(`https://${hostname}:${source}/(${targetPath}) → http://${hostname}:${target}/*
 https://${hostname}:${source}/* → http://${hostname}:${defaultTarget}/*`
      )
    );
  } else {
    proxyServer.listen(source);
    console.log(
      green(
        `Started ${isProxy(parsed) ? 'proxy' : bold(name)}: https://${hostname}:${source} → http://${hostname}:${target}`
      )
    );
  }

}
