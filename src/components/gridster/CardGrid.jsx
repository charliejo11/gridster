function CardGrid({ as: Component = "div", className, children, ...props }) {
  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
}

export default CardGrid;
