Opt = React.createClass({
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
