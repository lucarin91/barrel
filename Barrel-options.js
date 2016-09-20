var Opt = React.createClass({
  render: function() {
    var className = "btn btn-xs ";
    className += (this.props.enabled?"btn-success":"btn-danger");
    var text = this.props.enabled?"On":"Off";
    return (
      <span className="opt-text">
        <b>{this.props.caption + ": "}</b>
        <span
          className={className}
          onClick={this.props.onClick}>
          {text}
        </span>
      </span>
    )
  }
})

Options = React.createClass({
  getInitialState: function() {
    return {
      hardRecovery: false
    }
  },
  toggleOption: function(opt) {
    this.state[opt] = !this.state[opt];
    this.forceUpdate();
  },
  render: function() {
    return (
      <div>
        <h1 className="bolded">Options</h1>
        <Opt
          caption="Hard recovery"
          enabled={this.state.hardRecovery}
          onClick={() => this.toggleOption("hardRecovery")} />
      </div>
    )
  }
})
