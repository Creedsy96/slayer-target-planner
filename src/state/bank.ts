import type {BankKind,BankSnapshot,BankState,CombatSettings} from '../combat/types';
import {canonicalInventoryId,isPlaceholderId,isGearId} from '../combat/item-ids';
import type {Profile} from '../domain/types';
export const emptyBank=():BankState=>({version:1,account:null,snapshots:{},manual:{},groupManual:{},includeGroup:false});
export const defaultCombat=():CombatSettings=>({enabled:false,potions:'none',prayer:'none',uptime:100,rigour:false,augury:false,piety:false,allowUnknownRequirements:false,spellbook:'auto',markOfDarkness:false,style:'auto'});
export function validateCombat(value:unknown):CombatSettings{
 const v={markOfDarkness:false,style:'auto',...(value as Partial<CombatSettings>)} as CombatSettings;if(!v||typeof v!=='object')throw Error('Invalid combat settings.');
 for(const key of ['enabled','rigour','augury','piety','allowUnknownRequirements','markOfDarkness'] as const)if(typeof v[key]!=='boolean')throw Error('Invalid combat switch.');
 if(!['none','standard'].includes(v.potions)||!['none','standard','unlocked'].includes(v.prayer)||!['auto','standard','ancient','arceuus'].includes(v.spellbook)||!['auto','melee','ranged','magic'].includes(v.style)||!Number.isFinite(v.uptime)||v.uptime<10||v.uptime>100)throw Error('Invalid combat assumptions.');
 return {...v};
}
const kinds=['bank','inventory','equipment','group_storage'];
function safe(value:unknown,depth=0):void{
 if(depth>20)throw Error('Item file nesting is too deep.');
 if(value&&typeof value==='object')for(const [key,item]of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(key))throw Error('Unsafe item file key.');safe(item,depth+1);}
}
export function validateQuantities(value:unknown):Record<string,number>{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>10000)throw Error('Invalid item quantities.');
 const result:Record<string,number>={};
 for(const [id,quantity]of Object.entries(value)){if(!/^\d{1,6}$/.test(id)||Number(id)<1||!Number.isSafeInteger(quantity)||(quantity as number)<0||(quantity as number)>2147483647)throw Error('Invalid item ID or quantity.');if(isGearId(Number(id)))result[id]=quantity as number;}
 return result;
}
export function validateBank(value:unknown):BankState{
 const v=value as BankState;if(!v||v.version!==1||!v.snapshots||typeof v.snapshots!=='object'||Array.isArray(v.snapshots)||typeof v.includeGroup!=='boolean')throw Error('Invalid bank data.');
 if(v.account!==null&&(typeof v.account!=='string'||v.account.length>30))throw Error('Invalid bank account.');
 const result=emptyBank();result.account=v.account;result.includeGroup=v.includeGroup;result.manual=validateQuantities(v.manual);result.groupManual=validateQuantities(v.groupManual);
 for(const [kind,snapshot]of Object.entries(v.snapshots)){
  if(!kinds.includes(kind)||!snapshot||typeof snapshot.label!=='string'||snapshot.label.length>100||snapshot.account!==null&&(typeof snapshot.account!=='string'||snapshot.account.length>30)||snapshot.at!==null&&(typeof snapshot.at!=='string'||!Number.isFinite(Date.parse(snapshot.at))))throw Error('Invalid bank snapshot.');
  result.snapshots[kind as BankKind]={items:validateQuantities(snapshot.items),label:snapshot.label,account:snapshot.account,at:snapshot.at};
 }return result;
}
export interface BankPreview {kind:BankKind;snapshot:BankSnapshot;rows:number;warnings:string[]}
export function applyBankSnapshots(p:Profile,previews:BankPreview[],levels:Record<string,number>|null,account:string|null,enableTiming:boolean):Profile{
 const copy=structuredClone(p);copy.bank??=emptyBank();
 const personal=previews.filter(preview=>preview.kind!=='group_storage');
 const accounts=[copy.bank.account,account,...personal.map(preview=>preview.snapshot.account)].filter((s):s is string=>!!s);
 if(new Set(accounts.map(s=>s.toLowerCase().replace(/[_\u00a0]/g,' ').trim())).size>1)throw Error('These exports belong to different accounts. Use a separate profile for another character.');
 if(new Set(previews.map(preview=>preview.kind)).size!==previews.length)throw Error('Choose one snapshot for each container.');
 copy.bank.account=account||personal.find(preview=>preview.snapshot.account)?.snapshot.account||copy.bank.account;
 for(const preview of previews)copy.bank.snapshots[preview.kind]=structuredClone(preview.snapshot);
 copy.bank=validateBank(copy.bank);
 if(levels){
  for(const [key,n]of Object.entries(levels))if(!/^[a-z]+$/.test(key)||!Number.isInteger(n)||n<1||n>99)throw Error('Invalid imported base skill.');
  if(['attack','strength','defence','hitpoints','ranged','magic','prayer'].some(key=>!levels[key]))throw Error('Missing imported combat skill.');
  Object.assign(copy.levels,levels);copy.levels.combat=Math.floor(.25*(levels.defence+levels.hitpoints+Math.floor(levels.prayer/2))+.325*Math.max(levels.attack+levels.strength,Math.floor(levels.ranged*1.5),Math.floor(levels.magic*1.5)));
 }
 copy.combat??=defaultCombat();copy.combat.enabled=enableTiming;return copy;
}
export function parseBankImport(text:string,kindOverride?:BankKind):BankPreview{
 if(text.length>5_000_000)throw Error('Item file exceeds 5 MB.');
 const value=JSON.parse(text.replace(/^\uFEFF/,''));safe(value);
 if(!value||typeof value!=='object'||!Array.isArray(value.items)||value.items.length>10000)throw Error('Choose a Character Export container JSON with an items array.');
 const kind=kindOverride??value.kind;if(!kinds.includes(kind))throw Error('Select Bank, Inventory, Equipment or Group Storage as the source.');
 const items:Record<string,number>={};let omitted=0;
 for(const row of value.items){
  if(!row||!Number.isInteger(row.id)||row.id<1||row.id>999999||!Number.isSafeInteger(row.quantity)||row.quantity<0||row.quantity>2147483647)throw Error('Each item needs a valid ID and quantity.');
  if(row.placeholder===true||row.isPlaceholder===true||row.quantity===0||isPlaceholderId(row.id))continue;
  const id=canonicalInventoryId(row.id);if(!isGearId(id)){omitted++;continue;}items[id]=(items[id]||0)+row.quantity;if(items[id]>2147483647)throw Error('Combined item quantity is too large.');
 }
 const account=typeof value.player?.username==='string'?value.player.username:typeof value.account_name==='string'?value.account_name:typeof value.player_name==='string'?value.player_name:typeof value.accountName==='string'?value.accountName:null;
 const date=value.exported_at??value.lastUpdated;
 const at=typeof date==='string'&&Number.isFinite(Date.parse(date))?new Date(date).toISOString():null;
 const warnings=[`${omitted} non-equipment or unmodelled item rows omitted; only recognised wearable gear/ammunition is imported.`,'Import replaces only this container snapshot. Manual item quantities stay in effect.'];
 if(!account)warnings.push('This export does not name the account; verify its character folder.');
 if(kind==='group_storage')warnings.push('Group items are shared; include them only if you can use them. Character Export does not currently export this container.');
 return {kind,snapshot:{items,account,at,label:kind},rows:value.items.length,warnings};
}
export function ownedQuantities(bank:BankState):Record<string,number>{
 const personal:Record<string,number>={},group:Record<string,number>={};
 for(const [kind,snapshot]of Object.entries(bank.snapshots))for(const [id,qty]of Object.entries(snapshot!.items)){
  const target=kind==='group_storage'?group:personal,key=canonicalInventoryId(Number(id));target[key]=(target[key]||0)+qty;
 }
 for(const [id,n]of Object.entries(bank.manual))personal[canonicalInventoryId(Number(id))]=n;
 for(const [id,n]of Object.entries(bank.groupManual))group[canonicalInventoryId(Number(id))]=n;
 if(bank.includeGroup)for(const [id,qty]of Object.entries(group))personal[id]=(personal[id]||0)+qty;
 return personal;
}
export function parseCharacterLevels(text:string):{levels:Record<string,number>;account:string|null}{
 if(text.length>5_000_000)throw Error('Character file exceeds 5 MB.');
 const v=JSON.parse(text.replace(/^\uFEFF/,''));safe(v);const stats=v.stats??v.skills;
 if(!stats||typeof stats!=='object'||Array.isArray(stats))throw Error('Choose character.json with named skill records.');
 const levels:Record<string,number>={};for(const [name,value]of Object.entries(stats)){
  const n=(value as {real_level?:number;level?:number})?.real_level??(value as {level?:number})?.level;
  if(typeof n==='number'&&Number.isInteger(n)&&n>=1&&n<=99)levels[name.toLowerCase()]=n;
 }
 if(!levels.attack||!levels.strength||!levels.ranged||!levels.magic||!levels.prayer)throw Error('Character file needs base combat skill levels.');
 const account=typeof v.account_name==='string'?v.account_name:typeof v.player?.username==='string'?v.player.username:typeof v.player?.name==='string'?v.player.name:null;
 return {levels,account};
}
