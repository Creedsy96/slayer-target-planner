import {packager} from '@electron/packager';
import {mkdir, readFile, writeFile, copyFile, access,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import offline from '../../desktop/offline-style.cjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, '.desktop-build', 'output');
const stage = path.join(root, '.desktop-build', 'app-v2');
const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const web = path.join(stage, 'web');
await mkdir(web, {recursive: true});
await mkdir(path.join(stage, 'assets'), {recursive: true});
// Deliberate allowlist: no Git, hosting credentials, test output or browser data.
for (const file of ['planner.js','data-manifest.json','creatures.png','items.png','owned-items.png']) {
  await copyFile(path.join(root, 'dist', file), path.join(web, file));
}
for(const file of ['main.cjs','preload.cjs','hiscores.cjs','compact.cjs','character-exports.cjs','updates.cjs','update-feed.cjs','apply-update.ps1'])await copyFile(path.join(root,'desktop',file),path.join(stage,file));
await copyFile(path.join(root, 'desktop', 'navigation.cjs'), path.join(stage, 'navigation.cjs'));
await copyFile(path.join(root, 'desktop', 'icon.ico'), path.join(stage, 'assets', 'icon.ico'));
await copyFile(path.join(root, 'desktop', 'icon.png'), path.join(web, 'app-icon.png'));
let html = await readFile(path.join(root, 'dist', 'index.html'), 'utf8');
await writeFile(path.join(web, 'index.html'), html);
const css = offline.offlineStyle(await readFile(path.join(root, 'dist', 'style.css'), 'utf8'));
await writeFile(path.join(web, 'style.css'), css);
await writeFile(path.join(stage, 'package.json'), JSON.stringify({
  name: 'slayer-target-planner', productName: 'Slayer Target Planner', version: manifest.version,
  description: 'Offline Slayer master comparison and creature target planner', main: 'main.cjs',
  author: 'Owen Welch', private: true,
}, null, 2));
await access(path.join(root, 'desktop', 'icon.ico'));
const packaged = await packager({
  dir: stage, name: 'Slayer Target Planner', executableName: 'Slayer Target Planner',
  platform: 'win32', arch: 'x64', electronVersion: manifest.devDependencies.electron,
  asar: true, prune: false, out: output, overwrite: false,
  icon: path.join(root, 'desktop', 'icon.ico'), appVersion: manifest.version,
  win32metadata: {CompanyName: 'Owen Welch', FileDescription: 'Slayer Target Planner', ProductName: 'Slayer Target Planner'},
});
const folders=[];
for(const folder of packaged){
  const versioned=path.join(output,'Slayer Target Planner '+manifest.version+' - Windows');
  await rename(folder,versioned);folders.push(versioned);
  await writeFile(path.join(versioned,'resources','update-manifest.json'),JSON.stringify({schema:1,version:manifest.version,platform:'win32',arch:'x64',repository:'Lolager23/slayer-target-planner'},null,2));
}
console.log(JSON.stringify({folders, electron:manifest.devDependencies.electron, version:manifest.version}));
