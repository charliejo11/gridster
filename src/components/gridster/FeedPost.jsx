function FeedPost({ header, actions, children, className = "" }) {
  const classes = ["post-card glass-card", className].filter(Boolean).join(" ");

  return (
    <article className={classes}>
      {header}
      {children}
      {actions}
    </article>
  );
}

export default FeedPost;
