'use strict';
const {contextBridge, ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('slayerDesktop',Object.freeze({
 characterExports:mode=>ipcRenderer.invoke('character-exports',mode),hiscores:name=>ipcRenderer.invoke('public-hiscores',name),compact:(enabled,pin=false)=>ipcRenderer.invoke('compact-mode',enabled,pin),
 updates:(action,value)=>ipcRenderer.invoke('app-update',action,value),
 onUpdateState:callback=>{const listener=(_event,state)=>callback(state);ipcRenderer.on('app-update-state',listener);return ()=>ipcRenderer.removeListener('app-update-state',listener);},
}));
