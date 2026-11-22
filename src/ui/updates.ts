import {escapeHtml as esc} from './html';
export interface UpdateState {phase:'idle'|'unsupported'|'disabled'|'checking'|'up-to-date'|'downloading'|'ready'|'installing'|'error';enabled:boolean;currentVersion:string;latestVersion?:string;message:string;progress?:number;releaseUrl:string}
export interface UpdateBridge {updates:(action:'state'|'check'|'enabled'|'restart',value?:boolean)=>Promise<UpdateState>;onUpdateState:(changed:(state:UpdateState)=>void)=>()=>void}
const releaseLink='<a href="https://github.com/Lolager23/slayer-target-planner/releases" target="_blank" rel="noopener">GitHub releases</a>';
export function renderUpdateBanner(state?:UpdateState):string{
 if(!state||!['downloading','ready','installing'].includes(state.phase))return '';
 return `<section class="desktop-update notice" role="status"><strong>${state.phase==='ready'?'Update '+esc(state.latestVersion)+' ready':state.phase==='installing'?'Installing update':'Downloading update '+esc(state.latestVersion)}</strong><p>${esc(state.message)}</p>${state.phase==='downloading'?`<progress value="${Math.min(100,Math.max(0,state.progress||0))}" max="100" aria-label="Update download progress"></progress><span>${Math.min(100,Math.max(0,state.progress||0))}%</span>`:''}${state.phase==='ready'?'<button data-update-action="restart">Restart and update</button><small>'+(state.enabled?'Or close normally to install. ':'Automatic installation on close is off. ')+'Your characters and saved calculations stay in their existing storage.</small>':''}</section>`;
}
export function renderUpdateSettings(state?:UpdateState):string{
 if(!state)return '';
 const busy=['checking','downloading','installing'].includes(state.phase),unsupported=state.phase==='unsupported';
 return `<section class="card desktop-update-settings"><h2>Application updates</h2><p>Installed version: <strong>${esc(state.currentVersion)}</strong>${state.latestVersion?' · Latest found: '+esc(state.latestVersion):''}</p><label class="check toggle-card"><input id="automatic-app-updates" type="checkbox" ${state.enabled?'checked':''} ${unsupported?'disabled':''}>Automatically download stable GitHub releases at startup and install when I close the app</label><p class="small muted">Checks the official Slayer Target Planner repository. Downloads are verified before installation. Restart when ready; your character storage is separate from the application folder. The previous application copy is retained for recovery.</p><p role="status" class="${state.phase==='error'?'update-error':''}">${esc(state.message)}</p><div class="tools"><button data-update-action="check" ${busy||unsupported?'disabled':''}>Check for updates</button>${state.phase==='ready'?'<button data-update-action="restart">Restart and update</button>':''}${releaseLink}</div></section>`;
}
export class DesktopUpdates {
 state?:UpdateState;
 constructor(private bridge:UpdateBridge|undefined,private changed:()=>void){
  if(!bridge)return;
  let revision=0;bridge.onUpdateState(state=>{revision++;this.state=state;this.changed();});
  const requested=revision;void bridge.updates('state').then(state=>{if(revision!==requested)return;this.state=state;this.changed();}).catch(()=>{});
 }
 async action(action:'check'|'restart'|'enabled',value?:boolean):Promise<void>{
  if(!this.bridge)throw Error('Application updates are available in the Windows app.');
  this.state=await this.bridge.updates(action,value);this.changed();
 }
}
