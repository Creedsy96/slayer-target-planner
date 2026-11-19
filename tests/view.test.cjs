const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const {transformSync}=require('esbuild');
const code=transformSync(readFileSync(require.resolve('../src/ui/view.ts'),'utf8'),{loader:'ts',format:'cjs'}).code;

function fixture(attributes,duplicate=false){
  const fields=[],focuses=[];
  const field=(value,caret=0)=>({id:'',type:'number',value,caret,
    hasAttribute:key=>key in attributes,getAttribute:key=>attributes[key],
    get selectionStart(){throw Error('Number inputs cannot read selectionStart');},
    replaceWith(original){fields[fields.indexOf(this)]=original;},
    focus(options){focuses.push({field:this,options});},
  });
  const active=field('12.',3),other=field('5');
  fields.push(...(duplicate?[other,active]:[active]));
  const details={open:true,querySelector:()=>({textContent:'Quick setup'})};
  const scroll=[];
  const document={activeElement:active,querySelectorAll:selector=>selector==='details[open]'||selector==='details'?[details]:fields};
  const context={module:{exports:{}},document,window:{scrollY:125,scrollTo:options=>scroll.push(options)},CSS:{escape:value=>value}};
  vm.runInNewContext(code,context);
  return {fields,focuses,active,other,details,scroll,field,preserve:context.module.exports.preserveView};
}

test('number editors retain native caret and unfinished decimals after form replacement',()=>{
  for(const attributes of [
    {'data-setting':'points'},
    {'data-target':'0','data-target-field':'priority'},
    {'data-method':'basilisks::basilisk','data-method-field':'dps'},
    {'data-offer':'0','data-offer-field':'quantity'},
  ]){
    const f=fixture(attributes),restore=f.preserve();
    f.fields[0]=f.field('12');f.details.open=false;restore();
    assert.equal(f.fields[0],f.active);
    assert.equal(f.active.value,'12.');assert.equal(f.active.caret,3);
    assert.equal(f.focuses[0].field,f.active);assert.equal(f.details.open,true);
    assert.equal(f.scroll[0].top,125);
  }
});

test('duplicated numeric settings restore the main editor without moving it into Quick setup',()=>{
  const f=fixture({'data-setting':'levels.slayer'},true),restore=f.preserve();
  const quick=f.field('87');f.fields.splice(0,2,quick,f.field('12'));restore();
  assert.equal(f.fields[0],quick);assert.equal(f.fields[1],f.active);
  assert.equal(f.focuses[0].field,f.active);
});

test('creature picker focus follows the visible replacement control after worker refresh',()=>{
  const f=fixture({'data-picker-for':'0:variantId'});f.active.type='button';
  const restore=f.preserve(),replacement=f.field('Cerberus');replacement.type='button';f.fields[0]=replacement;restore();
  assert.equal(f.focuses[0].field,replacement);assert.equal(f.fields[0],replacement);
});

test('worker content refresh leaves an already-connected editor in place and removed fields stay removed',()=>{
  const f=fixture({'data-setting':'points'}),restore=f.preserve();
  f.active.replaceWith=()=>assert.fail('Connected editor must not move');restore();
  assert.equal(f.fields[0],f.active);
  f.fields.length=0;restore();assert.equal(f.fields.length,0);
});
test('advanced sections remain open across a temporarily missing worker result and explicit closing still wins',()=>{
  const detail=()=>({open:false,querySelector:()=>({textContent:'Current assignment and cape state'})});
  let current=[detail()];current[0].open=true;
  const context={module:{exports:{}},document:{activeElement:null,querySelectorAll:()=>current},window:{scrollY:0,scrollTo(){}},CSS:{escape:v=>v}};
  vm.runInNewContext(code,context);const preserve=context.module.exports.preserveView;
  let restore=preserve();current=[];restore();restore=preserve();current=[detail()];restore();assert.equal(current[0].open,true);
  current[0].open=false;restore=preserve();current=[];restore();restore=preserve();current=[detail()];restore();assert.equal(current[0].open,false);
});
