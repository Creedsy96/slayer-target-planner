/** Disposable local results, separate from characters and exported backups. */
export interface CachedCalculation {key:string;owner:string;context:string;version:string;updated:number;bytes:number;value:unknown}
export interface CalculationStorage {
 read(key:string):Promise<unknown>;
 write(entry:CachedCalculation):Promise<void>;
 context(key:string):Promise<unknown[]>;
 removeOwner(owner:string):Promise<void>;
}
const request=<T>(value:IDBRequest<T>):Promise<T>=>new Promise((resolve,reject)=>{value.onsuccess=()=>resolve(value.result);value.onerror=()=>reject(value.error);});
const completed=(tx:IDBTransaction):Promise<void>=>new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||Error('Calculation storage transaction aborted.'));tx.onerror=()=>reject(tx.error);});
export class IndexedCalculationStorage implements CalculationStorage {
 private database?:Promise<IDBDatabase>;private writes=0;
 private open():Promise<IDBDatabase>{
  return this.database??=new Promise((resolve,reject)=>{
   const opening=indexedDB.open('slayer-calculations-v1',1);let expired=false;
   const timer=setTimeout(()=>{expired=true;reject(Error('Calculation storage did not open.'));},3000);
   opening.onupgradeneeded=()=>{
    opening.result.createObjectStore('values');
    const metadata=opening.result.createObjectStore('metadata',{keyPath:'key'});
    metadata.createIndex('context','context');metadata.createIndex('owner','owner');
   };
   opening.onsuccess=()=>{clearTimeout(timer);if(expired){opening.result.close();return;}opening.result.onversionchange=()=>opening.result.close();resolve(opening.result);};
   opening.onerror=()=>{clearTimeout(timer);reject(opening.error);};
   opening.onblocked=()=>{clearTimeout(timer);expired=true;reject(Error('Calculation storage is blocked by another app window.'));};
  });
 }
 async read(key:string):Promise<unknown>{const db=await this.open();return request(db.transaction('values').objectStore('values').get(key));}
 async write(entry:CachedCalculation):Promise<void>{
  const db=await this.open(),tx=db.transaction(['values','metadata'],'readwrite'),done=completed(tx);
  const {value,...metadata}=entry;tx.objectStore('values').put(value,entry.key);tx.objectStore('metadata').put(metadata);await done;
  if(++this.writes%32===1)await this.prune(db,entry.version);
 }
 async context(key:string):Promise<unknown[]>{
  const db=await this.open(),metadata=await request(db.transaction('metadata').objectStore('metadata').index('context').getAll(key)) as Omit<CachedCalculation,'value'>[];
  const tx=db.transaction('values'),values=tx.objectStore('values');return Promise.all(metadata.map(entry=>request(values.get(entry.key))));
 }
 async removeOwner(owner:string):Promise<void>{
  const db=await this.open(),rows=await request(db.transaction('metadata').objectStore('metadata').index('owner').getAll(owner)) as Omit<CachedCalculation,'value'>[];
  await this.remove(db,rows.map(row=>row.key));
 }
 private async prune(db:IDBDatabase,version:string):Promise<void>{
  const rows=await request(db.transaction('metadata').objectStore('metadata').getAll()) as Omit<CachedCalculation,'value'>[];
  const current=rows.filter(row=>row.version===version).sort((a,b)=>a.updated-b.updated),remove=rows.filter(row=>row.version!==version).map(row=>row.key);
  let bytes=current.reduce((n,row)=>n+row.bytes,0),count=current.length;
  for(const row of current){if(bytes<=128*1024*1024&&count<=10000)break;remove.push(row.key);bytes-=row.bytes;count--;}
  if(remove.length)await this.remove(db,remove);
 }
 private async remove(db:IDBDatabase,keys:string[]):Promise<void>{
  if(!keys.length)return;const tx=db.transaction(['values','metadata'],'readwrite'),done=completed(tx);
  for(const key of keys){tx.objectStore('values').delete(key);tx.objectStore('metadata').delete(key);}await done;
 }
}
