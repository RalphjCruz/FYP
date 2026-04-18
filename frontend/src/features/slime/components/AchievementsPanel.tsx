import type { SlimeAchievementProgress } from '../types';

type AchievementsPanelProps = {
  achievementProgress: SlimeAchievementProgress[];
};

export const AchievementsPanel = ({ achievementProgress }: AchievementsPanelProps) => {
  const unlockedCount = achievementProgress.filter((achievement) => achievement.isUnlocked).length;

  return (
    <section className="achievements-panel" aria-label="Achievements">
      <div className="section-header achievements-header">
        <h3>Achievements</h3>
      </div>
      <span className="achievements-count">
        {unlockedCount} / 8 unlocked
      </span>

      {achievementProgress.length === 0 ? (
        <p className="achievements-empty">No achievements unlocked yet. Complete tasks to unlock your first badge.</p>
      ) : (
        <ul className="achievement-list">
          {achievementProgress.map((achievement) => (
            <li key={achievement.key} className={`achievement-item ${achievement.isUnlocked ? 'unlocked' : 'locked'}`}>
              <div className="achievement-copy">
                <p className="achievement-name">{achievement.name}</p>
                <p className="achievement-description">{achievement.description}</p>
                <p className="achievement-state">
                  {achievement.isUnlocked ? 'Unlocked' : 'Locked'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
