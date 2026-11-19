'use strict';
const {contextBridge, ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('slayerDesktop',Object.freeze({hiscores:name=>ipcRenderer.invoke('public-hiscores',name)}));
