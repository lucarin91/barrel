var BarrelMenu = React.createClass({
    render: function() {
        var exportCsar =
            () => mProt.save(
                () => csar.exportBlob(
                    blob => saveAs(blob.slice(0, blob.size, "application/octet-stream"), csarFileName, true)
                )
            );

        return (
            <div className="collapse navbar-collapse" id="bs-example-navbar-collapse-1">
                <ul className="nav navbar-nav">
                    <li><a data-toggle="tab" href="#visualiser" className="hidden">Visualise</a></li>
                    <li><a data-toggle="tab" href="#editor" className="hidden">Edit</a></li>
                    <li><a data-toggle="tab" href="#simulator" className="hidden">Simulate</a></li>
                    <li><a data-toggle="tab" href="#analyser" className="hidden">Analyse</a></li>
                    <li className="dropdown">
                        <a href="#" className="dropdown-toggle" data-toggle="dropdown" role="button" aria-expanded={false}>CSAR<span className="caret"></span></a>
                        <ul className="dropdown-menu" role="menu">
                            <li><a href="#" className="hidden" onClick={exportCsar}>Export</a></li>
                            <li><a href="#" onClick={() => this.refs.file.click()}>Import
                                <input ref="file" type="file" onChange={readCsar} style={{ display: "none" }} />
                            </a></li>
                        </ul>
                    </li>
                </ul>
                <ul className="nav navbar-nav navbar-right">
                    <li><a data-toggle="modal" data-target="#modal-info">About</a></li>
                </ul>
            </div>
        );
    }
});

var SingleSelector = React.createClass({
    getInitialState: function() {
        return {
            selected: this.props.value,
        };
    },

    render: function() {
        var makeOption = v => <option key={v} value={v}>{v}</option>;
        var onChange = evt => {
            this.setState({ selected: evt.target.value });
            if (this.props.onChange)
                this.props.onChange(evt.target.value);
        };

        return (
            <select className="form-control state-selector" value={this.state.selected} onChange={onChange}>
                {Object.keys(this.props.items).map(makeOption)}
            </select>
        );
    }
});

var MultiSelector =  React.createClass({
    render: function() {
        var makeCheckBox = (v) => (
            <label key={v}>
                <input type="checkbox" checked={this.props.values(v)} onChange={evt => this.props.onChange(v, evt.target.checked)} />
                {v}
            </label>
        );

        return <div>{Object.keys(this.props.items).map(makeCheckBox)}</div>;
    }
});

var BarrelStateCREditor = React.createClass({
    getInitialState: function() {
        return {
            selectedState: this.props.mProt.getInitialState()
        };
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState({
            selectedState: nextProps.mProt.getInitialState()
        });
    },

    render: function() {
        var reqs = this.props.mProt.getReqs();
        var caps = this.props.mProt.getCaps();
        var states = this.props.mProt.getStates();
        var state = states[this.state.selectedState];
        var stateReqs = state.getReqs();
        var stateCaps = state.getCaps();

        var setReq = (r, value) => {
            if (value)
                stateReqs[r] = true;
            else
                delete stateReqs[r];

            state.setReqs(stateReqs);
            this.setState(this.state);
            editor.refreshMProt();
        };

        var setCap = (c, value) => {
            if (value)
                stateCaps[c] = true;
            else
                delete stateCaps[c];

            state.setCaps(stateCaps);
            this.setState(this.state);
            editor.refreshMProt();
        };

        return (
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <button type="button" className="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                        <h4 className="modal-title">State</h4>
                    </div>
                    <div className="modal-body">
                        <label className="control-label">State:</label>
                        <SingleSelector
                            value={this.state.selectedState}
                            items={states}
                            onChange={s => this.setState({ selectedState: s })} />
                        <label className="control-label">Requirements held:</label>
                        <MultiSelector items={reqs} values={r => r in stateReqs} onChange={setReq} />
                        <label className="control-label">Capabilities provided:</label>
                        <MultiSelector items={caps} values={r => r in stateCaps} onChange={setCap} />
                    </div>
                </div>
            </div>
        );
    }
});

