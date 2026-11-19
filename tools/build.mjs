import {build} from 'esbuild';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});await mkdir('.desktop-build',{recursive:true});
const worker=await build({entryPoints:['src/worker.ts'],bundle:true,write:false,format:'iife',target:'es2022'});
await build({entryPoints:['src/core.ts'],bundle:true,format:'cjs',platform:'node',target:'node20',outfile:'.desktop-build/core.cjs'});
await build({entryPoints:['src/ui/app.ts'],bundle:true,format:'iife',target:'es2022',outfile:'dist/planner.js',define:{WORKER_SOURCE:JSON.stringify(worker.outputFiles[0].text)}});
await copyFile('src/ui/index.html','dist/index.html');await copyFile('src/ui/style.css','dist/style.css');await copyFile('desktop/icon.png','dist/app-icon.png');
await writeFile('dist/data-manifest.json',JSON.stringify({version:JSON.parse(await readFile('data/catalogue.json','utf8')).version,application:JSON.parse(await readFile('package.json','utf8')).version},null,2));
console.log('Built shared core, offline worker, browser UI and data manifest.');
