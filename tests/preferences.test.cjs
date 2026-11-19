const test=require('node:test');
const assert=require('node:assert/strict');
require('./fixtures/v1/data.js');
const data=globalThis.SLAYER_DATA;
const {sanitise,sanitiseOverrides}=require('./fixtures/v1/preferences.js');
test('stored inputs reject invalid values and clamp numeric ranges',()=>{
  const result=sanitise(data,{level:200,blocks:-2,mortimerBlocks:4,dps:NaN,target:'invalid',streak:'false',overhead:Infinity});
  assert.equal(result.level,99);assert.equal(result.blocks,0);assert.equal(result.mortimerBlocks,2);
  assert.equal(result.dps,5);assert.equal(result.target,'basilisks');assert.equal(result.streak,true);assert.equal(result.overhead,0);
});
test('only known task overrides and valid fields survive',()=>{
  const result=sanitiseOverrides(data,{basilisks:{hp:0,multiplier:-2,level:10.9,excluded:false,pointsMin:100},unknown:{hp:30}});
  assert.deepEqual(result,{basilisks:{excluded:false,hp:1,multiplier:0.01,level:10}});
  assert.deepEqual(sanitiseOverrides(data,null),{});
});
