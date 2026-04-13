import type { SlimeAchievementProgress } from '../types';

type AchievementsPanelProps = {
  achievementProgress: SlimeAchievementProgress[];
};

export const AchievementsPanel = ({ achievementProgress }: AchievementsPanelProps) => {
  const unlockedCount = achievementProgress.filter((achievement) => achievement.isUnlocked).length;

  return (
    <section className="rounded-xl border-2 border-gb-border bg-gb-panel p-4 shadow-gbInner" aria-label="Achievements">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-display text-lg leading-relaxed text-gb-text sm:text-xl">Achievements</h3>
        <span className="rounded-full border-2 border-gb-border bg-gb-bg px-3 py-1 font-sans text-base font-semibold text-gb-text sm:text-lg">
          {unlockedCount} / 8 unlocked
        </span>
      </div>

      {achievementProgress.length === 0 ? (
        <p className="mt-4 rounded-lg border-2 border-gb-border bg-gb-bg/70 p-4 font-sans text-base text-gb-text sm:text-lg">
          No achievements unlocked yet. Complete tasks to unlock your first badge.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {achievementProgress.map((achievement) => (
            <li
              key={achievement.key}
              className={`rounded-lg border-2 p-4 ${
                achievement.isUnlocked
                  ? 'border-gb-border bg-gb-bg/80'
                  : 'border-gb-border/60 bg-gb-panel/70 opacity-80'
              }`}
            >
              <div>
                <p className="font-display text-lg leading-relaxed text-gb-text sm:text-xl">{achievement.name}</p>
                <p className="mt-1 font-sans text-base text-gb-text sm:text-lg">{achievement.description}</p>
                <p className="mt-2 font-sans text-base font-semibold uppercase tracking-wide text-gb-text sm:text-lg">
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
