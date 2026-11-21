const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),d=c.catalogue,metadata=require('../data/slayer-unlocks.json');
function ui(file){const code=buildSync({entryPoints:[file],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text,m={exports:{}};new Function('module','exports',code)(m,m.exports);return m.exports;}
const {rewardCards}=ui('src/ui/fact-cards.ts'),{renderCharacterSetup}=ui('src/ui/character-setup.ts');

test('every modeled unlock has a distinct explanation and a cost matching the offline rewards source',()=>{
 assert.deepEqual(Object.keys(metadata.rewards).sort(),Object.keys(d.unlocks).sort());
 const source=JSON.parse(fs.readFileSync('data/sources/slayer-rewards.json','utf8')).revisions[0];
 assert.equal(metadata.source.revision,source.revid);
 for(const [key,reward] of Object.entries(metadata.rewards)){
  const row=source.slots.main.content.split('|-').find(row=>row.toLowerCase().includes('\n|'+d.unlocks[key].toLowerCase()+'\n'));
  assert.ok(row,key);assert.match(row,new RegExp('\\n\\|\\s*'+reward.points+'\\s*\\n'),key);
  assert.ok(reward.description.length>30,key);
 }
 assert.equal(new Set(Object.values(metadata.rewards).map(r=>r.description)).size,13);
});

test('unlock descriptions are visible on the whole-card controls and preserve ownership and shop order',()=>{
 const p=c.newCharacter(d,'Fresh');p.unlocks.basilocked=1;const before=c.clone(p),html=rewardCards(d,p);
 assert.equal((html.match(/data-fact-toggle="unlocks"/g)||[]).length,13);
 assert.ok(html.indexOf('Seeing red')<html.indexOf('Watch the birdie'));
 assert.match(html,/data-key="basilocked" aria-pressed="true"/);
 for(const key of Object.keys(d.unlocks))assert.match(html,new RegExp('data-key="'+key+'"'));
 assert.match(html,/80 points · Adds basilisk tasks/);assert.match(html,/Free · Adds jellies/);
 assert.match(html,/No points are spent here/);assert.match(html,/Slayer_Rewards\?oldid=15373095#Unlock/);
 assert.deepEqual(p,before);
});

test('the setup wizard shares descriptive unlocks without enabling or purchasing rewards',()=>{
 const p=c.newCharacter(d,'Setup');p.setup.step=3;const before=c.clone(p),html=renderCharacterSetup(d,p,null);
 assert.match(html,/Removes Fossil Island wyvern tasks/);assert.match(html,/Raises frost dragon task weight from 5 to 8/);
 assert.match(html,/Mortimer&#39;s Venators do not need this reward/);assert.deepEqual(p,before);
});

test('exceptions explain task removal, independent requirements and weight increases',()=>{
 assert.match(metadata.rewards['stop-the-wyvern'].description,/without using a block slot/);
 assert.match(metadata.rewards['stop-the-wyvern'].description,/Skeletal wyverns and your current task are unaffected/);
 assert.match(metadata.rewards['heavy-frost'].description,/does not unlock the task/);
 assert.match(metadata.rewards.basilocked.description,/Knights still need quest access and a compatible task location/);
 assert.match(metadata.rewards['wildy-more'].description,/Free to toggle/);
 assert.match(metadata.rewards['hot-stuff'].description,/Zuk.*first Zuk kill/);
});

test('requirements filtering finds creature and master descriptions as well as reward names',()=>{
 const p=c.newCharacter(d,'Filter');
 for(const query of ['basilocked','BASILISK',' knights ']){const html=rewardCards(d,p,query);assert.equal((html.match(/data-fact-toggle=/g)||[]).length,1);assert.match(html,/data-key="basilocked"/);}
 const html=rewardCards(d,p,'Duradel');assert.equal((html.match(/data-fact-toggle=/g)||[]).length,11);
 assert.ok(html.indexOf('Seeing red')<html.indexOf('Watch the birdie'));
 assert.match(rewardCards(d,p,'no-such-reward'),/No task unlocks match this filter/);
});

test('unknown future reward labels are escaped and receive a conservative fallback description',()=>{
 const p=c.newCharacter(d,'Future'),html=rewardCards({...d,unlocks:{'future-reward':'<New & reward>'}},p);
 assert.match(html,/&lt;New &amp; reward&gt;/);assert.doesNotMatch(html,/<New/);
 assert.match(html,/Only enable rewards purchased with Slayer points/);assert.match(html,/Unconfirmed/);
});
