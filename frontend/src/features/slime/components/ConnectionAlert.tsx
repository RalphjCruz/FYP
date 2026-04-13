type ConnectionAlertProps = {
  error: string | null;
  onCreateAccount?: () => void;
};

export const ConnectionAlert = ({ error, onCreateAccount }: ConnectionAlertProps) => {
  if (!error) {
    return null;
  }

  return (
    <div
      className="rounded-xl border-2 border-[#7a2d2d] bg-[#b54a4a]/20 p-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-lg leading-relaxed text-[#4d1212] sm:text-xl">Connection Issue</h3>
          <p className="mt-1 font-sans text-base text-[#4d1212] sm:text-lg">{error}</p>
        </div>
        {error.includes('not found') && onCreateAccount && (
          <button
            type="button"
            className="rounded-lg border-2 border-[#7a2d2d] bg-[#b2473e] px-4 py-3 font-sans text-base font-semibold text-white transition hover:bg-[#9e3a33] active:translate-y-px sm:text-lg"
            onClick={onCreateAccount}
          >
            Create Account
          </button>
        )}
      </div>
    </div>
  );
};
