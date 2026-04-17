type AppFooterPanelProps = {
  linkedinUrl?: string;
  socialUrl?: string;
};

export const AppFooterPanel = ({ linkedinUrl, socialUrl }: AppFooterPanelProps) => {
  const brandLogoSrc = '/branding/MySlimeLogo.png';

  return (
    <footer className="app-footer-panel" aria-label="Project footer">
      <div className="app-footer-panel-inner">
        <div className="app-footer-brand">
          <img src={brandLogoSrc} alt="MySlime" className="app-footer-logo" />
          <p className="app-footer-text">Ralph Jude Cruz, C22427602, TU858, ralphjcruz18@gmail.com</p>
        </div>
        <div className="app-footer-links">
          <a
            href={linkedinUrl || '#'}
            target="_blank"
            rel="noreferrer"
            className="app-footer-link"
          >
            LinkedIn
          </a>
          <a
            href={socialUrl || '#'}
            target="_blank"
            rel="noreferrer"
            className="app-footer-link"
          >
            Social Media
          </a>
        </div>
      </div>
    </footer>
  );
};
