export const ActivityFeed = () => {
  return (
    <div className="activity-section">
      <div className="section-header">
        <h3>Recent Activity</h3>
        <button className="btn-text">View all {'\u{2192}'}</button>
      </div>

      <div className="activity-feed">
        <div className="activity-empty">
          <div className="empty-icon">{'\u{1F4CA}'}</div>
          <div className="empty-text">No activity yet</div>
          <div className="empty-subtext">Complete a focus session to get started!</div>
        </div>
      </div>
    </div>
  );
};
