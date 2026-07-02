function PageHeader({ eyebrow = "Gridster", title, subtitle, className = "" }) {
  const classes = ["page-heading glass-card", className].filter(Boolean).join(" ");

  return (
    <header className={classes}>
      {eyebrow ? <span>{eyebrow}</span> : null}
      <h2>{title}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
    </header>
  );
}

export default PageHeader;
