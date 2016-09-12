var BarrelMenu = React.createClass({
    render: function() {
        var className = csar ? "" : "hidden";

        var exportCsar = () => {
            mProt.save(function () {
                csar.exportBlob(function (blob) {
                    var url = URL.createObjectURL(blob);
                    setTimeout(function () {
                        var a = document.createElement("a");
                        a.style = "display: none";
                        a.href = url;
                        a.download = csarFileName;
                        document.body.appendChild(a);
                        a.click();
                        setTimeout(function () {
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(url);
                        }, 0);
                    }, 0);
                });
            });
        };

        return (
            <div className="collapse navbar-collapse" id="bs-example-navbar-collapse-1">
                <ul className="nav navbar-nav">
                    <li><a data-toggle="tab" href="#visualiser" className={className}>Visualise</a></li>
                    <li><a data-toggle="tab" href="#editor" className={className}>Edit</a></li>
                    <li><a data-toggle="tab" href="#simulator" className={className}>Simulate</a></li>
                    <li><a data-toggle="tab" href="#analyser" className={className}>Analyse</a></li>
                    <li className="dropdown">
                        <a href="#" className="dropdown-toggle" data-toggle="dropdown" role="button" aria-expanded={false}>CSAR<span className="caret"></span></a>
                        <ul className="dropdown-menu" role="menu">
                            <li><a className={className} onClick={exportCsar}>Export</a></li>
                            <li><a onClick={() => this.refs.file.click()}>Import
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
        };

        var setCap = (c, value) => {
            if (value)
                stateCaps[c] = true;
            else
                delete stateCaps[c];

            state.setCaps(stateCaps);
            this.setState(this.state);
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
        } ;

        var setReq = (r, value) => {
            if (value)
                this.state.reqs[r] = true;
            else
                delete this.state.reqs[r];

            this.setState(this.state);
        };

        var apply = () => this.props.mProt.addTransition(this.state);

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
                        <label className="control-label">Target state:</label>
                        <SingleSelector
                            value={this.state.target}
                            items={states}
                            onChange={s => this.setState({ target: s })} />
                        <label className="control-label">Operation:</label>
                        <SingleSelector
                            value={mergeOp(this.state)}
                            items={ops}
                            onChange={s => this.setState(splitOp(s))} />
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
        var apply = () => this.props.mProt.addFaultHandler(this.state);

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
            console.log(this.state);
            console.log(this.props.mProt);
            this.props.mProt.removeFaultHandler(this.state)
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

var BarrelEditor = React.createClass({
    getInitialState: function() {
        return {
            name: "",
            mProt: null
        };
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
                <fieldset className="col-lg-10">
                    <legend>
                        <a className="legend" onClick={exportXMLDoc}>{this.state.name}</a>: Management Protocol
                        <button type="button"
                            ref={el => el ? $(el).popover() : null}
                            className="btn btn-info btn-xs"
                            data-container="body"
                            data-toggle="popover"
                            data-placement="right"
                            data-content="To edit a management protocol, (i) double click on a topology node, or (ii) click on row of the corresponding table."
                            data-original-title=""
                            title="">
                            info
                        </button>
                    </legend>
                    <table className="table">
                        <tbody>
                            <tr>
                                <td style={{ width: "70%" }}>
                                    <pre id="management-protocol-display"></pre>
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
                                                    onChange={updateInitialState} />
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
                </fieldset>
                <div id="modal-state-editor" className="modal fade">
                    <BarrelStateCREditor mProt={this.state.mProt} />
                </div>
                <div id="modal-add-transition-editor" className="modal fade">
                    <BarrelTransitionAdder mProt={this.state.mProt} />
                </div>
                <div id="modal-remove-transition-editor" className="modal fade">
                    <BarrelStateCREditor mProt={this.state.mProt} />
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