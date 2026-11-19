import {createRequire} from 'node:module';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Use the installed artifact runtime's SVG renderer; never modify its packages.
const bundledRequire = createRequire(process.argv[2]);
const sharp = bundledRequire('sharp');
const svg = await readFile(path.join(root, 'desktop', 'icon.svg'));
await sharp(svg).png().toFile(path.join(root, 'desktop', 'icon.png'));
const sizes = [16, 24, 32, 48, 64, 128, 256];
const pngs = await Promise.all(sizes.map(size => sharp(svg).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (let i = 0; i < sizes.length; i++) {
  const entry = 6 + 16 * i;
  header[entry] = header[entry + 1] = sizes[i] === 256 ? 0 : sizes[i];
  header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(pngs[i].length, entry + 8); header.writeUInt32LE(offset, entry + 12);
  offset += pngs[i].length;
}
await writeFile(path.join(root, 'desktop', 'icon.ico'), Buffer.concat([header, ...pngs]));
console.log('Created original SVG, PNG and 7-resolution Windows icon.');
