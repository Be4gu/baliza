# Instrucciones de Setup

## 🚀 Guía rápida de instalación

### 1. Configurar base de datos en Neon

1. Ve a [neon.tech](https://neon.tech) y crea una cuenta gratuita
2. Crea una nueva base de datos
3. Copia la connection string que te proporcionen

### 2. Configurar el proyecto

```bash
# Clonar dependencias
npm install

# Crear archivo .env
cp .env.example .env
```

Edita `.env` y añade tu connection string de Neon:

```env
DATABASE_URL="postgresql://username:password@ep-cool-name.us-east-1.postgres.neon.tech/main?sslmode=require"
PORT=3000
```

### 3. Configurar base de datos

```bash
npx prisma generate
npx prisma db push
```

### 4. Ejecutar

```bash
npm run dev
```

Abre http://localhost:3000 y deberías ver el dashboard funcionando.

## 📋 Scripts disponibles

- `npm start` - Ejecutar en producción
- `npm run dev` - Ejecutar en desarrollo con nodemon
- `npm run setup` - Configurar Prisma tras cambios en schema

## 🌍 Opciones de deployment

### Opción 1: Railway (Recomendado para 24/7)

1. Sube tu código a GitHub
2. Ve a [railway.app](https://railway.app)
3. "New Project" → "Deploy from GitHub"
4. Selecciona tu repositorio
5. En Variables → Add `DATABASE_URL` con tu string de Neon
6. Deploy automático ✅

**Pros**: Gratis hasta 500h/mes, ideal para scraping continuo
**Contras**: Límite de horas en plan gratuito

### Opción 2: Render

1. Conecta tu GitHub a [render.com](https://render.com)
2. "New Web Service"
3. Runtime: Node
4. Build Command: `npm install && npx prisma generate`
5. Start Command: `npm start`
6. Environment Variables: `DATABASE_URL`

**Pros**: Setup sencillo
**Contras**: Se "duerme" con inactividad, puede perder datos de scraping

### Opción 3: Local + Frontend deployado

Si quieres mantener el scraping local pero tener el frontend accesible:

1. **Backend local**: `npm start`
2. **Modifica script.js** para usar tu IP local:

```javascript
const API_BASE = 'http://TU_IP_LOCAL:3000/api'
```

3. **Deploy solo /public/** en Vercel/Netlify

## ⚙️ Configuración avanzada

### Cambiar frecuencia de scraping

En `src/cronService.js` línea 26:

```javascript
// Cada minuto (default)
'*/1 * * * *'

// Cada 30 segundos (testing)
'*/30 * * * * *'

// Cada 5 minutos (menos agresivo)
'*/5 * * * *'
```

### Personalizar detección de eventos

En `src/scraper.js` método `classifyEvent()` puedes añadir nuevos patrones para detectar diferentes tipos de eventos de Rust.
