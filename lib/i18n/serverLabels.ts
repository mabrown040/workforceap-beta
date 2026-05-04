import { cookies } from 'next/headers';
import type { WAPLocale } from '@/components/portal/LocaleContext';

const COOKIE_KEY = 'wap-locale';

const SERVER_LABELS_ES: Record<string, string> = {
  'Choose Your Path': 'Elige tu camino',
  'Find the right program': 'Encuentra el programa adecuado',
  'for your goals.': 'para tus metas.',
  'Quick start': 'Inicio rápido',
  'Start with the lane that fits you best.': 'Empieza con la ruta que mejor se adapte a ti.',
  'Not sure? Take the 2-minute pathfinder': '¿No estás seguro? Haz la guía de 2 minutos',
  'Find Your Path — Take the Quiz': 'Encuentra tu camino — haz la evaluación',
  'Compare Programs': 'Comparar programas',
  'View Salary Guide': 'Ver guía salarial',
  'How to choose a program': 'Cómo elegir un programa',
  'From enrollment to employment': 'De la inscripción al empleo',
  'Ready to take the next step?': '¿Listo para dar el siguiente paso?',
  'Start Application': 'Comenzar solicitud',
  'Talk to an Advisor': 'Hablar con un asesor',
  'Get in Touch': 'Ponte en contacto',
  'Send Us a Message': 'Envíanos un mensaje',
  'Austin-based team': 'Equipo con base en Austin',
  'Workforce Advancement Project Team': 'Equipo de Workforce Advancement Project',
  'Knowledge Base': 'Centro de ayuda',
  'Quick answers': 'Respuestas rápidas',
  'Career Resources': 'Recursos profesionales',
  'Blog': 'Blog',
  'Career Toolkit': 'Kit de herramientas profesionales',
  'Included for members': 'Incluido para miembros',
  'Beta Access': 'Acceso beta',
  'View my past results': 'Ver mis resultados anteriores',
  'Prep bundle': 'Paquete de preparación',
  'Guided Job Search Steps': 'Pasos guiados para buscar empleo',
  'Open Application Tracker': 'Abrir seguimiento de solicitudes',
  'AI Career Counselor': 'Consejero profesional con IA',
  'Past sessions': 'Sesiones anteriores',
  'Resume': 'Currículum',
  'Employer Portal': 'Portal de empleador',
  'Messages': 'Mensajes',
  'Referred Members': 'Miembros referidos',
  'Export CSV': 'Exportar CSV',
  // Footer labels
  'Programs': 'Programas',
  'All Programs': 'Todos los programas',
  'Find Your Path': 'Encuentra tu camino',
  'Salary Guide': 'Guía salarial',
  'Apply Now': 'Solicitar Ahora',
  'About': 'Acerca de',
  'What We Do': 'Qué hacemos',
  'How It Works': 'Cómo funciona',
  'Leadership Team': 'Equipo de liderazgo',
  'Partners': 'Socios',
  'Support': 'Soporte',
  'Contact Us': 'Contáctanos',
  'FAQ': 'Preguntas frecuentes',
  'Privacy Policy': 'Política de privacidad',
  'Terms of Service': 'Términos de servicio',
  'Accessibility Statement': 'Declaración de accesibilidad',
  // Homepage labels
  'Browse Programs': 'Explorar programas',
  'Ready to apply? Start your application →': '¿Listo para aplicar? Comienza tu solicitud →',
  'Empowering People. Advancing Futures.': 'Empoderando personas. Avanzando hacia el futuro.',
  'Career Training & Industry Certificates': 'Capacitación profesional y certificaciones industriales',
  'Occupational and career training with grant- and partner-funded access for qualifying members — Digital Literacy, Tech, Data, AI, Healthcare, Manufacturing, and Skilled Trades. Apply today.': 'Capacitación profesional con acceso financiado por subvenciones y socios para miembros que califiquen — Alfabetización digital, Tecnología, Datos, IA, Salud, Manufactura y Oficios calificados. Solicita hoy.',
  'Career training with no upfront program cost for qualifying members who want a stronger path to work. Start with Find Your Path, see programs that fit, and get counselor guidance, resume help, and job-search support.': 'Capacitación profesional sin costo inicial para miembros que califiquen y desean un mejor camino al trabajo. Comienza con Encuentra tu camino, ve programas que se ajusten a ti y obtén orientación de consejeros, ayuda con currículum y apoyo en búsqueda de empleo.',
  // Trust signals
  'Reviewed by a real team': 'Revisado por un equipo real',
  'Applications are reviewed by WorkforceAP staff, with next-step follow-up in 1 to 2 business days.': 'Las solicitudes son revisadas por el personal de WorkforceAP, con seguimiento en 1 a 2 días hábiles.',
  'Built on 25+ years of workforce experience': 'Construido sobre 25+ años de experiencia laboral',
  'WorkforceAP is a 501(c)(3) nonprofit built in Austin on 25+ years of workforce development experience across public, nonprofit, and employer-serving organizations.': 'WorkforceAP es una organización sin fines de lucro 501(c)(3) construida en Austin con 25+ años de experiencia en desarrollo de la fuerza laboral.',
  'Employer-recognized pathways': 'Rutas reconocidas por empleadores',
  'Training includes certificate tracks and tools tied to employers, hiring pathways, and real job support.': 'La capacitación incluye certificaciones y herramientas vinculadas a empleadores, rutas de contratación y apoyo real para empleo.',
  'Partnerships': 'Alianzas',
  'A Network Built for Success': 'Una red construida para el éxito',
  'Members': 'Miembros',
  'No-cost for qualifying members': 'Sin costo para miembros que califiquen',
  'high-demand career tracks': 'rutas profesionales en alta demanda',
  'Resume, interview, and job search support': 'Apoyo con currículum, entrevistas y búsqueda de empleo',
  'Job-search guidance and employer-facing support': 'Orientación para búsqueda de empleo y apoyo frente a empleadores',
  'Interview / Pre-qualification': 'Entrevista / Pre-calificación',
  'Partner With Us': 'Asóciate con nosotros',
  'Employer Overview': 'Resumen para empleadores',
  'About Us': 'Acerca de nosotros',
  'Employer-Aligned Training. Career Support Throughout the Journey.': 'Capacitación alineada con empleadores. Apoyo profesional durante todo el camino.',
  'Trained historically': 'Capacitados históricamente',
  'Member Cost': 'Costo para miembros',
  // Apply page labels
  'Submit your application and tell us what kind of work or training you want.': 'Envía tu solicitud y cuéntanos qué tipo de trabajo o capacitación deseas.',
  'A WorkforceAP advisor reviews your information and follows up within 1–2 business days in most cases.': 'Un asesor de WorkforceAP revisa tu información y te contacta en 1–2 días hábiles en la mayoría de los casos.',
  'We talk through fit, eligibility, and the best next step for your situation.': 'Hablamos sobre ajuste, elegibilidad y el mejor siguiente paso para tu situación.',
  'If needed, we guide you to screening, documentation, interview, or program-readiness steps.': 'Si es necesario, te guiamos en los pasos de evaluación, documentación, entrevista o preparación del programa.',
  'You get a clearer recommendation for training, support, and job-readiness next steps.': 'Recibes una recomendación más clara para capacitación, apoyo y siguientes pasos de preparación para el empleo.',
  'Personal Info': 'Información personal',
  'Background': 'Antecedentes',
  'Program Selection': 'Selección de programa',
  'Member Application': 'Solicitud de miembro',
  'Start Your Application': 'Comienza tu solicitud',
  'Programs are offered at no cost to qualifying members, funded by grants and partnerships.': 'Los programas se ofrecen sin costo para miembros que califiquen, financiados por subvenciones y alianzas.',
  "No prior experience required. We'll help you confirm fit and eligibility for next steps.": 'No se requiere experiencia previa. Te ayudaremos a confirmar ajuste y elegibilidad para los siguientes pasos.',
  'Need help getting started?': '¿Necesitas ayuda para comenzar?',
  'You can still reach us directly. Call a counselor or send a message, and we’ll help you start the application manually and explain the funding path, eligibility, and next step before you commit.': 'Aún puedes contactarnos directamente. Llama a un consejero o envía un mensaje, y te ayudaremos a iniciar la solicitud manualmente y explicar el camino de financiamiento, elegibilidad y siguiente paso antes de comprometerte.',
  'Contact a counselor': 'Contactar un consejero',
  'Application Progress': 'Progreso de la solicitud',
  'What happens next?': '¿Qué sigue?',
  'Start your application': 'Comienza tu solicitud',
  "If the form doesn't load, call": 'Si el formulario no carga, llama',
  'or email': 'o envía un correo a',
  // Leadership page labels
  'Board & Leadership': 'Junta Directiva y Liderazgo',
  'Meet the leadership team behind WorkforceAP — decades of workforce experience, employer-side tech credibility, military discipline, and nationwide community impact.': 'Conoce al equipo de liderazgo detrás de WorkforceAP — décadas de experiencia en desarrollo de la fuerza laboral, credibilidad tecnológica del lado del empleador, disciplina militar e impacto comunitario a nivel nacional.',
  'Our Leadership': 'Nuestro Liderazgo',
  'Stewards of the': 'Administradores del',
  'Future Workforce.': 'Futuro de la Fuerza Laboral.',
  // What-we-do metadata
  'Workforce Development Training & Industry Certificates': 'Capacitación en Desarrollo de la Fuerza Laboral y Certificaciones Industriales',
  'WorkforceAP is built on 25+ years of workforce development leadership. Employer-aligned training, career support, and grant- and partner-funded access for qualifying members.': 'WorkforceAP está construido sobre 25+ años de liderazgo en desarrollo de la fuerza laboral. Capacitación alineada con empleadores, apoyo profesional y acceso financiado por subvenciones y socios para miembros que califiquen.',
  // How-it-works metadata + phase labels
  'How It Works': 'Cómo funciona',
  'Your path from application through certification and job placement. Ten clear steps — each designed to set you up for success.': 'Tu camino desde la solicitud hasta la certificación y colocación laboral. Diez pasos claros — cada uno diseñado para prepararte para el éxito.',
  'Get Started': 'Comenzar',
  'Build Your Future': 'Construye tu Futuro',
  'Launch Your Career': 'Lanza tu Carrera',
  'Phase 1 — Get Started': 'Fase 1 — Comenzar',
  'Phase 2 — Build Your Future': 'Fase 2 — Construye tu Futuro',
  'Phase 3 — Launch Your Career': 'Fase 3 — Lanza tu Carrera',
};

export async function getServerLocaleAsync(): Promise<WAPLocale> {
  try {
    const cookieStore = await cookies();
    const locale = cookieStore.get(COOKIE_KEY)?.value;
    if (locale === 'es' || locale === 'en') return locale;
  } catch {
    // cookies() throws in static generation or edge contexts — fall back to en
  }
  return 'en';
}

export function getServerLabel(label: string, locale: WAPLocale): string {
  if (locale === 'en') return label;
  return SERVER_LABELS_ES[label] ?? label;
}

export function makeServerT(locale: WAPLocale) {
  return (label: string) => getServerLabel(label, locale);
}

export async function makeServerTAsync(): Promise<(label: string) => string> {
  const locale = await getServerLocaleAsync();
  return makeServerT(locale);
}
