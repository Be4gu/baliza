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

// Estado del servicio de scraping
app.get('/api/scraping/status', (req, res) => {
  try {
    const status = cronService.getStatus()

    res.json({
      success: true,
      data: status
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

    // Conectar a la base de datos
    await database.connect()

    // Inicializar y empezar servicios de cron
    await cronService.init()
    cronService.startScrapingJob()
    cronService.startBalizaUpdateJob()

    // Ejecutar un scraping inicial
    console.log('🔄 Ejecutando scraping inicial...')
    await cronService.runNow()

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
