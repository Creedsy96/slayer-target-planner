'use strict';
// Window-only operation: no files, navigation, or user profile changes.
function compactWindow(window,enabled,pin,previous){
  if(typeof enabled!=='boolean'||typeof pin!=='boolean')throw Error('Invalid compact-window options.');
  if(enabled&&!previous){
    previous={bounds:window.getBounds(),maximized:window.isMaximized()};
    if(previous.maximized)window.unmaximize();
    window.setMinimumSize(360,420);
    window.setBounds({...previous.bounds,width:440,height:720});
  }else if(!enabled&&previous){
    window.setMinimumSize(420,620);window.setBounds(previous.bounds);
    if(previous.maximized)window.maximize();previous=null;
  }
  window.setAlwaysOnTop(enabled&&pin);
  return previous;
}
module.exports={compactWindow};
