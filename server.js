require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')

const DatabaseService = require('./src/database')
const CronService = require('./src/cronService')

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static('public'))

// Servicios
const database = new DatabaseService()
const cronService = new CronService()

// === API ENDPOINTS ===

// Obtener todos los eventos con filtros
app.get('/api/events', async (req, res) => {
  try {
    const { eventType, teamName, limit = 100, offset = 0, startDate, endDate } = req.query

    const events = await database.getEvents({
      eventType,
      teamName,
      limit: parseInt(limit),
      offset: parseInt(offset),
      startDate,
      endDate
    })

    res.json({
      success: true,
      data: events,
      total: events.length
    })
  } catch (error) {
    console.error('Error obteniendo eventos:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
})

// Obtener solo eventos de balizas
app.get('/api/events/balizas', async (req, res) => {
  try {
    const { teamName, limit = 50, offset = 0, startDate, endDate } = req.query

    const events = await database.getEvents({
      eventType: 'BALIZA',
      teamName,
      limit: parseInt(limit),
      offset: parseInt(offset),
      startDate,
      endDate
    })

    res.json({
      success: true,
      data: events,
      total: events.length
    })
  } catch (error) {
    console.error('Error obteniendo eventos de balizas:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
})

// Obtener estado actual de todas las balizas
app.get('/api/balizas/status', async (req, res) => {
  try {
    const balizasStatus = await database.getBalizasStatus()

    res.json({
      success: true,
      data: balizasStatus,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Error obteniendo estado de balizas:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
})

// Obtener estadísticas generales
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await database.getStats()

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
})

// Obtener eventos recientes (temporal para debug)
app.get('/api/events/recent', async (req, res) => {
  try {
    const events = await database.prisma.event.findMany({
      where: {
        eventType: 'BALIZA'
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 10
    })

    res.json({
      success: true,
      data: events
    })
  } catch (error) {
    console.error('Error obteniendo eventos recientes:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
})

// Estado del servicio de scraping
app.get('/api/scraping/status', (req, res) => {
  try {
    const status = cronService.getStatus()

    res.json({
      success: true,
      data: {
        ...status,
        author: 'Entrellaves',
        version: '1.0.0'
      }
    })
  } catch (error) {
    console.error('Error obteniendo estado del scraping:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
})

// Ejecutar scraping manualmente (para testing)
app.post('/api/scraping/run', async (req, res) => {
  try {
    await cronService.runNow()

    res.json({
      success: true,
      message: 'Scraping ejecutado exitosamente'
    })
  } catch (error) {
    console.error('Error ejecutando scraping manual:', error)
    res.status(500).json({
      success: false,
      error: 'Error ejecutando scraping'
    })
  }
})

// Migrar eventos de balizas existentes
app.post('/api/balizas/migrate', async (req, res) => {
  try {
    await database.migrateBalizaEvents()

    res.json({
      success: true,
      message: 'Migración de eventos de balizas completada'
    })
  } catch (error) {
    console.error('Error migrando eventos de balizas:', error)
    res.status(500).json({
      success: false,
      error: 'Error en la migración'
    })
  }
})

// Forzar re-migración completa (para restaurar datos perdidos)
app.post('/api/balizas/force-migrate', async (req, res) => {
  try {
    console.log('🔧 Forzando re-migración completa con nueva lógica...')

    // Usar la función de migración mejorada
    await database.migrateBalizaEvents()

    res.json({
      success: true,
      message: 'Re-migración forzada completada con nueva lógica realista.'
    })
  } catch (error) {
    console.error('Error en re-migración forzada:', error)
    res.status(500).json({
      success: false,
      error: 'Error en la re-migración'
    })
  }
})

// Debug de migración paso a paso
app.post('/api/balizas/debug-migrate', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Migración paso a paso...')

    // Paso 1: Limpiar balizas
    console.log('🧹 Limpiando balizas existentes...')
    await database.prisma.balizaStatus.deleteMany({
      where: {
        balizaId: { startsWith: 'Baliza_' }
      }
    })
    console.log('✅ Balizas limpiadas')

    // Paso 2: Obtener eventos
    console.log('📊 Obteniendo eventos de balizas...')
    const balizaEvents = await database.prisma.event.findMany({
      where: { eventType: 'BALIZA' },
      orderBy: { timestamp: 'desc' },
      take: 5
    })
    console.log(`Eventos encontrados: ${balizaEvents.length}`)

    // Paso 3: Procesar eventos
    const now = new Date()
    let balizaIndex = 1
    const results = []

    for (const event of balizaEvents) {
      const eventTime = new Date(event.timestamp)
      const availableAt = new Date(eventTime.getTime() + 60 * 60 * 1000)
      const timeRemaining = availableAt.getTime() - now.getTime()
      const isExpired = timeRemaining <= 0

      console.log(`\n--- Procesando ${event.teamName} ---`)
      console.log(`Timestamp: ${eventTime.toLocaleString()}`)
      console.log(`Expira: ${availableAt.toLocaleString()}`)
      console.log(`Tiempo restante: ${Math.round(timeRemaining / 60000)} min`)
      console.log(`¿Expirado? ${isExpired}`)

      results.push({
        team: event.teamName,
        timestamp: eventTime,
        timeRemaining: Math.round(timeRemaining / 60000),
        expired: isExpired
      })

      if (!isExpired && balizaIndex <= 5) {
        const balizaId = `Baliza_${balizaIndex}`
        console.log(`✅ Creando ${balizaId} para ${event.teamName}`)

        const created = await database.prisma.balizaStatus.create({
          data: {
            balizaId,
            currentTeam: event.teamName,
            teamColor: event.teamColor,
            capturedAt: eventTime,
            availableAt: availableAt,
            isAvailable: false,
            lastEventId: event.id
          }
        })
        console.log(`✅ ${balizaId} creada con ID: ${created.id}`)
        balizaIndex++
      } else {
        console.log(`⏰ Evento expirado o sin espacio - saltando`)
      }
    }

    // Paso 4: Completar balizas disponibles
    for (let i = balizaIndex; i <= 5; i++) {
      const balizaId = `Baliza_${i}`
      console.log(`📍 Creando ${balizaId} disponible`)

      await database.prisma.balizaStatus.create({
        data: {
          balizaId,
          currentTeam: null,
          teamColor: null,
          capturedAt: null,
          availableAt: null,
          isAvailable: true,
          lastEventId: null
        }
      })
    }

    // Verificar resultado
    const finalBalizas = await database.prisma.balizaStatus.findMany()
    console.log(`\n✅ Migración completada. ${finalBalizas.length} balizas creadas`)

    res.json({
      success: true,
      message: `Debug completado. ${balizaIndex - 1} ocupadas, ${5 - balizaIndex + 1} disponibles`,
      details: results,
      finalCount: finalBalizas.length
    })
  } catch (error) {
    console.error('Error en debug de migración:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
}) // Simular eventos FRESCOS (para testing)
app.post('/api/balizas/simulate-fresh', async (req, res) => {
  try {
    console.log('🎮 Simulando eventos FRESCOS para testing...')

    const teams = [
      { name: 'Team Panpots', color: '#F5D6A6' },
      { name: 'Team Ricoy', color: '#B5B1B1' },
      { name: 'Team Welyn', color: '#F27C1B' },
      { name: 'Team xQc', color: '#F0F0F0' },
      { name: 'Team hJune', color: '#F22C2C' }
    ]

    const now = new Date()

    // Crear eventos RECIENTES en la base de datos
    for (let i = 0; i < 5; i++) {
      const team = teams[i]
      const minutesAgo = 5 + i * 3 // 5, 8, 11, 14, 17 minutos atrás
      const eventTime = new Date(now.getTime() - minutesAgo * 60 * 1000)

      console.log(`📝 Creando evento: ${team.name} - hace ${minutesAgo} minutos`)

      // Crear el evento en la tabla Event
      await database.prisma.event.create({
        data: {
          timestamp: eventTime,
          displayTime: eventTime.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Madrid'
          }),
          eventCategory: 'Major Events',
          eventType: 'BALIZA',
          teamName: team.name,
          teamColor: team.color,
          playerName: '',
          action: `${team.name} captured a beacon for testing`,
          rawDescription: `${team.name} captured a beacon for testing`,
          scrapedAt: now
        }
      })
    }

    // Ejecutar migración para procesar los eventos
    console.log('🔄 Ejecutando migración para procesar eventos frescos...')
    await database.migrateBalizaEvents()

    res.json({
      success: true,
      message: 'Eventos frescos simulados y procesados correctamente'
    })
  } catch (error) {
    console.error('Error simulando eventos frescos:', error)
    res.status(500).json({
      success: false,
      error: 'Error en la simulación'
    })
  }
})

// Simular balizas activas (para testing)
app.post('/api/balizas/simulate-active', async (req, res) => {
  try {
    console.log('🎮 Simulando balizas activas para testing...')

    const teams = [
      { name: 'Team Panpots', color: '#F5D6A6' },
      { name: 'Team Ricoy', color: '#B5B1B1' },
      { name: 'Team Welyn', color: '#F27C1B' },
      { name: 'Team xQc', color: '#F0F0F0' },
      { name: 'Team hJune', color: '#F22C2C' }
    ]

    // Limpiar todas las balizas
    await database.prisma.balizaStatus.deleteMany({
      where: {
        balizaId: {
          startsWith: 'Baliza_'
        }
      }
    })

    const now = new Date()

    // Crear balizas simuladas con tiempos recientes
    for (let i = 1; i <= 5; i++) {
      const team = teams[i - 1]
      const capturedAt = new Date(now.getTime() - i * 2 * 60 * 1000) // Hace 2, 4, 6, 8, 10 minutos
      const availableAt = new Date(capturedAt.getTime() + 60 * 60 * 1000) // +1 hora

      await database.prisma.balizaStatus.create({
        data: {
          balizaId: `Baliza_${i}`,
          currentTeam: team.name,
          teamColor: team.color,
          capturedAt,
          availableAt,
          isAvailable: false,
          lastEventId: null
        }
      })

      console.log(`✅ Baliza_${i} asignada a ${team.name} (expira en ${Math.round((availableAt.getTime() - now.getTime()) / 60000)} minutos)`)
    }

    res.json({
      success: true,
      message: 'Balizas activas simuladas correctamente para testing'
    })
  } catch (error) {
    console.error('Error simulando balizas activas:', error)
    res.status(500).json({
      success: false,
      error: 'Error en la simulación'
    })
  }
})

// Reiniciar servicios de scraping
app.post('/api/scraping/restart', (req, res) => {
  try {
    cronService.restart()

    res.json({
      success: true,
      message: 'Servicios de scraping reiniciados'
    })
  } catch (error) {
    console.error('Error reiniciando servicios:', error)
    res.status(500).json({
      success: false,
      error: 'Error reiniciando servicios'
    })
  }
})

// ENDPOINT TEMPORAL - Forzar migración para Railway
app.post('/api/force-migrate', async (req, res) => {
  try {
    console.log('🚀 FORZANDO MIGRACIÓN desde endpoint...')
    await database.migrateBalizaEvents()

    const status = await database.getBalizasStatus()

    res.json({
      success: true,
      message: 'Migración ejecutada correctamente',
      data: status.data
    })

    console.log('✅ Migración completada desde endpoint')
  } catch (error) {
    console.error('❌ Error en migración forzada:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// === RUTAS DEL FRONTEND ===

// Servir el frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// Ruta catch-all para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// === INICIALIZACIÓN ===

async function startServer() {
  try {
    console.log('🚀 Iniciando servidor Rust Kickoff Tracker...')
    console.log('👤 Creado por Entrellaves')

    // Conectar a la base de datos
    await database.connect()

    // Ejecutar migración de eventos de balizas existentes
    console.log('🔄 Migrando eventos de balizas existentes...')
    await database.migrateBalizaEvents()

    // Inicializar y empezar servicios de cron
    await cronService.init()
    console.log('🚀 Iniciando servicios de scraping automáticos...')
    cronService.startScrapingJob() // ACTIVADO para producción
    cronService.startBalizaUpdateJob() // ACTIVADO para producción

    // Ejecutar un scraping inicial
    // console.log('🔄 Ejecutando scraping inicial...')
    // await cronService.runNow() // TEMPORAL: Desactivado para evitar sobrescribir balizas migradas

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`\n✅ Servidor corriendo en puerto ${PORT}`)
      console.log(`📊 Dashboard: http://localhost:${PORT}`)
      console.log(`🔗 API: http://localhost:${PORT}/api`)
      console.log('\n📋 Endpoints disponibles:')
      console.log('   GET  /api/events - Todos los eventos')
      console.log('   GET  /api/events/balizas - Solo eventos de balizas')
      console.log('   GET  /api/balizas/status - Estado actual de balizas')
      console.log('   GET  /api/stats - Estadísticas generales')
      console.log('   GET  /api/scraping/status - Estado del scraping')
      console.log('   POST /api/scraping/run - Ejecutar scraping manual')
      console.log('   POST /api/scraping/restart - Reiniciar servicios')
      console.log('\n⏰ Scraping automático cada minuto activado')
    })
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error)
    process.exit(1)
  }
}

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  console.log('\n⏹️  Cerrando servidor...')
  cronService.stop()
  await database.disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n⏹️  Cerrando servidor...')
  cronService.stop()
  await database.disconnect()
  process.exit(0)
})

// Iniciar servidor
startServer()
