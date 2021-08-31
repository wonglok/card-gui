// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

const replaceText = (selector, text) => {
  const element = document.getElementById(selector);
  if (element) element.innerText = text;
};

let $ = (v) => document.querySelector(v);

window.logStuff = (v) => {
  "#log".innerText = `${v}\n${$("#log").innerText}`;
};
