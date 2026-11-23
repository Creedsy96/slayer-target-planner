const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),g=require('../.desktop-build/guide.cjs'),d=c.catalogue;
const profile=()=>{const p=c.maxedProfile(d);p.combat.enabled=false;p.assumeAllGear=false;return p;};
function ui(file){const m={exports:{}},code=buildSync({entryPoints:[file],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text;new Function('module','exports',code)(m,m.exports);return m.exports;}

test('every guide form, location and explicit added encounter has a revisioned review',()=>{
 const p=profile();let checked=0;
 for(const record of Object.values(g.GUIDE.records))for(const form of record.forms){
  const state={...g.defaultGuideState(),variantId:record.id,formId:form.id};
  for(const loc of g.rankLocations(record,form,state,p)){checked++;assert.ok(loc.reviewed,record.name+' / '+loc.name);assert.ok(loc.review.source.revision,loc.name);assert.match(loc.review.source.url,/^https:\/\/oldschool\.runescape\.wiki\/w\//);}
 }
 assert.ok(checked>950);assert.equal(Object.keys(c.LOCATION_REVIEWS).length,375);
});

test('location review generation is reproducible without network requests',()=>{
 const target='.desktop-build/verification/location-reviews-check.json';fs.mkdirSync('.desktop-build/verification',{recursive:true});cp.execFileSync('python',['tools/build_location_reviews.py','--output',target]);assert.deepEqual(JSON.parse(fs.readFileSync(target)),require('../data/location-reviews.json'));
});

test('the production calculation worker excludes presentation source excerpts',()=>{
 const built=buildSync({entryPoints:['src/worker.ts'],bundle:true,write:false,format:'iife',target:'es2022',minify:true,metafile:true,define:{LOCATION_REVIEW_DETAILS:'false'}});
 const inputs=Object.values(built.metafile.outputs)[0].inputs;
 assert.equal(inputs['data/location-reviews.json']?.bytesInOutput||0,0);
 assert.ok(inputs['data/location-access-reviews.json'].bytesInOutput>0);
});

test('Stalker Den and Tonali Cavern use their own quests and do not need duplicate creature confirmations',()=>{
 const p=profile();p.quests['Shadows of Custodia']=0;p.quests['The Final Dawn']=0;p.quests['Perilous Moons']=2;
 assert.equal(c.resolveAccess('location:Tonali Cavern',p).value,0);assert.match(c.resolveAccess('location:Tonali Cavern',p).reason,/The Final Dawn/);
 delete p.access['variant:mature-custodian-stalker'];p.access['location:Stalker Den']=1;
 assert.equal(c.resolveAccess('variant:mature-custodian-stalker',p).value,0);
 p.quests['Shadows of Custodia']=2;assert.equal(c.resolveAccess('variant:mature-custodian-stalker',p).value,1);
 p.levels.agility=1;assert.equal(c.resolveAccess('location:Stalker Den',p).value,1,'the northern entrance avoids 59 Agility');
 p.quests['The Final Dawn']=2;p.quests['Perilous Moons']=0;assert.equal(c.resolveAccess('location:Tonali Cavern',p).value,1);
});

test('a creature or area Yes cannot bypass a known hard entrance failure',()=>{
 const p=profile();p.id='custom-review';p.quests['Legends\' Quest']=0;p.access['variant:death-wing']=1;p.access['location:Shaman Caves']=1;
 assert.equal(c.resolveAccess('variant:death-wing',p).value,0);
 p.quests['Legends\' Quest']=null;delete p.questImport;p.access['location:Shaman Caves']=undefined;assert.equal(c.resolveAccess('variant:death-wing',p).value,null);
 p.quests['Legends\' Quest']=2;assert.equal(c.resolveAccess('variant:death-wing',p).value,1);
 p.restrictBasicAccess=true;p.access['location:Stalker Den']=0;assert.equal(c.resolveAccess('location:Stalker Den',p).value,0);
});

test('guild exteriors stay open while actual inside creatures check their skill or quest point requirement',()=>{
 const p=profile();p.levels.fishing=1;p.levels.farming=1;p.levels.crafting=1;p.questPoints=0;
 assert.equal(c.locationAccess('Outside Fishing Guild',p,'Fishing Guild').value,1);
 assert.equal(c.locationAccess('East of the Farming Guild',p,'Farming Guild').value,1);
 assert.equal(c.resolveAccess('location:Crafting Guild',p).value,1,'listed cows are in the external pen');
 p.levels.woodcutting=1;assert.equal(c.resolveAccess('location:Brimhaven Dungeon',p).value,1,'vine routes do not close the ordinary entrance');
 assert.equal(c.locationAccess('Fishing Guild',p,'Fishing Guild').value,0);
 assert.equal(c.locationAccess('Farming Guild',p,'Farming Guild').value,0);
 assert.equal(c.resolveAccess('location:Champions\' Guild',p).value,0);
 p.questPoints=32;assert.equal(c.resolveAccess('location:Champions\' Guild',p).value,1);
 p.levels.attack=65;p.levels.strength=65;assert.equal(c.resolveAccess('location:Warriors\' Guild',p).value,1);
 p.levels.attack=64;assert.equal(c.resolveAccess('location:Warriors\' Guild',p).value,0);
});

test('Wilderness GWD uses alternative stat entrances and does not inherit main GWD boss-room instructions',()=>{
 const p=profile();p.levels.strength=59;p.levels.agility=59;assert.equal(c.resolveAccess('location:Wilderness God Wars Dungeon',p).value,0);
 p.levels.agility=60;assert.equal(c.resolveAccess('location:Wilderness God Wars Dungeon',p).value,1);
 const record=g.GUIDE.records['bloodveld'],state={...g.defaultGuideState(),variantId:record.id,formId:record.defaultForm};const loc=record.forms.flatMap(form=>g.rankLocations(record,form,{...state,formId:form.id},p)).find(l=>l.page==='Wilderness God Wars Dungeon');
 assert.ok(loc);assert.doesNotMatch(loc.requires.join(' '),/Faction access and kill count/);assert.ok(loc.wilderness);
});

test('optional shortcuts, mooring and supplies are not imposed on alternative routes',()=>{
 const p=profile();p.levels.sailing=1;p.levels.agility=1;p.quests['Troubled Tortugans']=2;
 assert.equal(c.resolveAccess('location:The Great Conch',p).value,1,'charter/fairy routes do not require 45 Sailing');
 assert.equal(c.resolveAccess('location:Tear of the Soul',p).value,1,'confirmed built rowboat avoids mooring requirement');
 p.id='custom-review';p.access['location:Tear of the Soul']=undefined;assert.equal(c.resolveAccess('location:Tear of the Soul',p).value,null);
 p.levels.sailing=75;p.access['location:Buccaneers\' Laboratory']=1;assert.equal(c.resolveAccess('location:Buccaneers\' Laboratory',p).value,0);
 p.levels.sailing=76;assert.equal(c.resolveAccess('location:Buccaneers\' Laboratory',p).value,1);
});

test('the guide has readable source notes, no false Shaman route, and no PvP label on safe Ferox Enclave',()=>{
 const p=profile(),page=ui('src/ui/creature-guide.ts'),record=g.GUIDE.records['death-wing'];
 Object.assign(page.guideState,{...g.defaultGuideState(),variantId:record.id,formId:record.defaultForm});
 let html=page.renderCreatureGuide(d,p);assert.match(html,/Reviewed entrance and travel notes/);assert.match(html,/Kharazi Jungle/);assert.doesNotMatch(html,/Xeric.s Lookout|Route unreviewed/);
 const rat=g.GUIDE.records.rat,s={...g.defaultGuideState(),variantId:rat.id,formId:rat.defaultForm};const ferox=g.rankLocations(rat,g.guideForm(rat,s),s,p).find(l=>l.page==='Ferox Enclave');assert.ok(ferox);assert.equal(ferox.wilderness,false);
});

test('a teleport and fallback walk stay unavailable when the entrance is locked or unconfirmed',()=>{
 const {locationTravel}=ui('src/guide/travel.ts'),p=profile();p.quests['Song of the Elves']=0;
 assert.ok(locationTravel('Iorwerth Dungeon',p,[], 'Iorwerth Dungeon').every(r=>!r.available&&r.correctionRoute==='account'&&r.correctionFilter==='Song of the Elves'));
 delete p.quests['Song of the Elves'];assert.ok(locationTravel('Iorwerth Dungeon',p,[], 'Iorwerth Dungeon').every(r=>!r.available));
 p.quests['Song of the Elves']=2;assert.ok(locationTravel('Iorwerth Dungeon',p,[], 'Iorwerth Dungeon').some(r=>r.available));
 assert.equal(c.resolveAccess('location:The Node',p).value,0);assert.equal(c.resolveAccess('location:Limbo',p).value,0);
});

test('existing Maxed characters assume newly reviewed ordinary routes while preserving deliberate restrictions',()=>{
 const p=profile();delete p.access['location:Tear of the Soul'];assert.equal(c.resolveAccess('location:Tear of the Soul',p).value,1);
 p.access['location:Tear of the Soul']=0;assert.equal(c.resolveAccess('location:Tear of the Soul',p).value,0);
 delete p.quests['The Final Dawn'];const saved=c.withDefaultMaxedProfile(d,[p],p.id).profiles[0];assert.equal(c.resolveAccess('location:Tonali Cavern',saved).value,1);
 assert.equal(saved.unlocks.basilocked,0);assert.equal(saved.access['location:Tear of the Soul'],0);
 const reviews=require('../data/location-reviews.json').records;assert.equal(reviews['gryphon caves'].cannon,true);assert.notEqual(reviews['shellbane gryphon cave'].cannon,true);
});