var BarrelTransitionAdder = React.createClass({
    getInitialState: function() {
        var states = Object.keys(this.props.mProt.getStates());
        var ops = this.props.mProt.getOps();
        return {
            source: states[0],
            target: states[0],
            iface: ops[0].iface,
            operation: ops[0].operation,
            reqs: {}
        };
    },

    componentWillReceiveProps: function(nextProps) {
        var states = Object.keys(nextProps.mProt.getStates());
        var ops = this.props.mProt.getOps();
        this.setState({
            source: states[0],
            target: states[0],
            iface: ops[0].iface,
            operation: ops[0].operation,
            reqs: {}
        });
    },

    render: function() {
        var reqs = this.props.mProt.getReqs();
        var states = this.props.mProt.getStates();
        var mergeOp = o => o.iface + ":" + o.operation;
        var ops = Utils.makeSet(this.props.mProt.getOps().map(mergeOp));

        var splitOp = s => {
            var o = s.split(":", 2);
            return { iface: o[0], operation: o[1] };
        };

        var setReq = (r, value) => {
            if (value)
                this.state.reqs[r] = true;
            else
                delete this.state.reqs[r];

            this.setState(this.state);
        };

        var apply = () => {
            this.props.mProt.addTransition(this.state);
            editor.refreshMProt();
        };

        return (
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <button type="button" className="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                        <h4 className="modal-title">Add transition</h4>
                    </div>
                    <div className="modal-body">
                        <label className="control-label">Starting state:</label>
                        <SingleSelector
                            value={this.state.source}
                            items={states}
                            onChange={s => this.setState({ source: s })} />
                        <label className="control-label">Operation:</label>
                        <SingleSelector
                            value={mergeOp(this.state)}
                            items={ops}
                            onChange={s => this.setState(splitOp(s))} />
                        <label className="control-label">Target state:</label>
                        <SingleSelector
                            value={this.state.target}
                            items={states}
                            onChange={s => this.setState({ target: s })} />
                        <label className="control-label">Requirements held:</label>
                        <MultiSelector items={reqs} values={r => r in this.state.reqs} onChange={setReq} />
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-default" data-dismiss="modal">Close</button>
                        <button type="button" className="btn btn-primary" data-dismiss="modal" onClick={apply}>Apply</button>
                    </div>
                </div>
            </div>
        );
    }
});

