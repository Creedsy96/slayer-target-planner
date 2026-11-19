const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const {transformSync}=require('esbuild');
const code=transformSync(readFileSync(require.resolve('../src/ui/rate-dialog.ts'),'utf8'),{loader:'ts',format:'cjs'}).code;

function fixture(){
  const events={},fieldEvents={};
  const field={valueAsNumber:NaN,message:'',addEventListener:(name,handler)=>fieldEvents[name]=handler,setCustomValidity(message){this.message=message;},reportValidity(){this.reported=true;},focus(){this.focused=true;}};
  const dialog={querySelector:()=>field,addEventListener:(name,handler)=>events[name]=handler,showModal(){this.shown=true;},remove(){this.removed=true;}};
  const context={module:{exports:{}},document:{createElement:()=>dialog,body:{append(){}}}};
  vm.runInNewContext(code,context);
  const submit=(value,button='save')=>{field.valueAsNumber=value;let prevented=false;events.submit({submitter:{getAttribute:()=>button},preventDefault:()=>prevented=true});return prevented;};
  return {api:context.module.exports,field,dialog,submit,events,fieldEvents};
}

test('timing popup uses the selected numeric rate and units instead of a name prompt',async()=>{
  for(const [timing,label] of [['kills-hour','Kills per hour'],['task-minutes','Combat minutes per whole task']]){
    const f=fixture(),result=f.api.requestRate(timing);
    assert.ok(f.dialog.innerHTML.includes(`<label>${label}<input`));
    assert.ok(f.dialog.innerHTML.includes('type="number"'));
    assert.ok(!f.dialog.innerHTML.includes('<label>Name'));
    assert.equal(f.dialog.shown,true);assert.equal(f.field.focused,true);
    assert.equal(f.submit(12.5),false);f.dialog.returnValue='save';f.events.close();
    assert.equal(await result,12.5);assert.equal(f.dialog.removed,true);
  }
});

test('zero, negative and invalid drafts stay in the rate dialog for correction',async()=>{
  const f=fixture(),result=f.api.requestRate('kills-hour');
  for(const rate of [0,-1,NaN,Infinity])assert.equal(f.submit(rate),true);
  assert.match(f.field.message,/greater than zero/);assert.equal(f.field.reported,true);
  f.fieldEvents.input();assert.equal(f.field.message,'');
  assert.equal(f.submit(250),false);f.dialog.returnValue='save';f.events.close();assert.equal(await result,250);
});

test('cancel remains available with an invalid or empty rate',async()=>{
  const f=fixture(),result=f.api.requestRate('task-minutes');
  assert.equal(f.submit(NaN,'cancel'),false);f.dialog.returnValue='cancel';f.events.close();
  assert.equal(await result,null);
});
