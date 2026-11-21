const test=require('node:test'),assert=require('node:assert/strict'),{buildSync}=require('esbuild');
const source=buildSync({entryPoints:['src/ui/selection-surfaces.ts'],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text;
function fixture(){
 let selection={isCollapsed:true},listener;const calls=[];
 class Element {closest(selector){return selector==='.selection-surface'?this.box:this.control||null;}}
 const button=new Element();button.disabled=false;button.attributes={'aria-pressed':'false'};button.matches=()=>false;button.getAttribute=key=>button.attributes[key]??null;button.focus=options=>calls.push(['focus',options]);button.click=()=>{calls.push(['select']);listener?.(event(button));};button.control=button;
 const classes=new Set(),box={buttons:[button],querySelectorAll(selector){this.selector=selector;return this.buttons;},contains(control){return control!==this.outside;},classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);}}};
 const target=new Element();target.box=box;button.box=box;
 const document={getSelection:()=>selection,addEventListener:(kind,callback)=>{assert.equal(kind,'click');listener=callback;}};
 const mod={exports:{}};new Function('module','exports','Element','document',source)(mod,mod.exports,Element,document);
 const event=(node=target,overrides={})=>({target:node,button:0,defaultPrevented:false,...overrides});
 return {...mod.exports,button,box,target,classes,calls,event,Element,selection:value=>selection=value,root:{querySelectorAll:selector=>{assert.match(selector,/\.guide-location/);assert.match(selector,/\.setup-progress li/);return [box];}}};
}
test('a box with one selection action activates that existing button from any plain content',()=>{
 const f=fixture();assert.equal(f.surfaceAction(f.box),f.button);assert.ok(f.activateSelectionSurface(f.event()));
 assert.deepEqual(f.calls,[['focus',{preventScroll:true}],['select']]);assert.match(f.box.selector,/data-master/);assert.match(f.box.selector,/data-gear-pick/);
});
test('multiple selection options and disabled choices are never promoted',()=>{
 const f=fixture();f.box.buttons=[f.button,{...f.button}];assert.equal(f.surfaceAction(f.box),undefined);assert.equal(f.activateSelectionSurface(f.event()),false);
 f.box.buttons=[f.button];f.button.disabled=true;assert.equal(f.surfaceAction(f.box),undefined);f.button.disabled=false;
 f.button.matches=()=>true;assert.equal(f.surfaceAction(f.box),undefined);f.button.matches=()=>false;
 f.button.attributes['aria-disabled']='true';assert.equal(f.surfaceAction(f.box),undefined);assert.equal(f.calls.length,0);
});
test('links, native buttons, inputs, labels and details inside a box keep independent actions',()=>{
 for(const label of ['wiki link','primary button','secondary button','quantity input','disclosure','text in details']){
  const f=fixture();f.target.control={label};assert.equal(f.activateSelectionSurface(f.event()),false,label);assert.equal(f.calls.length,0);
 }
});
test('an outclassed row inside an outer disclosure is still selectable',()=>{
 const f=fixture(),outer={kind:'details'};f.box.outside=outer;f.target.control=outer;
 assert.ok(f.activateSelectionSurface(f.event()));assert.equal(f.calls.filter(c=>c[0]==='select').length,1);
});
test('modified clicks, cancelled events and dragged text never trigger selection',()=>{
 for(const options of [{ctrlKey:true},{metaKey:true},{altKey:true},{shiftKey:true},{button:1},{button:2},{defaultPrevented:true}]){
  const f=fixture();assert.equal(f.activateSelectionSurface(f.event(f.target,options)),false);assert.equal(f.calls.length,0);
 }
 const f=fixture();f.selection({isCollapsed:false});assert.equal(f.activateSelectionSurface(f.event()),false);f.selection(null);assert.ok(f.activateSelectionSurface(f.event()));
});
test('delegation revalidates dynamic controls and does not recursively select twice',()=>{
 const f=fixture();f.installSelectionSurfaces();assert.ok(f.activateSelectionSurface(f.event()));assert.equal(f.calls.filter(c=>c[0]==='select').length,1);
 f.calls.length=0;f.box.buttons.push({...f.button});assert.equal(f.activateSelectionSurface(f.event()),false);assert.equal(f.calls.length,0);
});
test('enhancement mirrors selection and removes stale affordances without replacing native controls',()=>{
 const f=fixture();f.button.attributes['aria-pressed']='true';f.enhanceSelectionSurfaces(f.root);assert.ok(f.classes.has('selection-surface'));assert.ok(f.classes.has('selection-current'));assert.equal(f.box.buttons[0],f.button);
 f.button.disabled=true;f.enhanceSelectionSurfaces(f.root);assert.equal(f.classes.size,0);
});
test('non-element targets and content outside a selectable surface are ignored',()=>{
 const f=fixture();assert.equal(f.activateSelectionSurface(f.event({})),false);f.target.box=null;assert.equal(f.activateSelectionSurface(f.event()),false);assert.equal(f.calls.length,0);
});
