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

Analyser = React.createClass({
  getInitialState: function() {
    return {
      reachable: Analysis.reachable(this.props.uiData.data),
      plans: Analysis.plans(this.props.uiData.data)
    }
  },
  findPlan: function() {
    var stateSelectors = $(".global-state-selector").map((i,sel) => sel.value);
    var startingState=[];
    var targetState=[];
    stateSelectors.map((index,val) => {
      (index<stateSelectors.length/2)?startingState.push(val):targetState.push(val);
    });
    var start = startingState.sort().join("|");
    var target = targetState.sort().join("|");

    console.log(this.state.reachable);
    console.log("start: " + start);
    console.log("is start reachable? " + this.state.reachable[start]);
    console.log("");
    console.log("target: " + target);
    console.log("is target reachable? " + this.state.reachable[target]);
    console.log("");
    console.log(this.state.plans);
    console.log("costs[start][target]: " + this.state.plans.costs[start][target]);
    console.log("plans[start][target]: " + this.state.plans.steps[start][target]);
  },
  render: function() {
    var getUIName = id => this.props.uiData.uiNames[id] || id;
    var setToList = set => Object.keys(set).map(el => { return { name: el, obj: set[el] } });

    return (
      <div>
        <h1 className="legend bolded">Planning</h1>
        <div className="form-group">
          <StateSelector
            caption="Starting global state"
            nodes={setToList(this.props.uiData.data.nodes)}
            getUIName={getUIName} />
          <StateSelector
            caption="Target global state"
            nodes={setToList(this.props.uiData.data.nodes)}
            getUIName={getUIName} />
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
