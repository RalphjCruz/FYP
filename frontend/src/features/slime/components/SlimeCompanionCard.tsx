import { getColorSkinAssetSrc, type CosmeticItem, type CosmeticSlot } from '../../customization';
import type { SlimeData } from '../types';

type SlimeCompanionCardProps = {
  slimeData: SlimeData | null;
  xpPercentage: number;
  nextLevelXP: number;
  studyHealthPercentage: number;
  studyHealthCurrentHp?: number | null;
  studyHealthMaxHp?: number | null;
  targetDailyMinutes?: number | null;
  onStartFocusSession?: () => void;
  onOpenCustomize?: () => void;
  coinBalance?: number | null;
  customizationCatalog?: CosmeticItem[];
  equippedBySlot?: Partial<Record<CosmeticSlot, string>>;
};

export const SlimeCompanionCard = ({
  slimeData,
  xpPercentage,
  nextLevelXP,
  studyHealthPercentage,
  studyHealthCurrentHp,
  studyHealthMaxHp,
  targetDailyMinutes,
  onStartFocusSession,
  onOpenCustomize,
  coinBalance,
  customizationCatalog = [],
  equippedBySlot = {},
}: SlimeCompanionCardProps) => {
  const safeStudyHealthPercentage = Math.max(0, Math.min(100, studyHealthPercentage));
  const slimeName = slimeData?.name || 'Your Slime';
  const slimeLevel = slimeData?.level || 1;
  const fallbackHpMax = 100 + Math.max(0, slimeLevel - 1) * 12;
  const hasBackendHp =
    typeof studyHealthCurrentHp === 'number'
    && Number.isFinite(studyHealthCurrentHp)
    && typeof studyHealthMaxHp === 'number'
    && Number.isFinite(studyHealthMaxHp)
    && studyHealthMaxHp > 0;
  const resolvedHpMax = hasBackendHp ? Math.max(1, Math.round(studyHealthMaxHp)) : fallbackHpMax;
  const fallbackHpCurrent = Math.round((safeStudyHealthPercentage / 100) * resolvedHpMax);
  const resolvedHpCurrent = hasBackendHp ? Math.round(studyHealthCurrentHp) : fallbackHpCurrent;
  const clampedHpCurrent = Math.max(0, Math.min(resolvedHpMax, resolvedHpCurrent));
  const hpPercentage = resolvedHpMax > 0
    ? Math.max(0, Math.min(100, (clampedHpCurrent / resolvedHpMax) * 100))
    : safeStudyHealthPercentage;
  const safeTargetDailyMinutes = Math.max(0, Math.round(targetDailyMinutes ?? 0));
  const goalHours = Math.floor(safeTargetDailyMinutes / 60);
  const goalMinutes = safeTargetDailyMinutes % 60;
  const goalText = `Goal: ${goalHours}h ${String(goalMinutes).padStart(2, '0')}m`;
  const studyHealthToneClass =
    hpPercentage < 20
      ? 'critical'
      : hpPercentage < 45
        ? 'low'
        : hpPercentage < 70
          ? 'steady'
          : hpPercentage < 90
            ? 'strong'
            : 'peak';

  const equippedAura = customizationCatalog.find((item) => item.id === equippedBySlot.aura);
  const equippedColor = customizationCatalog.find((item) => item.id === equippedBySlot.color);
  const equippedColorImageSrc = getColorSkinAssetSrc(equippedColor?.id);

  return (
    <div className="slime-section">
      <div className="section-header">
        <h3>Your Companion</h3>
        <button type="button" className="btn-text" onClick={onOpenCustomize}>
          Customize {'\u{2192}'}
        </button>
      </div>

      <div className="slime-card-modern">
        <div className="slime-stage">
          <div className="slime-stage-topbar">
            <div className="slime-coin-hud" aria-label="Coins">
              <span className="slime-coin-stack" aria-hidden="true">
                <span className="slime-coin disk back"></span>
                <span className="slime-coin disk front"></span>
              </span>
              <span className="slime-coin-count">{coinBalance ?? 0}</span>
            </div>
          </div>

          <div
            className={`slime-health-hud ${studyHealthToneClass}`}
            role="img"
            aria-label={`${slimeName} level ${slimeLevel}, HP ${clampedHpCurrent} out of ${resolvedHpMax}`}
          >
            <div className="slime-health-header">
              <span className="slime-health-name">{slimeName}</span>
            </div>
            <div className="slime-health-subheader">
              <span className="slime-health-goal">{goalText}</span>
              <span className="slime-health-level">Level {slimeLevel}</span>
            </div>
            <div className="slime-health-meter-row">
              <div className="slime-health-track">
                <div className={`slime-health-fill ${studyHealthToneClass}`} style={{ width: `${hpPercentage}%` }}></div>
              </div>
            </div>
            <div className="slime-health-meta">
              <span className="slime-health-value">
                {clampedHpCurrent}/{resolvedHpMax}
              </span>
            </div>
          </div>

          <div className="slime-display-modern">
            <div className="slime-glow"></div>
            {equippedAura && (
              <div
                className="slime-aura-ring"
                style={{ background: equippedAura.previewGradient }}
                aria-label={`Equipped aura: ${equippedAura.name}`}
              ></div>
            )}
            <div className={`slime slime-${slimeData?.color || 'green'}`}>
              <div
                className={`slime-body ${equippedColorImageSrc ? 'image-mode' : ''}`}
                style={
                  equippedColorImageSrc
                    ? {
                        backgroundImage: `url(${equippedColorImageSrc})`,
                      }
                    : equippedColor
                      ? { background: equippedColor.previewGradient }
                      : undefined
                }
              ></div>
              <div className={`slime-eyes ${equippedColorImageSrc ? 'overlay' : ''}`}>
                <div className="eye"></div>
                <div className="eye"></div>
              </div>
              <div className={`slime-mouth ${equippedColorImageSrc ? 'overlay' : ''}`}></div>
            </div>
            <div className="slime-shadow"></div>
          </div>
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

          <button type="button" className="btn-cta" onClick={onStartFocusSession}>
            {onStartFocusSession ? 'Open Focus Session' : 'Start Focus Session'}
            <span className="btn-shine"></span>
          </button>
        </div>
      </div>
    </div>
  );
};
