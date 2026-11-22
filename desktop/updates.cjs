'use strict';
const fs=require('node:fs');
const fsp=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const os=require('node:os');
const {spawn}=require('node:child_process');
const feed=require('./update-feed.cjs');
const JOB=/^[a-f0-9]{32}$/;
function noLinks(directory){
 let current=path.resolve(directory);
 while(true){if(fs.lstatSync(current).isSymbolicLink())throw Error('Linked update/install paths are not supported.');const parent=path.dirname(current);if(parent===current)break;current=parent;}
 return path.resolve(directory);
}
function installLocation(executable,userData){
 if(path.basename(executable)!=='Slayer Target Planner.exe')throw Error('Run the portable Slayer Target Planner executable to update it.');
 const root=noLinks(path.dirname(executable)),data=noLinks(userData),prefix=path.sep;
 const critical=[path.parse(root).root,os.homedir(),...['Desktop','Documents','Downloads'].map(name=>path.join(os.homedir(),name)),process.env.SystemRoot,process.env.ProgramFiles,process.env.ProgramData].filter(Boolean).map(value=>path.resolve(value).toLowerCase());
 if(critical.includes(root.toLowerCase())||root===data||root.startsWith(data+prefix)||data.startsWith(root+prefix))throw Error('The app folder and character storage must be separate.');
 if(!fs.statSync(path.join(root,'resources','app.asar')).isFile())throw Error('Extract the complete Windows application folder before updating.');
 return root;
}
async function atomicJson(file,value){const temporary=file+'.'+randomUUID()+'.tmp';await fsp.writeFile(temporary,JSON.stringify(value),{flag:'wx'});await fsp.rename(temporary,file);}
function launchHelper(configuration){
 const powershell=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
 // Fixed bundled code; paths come from a data-only job file, never a command string.
 const script=fs.readFileSync(path.join(__dirname,'apply-update.ps1'),'utf8');
 return new Promise((resolve,reject)=>{
  const child=spawn(powershell,['-NoProfile','-NonInteractive','-Command',script],{cwd:path.dirname(configuration),detached:true,windowsHide:true,stdio:'ignore',env:{...process.env,SLAYER_UPDATE_JOB:configuration}});
  child.once('error',reject);child.once('spawn',()=>{child.unref();resolve();});
 });
}
class PortableUpdater{
 constructor(options){
  this.options=options;this.root=path.join(options.userData,'updates');this.pendingFile=path.join(this.root,'pending.json');this.settingsFile=path.join(this.root,'settings.json');this.pending=null;this.running=null;this.quitHandled=false;this.retryRequired=false;
  this.state={phase:options.platform==='win32'&&options.packaged?'idle':'unsupported',enabled:true,currentVersion:options.version,message:'Updates are available in the packaged Windows application.',releaseUrl:feed.RELEASES};
 }
 publish(change){this.state={...this.state,...change};this.options.notify?.(this.snapshot());}
 snapshot(){return {...this.state};}
 async initialize(){
  if(this.state.phase==='unsupported')return this.snapshot();
  try{
   installLocation(this.options.executable,this.options.userData);await fsp.mkdir(this.root,{recursive:true});noLinks(this.root);
   try{const settings=JSON.parse(await fsp.readFile(this.settingsFile,'utf8'));if(typeof settings.enabled!=='boolean')throw Error('Invalid update preference.');this.state.enabled=settings.enabled;}catch(error){if(error.code!=='ENOENT')throw Error('Could not read the automatic-update preference.');}
   try{
    const pending=JSON.parse(await fsp.readFile(this.pendingFile,'utf8'));
    if(!JOB.test(pending.id)||!/^\d+\.\d+\.\d+$/.test(pending.release?.version)||!Number.isSafeInteger(pending.release?.size)||pending.release.size<1||pending.release.size>feed.MAX_ARCHIVE||!(/^[a-f0-9]{64}$/).test(pending.release?.sha256))throw Error('Invalid staged update record.');
    if(feed.newer(pending.release.version,this.options.version)){
     const job=path.join(this.root,pending.id);noLinks(job);const archive=path.join(job,'package.zip');
     try{const previous=JSON.parse((await fsp.readFile(path.join(job,'result.json'),'utf8')).replace(/^\uFEFF/,''));if(previous.status==='failed'){this.retryRequired=true;this.publish({phase:'error',message:'The previous update did not complete. Your previous copy was retained. Check for updates to retry, or open GitHub releases.'});return this.snapshot();}}catch(error){if(error.code!=='ENOENT')throw error;}
     if(!fs.lstatSync(archive).isFile()||fs.lstatSync(archive).isSymbolicLink())throw Error('The staged update archive is missing.');
     this.pending=pending;this.publish({phase:'ready',latestVersion:pending.release.version,progress:100,message:this.state.enabled?'Update ready. Install when closing, or restart and update now.':'Update ready. Restart and update to install; automatic installation on close is off.'});
    }else await fsp.unlink(this.pendingFile);
   }catch(error){if(error.code!=='ENOENT')throw Error('The staged update could not be restored. Check for updates again.');}
   if(!this.pending)this.publish({phase:this.state.enabled?'idle':'disabled',message:this.state.enabled?'Checks GitHub for a newer stable release at startup.':'Automatic startup updates are off.'});
  }catch(error){this.publish({phase:'error',message:error.message});}
  return this.snapshot();
 }
 async setEnabled(enabled){
  if(typeof enabled!=='boolean')throw Error('Invalid automatic-update preference.');
  if(this.state.phase==='unsupported')return this.snapshot();
  await atomicJson(this.settingsFile,{enabled});this.publish({enabled});
  if(this.pending)this.publish({message:enabled?'Update ready. Install when closing, or restart and update now.':'Update ready. Restart and update to install; automatic installation on close is off.'});
  if(!enabled){this.abort?.abort();if(!this.pending)this.publish({phase:'disabled',message:'Automatic startup updates are off.'});}
  else if(!this.pending)void this.check();
  return this.snapshot();
 }
 check(manual=false){
  if(this.running)return this.running;
  if(manual&&this.pending&&this.state.phase==='error'){this.quitHandled=false;this.publish({phase:'ready',message:'The verified update is ready to retry. Restart and update, or open GitHub releases.'});}
  if(this.state.phase==='unsupported'||this.pending||!manual&&(!this.state.enabled||this.retryRequired))return Promise.resolve(this.snapshot());
  this.retryRequired=false;
  this.running=this.performCheck().finally(()=>{this.running=null;});return this.running;
 }
 async performCheck(){
  this.abort=new AbortController();this.publish({phase:'checking',progress:0,message:'Checking the latest stable GitHub release…'});
  try{
   const release=await (this.options.latest||feed.latest)(this.options.version,this.options.fetcher,this.abort.signal);
   if(this.abort.signal.aborted)throw Error('Update check cancelled.');
   if(!release){this.publish({phase:'up-to-date',message:'This version is up to date.'});return this.snapshot();}
   const install=installLocation(this.options.executable,this.options.userData),probe=path.join(path.dirname(install),'.stp-permission-'+randomUUID());
   try{const handle=await fsp.open(probe,'wx');await handle.close();await fsp.unlink(probe);}catch{throw Error('The application parent folder is not writable. Move the complete portable app to a writable folder, then check again.');}
   const partial=path.join(this.root,'download.part');
   if(fs.existsSync(partial)){noLinks(partial);if(!fs.lstatSync(partial).isFile())throw Error('The update download cache is not an ordinary file.');await fsp.unlink(partial);}
   this.publish({phase:'downloading',latestVersion:release.version,releaseUrl:release.releaseUrl,message:'Downloading and verifying '+release.version+'…'});
   let previous=-1;await (this.options.download||feed.download)(release,partial,percent=>{if(percent!==previous){previous=percent;this.publish({progress:percent});}},this.options.fetcher,this.abort.signal);
   const id=randomUUID().replaceAll('-',''),job=path.join(this.root,id);await fsp.mkdir(job);noLinks(job);await fsp.rename(partial,path.join(job,'package.zip'));
   this.pending={id,release};await atomicJson(this.pendingFile,this.pending);
   this.publish({phase:'ready',progress:100,message:this.state.enabled?'Update verified. It will install when you close the app. You can also restart and update now.':'Update verified. Restart and update to install; automatic installation on close is off.'});
  }catch(error){this.publish({phase:!this.state.enabled&&this.abort.signal.aborted?'disabled':'error',message:!this.state.enabled&&this.abort.signal.aborted?'Automatic updates are off.':String(error.message||'Update check failed.').slice(0,300)});}
  return this.snapshot();
 }
 shouldInstallOnQuit(){return !!this.pending&&this.state.enabled&&!this.quitHandled&&this.state.phase==='ready';}
 async healthy(args){
  const id=args.find(value=>/^--slayer-updated=[a-f0-9]{32}$/.test(value))?.split('=')[1];if(!id)return;
  try{const job=path.join(this.root,id);noLinks(job);const config=JSON.parse(await fsp.readFile(path.join(job,'job.json'),'utf8'));if(config.version===this.options.version&&path.resolve(config.installDir)===path.dirname(this.options.executable))await atomicJson(path.join(job,'healthy.json'),{version:this.options.version});}catch{/* The helper retains its rollback copy if startup cannot be confirmed. */}
 }
 async install(restart){
  if(!this.pending||this.state.phase!=='ready'||this.quitHandled)throw Error('No verified update is ready to install.');
  this.quitHandled=true;
  this.publish({phase:'installing',message:'Preparing to close and install the verified update…'});
  try{
   const installDir=installLocation(this.options.executable,this.options.userData),job=path.join(this.root,this.pending.id);noLinks(job);
   const configuration=path.join(job,'job.json');
   await atomicJson(configuration,{schema:1,id:this.pending.id,parentPid:process.pid,installDir,userData:this.options.userData,version:this.pending.release.version,sha256:this.pending.release.sha256,size:this.pending.release.size,restart:restart===true});
   await (this.options.launch||launchHelper)(configuration);
   this.publish({phase:'installing',message:'Closing the app to install the verified update…'});return true;
  }catch(error){this.publish({phase:'error',message:'Could not start the updater. The installed app was kept. '+error.message});throw error;}
 }
}
module.exports={PortableUpdater,installLocation,noLinks,launchHelper};
