#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const SQLITE_URL = 'file:./dev.db'
const POSTGRES_URL = 'postgresql://neondb_owner:npg_2vzRpDT5MUIP@ep-flat-block-abfilz7u-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

function updateSchema(provider) {
  const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma')
  let schemaContent = fs.readFileSync(schemaPath, 'utf8')

  // Actualizar el proveedor en el schema
  schemaContent = schemaContent.replace(/provider = "(sqlite|postgresql)"/, `provider = "${provider}"`)

  fs.writeFileSync(schemaPath, schemaContent)
  console.log(`✅ Schema actualizado para ${provider}`)
}

function updateEnv(databaseUrl, mode) {
  const envPath = path.join(__dirname, '.env')
  const envContent = `# Configuración para ${mode.toUpperCase()}
DATABASE_URL="${databaseUrl}"
PORT=3000

# Configuración de scraping
SCRAPE_INTERVAL_MINUTES=1
BEACON_COOLDOWN_HOURS=1

# Modo actual: ${mode}
`

  fs.writeFileSync(envPath, envContent)
  console.log(`✅ Archivo .env actualizado para ${mode}`)
}

async function runCommand(command, description) {
  console.log(`🔄 ${description}...`)
  const { execSync } = require('child_process')
  try {
    execSync(command, { stdio: 'inherit' })
    console.log(`✅ ${description} completado`)
  } catch (error) {
    console.error(`❌ Error en ${description}:`, error.message)
  }
}

async function setupEnvironment(mode) {
  console.log(`🚀 Configurando entorno para ${mode.toUpperCase()}...\\n`)

  if (mode === 'dev') {
    console.log('📋 Configuración de DESARROLLO (SQLite):')
    updateSchema('sqlite')
    updateEnv(SQLITE_URL, 'desarrollo')
  } else if (mode === 'prod') {
    console.log('📋 Configuración de PRODUCCIÓN (PostgreSQL - Neon):')
    updateSchema('postgresql')
    updateEnv(POSTGRES_URL, 'producción')
  } else {
    console.error('❌ Modo no válido. Usa: node setup.js dev|prod')
    process.exit(1)
  }

  // Generar cliente de Prisma
  await runCommand('npx prisma generate', 'Generando cliente de Prisma')

  // Aplicar migraciones/schema
  if (mode === 'prod') {
    await runCommand('npx prisma db push', 'Aplicando schema a PostgreSQL')
  } else {
    await runCommand('npx prisma db push', 'Aplicando schema a SQLite')
  }

  console.log(`\\n🎉 Configuración completada para ${mode.toUpperCase()}`)
  console.log('📊 Puedes iniciar el servidor con: npm start o node server.js')
  console.log('🌐 La aplicación estará disponible en: http://localhost:3000')

  if (mode === 'prod') {
    console.log('\\n🔥 MODO PRODUCCIÓN ACTIVADO:')
    console.log('   🗄️  Base de datos: PostgreSQL (Neon)')
    console.log('   🌍 Datos persisten en la nube')
    console.log('   ⚡ Scraping automático cada minuto')
    console.log('   🔄 Verificación de eventos duplicados activa')
  } else {
    console.log('\\n🛠️  MODO DESARROLLO ACTIVADO:')
    console.log('   🗄️  Base de datos: SQLite (local)')
    console.log('   💻 Datos en archivo dev.db')
    console.log('   🧪 Perfecto para pruebas locales')
  }
}

// Obtener argumento de línea de comandos
const mode = process.argv[2]

if (!mode) {
  console.log('🔧 Script de configuración de entorno')
  console.log('\\nUso:')
  console.log('  node setup.js dev   # Configurar para desarrollo (SQLite)')
  console.log('  node setup.js prod  # Configurar para producción (PostgreSQL)')
  process.exit(1)
}

setupEnvironment(mode)
