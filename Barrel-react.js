var BarrelMenu = React.createClass({
    render: function() {
        var className = this.props.csar ? "" : "hidden";
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
                            <input ref="file" type="file" onChange={readCsar} style={{display: "none"}} />
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
            selectedState: "",
            instanceStates: {}
        };
    },

    render: function() {
        var makeOption = v => <option key={v} value={v}>{v}</option>;

        return (
            <select
                className="form-control state-selector"
                value={this.state.selectedState}
                onChange={evt => {this.setState({ selectedState: evt.target.value }); if (this.props.onChange) this.props.onChange(evt.target.value); }}>
                {Object.keys(this.state.instanceStates).map(makeOption)}
            </select>
        );
    }
});

ReactDOM.render(<BarrelMenu />, document.getElementById('barrelMenu'));
barrelStateSelector = ReactDOM.render(<BarrelStateSelector onChange={updateInitialState} />, document.getElementById('barrelStateSelector'));
