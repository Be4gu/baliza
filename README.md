# Rust Kickoff Tracker - Balizas 🎯

Una aplicación completa para hacer scraping en tiempo real de eventos de Rust Kickoff, especialmente diseñada para trackear el estado de las balizas y calcular cuándo estarán disponibles nuevamente.

## 🚀 Características

- **Scraping automático cada minuto** de https://rustkickoff.com/leaderboards
- **Dashboard en tiempo real** con estado de balizas y countdown timers
- **Filtros avanzados** por tipo de evento, equipo y fecha
- **API REST completa** para acceder a todos los datos
- **Base de datos PostgreSQL** para almacenamiento persistente
- **Interfaz responsive** que funciona en desktop y móvil

## 🏗️ Arquitectura

- **Backend**: Node.js + Express
- **Scraping**: Cheerio + Axios
- **Base de datos**: PostgreSQL (Neon) + Prisma ORM
- **Cron jobs**: node-cron para automatización
- **Frontend**: HTML5 + CSS3 + JavaScript Vanilla

## 📁 Estructura del proyecto

```
rust-kickoff-tracker/
├── src/
│   ├── scraper.js          # Lógica de scraping
│   ├── database.js         # Servicios de base de datos
│   └── cronService.js      # Trabajos programados
├── public/
│   ├── index.html          # Frontend principal
│   ├── styles.css          # Estilos
│   └── script.js           # Lógica del frontend
├── prisma/
│   └── schema.prisma       # Esquema de base de datos
├── server.js               # Servidor principal
├── package.json
└── README.md
```

## 🛠️ Instalación y configuración

### 1. Requisitos previos

- Node.js 18+
- Una base de datos PostgreSQL (recomendado: Neon.tech)

### 2. Clonar y configurar

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
```

### 3. Configurar base de datos

Edita `.env` con tu URL de PostgreSQL de Neon:

```env
DATABASE_URL="postgresql://username:password@host:5432/database"
PORT=3000
```

### 4. Configurar Prisma

```bash
# Generar cliente de Prisma
npx prisma generate

# Aplicar migraciones
npx prisma db push
```

### 5. Iniciar la aplicación

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 🌐 Endpoints de la API

### Eventos

- `GET /api/events` - Todos los eventos con filtros opcionales
- `GET /api/events/balizas` - Solo eventos de balizas

### Balizas

- `GET /api/balizas/status` - Estado actual de todas las balizas

### Estadísticas

- `GET /api/stats` - Estadísticas generales del servidor

### Control de scraping

- `GET /api/scraping/status` - Estado del sistema de scraping
- `POST /api/scraping/run` - Ejecutar scraping manualmente
- `POST /api/scraping/restart` - Reiniciar servicios

## 🎮 Funcionalidades de balizas

### Lógica de balizas

1. Cuando un equipo captura una baliza, queda **ocupada por 1 hora**
2. El sistema calcula automáticamente cuándo estará disponible
3. Se muestra un **countdown en tiempo real** hasta que esté disponible
4. Las balizas se marcan como disponibles automáticamente

### Dashboard de balizas

- **Estado visual** de cada baliza (disponible/ocupada)
- **Countdown timer** para balizas ocupadas
- **Información del equipo** que la controla
- **Colores por equipo** para identificación rápida

## 📊 Panel de control

### Funciones principales

- **Auto-refresh** cada 30 segundos del dashboard
- **Scraping manual** para obtener datos inmediatamente
- **Filtros en tiempo real** por evento, equipo y fecha
- **Paginación** para navegar por grandes volúmenes de datos

## 🚀 Opciones de deployment

### Opción 1: Aplicación completa en Railway/Render (RECOMENDADO)

**Railway (Gratis con limitaciones)**

1. Fork el repositorio en GitHub
2. Conecta tu cuenta de Railway a GitHub
3. Importa el proyecto y configura la variable `DATABASE_URL`
4. Railway detectará automáticamente que es una app Node.js
5. La app estará disponible 24/7 con scraping automático

**Render (Gratis con limitaciones)**

1. Conecta tu repositorio a Render
2. Configura como Web Service
3. Añade la variable de entorno `DATABASE_URL`
4. Deploy automático

### Opción 2: Local + Frontend estático

**Si prefieres mantener el backend local:**

1. **Backend local**: Ejecuta `npm start` en tu máquina
2. **Frontend en Vercel/Netlify**:
   - Modifica las URLs de la API en `script.js` para apuntar a tu IP local
   - Deploy solo la carpeta `public/` en Vercel o Netlify

### Opción 3: Docker (para deployment propio)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "start"]
```

## ⚡ Consideraciones de performance

### Limitaciones de planes gratuitos

- **Railway**: 500 horas/mes (suficiente para uso continuo)
- **Render**: Se "duerme" después de inactividad, puede tardar en despertar
- **Vercel**: No es ideal para cron jobs largos

### Recomendación

Para uso serio, usa **Railway** o mantén el backend **local** con frontend estático.

## 🔧 Configuración avanzada

### Ajustar frecuencia de scraping

En `src/cronService.js`, línea 26:

```javascript
// Cada minuto
this.scrapingJob = cron.schedule('*/1 * * * *', ...);

// Cada 30 segundos (para testing)
this.scrapingJob = cron.schedule('*/30 * * * * *', ...);

// Cada 5 minutos (para reducir carga)
this.scrapingJob = cron.schedule('*/5 * * * *', ...);
```

### Personalizar detección de balizas

En `src/database.js`, método `extractBalizaId()` puedes ajustar los patrones para detectar diferentes tipos de balizas según aparezcan en los eventos.

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🎯 Tu aplicación está LISTA para producción

### ✅ Configuración completada:

- 🗄️ **Base de datos PostgreSQL** configurada con Neon
- 🔄 **Verificación de eventos duplicados** implementada y probada
- ⏱️ **Sistema de timestamps** que compara último evento vs scrapeados
- 🌍 **Scripts de configuración** para cambio dev/prod automático
- 📦 **Build scripts** optimizados para deployment

### 🚀 Próximos pasos para desplegar:

1. **Ejecutar configuración de producción**:

   ```bash
   npm run setup:prod
   ```

2. **Subir a tu plataforma favorita** (Railway, Render, Vercel)

3. **Configurar variable de entorno**:

   ```
   DATABASE_URL=postgresql://neondb_owner:npg_2vzRpDT5MUIP@ep-flat-block-abfilz7u-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```

4. **¡Listo!** La aplicación comenzará a hacer scraping automáticamente y acumulará datos en la nube

### 🔥 Funcionalidades listas:

- ⚡ Scraping cada minuto con verificación de duplicados
- 🗄️ Los datos se acumularán progresivamente en PostgreSQL
- 🎯 Solo procesa eventos nuevos (no duplica datos)
- 🌐 Frontend simplificado enfocado solo en balizas
- ⏱️ Countdown timers de 60 minutos para balizas ocupadas

## ⚠️ Disclaimer

Este proyecto es para fines educativos y de entretenimiento. Asegúrate de cumplir con los términos de servicio de rustkickoff.com al hacer scraping de su contenido.

---

Desarrollado con ❤️ para la comunidad de Rust
