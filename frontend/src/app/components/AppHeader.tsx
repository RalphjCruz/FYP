type AppHeaderProps = {
  title: string;
};

export const AppHeader = ({ title }: AppHeaderProps) => {
  return (
    <header className="page-header">
      <div className="header-content">
        <div>
          <h2 className="page-title">{title}</h2>
        </div>
      </div>
    </header>
  );
};
