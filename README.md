# Fichas de Personaje

Sitio para crear fichas de personaje con forma de carta: plantilla editable, capacidades con barras,
habilidades, historia, relaciones entre personajes, mundos y avatar (subido o armado por piezas).
Las cartas se exportan a PNG y las fichas se comparten con un enlace.

Stack: React 19 + Vite + TypeScript, Supabase (cuentas, base de datos e imágenes) y Vercel (hosting).

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5180
```

Sin configurar nada, la app funciona en **modo invitado**: todo se guarda en el navegador.
Con Supabase configurado aparecen el login, Explorar y los enlaces para compartir.

## Conectar Supabase (una sola vez)

1. Crea un proyecto gratis en https://supabase.com (región: la más cercana, ej. São Paulo).
2. **SQL Editor → New query**: pega todo `supabase/schema.sql` y dale **Run**.
   Crea las tablas, las reglas de acceso y el bucket `avatars`. Se puede volver a ejecutar.
   Si la base ya existía, basta con ejecutar las migraciones nuevas de `supabase/migrations/`.
3. **Project Settings → API**: copia la *Project URL* y la *anon / publishable key* a un archivo
   `.env.local` (usa `.env.example` de guía). Esa clave es pública por diseño: la seguridad la dan las reglas del paso 2.
4. **Authentication → URL Configuration**:
   - *Site URL*: la dirección final del sitio (la de Vercel).
   - *Redirect URLs*: añade `http://localhost:5180/**` y `https://TU-SITIO.vercel.app/**`.
5. **Authentication → Sign In / Providers**:
   - **GitHub** (el más rápido): en GitHub → Settings → Developer settings → OAuth Apps → *New OAuth App*.
     *Authorization callback URL* = `https://TU-PROYECTO.supabase.co/auth/v1/callback`.
     Copia el Client ID y un Client Secret nuevo a Supabase.
   - **Google**: en https://console.cloud.google.com → APIs y servicios → Credenciales →
     *ID de cliente de OAuth* (tipo Aplicación web), con el mismo callback de arriba como URI de redireccionamiento.
     Copia el ID y el secreto a Supabase.

## Publicar en Vercel

1. Sube el repo a GitHub e impórtalo en https://vercel.com (detecta Vite solo).
2. En *Environment Variables* pon `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_AUTH_PROVIDERS` (ej. `github`).
3. Deploy. `vercel.json` ya trae las reglas de rutas y el cron.

### Que Supabase no se pause

El plan gratis pausa el proyecto tras ~1 semana sin uso. `api/keepalive.js` hace una consulta mínima
y Vercel la ejecuta **una vez al día** (cron en `vercel.json`, incluido en el plan gratis).
Para comprobarlo: abre `https://TU-SITIO.vercel.app/api/keepalive`; debe responder `"ok": true`.

## Estructura

- `src/lib/types.ts`: modelo (plantillas, secciones, personajes).
- `src/lib/templates.ts`: plantillas incluidas y el personaje de ejemplo.
- `src/lib/store.ts`: almacenamiento (navegador o Supabase, con la misma interfaz).
- `src/components/CharacterCard.tsx`: la carta. `SheetView.tsx`: la ficha completa.
- `src/pages/EditorPage.tsx`: el editor.
- `supabase/schema.sql`: base de datos y reglas de acceso.

Créditos: avatares por piezas con “Pixel Art” de DiceBear (diseño CC0, código MIT).
Fuentes Determination (fan-made) y sonidos tomados del portafolio.
