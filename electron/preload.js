/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose secure API channels to the web app frontend
contextBridge.exposeInMainWorld('electronAPI', {
  onOpenFile: (callback) => ipcRenderer.on('open-one-file', (_event, payload) => callback(payload))
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('OneNote Companion Workspace loaded in secure Electron wrapper context.');
});
