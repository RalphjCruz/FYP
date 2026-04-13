type AppHeaderProps = {
  greeting: string;
  username?: string;
  onLogout: () => void;
  isGameboyTheme: boolean;
  onToggleTheme: () => void;
};

export const AppHeader = ({ greeting, username, onLogout, isGameboyTheme, onToggleTheme }: AppHeaderProps) => {
  return (
    <header className="mb-4 rounded-xl border-2 border-gb-border bg-gb-panel p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="font-sans text-base text-gb-text sm:text-lg">
            {greeting}, {username || 'Student'}!
          </div>
          <h2 className="mt-2 font-display text-xl leading-relaxed text-gb-text sm:text-2xl md:text-3xl">
            Your Productivity Dashboard
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            className="rounded-lg border-2 border-gb-border bg-gb-bg px-4 py-3 font-sans text-base font-semibold text-gb-text transition hover:bg-gb-bgDark active:translate-y-px sm:text-lg"
            onClick={onToggleTheme}
          >
            {isGameboyTheme ? 'Classic Theme' : 'Game Boy Theme'}
          </button>
          <button
            type="button"
            className="rounded-lg border-2 border-gb-border bg-gb-panel px-4 py-3 font-sans text-base font-semibold text-gb-text transition hover:bg-gb-bg/70 active:translate-y-px sm:text-lg"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};
