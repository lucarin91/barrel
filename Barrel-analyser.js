var StateSelector = React.createClass({
  render: function() {
    var makeNodeRow = node => (
      <tr key={this.props.caption.replace(" ","-")+"-"+node.name}>
        <td>
          {this.props.getUIName(node.name)}
        </td>
        <td>
          <select className="form-control global-state-selector">
            {Object.keys(node.obj.states).map(v =>
              <option key={v} value={node.name+"="+v}>{v}</option>
            )}
          </select>
        </td>
      </tr>
    )

    return (
      <div style={{display:"inline-block",paddingRight:"15px"}}>
        <h4 className="bolded">{this.props.caption}</h4>
        <table>
          <thead>
            <tr>
              <th>Node</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {this.props.nodes.map(makeNodeRow)}
          </tbody>
        </table>
      </div>
    );
  }
});

var Planner = React.createClass({
  findPlan: function() {
    var stateSelectors = $(".global-state-selector").map((i,sel) => sel.value);
    var startingState=[];
    var targetState=[];
    stateSelectors.map((index,val) => {
      (index<stateSelectors.length/2)?startingState.push(val):targetState.push(val);
    });
    var start = startingState.sort().join("|");
    var target = targetState.sort().join("|");

    if(!this.props.reachable[start]) {
      alert("Starting state is unreachable");
    }
    else if(!this.props.reachable[target]) {
      alert("Target state is unreachable");
    }
    else {
      var plan = [];

      var currentApp = this.props.reachable[start];
      while(currentApp.globalState != target) {
        var step = this.props.plans.steps[currentApp.globalState][target];
        plan.push = [ step ];
        if (step.isOp) {
          currentApp = currentApp.performOp(step.nodeId,step.opId);
        } else {
          currentApp = currentApp.handleFault(step.nodeId,step.opId);
        }
      }
      console.log(plan);

    }
  },
  render: function() {
    return (
      <div>
        <h1 className="legend bolded">Planner</h1>
        <div className="form-group">
          <StateSelector
            caption="Starting global state"
            nodes={this.props.nodes}
            getUIName={this.props.getUIName} />
          <StateSelector
            caption="Target global state"
            nodes={this.props.nodes}
            getUIName={this.props.getUIName} />
        </div>
        <div className="form-group">
          <div className="col-sm-4 col-sm-offset-2">
            <a className="btn btn-primary" onClick={this.findPlan}>Find plan</a>
          </div>
        </div>
      </div>
    );
  }
})

Analyser = React.createClass({
  render: function() {
    var getUIName = id => this.props.uiData.uiNames[id] || id;
    var nodeSetToNodeList = set => Object.keys(set).map(el => { return { name: el, obj: set[el] } });

    return (
      <Planner
        nodes={nodeSetToNodeList(this.props.uiData.data.nodes)}
        reachable={Analysis.reachable(this.props.uiData.data)}
        plans={Analysis.plans(this.props.uiData.data)}
        getUIName={getUIName} />
    )
  }
})
