export default function ThemeInitScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var m=localStorage.getItem('wa_color_mode');if(m==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`,
      }}
    />
  );
}
