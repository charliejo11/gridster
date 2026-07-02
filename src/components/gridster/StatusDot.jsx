function StatusDot({ className = "", label, ...props }) {
  const classes = ["status-dot", className].filter(Boolean).join(" ");

  return <span className={classes} aria-label={label} {...props}></span>;
}

export default StatusDot;
