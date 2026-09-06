import fs from 'node:fs';
import path from 'node:path';

const emptyJs = path.resolve('node_modules/pg-cloudflare/dist/empty.js');
if (fs.existsSync(emptyJs)) {
  fs.writeFileSync(emptyJs, '"use strict";\nmodule.exports = require("./index.js");\n');
  console.log('Patched pg-cloudflare dist/empty.js');
}

const pkgJson = path.resolve('node_modules/pg-cloudflare/package.json');
if (fs.existsSync(pkgJson)) {
  const pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf-8'));
  if (pkg.exports && pkg.exports['.'] && pkg.exports['.']['default'] === './dist/empty.js') {
    pkg.exports['.']['default'] = './dist/index.js';
    fs.writeFileSync(pkgJson, JSON.stringify(pkg, null, 2) + '\n');
    console.log('Patched pg-cloudflare package.json exports');
  }
}
