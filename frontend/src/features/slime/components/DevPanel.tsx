type DevPanelProps = {
  loading: boolean;
  notice: string | null;
  error: string | null;
  onClearMessage: () => void;
  onResetXp: () => void;
  onAddXp: () => void;
  onResetAchievements: () => void;
  onResetTasks: () => void;
  onResetCoins: () => void;
  onAddCoins: () => void;
};

export const DevPanel = ({
  loading,
  notice,
  error,
  onClearMessage,
  onResetXp,
  onAddXp,
  onResetAchievements,
  onResetTasks,
  onResetCoins,
  onAddCoins,
}: DevPanelProps) => {
  return (
    <section className="activity-section dev-panel" aria-label="Developer panel">
      <div className="section-header">
        <h3>Developer Panel</h3>
      </div>
      <p className="dev-panel-note">Localhost-only tools. Remove this panel before production handoff.</p>

      {(notice || error) && (
        <div className={`customize-banner ${error ? 'error' : ''}`}>
          <div>{error ?? notice}</div>
          <button type="button" className="btn-text" onClick={onClearMessage}>
            Dismiss
          </button>
        </div>
      )}

      <div className="dev-panel-grid">
        <button type="button" className="btn-small" disabled={loading} onClick={onResetXp}>
          Reset XP
        </button>
        <button type="button" className="btn-small" disabled={loading} onClick={onAddXp}>
          +100 XP
        </button>
        <button type="button" className="btn-small" disabled={loading} onClick={onResetAchievements}>
          Reset Achievements
        </button>
        <button type="button" className="btn-small" disabled={loading} onClick={onResetTasks}>
          Reset Tasks
        </button>
        <button type="button" className="btn-small" disabled={loading} onClick={onResetCoins}>
          Reset Coins
        </button>
        <button type="button" className="btn-small" disabled={loading} onClick={onAddCoins}>
          +100 Coins
        </button>
      </div>
    </section>
  );
};
