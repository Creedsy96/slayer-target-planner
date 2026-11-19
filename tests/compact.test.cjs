const test=require('node:test'),assert=require('node:assert/strict');
const {compactWindow}=require('../desktop/compact.cjs');
test('compact window restores original bounds and maximisation and pin stays opt-in',()=>{
  const calls=[],bounds={x:10,y:20,width:1440,height:980},w={getBounds:()=>bounds,isMaximized:()=>true,unmaximize:()=>calls.push('unmaximize'),maximize:()=>calls.push('maximize'),setMinimumSize:(...v)=>calls.push(v),setBounds:v=>calls.push(v),setAlwaysOnTop:v=>calls.push(v)};
  let saved=compactWindow(w,true,false,null);assert.equal(saved.bounds,bounds);assert.ok(calls.includes(false));assert.ok(calls.includes('unmaximize'));
  const count=calls.length;assert.equal(compactWindow(w,true,true,saved),saved);assert.equal(calls.length,count+1);assert.equal(calls.at(-1),true);
  assert.equal(compactWindow(w,false,true,saved),null);assert.equal(calls.at(-1),false);assert.ok(calls.includes('maximize'));
  const before=calls.length;assert.throws(()=>compactWindow(w,'true',false,null),/Invalid/);assert.equal(calls.length,before);
});
