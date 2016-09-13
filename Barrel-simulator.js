var Simulator = React.createClass({
    getInitialState: function() {
        return {
            app: this.props.initialApp
        };
    },

    render: function() {
        return (
            <div>
                <table className="table table-striped table-hover ">
                    <thead>
                        <tr>
                            <th style="width:10%"></th>
                            <th style="width:10%">State</th>
                            <th style="width:25%">Offered capabilities</th>
                            <th style="width:25%">Assumed requirements</th>
                            <th style="width:30%">Available operations</th>
                        </tr>
                    </thead>
                    <tbody id="simulator-body">
                        <button type="button" className="btn btn-default btn-xs" onClick={() => this.setState({ app: app.performOp(id, o) })}>
                            Clear
                        </button>
                    </tbody>
                </table>

                <div className="form-horizontal col-lg-10 hidden" style="text-align:center">
                    <button type="button" className="btn btn-default btn-xs" onClick={() => this.setState(this.getInitialState())}>
                        Clear
                    </button>
                </div>
            </div>
        );
    }
});
