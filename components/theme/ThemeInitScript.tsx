export default function ThemeInitScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var m=localStorage.getItem('wa_color_mode')||localStorage.getItem('wap-theme')||localStorage.getItem('theme');if(m==='dark'){document.documentElement.classList.add('dark');}else if(m==='light'){document.documentElement.classList.remove('dark');}}catch(e){}})();`,
      }}
    />
  );
}
