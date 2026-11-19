'use strict';
function hiscoresUrl(name){
  if(typeof name!=='string'||!/^[A-Za-z0-9 _-]{1,12}$/.test(name))throw Error('Invalid RuneScape name.');
  return 'https://secure.runescape.com/m=hiscore_oldschool/index_lite.json?player='+encodeURIComponent(name);
}
async function lookup(name,fetcher=fetch){
  const response=await fetcher(hiscoresUrl(name),{signal:AbortSignal.timeout(8000),credentials:'omit',redirect:'error'});
  if(!response.ok)throw Error('Hiscores unavailable or player not found.');
  const reader=response.body.getReader();let text='',size=0;const decoder=new TextDecoder();
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>100000)throw Error('Hiscores response too large.');text+=decoder.decode(value,{stream:true});}}finally{await reader.cancel();}
  return text+decoder.decode();
}
module.exports={hiscoresUrl,lookup};
