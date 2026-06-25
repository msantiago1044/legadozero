# 🔐 LegadoZero — Bóveda de Legado Digital

> *"Tu privacidad hoy. Tu certeza para siempre."*

PWA Zero-Knowledge con Dead Man's Switch. Cifrado AES-GCM 256-bit nativo del navegador.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Vite + React 18 + Tailwind CSS + Lucide React |
| Cifrado | Web Crypto API (AES-GCM 256 + PBKDF2 600k iteraciones) |
| Base de datos | Supabase PostgreSQL + Storage |
| Backend/Cron | Vercel Serverless Functions |
| Emails | Resend |
| WhatsApp | Twilio (API de WhatsApp Business) |
| Pagos | Lemon Squeezy (PPP automático por región) |
| IA | GLM-4 (Zhipu AI) |

---

## Setup en 15 minutos

### 1. Clonar y dependencias

```bash
git clone https://github.com/tu-usuario/legadozero
cd legadozero
npm install
cp .env.example .env.local
```

### 2. Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ejecutar `src/lib/schema.sql` en el SQL Editor
3. Crear bucket `vault-files` (privado)
4. Copiar `SUPABASE_URL` y `SUPABASE_ANON_KEY` a `.env.local`

### 3. Lemon Squeezy (pagos)

1. Crear cuenta en [lemonsqueezy.com](https://lemonsqueezy.com)
2. Crear una tienda y un producto "LegadoZero — Bóveda Vitalicia"
3. Precio: $10 USD (Lemon Squeezy aplica PPP automáticamente)
4. En el producto, activar **Checkout** y copiar el URL
5. Configurar webhook → `https://tu-dominio.com/api/webhook-payment`
6. Eventos: `order_created`

### 4. Resend (emails)

1. Crear cuenta en [resend.com](https://resend.com)
2. Verificar dominio (`legadozero.com` o el tuyo)
3. Copiar API key

### 5. Twilio WhatsApp

1. Crear cuenta en [twilio.com](https://twilio.com)
2. Activar WhatsApp Business API o usar sandbox para desarrollo
3. Sandbox: `+14155238886` (envía "join <tu-palabra>" al número)
4. Producción: solicitar aprobación de plantilla de mensaje

### 6. GLM-4 (Zhipu AI)

1. Registrarse en [open.bigmodel.cn](https://open.bigmodel.cn)
2. Generar API key
3. El modelo `glm-4` tiene capacidades similares a GPT-4

### 7. Deploy en Vercel

```bash
npm i -g vercel
vercel login
vercel --prod
```

Configurar variables de entorno en el dashboard de Vercel:
- Todas las variables de `.env.example` (sin `VITE_` para las del servidor)

El cron `0 9 * * *` se activa automáticamente con `vercel.json`.

---

## Arquitectura Zero-Knowledge

```
Usuario
  │
  ├─ Escribe testamento + sube archivos
  │
  ▼
[Navegador — Web Crypto API]
  │  ┌─────────────────────────────────────────┐
  │  │ 1. Genera salt aleatorio (32 bytes)     │
  │  │ 2. Deriva clave: PBKDF2(password, salt) │
  │  │ 3. Cifra payload: AES-GCM-256(data,key) │
  │  │ 4. Solo el ciphertext sale al servidor  │
  │  └─────────────────────────────────────────┘
  │
  ▼
[Supabase Storage]
  │  Solo guarda: ciphertext + salt + heir_packages
  │  NUNCA ve: contraseña, plaintext, archivos reales
  │
  ▼ (Día 60 sin pulso)
[Vercel Cron → GLM-4 → Resend + Twilio]
  │  Genera resumen con GLM-4
  │  Envía token a herederos por email + WhatsApp
  │
  ▼
[Heredero — Navegador]
  │  1. Ingresa su email + token recibido
  │  2. Reconstruye heir key localmente
  │  3. Descifra vault key con heir key
  │  4. Descifra payload con vault key
  │  5. Descarga archivos originales
```

---

## Cronograma del Dead Man's Switch

| Día | Evento | Canal |
|-----|--------|-------|
| 7 | Aviso suave #1 | Email |
| 14 | Aviso suave #2 | Email |
| 21 | Aviso suave #3 | Email |
| 28 | Aviso suave #4 | Email |
| 30 | **Alerta crítica #1** | Email |
| 35 | Aviso suave #5 | Email |
| 42 | Aviso suave #6 | Email |
| 49 | Aviso suave #7 | Email |
| 56 | Aviso suave #8 | Email |
| 58 | **Alerta crítica #2** | Email |
| **60** | **🔴 TRIGGER — Liberar bóveda** | Email + WhatsApp a herederos |

---

## Seguridad

- **AES-GCM 256-bit** con IV único por operación
- **PBKDF2 600,000 iteraciones** (OWASP 2024)
- **RLS de Supabase**: propietario no puede borrar bóveda triggereada
- **Llave nunca sale del navegador** del propietario
- **Heredero descifra localmente** con su token
- Headers de seguridad: CSP, X-Frame-Options, nosniff

---

## Demo mode

Configura `VITE_DEMO_MODE=true` para probar todos los estados sin Supabase.
Usa los botones de estado en el header para cambiar entre: active / warning / critical / released / unpaid.
