import linkedinIconSrc from '../../assets/linkedin.svg';
import gmailIconSrc from '../../assets/icons8-gmail.svg';

type AppFooterPanelProps = {
  linkedinUrl?: string;
};

export const AppFooterPanel = ({ linkedinUrl }: AppFooterPanelProps) => {
  const currentYear = new Date().getFullYear();
  const email = 'ralphjcruz18@gmail.com';

  return (
    <footer className="app-footer-panel" aria-label="Project footer">
      <div className="app-footer-panel-inner">
        <div className="app-footer-grid">
          <section className="app-footer-col app-footer-col-next">
            <p className="app-footer-col-title">Info</p>
            <p className="app-footer-next-title">MySlime</p>
            <p className="app-footer-next-sub">Gamified focus and productivity support for your study workflow.</p>
          </section>

          <section className="app-footer-col">
            <p className="app-footer-col-title">Menu</p>
            <div className="app-footer-col-list">
              <p className="app-footer-col-item">Dashboard</p>
              <p className="app-footer-col-item">Focus Session</p>
              <p className="app-footer-col-item">Tasks</p>
              <p className="app-footer-col-item">Settings</p>
            </div>
          </section>

          <section className="app-footer-col">
            <p className="app-footer-col-title">Contact</p>
            <div className="app-footer-col-list">
              <a href={`mailto:${email}`} className="app-footer-col-link">
                <img src={gmailIconSrc} alt="" className="app-footer-contact-icon" />
                <span>Email: {email}</span>
              </a>
              <a href={linkedinUrl || '#'} target="_blank" rel="noreferrer" className="app-footer-col-link">
                <img src={linkedinIconSrc} alt="" className="app-footer-contact-icon app-footer-linkedin-icon" />
                <span>LinkedIn</span>
              </a>
            </div>
          </section>
        </div>

        <div className="app-footer-bottom">
          <div className="app-footer-identity">
            <span>Ralph Jude Cruz</span>
            <span>C22427602</span>
            <span>TU858</span>
          </div>
          <p className="app-footer-rights">{currentYear} All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
