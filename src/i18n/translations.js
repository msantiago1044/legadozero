export const translations = {
  es: {
    appName: "LegadoZero",
    tagline: "Tu privacidad hoy. Tu certeza para siempre.",
    nav: {
      vault: "Mi Bóveda",
      heirs: "Herederos",
      settings: "Configuración",
    },
    pulse: {
      title: "Próxima confirmación en",
      days: "días",
      hours: "horas",
      minutes: "minutos",
      button: "Estoy Vivo — Renovar Pulso",
      lastPulse: "Último pulso registrado",
      confirming: "Registrando pulso…",
      confirmed: "✓ Pulso renovado. Bóveda asegurada.",
    },
    vault: {
      title: "Contenido de la Bóveda",
      storageUsed: "Almacenamiento usado",
      storageLimit: "Límite: 1 GB",
      dropzone: "Arrastra archivos aquí o haz clic para seleccionar",
      dropzoneHint: "Máximo 1 GB total · Cifrado AES-256 antes de subir",
      testament: "Testamento Escrito",
      testamentPlaceholder: "Escribe aquí tus últimas voluntades, mensajes a tus seres queridos, instrucciones importantes…",
      glmAssist: "Asistir con IA (GLM-4)",
      glmAssisting: "Generando sugerencias…",
      encrypt: "Cifrar y Guardar",
      encrypting: "Cifrando localmente…",
      saved: "✓ Guardado y cifrado",
      emptyTitle: "Tu espacio seguro está listo",
      emptyDesc: "Puedes custodiar hasta 1 GB de información cifrada. Nadie, ni nosotros, puede leer tu contenido.",
      downloadKey: "Descargar Protocolo de Herencia",
      downloadKeyDesc: "Genera el paquete cifrado para tus herederos. Entrégaselo en vida.",
    },
    heirs: {
      title: "Herederos Designados",
      subtitle: "Máximo 19 personas. Recibirán acceso solo si el interruptor se activa.",
      addHeir: "Añadir Heredero",
      name: "Nombre completo",
      email: "Correo electrónico",
      whatsapp: "WhatsApp (con código de país, ej. +573001234567)",
      remove: "Eliminar",
      save: "Guardar Herederos",
      saved: "✓ Herederos actualizados",
      limitReached: "Has alcanzado el máximo de 19 herederos",
    },
    payment: {
      title: "Activa tu Bóveda",
      desc: "Pago único · Sin suscripciones · Almacenamiento vitalicio",
      price: "Desde $10 USD",
      pppNote: "El precio se ajusta automáticamente a tu región",
      cta: "Activar por $10 USD",
      pending: "Procesando pago…",
      success: "✓ Bóveda activada. Tu legado está protegido.",
      readonlyBanner: "Bóveda en modo lectura. Activa para usar el interruptor de vida.",
    },
    status: {
      active: "Bóveda Activa",
      warning: "Confirma que sigues vivo",
      critical: "¡ACCIÓN REQUERIDA!",
      released: "Bóveda Liberada",
      activeDesc: "Todo en orden. El interruptor está activo.",
      warningDesc: "Han pasado más de 7 días sin confirmación. Renueva tu pulso.",
      criticalDesc: "Tu bóveda se libera en {{days}} días si no confirmas identidad.",
      releasedDesc: "El protocolo de herencia fue activado. Los herederos fueron notificados.",
    },
    heir: {
      title: "Desencriptar Legado",
      subtitle: "Has recibido acceso a una bóveda de LegadoZero",
      tokenLabel: "Token de Herencia",
      tokenPlaceholder: "Pega el token que recibiste por correo o WhatsApp",
      decrypt: "Desencriptar Legado",
      decrypting: "Descifrando localmente en tu dispositivo…",
      success: "Legado descifrado. Descargando archivos…",
      error: "Token inválido o expirado. Verifica el mensaje que recibiste.",
      testament: "Mensaje del Propietario",
      files: "Archivos del Legado",
      download: "Descargar",
      privacy: "Todo el descifrado ocurre en tu dispositivo. LegadoZero no ve el contenido.",
    },
    errors: {
      storageExceeded: "Espacio insuficiente. Límite de 1 GB alcanzado.",
      encryptionFailed: "Error al cifrar. Intenta de nuevo.",
      networkError: "Sin conexión. Los datos se guardan localmente hasta reconectar.",
      invalidEmail: "Correo inválido.",
      invalidWhatsapp: "Número de WhatsApp inválido. Incluye el código de país (+).",
    },
  },
  en: {
    appName: "LegadoZero",
    tagline: "Your privacy today. Your certainty forever.",
    nav: {
      vault: "My Vault",
      heirs: "Heirs",
      settings: "Settings",
    },
    pulse: {
      title: "Next confirmation in",
      days: "days",
      hours: "hours",
      minutes: "minutes",
      button: "I'm Alive — Renew Pulse",
      lastPulse: "Last pulse recorded",
      confirming: "Recording pulse…",
      confirmed: "✓ Pulse renewed. Vault secured.",
    },
    vault: {
      title: "Vault Contents",
      storageUsed: "Storage used",
      storageLimit: "Limit: 1 GB",
      dropzone: "Drag files here or click to select",
      dropzoneHint: "Maximum 1 GB total · AES-256 encrypted before upload",
      testament: "Written Testament",
      testamentPlaceholder: "Write your last wishes, messages to loved ones, important instructions…",
      glmAssist: "AI Assist (GLM-4)",
      glmAssisting: "Generating suggestions…",
      encrypt: "Encrypt & Save",
      encrypting: "Encrypting locally…",
      saved: "✓ Saved and encrypted",
      emptyTitle: "Your secure space is ready",
      emptyDesc: "Store up to 1 GB of encrypted information. No one, not even us, can read your content.",
      downloadKey: "Download Inheritance Protocol",
      downloadKeyDesc: "Generate the encrypted package for your heirs. Give it to them while you're alive.",
    },
    heirs: {
      title: "Designated Heirs",
      subtitle: "Maximum 19 people. They receive access only if the switch activates.",
      addHeir: "Add Heir",
      name: "Full name",
      email: "Email address",
      whatsapp: "WhatsApp (with country code, e.g. +13015551234)",
      remove: "Remove",
      save: "Save Heirs",
      saved: "✓ Heirs updated",
      limitReached: "You've reached the maximum of 19 heirs",
    },
    payment: {
      title: "Activate Your Vault",
      desc: "One-time payment · No subscriptions · Lifetime storage",
      price: "From $10 USD",
      pppNote: "Price automatically adjusts to your region",
      cta: "Activate for $10 USD",
      pending: "Processing payment…",
      success: "✓ Vault activated. Your legacy is protected.",
      readonlyBanner: "Vault in read-only mode. Activate to use the life switch.",
    },
    status: {
      active: "Vault Active",
      warning: "Confirm you're still alive",
      critical: "ACTION REQUIRED!",
      released: "Vault Released",
      activeDesc: "Everything in order. The switch is active.",
      warningDesc: "More than 7 days without confirmation. Renew your pulse.",
      criticalDesc: "Your vault releases in {{days}} days if you don't confirm identity.",
      releasedDesc: "The inheritance protocol was activated. Heirs were notified.",
    },
    heir: {
      title: "Decrypt Legacy",
      subtitle: "You have received access to a LegadoZero vault",
      tokenLabel: "Inheritance Token",
      tokenPlaceholder: "Paste the token you received by email or WhatsApp",
      decrypt: "Decrypt Legacy",
      decrypting: "Decrypting locally on your device…",
      success: "Legacy decrypted. Downloading files…",
      error: "Invalid or expired token. Check the message you received.",
      testament: "Owner's Message",
      files: "Legacy Files",
      download: "Download",
      privacy: "All decryption happens on your device. LegadoZero cannot see the content.",
    },
    errors: {
      storageExceeded: "Insufficient space. 1 GB limit reached.",
      encryptionFailed: "Encryption error. Please try again.",
      networkError: "No connection. Data saved locally until reconnected.",
      invalidEmail: "Invalid email.",
      invalidWhatsapp: "Invalid WhatsApp number. Include country code (+).",
    },
  },
};

export function detectLanguage() {
  const lang = navigator.language || navigator.languages?.[0] || "es";
  const code = lang.toLowerCase().split("-")[0];
  return translations[code] ? code : "en";
}

export function useTranslation() {
  const lang = detectLanguage();
  const t = translations[lang];
  function tr(key, vars = {}) {
    const keys = key.split(".");
    let val = t;
    for (const k of keys) val = val?.[k];
    if (!val) return key;
    return Object.entries(vars).reduce(
      (s, [k, v]) => s.replace(`{{${k}}}`, v),
      val
    );
  }
  return { t, tr, lang };
}
