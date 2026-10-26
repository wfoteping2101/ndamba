#!/usr/bin/env node
// node tools/svg2png.mjs in.svg [out.png] [width]
import { createRequire } from 'node:module'
const require = createRequire('/opt/npm-tools/node_modules/')
const sharp = require('sharp')
const [inp, outp, width] = process.argv.slice(2)
const out = outp || inp.replace(/\.svg$/, '.png')
await sharp(inp, { density: 200 }).resize({ width: Number(width) || 1100 }).flatten({ background: '#ffffff' }).png().toFile(out)
console.log(out)
