import { getColorSkinAssetSrc, type CosmeticItem, type CosmeticSlot } from '../../customization';
import type { SlimeData } from '../types';

type SlimeCompanionCardProps = {
  slimeData: SlimeData | null;
  xpPercentage: number;
  nextLevelXP: number;
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
  onStartFocusSession,
  onOpenCustomize,
  coinBalance,
  customizationCatalog = [],
  equippedBySlot = {},
}: SlimeCompanionCardProps) => {
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
            <div className="stage-indicator">Stage {slimeData?.evolutionStage || 1}</div>
            <div className="slime-coin-hud" aria-label="Coins">
              <span className="slime-coin-stack" aria-hidden="true">
                <span className="slime-coin disk back"></span>
                <span className="slime-coin disk front"></span>
              </span>
              <span className="slime-coin-count">{coinBalance ?? 0}</span>
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

          <button type="button" className="btn-cta" onClick={onStartFocusSession}>
            <span className="btn-icon">{'\u{1F3AF}'}</span>
            {onStartFocusSession ? 'Open Focus Session' : 'Start Focus Session'}
            <span className="btn-shine"></span>
          </button>
        </div>
      </div>
    </div>
  );
};
