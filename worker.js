onmessage = function(e) {
  importScripts('Analysis.js');
  importScripts('Utils.js');
  var uiData = e.data;
  uiData.data = Object.setPrototypeOf(uiData.data, Analysis.Application.prototype);
  for (var k in uiData.data.nodes) {
    uiData.data.nodes[k] = Object.setPrototypeOf(uiData.data.nodes[k], Analysis.Node.prototype);
  }
  var res = Analysis.plans(uiData.data);
  postMessage(res);
};
