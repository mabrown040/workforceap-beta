'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type WAPLocale = 'en' | 'es';

const STORAGE_KEY = 'wap-locale';

const WAP_LOCALES: WAPLocale[] = ['en', 'es'];

interface LocaleContextValue {
  locale: WAPLocale;
  setLocale: (l: WAPLocale) => void;
  t: (key: string, fallback?: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be inside LocaleProvider');
  return ctx;
}

const TRANSLATIONS: Record<WAPLocale, Record<string, string>> = {
  en: {
    'nav.dashboard': 'Home',
    'nav.programs': 'Programs',
    'nav.apply': 'Apply',
    'nav.certifications': 'Certifications',
    'nav.profile': 'Profile',
    'nav.jobBoard': 'Job Board',
    'nav.aiToolkit': 'AI Toolkit',
    'nav.training': 'My Classes',
    'nav.learningHub': 'Learning Hub',
    'nav.resources': 'Resources',
    'nav.help': 'Help & Support',
    'nav.signOut': 'Sign out',
    'nav.myAccount': 'My Account',
    'nav.myCounselor': 'My Counselor',
    'nav.weeklyRecap': 'Weekly Recap',
    'nav.myProgress': 'My Progress',
    'cta.applyNow': 'Apply Now',
    'cta.learnMore': 'Learn More',
    'cta.contactUs': 'Contact Us',
    'cta.getStarted': 'Get Started',
    'cta.logIn': 'Log In',
    'footer.nonprofit': 'WorkforceAP is a 501(c)(3) nonprofit.',
    'footer.noCost': 'No-cost career training for low-income adults in Central Texas.',
    'footer.fundedBy': 'Funded by grants and partnerships.',
    'form.fullName': 'Full name',
    'form.email': 'Email',
    'form.phone': 'Phone',
    'form.address': 'Address',
    'form.city': 'City',
    'form.state': 'State',
    'form.zip': 'ZIP code',
    'form.submit': 'Submit',
    'form.next': 'Next',
    'form.back': 'Back',
    'form.save': 'Save',
    'form.required': 'Required',
    'page.programsTitle': 'Training Programs',
    'page.applyTitle': 'Apply for Training',
    'page.jobBoardTitle': 'Job Board',
    'page.dashboardTitle': 'Member Dashboard',
    'page.profileTitle': 'My Profile',
    'status.comingSoon': 'Coming soon',
    'status.new': 'New',
    'label.language': 'Language',
  },
  es: {
    'nav.dashboard': 'Inicio',
    'nav.programs': 'Programas',
    'nav.apply': 'Solicitar',
    'nav.certifications': 'Certificaciones',
    'nav.profile': 'Perfil',
    'nav.jobBoard': 'Bolsa de Trabajo',
    'nav.aiToolkit': 'Kit de Herramientas de IA',
    'nav.training': 'Mis Clases',
    'nav.learningHub': 'Centro de Aprendizaje',
    'nav.resources': 'Recursos',
    'nav.help': 'Ayuda y Soporte',
    'nav.signOut': 'Cerrar sesión',
    'nav.myAccount': 'Mi Cuenta',
    'nav.myCounselor': 'Mi Consejero',
    'nav.weeklyRecap': 'Resumen Semanal',
    'nav.myProgress': 'Mi Progreso',
    'cta.applyNow': 'Solicitar Ahora',
    'cta.learnMore': 'Más Información',
    'cta.contactUs': 'Contáctanos',
    'cta.getStarted': 'Comenzar',
    'cta.logIn': 'Iniciar Sesión',
    'footer.nonprofit': 'WorkforceAP es una organización sin fines de lucro 501(c)(3).',
    'footer.noCost': 'Capacitación profesional sin costo para adultos de bajos ingresos en el Centro de Texas.',
    'footer.fundedBy': 'Financiado por subvenciones y alianzas.',
    'form.fullName': 'Nombre completo',
    'form.email': 'Correo electrónico',
    'form.phone': 'Teléfono',
    'form.address': 'Dirección',
    'form.city': 'Ciudad',
    'form.state': 'Estado',
    'form.zip': 'Código postal',
    'form.submit': 'Enviar',
    'form.next': 'Siguiente',
    'form.back': 'Atrás',
    'form.save': 'Guardar',
    'form.required': 'Requerido',
    'page.programsTitle': 'Programas de Capacitación',
    'page.applyTitle': 'Solicitar Capacitación',
    'page.jobBoardTitle': 'Bolsa de Trabajo',
    'page.dashboardTitle': 'Panel de Miembro',
    'page.profileTitle': 'Mi Perfil',
    'status.comingSoon': 'Próximamente',
    'status.new': 'Nuevo',
    'label.language': 'Idioma',
  },
};

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<WAPLocale>('en');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEY) as WAPLocale | null) : null;
    if (saved && WAP_LOCALES.includes(saved)) setLocaleState(saved);
  }, []);

  const setLocale = (l: WAPLocale) => {
    setLocaleState(l);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, l);
    // Also set html lang attribute
    document.documentElement.lang = l;
  };

  const t = (key: string, fallback?: string) => TRANSLATIONS[locale][key] ?? fallback ?? key;

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}
