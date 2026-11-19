/** Session-only bounded history. Repeated edits of one field form one undo step. */
export class History<T>{
  private entries:string[]=[];private cursor=-1;private lastKey='';private lastTime=0;
  constructor(private limit=40){}
  get canUndo():boolean{return this.cursor>0;}
  get canRedo():boolean{return this.cursor<this.entries.length-1;}
  record(value:T,key='',now=Date.now()):void{
    const text=JSON.stringify(value);if(this.entries[this.cursor]===text)return;
    const merge=!!key&&key===this.lastKey&&now-this.lastTime<800&&this.cursor>0&&!this.canRedo;
    this.entries=this.entries.slice(0,this.cursor+1);
    if(merge)this.entries[this.cursor]=text;
    else{this.entries.push(text);if(this.entries.length>this.limit)this.entries.shift();this.cursor=this.entries.length-1;}
    this.lastKey=key;this.lastTime=now;
  }
  undo():T|null{return this.canUndo?this.read(--this.cursor):null;}
  redo():T|null{return this.canRedo?this.read(++this.cursor):null;}
  private read(index:number):T{this.lastKey='';return JSON.parse(this.entries[index]);}
}
