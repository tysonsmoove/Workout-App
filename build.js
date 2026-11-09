#!/usr/bin/env node
// Builds index.html from src/: shell.html + style.css + numbered JS modules wrapped in one closure.
// Usage: node build.js
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, 'src');
const read = f => fs.readFileSync(path.join(src, f), 'utf8');
const js = fs.readdirSync(src).filter(f => /^\d\d-.*\.js$/.test(f)).sort()
  .map(f => '/* ---- ' + f + ' ---- */\n' + read(f)).join('\n');
const out = read('shell.html')
  .replace('/*__CSS__*/', () => read('style.css'))
  .replace('/*__JS__*/', () => "(function () {\n'use strict';\n" + js + '\n})();');
fs.writeFileSync(path.join(__dirname, 'index.html'), out);
console.log('index.html', out.length, 'bytes');