var BarrelTransitionRemover = React.createClass({
    getInitialState: function() {
        var trans = this.props.mProt.getTransitions();
        if (trans.length != 0)
            return trans[0];

        return {
            source: "",
            target: "",
            iface: "",
            operation: "",
            reqs: {}
        };
    },

    setStateAndComputeDeps: function(nextState) {
        this.setState(nextState);
        var trans = this.props.mProt.getTransitions();

        var sameSource = trans.filter(t => t.source == this.state.source);
        if (sameSource.length == 0) return this.setState(trans[0]);

        var sameOp = sameSource.filter(t => t.iface == this.state.iface && t.operation == this.state.operation);
        if (sameOp.length == 0) return this.setState(sameSource[0]);

        var sameTarget = sameOp.filter(t => t.target == this.state.target);
        if (sameTarget.length == 0) return this.setState(sameOp[0]);
        
        var sameReqs = sameTarget.filter(t => Utils.setEquals(t.reqs == this.state.reqs));
        if (sameReqs.length == 0) return this.setState(sameTarget[0]);

        this.setState(sameReqs[0]);
    },

    componentWillReceiveProps: function(nextProps) {
        this.setStateAndComputeDeps({});
    },

    render: function() {
        var trans = this.props.mProt.getTransitions();
        var states = Utils.makeSet(trans.map(t => t.source));
        var sameSource = trans.filter(t => t.source == this.state.source);
        var sameOp = sameSource.filter(t => t.iface == this.state.iface && t.operation == this.state.operation);
        var sameTarget = sameOp.filter(t => t.target == this.state.target);

        var splitOp = s => {
            var o = s.split(":", 2);
            return { iface: o[0], operation: o[1] };
        };
        var mergeOp = o => o.iface + ":" + o.operation;
        var ops = Utils.makeSet(sameSource.map(mergeOp));
        var currOp = mergeOp(this.state);

        var targets = Utils.makeSet(sameOp.map(t => t.target));

        var splitReqs = s => Utils.makeSet(s.split("+"));
        var mergeReqs = reqSet => {
            var reqList = Object.keys(reqSet);
            reqList.sort();
            return reqList.join("+");
        };
        var currReqs = mergeReqs(this.state.reqs);
        var reqs = Utils.makeSet(sameTarget.map(t => mergeReqs(t.reqs)));

        var apply = () => {
            this.props.mProt.removeTransition(this.state)
            editor.refreshMProt();
        };

        return (
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <button type="button" className="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                        <h4 className="modal-title">Remove transition</h4>
                    </div>
                    <div className="modal-body">
                        <label className="control-label">Starting state:</label>
                        <SingleSelector
                            value={this.state.source}
                            items={states}
                            onChange={s => this.setStateAndComputeDeps({ source: s })} />
                        <label className="control-label">Operation:</label>
                        <SingleSelector
                            value={currOp}
                            items={ops}
                            onChange={s => this.setStateAndComputeDeps(splitOp(s))} />
                        <label className="control-label">Target state:</label>
                        <SingleSelector
                            value={this.state.target}
                            items={targets}
                            onChange={s => this.setStateAndComputeDeps({ target: s })} />
                        <label className="control-label">Requirements:</label>
                        <SingleSelector
                            value={currReqs}
                            items={reqs}
                            onChange={s => this.setStateAndComputeDeps({ reqs: splitReqs(s) })} />
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-default" data-dismiss="modal">Close</button>
                        <button type="button" className="btn btn-primary" data-dismiss="modal" onClick={apply}>Apply</button>
                    </div>
                </div>
            </div>
        );
    }
});

var BarrelFaultAdder = React.createClass({
    getInitialState: function() {
        var states = Object.keys(this.props.mProt.getStates());
        return {
            source: states[0],
            target: states[0]
        };
    },

    componentWillReceiveProps: function(nextProps) {
        var states = Object.keys(nextProps.mProt.getStates());
        this.setState({
            source: states[0],
            target: states[0]
        });
    },

    render: function() {
        var states = this.props.mProt.getStates();

        var apply = () => {
            this.props.mProt.addFaultHandler(this.state);
            editor.refreshMProt();
        };

        return (
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <button type="button" className="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                        <h4 className="modal-title">Add fault handler</h4>
                    </div>
                    <div className="modal-body">
                        <label className="control-label">Starting state:</label>
                        <SingleSelector
                            value={this.state.source}
                            items={states}
                            onChange={s => this.setState({ source: s })} />
                        <label className="control-label">Target state:</label>
                        <SingleSelector
                            value={this.state.target}
                            items={states}
                            onChange={s => this.setState({ target: s })} />
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-default" data-dismiss="modal">Close</button>
                        <button type="button" className="btn btn-primary" data-dismiss="modal" onClick={apply}>Apply</button>
                    </div>
                </div>
            </div>
        );
    }
});

var BarrelFaultRemover = React.createClass({
    getInitialState: function() {
        var states = Object.keys(this.props.mProt.getStates());
        var targets = this.props.mProt.getFaultHandlers().filter(f => f.source == states[0]).map(f => f.target);
        return {
            source: states[0],
            target: targets[0] || ""
        };
    },

    componentWillReceiveProps: function(nextProps) {
        this.setSource(Object.keys(nextProps.mProt.getStates())[0]);
    },

    setSource: function(source) {
        var targets = this.props.mProt.getFaultHandlers().filter(f => f.source == source).map(f => f.target);
        this.setState({
            source: source,
            target: targets[0] || ""
        });
    },

    render: function() {
        var states = this.props.mProt.getStates();
        var targets = Utils.makeSet(this.props.mProt.getFaultHandlers().filter(f => f.source == this.state.source).map(f => f.target));

        var apply = () => {
            this.props.mProt.removeFaultHandler(this.state)
            editor.refreshMProt();
        };

        return (
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <button type="button" className="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                        <h4 className="modal-title">Remove fault handler</h4>
                    </div>
                    <div className="modal-body">
                        <label className="control-label">Starting state:</label>
                        <SingleSelector
                            value={this.state.source}
                            items={states}
                            onChange={s => this.setSource(s)} />
                        <label className="control-label">Target state:</label>
                        <SingleSelector
                            value={this.state.target}
                            items={targets}
                            onChange={s => this.setState({ target: s })} />
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-default" data-dismiss="modal">Close</button>
                        <button type="button" className="btn btn-primary" data-dismiss="modal" onClick={apply}>Apply</button>
                    </div>
                </div>
            </div>
        );
    }
});

