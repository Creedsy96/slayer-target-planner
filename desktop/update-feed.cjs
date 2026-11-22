'use strict';
const {createHash}=require('node:crypto');
const fs=require('node:fs/promises');
const REPOSITORY='Lolager23/slayer-target-planner';
const RELEASES='https://github.com/'+REPOSITORY+'/releases';
const FEED='https://api.github.com/repos/'+REPOSITORY+'/releases/latest';
const MAX_ARCHIVE=512*1024*1024;
function version(value){
 if(typeof value!=='string'||!/^v?(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/.test(value))throw Error('Unsupported release version.');
 return value.replace(/^v/,'');
}
function newer(candidate,current){const a=version(candidate).split('.').map(Number),b=version(current).split('.').map(Number);for(let i=0;i<3;i++)if(a[i]!==b[i])return a[i]>b[i];return false;}
function trustedUrl(value){
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||!['api.github.com','github.com','release-assets.githubusercontent.com','objects.githubusercontent.com'].includes(url.hostname))throw Error('Update download left the trusted GitHub hosts.');
 if(url.hostname==='api.github.com'&&url.href!==FEED)throw Error('Unexpected update API address.');
 if(url.hostname==='github.com'&&!url.pathname.startsWith('/'+REPOSITORY+'/releases/download/'))throw Error('Unexpected release download address.');
 return url.href;
}
function selectRelease(release,current){
 if(!release||release.draft||release.prerelease)return null;
 const next=version(release.tag_name);if(!newer(next,current))return null;
 const expected='Slayer.Target.Planner.'+next+'.-.Windows.zip';
 const assets=(Array.isArray(release.assets)?release.assets:[]).filter(asset=>asset.name?.replaceAll(' ','.')===expected&&asset.state==='uploaded');
 if(assets.length!==1)throw Error('The latest release needs one portable Windows ZIP. Open GitHub releases to update manually.');
 const asset=assets[0],url=new URL(trustedUrl(asset.browser_download_url));
 if(url.hostname!=='github.com'||decodeURIComponent(url.pathname)!=='/'+REPOSITORY+'/releases/download/'+release.tag_name+'/'+asset.name)throw Error('Release archive does not belong to the selected version.');
 if(!/^sha256:[a-f0-9]{64}$/i.test(asset.digest||''))throw Error('The release ZIP has no GitHub SHA-256 digest; automatic installation was refused.');
 if(!Number.isSafeInteger(asset.size)||asset.size<1||asset.size>MAX_ARCHIVE)throw Error('The release ZIP has an unsupported size.');
 return {version:next,url:url.href,size:asset.size,sha256:asset.digest.slice(7).toLowerCase(),releaseUrl:RELEASES+'/tag/'+encodeURIComponent(release.tag_name)};
}
async function responseAt(url,fetcher,signal,timeout){
 const combined=signal?AbortSignal.any([signal,AbortSignal.timeout(timeout)]):AbortSignal.timeout(timeout);
 for(let i=0;i<5;i++){
  url=trustedUrl(url);const response=await fetcher(url,{redirect:'manual',credentials:'omit',signal:combined,headers:{'User-Agent':'Slayer-Target-Planner-Updater','Accept':url===FEED?'application/vnd.github+json':'application/octet-stream','X-GitHub-Api-Version':'2026-03-10'}});
  if(![301,302,303,307,308].includes(response.status))return response;
  const destination=response.headers.get('location');await response.body?.cancel();if(!destination)throw Error('GitHub returned an invalid download redirect.');url=new URL(destination,url).href;
 }
 throw Error('Too many update download redirects.');
}
async function latest(current,fetcher=fetch,signal){
 const response=await responseAt(FEED,fetcher,signal,12000);
 if(response.status===404)return null;
 if(!response.ok)throw Error('GitHub update check unavailable (HTTP '+response.status+'). Try again later.');
 if(!response.body)throw Error('GitHub returned no release information.');
 const reader=response.body.getReader();let size=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2*1024*1024)throw Error('GitHub release information was too large.');chunks.push(Buffer.from(value));}}finally{await reader.cancel();}
 return selectRelease(JSON.parse(Buffer.concat(chunks).toString('utf8')),current);
}
async function download(release,destination,progress=()=>{},fetcher=fetch,signal){
 const response=await responseAt(release.url,fetcher,signal,10*60*1000);
 if(!response.ok||!response.body)throw Error('Could not download the Windows update (HTTP '+response.status+').');
 const file=await fs.open(destination,'wx'),reader=response.body.getReader(),hash=createHash('sha256');let bytes=0,valid=false;
 try{
  while(true){
   const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;
   if(bytes>release.size||bytes>MAX_ARCHIVE)throw Error('The downloaded update is larger than its release metadata.');
   hash.update(value);let offset=0;while(offset<value.byteLength){const written=await file.write(value,offset,value.byteLength-offset);if(!written.bytesWritten)throw Error('Could not write the downloaded update.');offset+=written.bytesWritten;}
   progress(Math.min(99,Math.floor(bytes/release.size*100)));
  }
  if(bytes!==release.size||hash.digest('hex')!==release.sha256)throw Error('Update SHA-256 or size verification failed. The installed app was kept.');
  await file.sync();valid=true;progress(100);
 }finally{
  await file.close();
  try{await reader.cancel();}catch{/* An aborted stream can reject cancellation; partial-file cleanup still runs. */}
  if(!valid)await fs.rm(destination,{force:true});
 }
}
module.exports={REPOSITORY,RELEASES,FEED,MAX_ARCHIVE,version,newer,trustedUrl,selectRelease,latest,download};
