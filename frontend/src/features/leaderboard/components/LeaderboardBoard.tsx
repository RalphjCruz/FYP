import { useState } from 'react';
import { useGlobalLeaderboard } from '../hooks';

type LeaderboardBoardProps = {
  token: string | null;
  currentUserId?: number | null;
};

type LeaderboardMode = 'global' | 'local' | 'group';

export const LeaderboardBoard = ({ token, currentUserId = null }: LeaderboardBoardProps) => {
  const [mode] = useState<LeaderboardMode>('global');
  const { entries, loading, error } = useGlobalLeaderboard(token);

  return (
    <section className="leaderboard-board" aria-label="Leaderboard">
      <header className="tasks-board-header">
        <div>
          <h3>Leaderboard</h3>
        </div>
      </header>

      <div className="leaderboard-mode-row">
        <button type="button" className={`leaderboard-mode-btn ${mode === 'global' ? 'active' : ''}`}>
          Global
        </button>
        <button type="button" className="leaderboard-mode-btn disabled" disabled>
          Local (Soon)
        </button>
        <button type="button" className="leaderboard-mode-btn disabled" disabled>
          Group (Soon)
        </button>
      </div>

      {error && (
        <div className="tasks-empty-state">
          <p>{error}</p>
        </div>
      )}

      {loading && !entries.length && (
        <div className="tasks-empty-state">
          <p>Loading leaderboard...</p>
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="tasks-empty-state">
          <p>No leaderboard data yet.</p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="leaderboard-table-wrap">
          <table className="leaderboard-table" aria-label="Global leaderboard table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Level</th>
                <th>Day Streak</th>
                <th>Total XP</th>
                <th>Tasks</th>
                <th>Achievements</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.userId} className={entry.userId === currentUserId ? 'is-me' : ''}>
                  <td>{entry.rank}</td>
                  <td>{entry.username}</td>
                  <td>{entry.level}</td>
                  <td>{entry.dayStreak}</td>
                  <td>{entry.totalExperience}</td>
                  <td>{entry.completedTasks}</td>
                  <td>{entry.unlockedAchievements}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
