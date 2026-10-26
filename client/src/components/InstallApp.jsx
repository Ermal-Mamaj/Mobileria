import { useInstallApp } from '../lib/pwa.js';
import Icon from './Icon.jsx';

// Footer column that lets visitors put the site on their phone's home screen.
// It only appears where it can actually do something: a browser that offers
// the install prompt, or iPhone/iPad Safari (where it shows the manual steps).
// Once the site is open as an installed app, it disappears.
export default function InstallApp() {
  const { canPrompt, showIosHint, installed, promptInstall } = useInstallApp();
  if (installed || (!canPrompt && !showIosHint)) return null;

  return (
    <div className="footer__col">
      <h2 className="footer__heading">Aplikacioni</h2>
      {canPrompt ? (
        <button type="button" className="footer__link footer__link--icon footer__button" onClick={promptInstall}>
          <Icon name="download" /> Instalo aplikacionin
        </button>
      ) : (
        <p className="footer__text">
          Për ta shtuar në ekranin kryesor: shtypni <strong>Ndaj</strong> (Share) në Safari, pastaj{' '}
          <strong>Shto në Ekranin Kryesor</strong>.
        </p>
      )}
    </div>
  );
}
