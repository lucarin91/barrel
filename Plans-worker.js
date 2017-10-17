onmessage = function(e) {
  importScripts('Analysis.js');
  importScripts('Utils.js');

  var uiData = e.data;
  var app = uiData.data;

  // add prototype to the Application
  app = Object.setPrototypeOf(app, Analysis.Application.prototype);

  // add prototype to the Nodes
  for (var k in app.nodes) {
    app.nodes[k] = Object.setPrototypeOf(app.nodes[k], Analysis.Node.prototype);
  }
  
  // Evaluete the plans and send back to the main worker
  var res = Analysis.plans(app);
  postMessage(res);
};
