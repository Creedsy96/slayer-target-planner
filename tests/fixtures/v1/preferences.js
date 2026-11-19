(function(root){
  'use strict';
  const limits={level:[1,99],blocks:[0,8],mortimerBlocks:[0,2],dps:[0.1,10000],overhead:[0,10000],delay:[0,10000],skipSeconds:[0,10000],modifierChance:[0,1]};
  const integers=new Set(['level','blocks','mortimerBlocks']);
  function sanitise(data, input={}) {
    const settings={...data.defaults};
    for(const key of Object.keys(settings)){
      if(typeof settings[key]==='boolean' && typeof input[key]==='boolean') settings[key]=input[key];
      if(limits[key] && typeof input[key]==='number' && Number.isFinite(input[key])){
        const [min,max]=limits[key]; settings[key]=Math.min(max,Math.max(min,input[key]));
        if(integers.has(key)) settings[key]=Math.floor(settings[key]);
      }
    }
    if(data.creatures.some(c=>c.id===input.target)) settings.target=input.target;
    return settings;
  }
  function sanitiseOverrides(data, input={}){
    const result={};
    if(!input || typeof input!=='object') return result;
    for(const c of data.creatures){
      const source=input[c.id]; if(!source || typeof source!=='object') continue;
      const value={};
      if(typeof source.excluded==='boolean') value.excluded=source.excluded;
      for(const [key,min,max] of [['hp',1,100000],['multiplier',0.01,100],['level',0,99]]){
        if(typeof source[key]==='number' && Number.isFinite(source[key])) value[key]=Math.min(max,Math.max(min,source[key]));
      }
      if(value.level!==undefined)value.level=Math.floor(value.level);
      result[c.id]=value;
    }
    return result;
  }
  root.SlayerPreferences={sanitise,sanitiseOverrides};
  if(typeof module!=='undefined')module.exports=root.SlayerPreferences;
})(globalThis);
