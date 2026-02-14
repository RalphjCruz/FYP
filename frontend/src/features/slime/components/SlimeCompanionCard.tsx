import type { SlimeData } from '../types';

type SlimeCompanionCardProps = {
  slimeData: SlimeData | null;
  xpPercentage: number;
  nextLevelXP: number;
};

export const SlimeCompanionCard = ({
  slimeData,
  xpPercentage,
  nextLevelXP,
}: SlimeCompanionCardProps) => {
  return (
    <div className="slime-section">
      <div className="section-header">
        <h3>Your Companion</h3>
        <button className="btn-text">Customize {'\u{2192}'}</button>
      </div>

      <div className="slime-card-modern">
        <div className="slime-stage">
          <div className="stage-indicator">Stage {slimeData?.evolutionStage || 1}</div>
          <div className="slime-display-modern">
            <div className="slime-glow"></div>
            <div className={`slime slime-${slimeData?.color || 'green'}`}>
              <div className="slime-body"></div>
              <div className="slime-eyes">
                <div className="eye"></div>
                <div className="eye"></div>
              </div>
              <div className="slime-mouth"></div>
            </div>
            <div className="slime-shadow"></div>
          </div>
          <div className="slime-name">{slimeData?.name || 'Your Slime'}</div>
        </div>

        <div className="slime-stats">
          <div className="level-badge">
            <span className="level-number">{slimeData?.level || 1}</span>
            <span className="level-text">Level</span>
          </div>

          <div className="xp-section">
            <div className="xp-header">
              <span className="xp-label">Experience Points</span>
              <span className="xp-numbers">
                {slimeData?.experience || 0} / {nextLevelXP}
              </span>
            </div>
            <div className="xp-bar-modern">
              <div className="xp-fill-modern" style={{ width: `${xpPercentage}%` }}>
                <div className="xp-shine"></div>
              </div>
            </div>
            <div className="xp-footer">
              <span>{Math.round(xpPercentage)}% to next level</span>
            </div>
          </div>

          <button className="btn-cta">
            <span className="btn-icon">{'\u{1F3AF}'}</span>
            Start Focus Session
            <span className="btn-shine"></span>
          </button>
        </div>
      </div>
    </div>
  );
};
