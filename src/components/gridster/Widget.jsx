function Widget({ title, actionLabel = "View All", actionHref, onAction, children, className = "" }) {
  const classes = ["widget glass-card", className].filter(Boolean).join(" ");
  const showAction = Boolean(actionHref || onAction);

  return (
    <section className={classes}>
      <div className="widget-title">
        <h3>{title}</h3>
        {showAction ? (
          actionHref ? (
            <a href={actionHref}>{actionLabel}</a>
          ) : (
            <a
              onClick={(event) => {
                event.preventDefault();
                onAction(event);
              }}
            >
              {actionLabel}
            </a>
          )
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default Widget;
