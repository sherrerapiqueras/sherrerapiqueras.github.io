/**
 * Every user-facing string on the site, in both locales.
 *
 * Copy is final and comes verbatim from the design handoff — do not paraphrase.
 * Strings that are deliberately identical in both locales (paths, product
 * names, the stack block labels, the project meta labels) live in `shared`.
 */

export const languages = {
  en: 'English',
  es: 'Español',
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = 'en';

/** Locale codes for `<html lang>` and `hreflang`. */
export const htmlLang: Record<Lang, string> = {
  en: 'en',
  es: 'es-ES',
};

/** Not translated: paths, proper nouns, and labels the handoff keeps in English. */
export const shared = {
  name: 'Sergio Herrera Piqueras',
  displayName: ['SERGIO', 'HERRERA'],
  role: 'SOFTWARE ENGINEER',
  remote: 'REMOTE-FIRST',
  location: 'Madrid, ES',
  prompt: 'sherrerapiqueras@portfolio',
  email: 'sherrerapiqueras@gmail.com',
  linkedin: 'https://www.linkedin.com/in/sherrerapiqueras',
  github: 'https://github.com/sherrerapiqueras',
  repo: 'https://github.com/sherrerapiqueras/sherrerapiqueras.github.io',
  /*
   * The anchors are element ids and never change; the visible label is copy and
   * lives in `ui` per locale. Keeping the two apart means translating the nav
   * cannot break a link.
   */
  nav: [
    { num: '01', href: '#index', labelKey: 'nav.index' },
    { num: '02', href: '#projects', labelKey: 'nav.projects' },
    { num: '03', href: '#stack', labelKey: 'nav.stack' },
    { num: '04', href: '#contact', labelKey: 'nav.contact' },
  ],
  marquee: [
    'JAVA',
    'KOTLIN',
    'SPRING BOOT',
    'MICROSERVICES',
    'CLOUD NATIVE',
    'GCP CLOUD RUN',
    'AWS ECS/EKS',
    'KUBERNETES',
    'TERRAFORM',
    'OPENAPI',
    'REACTJS',
    'JETPACK COMPOSE',
  ],
  stack: [
    {
      label: 'BACK-END',
      lines: ['Java 17 / 21 / 25 · Kotlin · Spring Boot', 'Microservices · Cloud native · OpenAPI'],
    },
    {
      label: 'CLOUD & DEVOPS',
      lines: [
        'GCP Cloud Run · AWS ECS / EKS / ECR',
        'Docker · Kubernetes · Kafka · Terraform · Actions',
      ],
    },
    {
      label: 'FRONT-END & MOBILE',
      lines: ['ReactJS · MaterialUI · PrimeReact', 'Android · Jetpack Compose · KMP'],
    },
    {
      label: 'DATA',
      lines: ['PostgreSQL · MongoDB · Oracle SQL', 'Room · SQLCipher'],
    },
  ],
  employers: [
    { name: 'Grupo TECDATA Engineering', years: '2026 →', current: true },
    { name: 'Otto Group one.O', years: '2024–26', current: false },
    { name: 'NTT DATA', years: '2022–23', current: false },
    { name: 'Inetum & Itestra GmbH', years: '2020–22', current: false },
  ],
  /** Kept in English in both locales, per the handoff's section-label list. */
  metaLabels: {
    license: 'LICENSE',
    releases: 'RELEASES',
    lastShip: 'LAST SHIP',
    minSdk: 'MIN SDK',
    releaseLog: 'RELEASE LOG',
  },
  screenshotCaptions: { dark: 'DARK', light: 'LIGHT' },
} as const;

export const ui = {
  en: {
    'meta.title': 'Sergio Herrera Piqueras — Software Engineer',
    'meta.description':
      'Backend-heavy full-stack engineer in Madrid. Java and Kotlin microservices on GCP and AWS, React on the front, native Android on the side. Available for freelance and consulting work.',
    'meta.ogAlt': 'Sergio Herrera Piqueras — Software Engineer, remote-first, Madrid',

    'a11y.skipToContent': 'Skip to content',
    'a11y.themeToggle': 'Switch to light theme',
    'a11y.themeToggleToDark': 'Switch to dark theme',
    'a11y.langToggle': 'Ver esta página en español',
    'a11y.mainNav': 'Sections',
    'a11y.releaseLog': 'Release log for Tempo',

    'theme.dark': '☾ DARK',
    'theme.light': '☀ LIGHT',

    'nav.index': '/index',
    'nav.projects': '/projects',
    'nav.stack': '/stack',
    'nav.contact': '/contact',

    'boot.1': 'boot · runtime java · kotlin · node',
    'boot.2': 'mount cloud://gcp + aws',
    'boot.3': 'load 6 years of shipping software',
    'boot.4': 'accepting freelance & consulting work',

    'hero.pitch':
      'Backend-heavy full-stack engineer. Java and Kotlin microservices on GCP and AWS, React on the front, and native Android on the side. I lead teams, set standards, and ship things that stay shipped.',
    'hero.ctaPrimary': '$ hire --start',
    'hero.ctaSecondary': './cv_sergio_herrera.pdf ↓',
    'hero.ctaSecondaryLabel': 'Download CV (PDF, English)',
    'hero.cvFile': 'cv_sergio_herrera_en.pdf',

    'stats.1': 'YEARS SHIPPING SOFTWARE',
    'stats.2': 'BACKEND TEAMS LED',
    'stats.3': 'CLIENT SECTORS · LOGISTICS, MARITIME, ENERGY, PUBLIC',

    'projects.heading': 'PROJECTS',
    'projects.tracked': 'tracked',
    'projects.note':
      'version, status and release history are pulled live from the source repository — nothing here is typed by hand.',
    'projects.pending': 'next project — registered here the moment its first tag lands',
    'projects.status.active': 'ACTIVE',
    'projects.soon': 'SOON',
    'projects.playStore': 'play store',
    'projects.playStoreTitle': 'Not on Google Play yet',

    'tempo.description':
      "A native Android app for tasks, habits and actually starting the day — habit chains, a Focus tab that runs a timer against today's work, and an encrypted local database.",
    'tempo.shotDark': 'Tempo Focus screen, dark theme',
    'tempo.shotLight': 'Tempo Routines screen, light theme',

    'stack.heading': 'STACK',
    'stack.shipped': "WHERE I'VE SHIPPED",
    'stack.credentials': 'CREDENTIALS',
    'stack.msc': 'MSc — UCLM',
    'stack.languages': 'ES native · EN C1',
    'stack.current': 'current role',

    'contact.heading': 'CONTACT',
    'contact.command': 'contact --open',

    'footer.repo': 'see this repo ↗',
  },

  es: {
    'meta.title': 'Sergio Herrera Piqueras — Ingeniero de Software',
    'meta.description':
      'Ingeniero full-stack con base en backend, en Madrid. Microservicios Java y Kotlin sobre GCP y AWS, React en el front y Android nativo. Disponible para proyectos freelance y consultoría.',
    'meta.ogAlt': 'Sergio Herrera Piqueras — Ingeniero de Software, remote-first, Madrid',

    'a11y.skipToContent': 'Saltar al contenido',
    'a11y.themeToggle': 'Cambiar al tema claro',
    'a11y.themeToggleToDark': 'Cambiar al tema oscuro',
    'a11y.langToggle': 'View this page in English',
    'a11y.mainNav': 'Secciones',
    'a11y.releaseLog': 'Historial de releases de Tempo',

    'theme.dark': '☾ DARK',
    'theme.light': '☀ LIGHT',

    'nav.index': '/índice',
    'nav.projects': '/proyectos',
    'nav.stack': '/stack',
    'nav.contact': '/contacto',

    'boot.1': 'inicio · runtime java · kotlin · node',
    'boot.2': 'montar cloud://gcp + aws',
    'boot.3': 'cargar 6 años entregando software',
    'boot.4': 'disponible para proyectos freelance y consultoría',

    'hero.pitch':
      'Ingeniero full-stack con base en backend. Microservicios Java y Kotlin sobre GCP y AWS, React en el front y Android nativo por mi cuenta. Lidero equipos, defino estándares y entrego software que se mantiene.',
    'hero.ctaPrimary': '$ contratar --inicio',
    'hero.ctaSecondary': './cv_sergio_herrera.pdf ↓',
    'hero.ctaSecondaryLabel': 'Descargar CV (PDF, español)',
    'hero.cvFile': 'cv_sergio_herrera_es.pdf',

    'stats.1': 'AÑOS ENTREGANDO SOFTWARE',
    'stats.2': 'EQUIPOS BACKEND LIDERADOS',
    'stats.3': 'SECTORES CLIENTE · LOGÍSTICA, NAVAL, ENERGÍA, PÚBLICO',

    'projects.heading': 'PROYECTOS',
    'projects.tracked': 'rastreados',
    'projects.note':
      'versión, estado e historial de releases se leen en vivo del repositorio — nada de esto se escribe a mano.',
    'projects.pending': 'siguiente proyecto — aparecerá aquí en cuanto exista su primer tag',
    'projects.status.active': 'ACTIVO',
    'projects.soon': 'PRÓXIMAMENTE',
    'projects.playStore': 'play store',
    'projects.playStoreTitle': 'Todavía no está en Google Play',

    'tempo.description':
      'App Android nativa para tareas, hábitos y arrancar el día — cadenas de hábitos, una pestaña Focus con temporizador sobre el trabajo de hoy y base de datos local cifrada.',
    'tempo.shotDark': 'Pantalla Focus de Tempo, tema oscuro',
    'tempo.shotLight': 'Pantalla Rutinas de Tempo, tema claro',

    'stack.heading': 'STACK',
    'stack.shipped': 'DÓNDE HE ENTREGADO',
    'stack.credentials': 'CREDENCIALES',
    'stack.msc': 'Máster — UCLM',
    'stack.languages': 'ES nativo · EN C1',
    'stack.current': 'puesto actual',

    'contact.heading': 'CONTACTO',
    'contact.command': 'contacto --abrir',

    'footer.repo': 'ver el código ↗',
  },
} as const;

export type UiKey = keyof (typeof ui)['en'];
