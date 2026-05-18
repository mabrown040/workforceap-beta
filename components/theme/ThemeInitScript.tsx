export default function ThemeInitScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var KEY='wap-theme';var theme=localStorage.getItem(KEY);var systemDark=window.matchMedia('(prefers-color-scheme: dark)').matches;if(theme==='dark'){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');}else if(theme==='light'){document.documentElement.classList.remove('dark');document.documentElement.setAttribute('data-theme','light');}else{if(systemDark){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}document.documentElement.removeAttribute('data-theme');}}catch(e){}})();`,
      }}
    />
  );
}