var BarrelMProtGraphState = React.createClass({
    render: function() {
        var makeDraggable = el => { if (el) jsPlumb.draggable(el, { containment: "parent" }); };
        var initial = mProt.getInitialState() == this.props.name;

        return (
            <div
                ref={makeDraggable}
                id={"state_" + this.props.name}
                className={"stateDiv" + (initial ? " initial" : "")}
                style={{ left: this.props.left, top: this.props.top }}>
                <div>{this.props.name}</div>
                <div className="reliesOnOffersDiv">
                    Relies on:
                    {Object.keys(this.props.state.getReqs()).map(x => <div key={x}>- {x}</div>)}
                </div>
                <div className="reliesOnOffersDiv">
                    Offers:
                    {Object.keys(this.props.state.getCaps()).map(x => <div key={x}>- {x}</div>)}
                </div>
            </div>
        );
    }
});

var BarrelMProtGraph = React.createClass({
     drawTransitions: function() {
        mProt.getTransitions().forEach(transition => {
            var sourceState = "state_" + transition.source;
            var targetState = "state_" + transition.target;
            var transLabel = "<b>" + transition.iface + ":" + transition.operation + "</b>";
            var reqs = Object.keys(transition.reqs);
            reqs.sort();

            if (reqs.length != 0)
                transLabel += "<br> Relies on: {" + reqs.join(", ") + "}";

            jsPlumb.connect({
                source: sourceState,
                target: targetState,
                anchor: "Continuous",
                connector: ["StateMachine", { curviness: 50 }],
                endpoint: "Blank",
                paintStyle: { strokeStyle: "#112835", lineWidth: 2 },
                hoverPaintStyle: { strokeStyle: "#3399FF" },
                overlays: [
                    ["Arrow", { location: 1 }],
                    ["Label", { label: transLabel, id: "label", location: 0.4, cssClass: "transLabel" }]
                ]
            });
        });
    },

    drawHandlers: function() {
        mProt.getFaultHandlers().forEach(handler => {
            var sourceState = "state_" + handler.source;
            var targetState = "state_" + handler.target;

            jsPlumb.connect({
                source: sourceState,
                target: targetState,
                anchor: "Continuous",
                connector: ["StateMachine", { curviness: 50 }],
                endpoint: "Blank",
                paintStyle: { strokeStyle: "#95a5a6", lineWidth: 2 },
                hoverPaintStyle: { strokeStyle: "#3399FF" },
                overlays: [["Arrow", { location: 1 }]]
            });
        });
    },

    refresh: function() {
        this.forceUpdate();
    },

    render: function() {
        jsPlumb.reset();

        // TODO: refactor layout computation
        var firstRow = true;
        var x = 20;
        var y = 20;
        var deltaX = ($(window).width() - 200) / 4;
        var deltaY = ($(window).height() - 100) / 2;

        var instanceStates = mProt.getStates();
        var states = [];
        for (var s in instanceStates) {
            states.push(<BarrelMProtGraphState key={s} name={s} state={instanceStates[s]} left={x + "px"} top={y + "px"}/>)

            firstRow = !firstRow;
            if (firstRow) {
                x = (x + deltaX);
                y = 20;
            } else {
                y = y + deltaY;
            }
        }

        var redrawConnections = () => {
            jsPlumb.getConnections().forEach(c => jsPlumb.detach(c));
            this.drawTransitions();
            this.drawHandlers();
            jsPlumb.repaintEverything();
        };

        return <div ref={redrawConnections} className="mprot-graph">{states}</div>;
    }
});

