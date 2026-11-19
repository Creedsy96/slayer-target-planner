const test = require('node:test');
const assert = require('node:assert/strict');
require('./fixtures/v1/data.js');
const data = globalThis.SLAYER_DATA;
const {calculate, selectionProbabilities} = require('./fixtures/v1/engine.js');
const baseline = require('./baseline.json');
const close = (actual, expected, label) => assert.ok(Math.abs(actual-expected)<0.00001, `${label}: ${actual} != ${expected}`);

test('matches the workbook snapshot for every master and Mortimer scenario', () => {
  for (const expected of baseline) {
    const result = calculate(data, data.masters.find(m=>m.id===expected.id), data.defaults);
    for (const key of ['chance','average','afterSkips','hours','sustainableHours','fullSkips','boundary']) {
      if (expected[key] === 'n.a.') assert.equal(result[key], null);
      else close(result[key], expected[key], `${result.master.name} ${key}`);
    }
  }
});

test('every catalogue creature can be targeted without blocking or skipping it', () => {
  for (const creature of data.creatures) {
    for (const master of data.masters) {
      const result = calculate(data, master, {...data.defaults,target:creature.id,level:99}, {[creature.id]:{excluded:false}});
      const row = result.rows.find(r=>r.id===creature.id);
      if (row) { assert.equal(row.blocked,false); assert.equal(row.skip,0); assert.ok(result.chance>0); }
      assert.ok(result.pointsEarned-result.pointsSpent > -0.000001);
    }
  }
});

test('wrong requirements and absent targets have unavailable results', () => {
  const master = data.masters[0];
  assert.equal(calculate(data,master,{...data.defaults,level:1}).hours,null);
  assert.equal(calculate(data,master,data.defaults,{basilisks:{excluded:true}}).sustainableHours,null);
  assert.equal(calculate(data,data.masters[1],data.defaults).available,false);
});

test('zero rewards cannot fund skips; empty pools and only-target pools are finite', () => {
  const master = data.masters[0];
  const allExcluded = Object.fromEntries(data.creatures.map(c=>[c.id,{excluded:true}]));
  assert.equal(calculate(data,master,data.defaults,allExcluded).chance,0);
  allExcluded.basilisks.excluded=false;
  const result = calculate(data,master,data.defaults,allExcluded);
  close(result.chance,1,'only target'); close(result.hours,0,'immediate offer');
  assert.equal(calculate(data,data.masters[1],{...data.defaults,target:'bats'}).fullSkips,0);
});

test('weighted distinct offers normalise for one, two and three choices', () => {
  for (let choices=1;choices<=3;choices++) {
    const rows=[{id:'a',weight:1,minutes:10,probability:0},{id:'b',weight:2,minutes:20,probability:0},{id:'c',weight:3,minutes:30,probability:0}];
    selectionProbabilities(rows,choices,'c');
    close(rows.reduce((s,r)=>s+r.probability,0),1,'normalisation');
    if(choices===3) close(rows[2].probability,1,'target always offered');
  }
});

test('DPS, travel, extensions and exclusions recalculate', () => {
  const master=data.masters[0];
  const original=calculate(data,master,data.defaults);
  assert.ok(calculate(data,master,{...data.defaults,dps:10}).hours<original.hours);
  assert.ok(calculate(data,master,{...data.defaults,overhead:10}).hours>original.hours);
  assert.notEqual(calculate(data,master,{...data.defaults,extended:true}).hours,original.hours);
  assert.ok(calculate(data,master,data.defaults,{hellhounds:{excluded:true}}).rows.find(r=>r.id==='hellhounds').reason);
});
