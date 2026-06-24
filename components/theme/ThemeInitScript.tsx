export default function ThemeInitScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        // Dark mode is a PORTAL-only feature. The public marketing site is
        // light-locked: on marketing routes we force light regardless of the
        // stored/system preference (the localStorage pref is preserved for the
        // portal). PORTAL_PREFIXES must stay in sync with
        // lib/nav/marketing-chrome.ts (HIDE_MARKETING_CHROME_PREFIXES).
        __html: `(function(){try{var KEY='wap-theme';var PORTAL=['/dashboard','/admin','/employer','/partner','/counselor','/resources','/help','/applications','/certifications','/profile','/account'];var root=document.documentElement;var path=location.pathname.replace(/^\\/[a-z]{2}(?=\\/|$)/,'')||'/';var isPortal=PORTAL.some(function(p){return path===p||path.indexOf(p+'/')===0;});if(!isPortal){root.classList.remove('dark');root.setAttribute('data-theme','light');return;}var theme=localStorage.getItem(KEY);var systemDark=window.matchMedia('(prefers-color-scheme: dark)').matches;if(theme==='dark'){root.classList.add('dark');root.setAttribute('data-theme','dark');}else if(theme==='light'){root.classList.remove('dark');root.setAttribute('data-theme','light');}else{if(systemDark){root.classList.add('dark');}else{root.classList.remove('dark');}root.removeAttribute('data-theme');}}catch(e){}})();`,
      }}
    />
  );
}
