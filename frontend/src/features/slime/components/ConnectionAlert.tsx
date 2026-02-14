type ConnectionAlertProps = {
  error: string | null;
  onCreateAccount: () => void;
};

export const ConnectionAlert = ({ error, onCreateAccount }: ConnectionAlertProps) => {
  if (!error) {
    return null;
  }

  return (
    <div className="alert alert-error">
      <div className="alert-content">
        <span className="alert-icon">{`\u{26A0}\u{FE0F}`}</span>
        <div>
          <div className="alert-title">Connection Issue</div>
          <div className="alert-message">{error}</div>
        </div>
      </div>
      {error.includes('not found') && (
        <button className="btn-small" onClick={onCreateAccount}>
          Create Account
        </button>
      )}
    </div>
  );
};