var BarrelEditor = React.createClass({
    getInitialState: function() {
        return {
            name: "",
            mProt: null
        };
    },

    refreshMProt: function() {
        this.refs.mProtGraph.refresh();
    },

    render: function() {
        if (!this.state.mProt)
            return null;

        var exportXMLDoc = () => {
            var url = URL.createObjectURL(mProt.getXML());
            window.open(url, "_blank", "");
        };

        return (
            <div>
              <h1 className="legend"><b>{this.state.name}</b></h1>
              <h4>Management Protocol <a className="btn btn-info btn-xs" onClick={exportXMLDoc}>Show XML</a></h4>
              <table className="table">
                <tbody>
                  <tr>
                    <td style={{ width: "70%" }}>
                      <pre>
                        <BarrelMProtGraph ref="mProtGraph" />
                      </pre>
                    </td>
                    <td style={{ width: "30%" }}>
                      <form className="form-horizontal">
                        <fieldset>
                          <legend>Edit</legend>
                          <div className="col-lg-10"><label className="control-label">Initial state</label></div>
                          <div className="col-lg-10" style={{ width: "80%" }}>
                          <SingleSelector
                            value={this.state.mProt.getInitialState()}
                            items={this.state.mProt.getStates()}
                            onChange={newInitialState => {
                                mProt.setInitialState(newInitialState);
                                this.refreshMProt();
                            }} />
                          </div>
                          <div className="col-lg-10"><label className="control-label">Requirement assumptions</label></div>
                          <div className="col-lg-10 btn-group btn-group-justified" style={{ width: "80%" }}>
                            <a className="btn btn-primary" data-toggle="modal" data-target="#modal-state-editor">Add</a>
                            <a className="btn btn-info" data-toggle="modal" data-target="#modal-state-editor">Remove</a>
                          </div>
                          <div className="col-lg-10"><label className="control-label">Provisioned capabilities</label></div>
                          <div className="col-lg-10 btn-group btn-group-justified" style={{ width: "80%" }}>
                            <a className="btn btn-primary" data-toggle="modal" data-target="#modal-state-editor">Add</a>
                            <a className="btn btn-info"    data-toggle="modal" data-target="#modal-state-editor">Remove</a>
                          </div>
                          <div className="col-lg-10"><label className="control-label">Transitions</label></div>
                          <div className="col-lg-10 btn-group btn-group-justified" style={{ width: "80%" }}>
                            <a className="btn btn-primary" data-toggle="modal" data-target="#modal-add-transition-editor">Add</a>
                            <a className="btn btn-info"    data-toggle="modal" data-target="#modal-remove-transition-editor">Remove</a>
                          </div>
                          <div className="col-lg-10"><label className="control-label">Fault handlers</label></div>
                          <div className="col-lg-10 btn-group btn-group-justified" style={{ width: "80%" }}>
                            <a className="btn btn-primary" data-toggle="modal" data-target="#modal-add-fault-editor">Add</a>
                            <a className="btn btn-info"    data-toggle="modal" data-target="#modal-remove-fault-editor">Remove</a>
                          </div>
                        </fieldset>
                      </form>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div id="modal-state-editor" className="modal fade">
                <BarrelStateCREditor mProt={this.state.mProt} />
              </div>
              <div id="modal-add-transition-editor" className="modal fade">
                <BarrelTransitionAdder mProt={this.state.mProt} />
              </div>
              <div id="modal-remove-transition-editor" className="modal fade">
                <BarrelTransitionRemover mProt={this.state.mProt} />
              </div>
              <div id="modal-add-fault-editor" className="modal fade">
                <BarrelFaultAdder mProt={this.state.mProt} />
              </div>
              <div id="modal-remove-fault-editor" className="modal fade">
                <BarrelFaultRemover mProt={this.state.mProt} />
              </div>
            </div>
        );
    }
});

ReactDOM.render(<BarrelMenu />, document.getElementById('barrelMenu'));
editor = ReactDOM.render(<BarrelEditor />, document.getElementById('barrelEditor'));
