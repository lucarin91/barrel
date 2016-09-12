var BarrelMenu = React.createClass({
    render: function() {
        var className = this.props.csar ? "" : "hidden";

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
                    <li><a href="#visualiser" className={className}>Visualise</a></li>
                    <li><a href="#editor" className={className}>Edit</a></li>
                    <li><a href="#simulator" className={className}>Simulate</a></li>
                    <li><a href="#analyser" className={className}>Analyse</a></li>
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

var BarrelStateSelector = React.createClass({
    getInitialState: function() {
        return {
            selectedState: this.props.value,
        };
    },

    render: function() {
        var makeOption = v => <option key={v} value={v}>{v}</option>;
        var onChange = evt => {
            this.setState({ selectedState: evt.target.value });
            if (this.props.onChange)
                this.props.onChange(evt.target.value);
        };

        return (
            <select className="form-control state-selector" value={this.state.selectedState} onChange={onChange}>
                {Object.keys(this.props.states).map(makeOption)}
            </select>
        );
    }
});

var MultiSelector =  React.createClass({
    render: function() {
        var makeCheckBox = (v) => (
            <label>
                <input type="checkbox" checked={this.props.getter[v]} onChange={evt => this.props.setter(v, evt.target.checked)} />
                {v}
            </label>
        );

        return <div>{this.props.values.map(makeCheckBox)}</div>;
    }
});

var BarrelStateCREditor = React.createClass({
    getInitialState: function() {
        return {
            selectedState: this.props.value
        };
    },

    render: function() {
        var reqs = [];
        var caps = [];

        return (
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <button type="button" className="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                        <h4 className="modal-title">State</h4>
                    </div>
                    <div className="modal-body">
                        <label className="control-label">State:</label>
                        <BarrelStateSelector cb={s => this.setState({ selectedState: s })} />
                        <label className="control-label">Requirements held:</label>
                        <MultiSelector values={reqs} />
                        <label className="control-label">Capabilities provided:</label>
                        <MultiSelector values={caps} />
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
                        <a className="legend" id="management-protocol-node-type-name" onClick={exportXMLDoc}>{this.state.name}</a>: Management Protocol
                        <button type="button"
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
                                                <BarrelStateSelector value={this.state.mProt.getInitialState()} states={this.state.mProt.getStates()} onChange={updateInitialState} />
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
                <div id="modal-state-editor" className="modal fade"></div>
                <div id="modal-transition-adder" className="modal fade">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <button type="button" className="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                                <h4 className="modal-title">Transition</h4>
                            </div>
                            <div className="modal-body">
                                <label className="control-label">Starting state:</label>
                                <select id="transition-starting-state-selector" className="form-control state-selector"></select>
                                <label className="control-label transition-hide-show">Target state:</label>
                                <select id="transition-target-state-selector" className="form-control state-selector"></select>
                                <label className="control-label">Operation:</label>
                                <select id="transition-operation-selector" className="form-control op-selector"></select>
                                <label className="control-label">Needed requirements:</label>
                                <div className="form-group reqs-checkbox-group"></div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-default" data-dismiss="modal">Close</button>
                                <button id="transition-editor-confirm" type="button" className="btn btn-primary" data-dismiss="modal">Add</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

ReactDOM.render(<BarrelMenu />, document.getElementById('barrelMenu'));
editor = ReactDOM.render(<BarrelEditor />, document.getElementById('editor'));