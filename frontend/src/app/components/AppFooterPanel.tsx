import linkedinIconSrc from '../../assets/linkedin.svg';

type AppFooterPanelProps = {
  linkedinUrl?: string;
};

export const AppFooterPanel = ({ linkedinUrl }: AppFooterPanelProps) => {
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
            className="app-footer-link app-footer-link-icon"
            aria-label="LinkedIn profile"
          >
            <img src={linkedinIconSrc} alt="" className="app-footer-linkedin-icon" />
            <span className="app-footer-sr-only">LinkedIn</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
