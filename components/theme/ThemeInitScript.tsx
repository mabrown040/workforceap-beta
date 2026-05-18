export default function ThemeInitScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var KEY='wap-theme';var theme=localStorage.getItem(KEY);if(theme==='dark'){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');}else if(theme==='light'){document.documentElement.classList.remove('dark');document.documentElement.setAttribute('data-theme','light');}else{document.documentElement.classList.remove('dark');document.documentElement.removeAttribute('data-theme');}}catch(e){}})();`,
      }}
    />
  );
}
