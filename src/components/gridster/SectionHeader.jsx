function SectionHeader({ className = "", eyebrow, title }) {
  const classes = [className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      {eyebrow ? <span>{eyebrow}</span> : null}
      {title ? <h3>{title}</h3> : null}
    </div>
  );
}

export default SectionHeader;