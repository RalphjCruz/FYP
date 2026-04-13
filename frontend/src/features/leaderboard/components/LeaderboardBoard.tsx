import { useGlobalLeaderboard } from '../hooks';

type LeaderboardBoardProps = {
  token: string | null;
  currentUserId?: number | null;
};

export const LeaderboardBoard = ({ token, currentUserId = null }: LeaderboardBoardProps) => {
  const { entries, loading, error } = useGlobalLeaderboard(token);
  const modeButtonClass = 'rounded-lg border-2 border-gb-border bg-gb-bg px-3 py-2 font-sans text-base font-semibold text-gb-text sm:text-lg';

  return (
    <section className="rounded-xl border-2 border-gb-border bg-gb-panel p-4 shadow-gbInner" aria-label="Leaderboard">
      <header>
        <div>
          <h3 className="font-display text-lg leading-relaxed text-gb-text sm:text-xl">Leaderboard</h3>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={`${modeButtonClass} bg-gb-bgDark`}>
          Global
        </button>
        <button type="button" className={`${modeButtonClass} opacity-60`} disabled>
          Local (Soon)
        </button>
        <button type="button" className={`${modeButtonClass} opacity-60`} disabled>
          Group (Soon)
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border-2 border-[#7a2d2d] bg-[#b54a4a]/20 p-4" role="alert">
          <p className="font-sans text-base text-[#4d1212] sm:text-lg">{error}</p>
        </div>
      )}

      {loading && !entries.length && (
        <div className="mt-4 rounded-lg border-2 border-gb-border bg-gb-bg/70 p-4">
          <p className="font-sans text-base text-gb-text sm:text-lg">Loading leaderboard...</p>
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="mt-4 rounded-lg border-2 border-gb-border bg-gb-bg/70 p-4">
          <p className="font-sans text-base text-gb-text sm:text-lg">No leaderboard data yet.</p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border-2 border-gb-border bg-gb-bg/70">
          <table className="min-w-[680px] w-full border-collapse" aria-label="Global leaderboard table">
            <thead className="bg-gb-bgDark">
              <tr>
                <th className="border-b-2 border-gb-border px-3 py-3 text-center font-display text-base text-gb-text sm:text-lg">#</th>
                <th className="border-b-2 border-gb-border px-3 py-3 text-center font-display text-base text-gb-text sm:text-lg">Player</th>
                <th className="border-b-2 border-gb-border px-3 py-3 text-center font-display text-base text-gb-text sm:text-lg">Level</th>
                <th className="border-b-2 border-gb-border px-3 py-3 text-center font-display text-base text-gb-text sm:text-lg">Day Streak</th>
                <th className="border-b-2 border-gb-border px-3 py-3 text-center font-display text-base text-gb-text sm:text-lg">Total XP</th>
                <th className="border-b-2 border-gb-border px-3 py-3 text-center font-display text-base text-gb-text sm:text-lg">Tasks</th>
                <th className="border-b-2 border-gb-border px-3 py-3 text-center font-display text-base text-gb-text sm:text-lg">Achievements</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.userId}
                  className={entry.userId === currentUserId ? 'bg-gb-bgDark/40' : 'bg-transparent'}
                >
                  <td className="border-b border-gb-border/50 px-3 py-3 text-center font-sans text-base text-gb-text sm:text-lg">{entry.rank}</td>
                  <td className="border-b border-gb-border/50 px-3 py-3 text-center font-sans text-base text-gb-text sm:text-lg">{entry.username}</td>
                  <td className="border-b border-gb-border/50 px-3 py-3 text-center font-sans text-base text-gb-text sm:text-lg">{entry.level}</td>
                  <td className="border-b border-gb-border/50 px-3 py-3 text-center font-sans text-base text-gb-text sm:text-lg">{entry.dayStreak}</td>
                  <td className="border-b border-gb-border/50 px-3 py-3 text-center font-sans text-base text-gb-text sm:text-lg">{entry.totalExperience}</td>
                  <td className="border-b border-gb-border/50 px-3 py-3 text-center font-sans text-base text-gb-text sm:text-lg">{entry.completedTasks}</td>
                  <td className="border-b border-gb-border/50 px-3 py-3 text-center font-sans text-base text-gb-text sm:text-lg">{entry.unlockedAchievements}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
