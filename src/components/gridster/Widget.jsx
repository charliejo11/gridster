function Widget({ title, actionLabel = "View All", actionHref, children, className = "" }) {
  const classes = ["widget glass-card", className].filter(Boolean).join(" ");

  return (
    <section className={classes}>
      <div className="widget-title">
        <h3>{title}</h3>
        {actionHref ? <a href={actionHref}>{actionLabel}</a> : <a>{actionLabel}</a>}
      </div>
      {children}
    </section>
  );
}

export default Widget;
