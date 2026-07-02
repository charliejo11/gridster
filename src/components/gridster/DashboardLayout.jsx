function DashboardLayout({ leftSidebar, rightSidebar, children }) {
  return (
    <section className="dashboard">
      {leftSidebar}

      <section className="center-feed">
        {children}
      </section>

      {rightSidebar}
    </section>
  );
}

export default DashboardLayout;
