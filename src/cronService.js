const cron = require('node-cron')
const RustKickoffScraper = require('./scraper')
const DatabaseService = require('./database')

class CronService {
  constructor() {
    this.scraper = new RustKickoffScraper()
    this.database = new DatabaseService()
    this.isRunning = false
    this.lastRunTime = null
    this.runCount = 0
    this.errors = []
  }

  async init() {
    await this.database.connect()
    console.log('🤖 Servicio de cron inicializado')
  }

  // Scraping configurable (30 segundos por defecto)
  startScrapingJob() {
    const intervalSeconds = process.env.SCRAPE_INTERVAL_SECONDS || 30
    console.log(`⏰ Iniciando job de scraping cada ${intervalSeconds} segundos...`)

    // Crear patrón de cron basado en los segundos configurados
    let cronPattern
    if (intervalSeconds >= 60) {
      // Si es 60 o más segundos, usar patrón de minutos
      const minutes = Math.floor(intervalSeconds / 60)
      cronPattern = `*/${minutes} * * * *`
    } else {
      // Si es menos de 60 segundos, usar patrón de segundos
      cronPattern = `*/${intervalSeconds} * * * * *`
    }

    this.scrapingJob = cron.schedule(
      cronPattern,
      async () => {
        if (this.isRunning) {
          console.log('⚠️  Scraping anterior aún en proceso, saltando esta ejecución')
          return
        }

        await this.runScrapingCycle()
      },
      {
        scheduled: true,
        timezone: 'Europe/Madrid'
      }
    )

    console.log(`✅ Job de scraping programado cada ${intervalSeconds} segundos`)
  }

  // Actualización de balizas cada 5 minutos
  startBalizaUpdateJob() {
    console.log('⏰ Iniciando job de actualización de balizas cada 5 minutos...')

    this.balizaJob = cron.schedule(
      '*/5 * * * *',
      async () => {
        await this.updateBalizasAvailability()
      },
      {
        scheduled: true,
        timezone: 'Europe/Madrid'
      }
    )

    console.log('✅ Job de actualización de balizas programado cada 5 minutos')
  }

  async runScrapingCycle() {
    this.isRunning = true
    const startTime = Date.now()

    try {
      console.log(`\n🚀 Iniciando ciclo de scraping #${this.runCount + 1} - ${new Date().toLocaleString()}`)

      // Hacer scraping
      const events = await this.scraper.scrapeEvents()

      if (events.length === 0) {
        console.log('📭 No se encontraron eventos nuevos')
        return
      }

      // Guardar en base de datos
      const savedEvents = await this.database.saveEvents(events)

      // Si hay eventos nuevos de baliza, ejecutar migración
      const newBalizaEvents = savedEvents.filter((e) => e.eventType === 'BALIZA')
      if (newBalizaEvents.length > 0) {
        console.log(`🔄 ${newBalizaEvents.length} nuevos eventos de baliza - ejecutando migración...`)
        await this.database.migrateBalizaEvents()
      }

      // Estadísticas
      const duration = Date.now() - startTime
      this.lastRunTime = new Date()
      this.runCount++

      console.log(`📊 Ciclo completado en ${duration}ms:`)
      console.log(`   • Eventos scrapeados: ${events.length}`)
      console.log(`   • Eventos nuevos guardados: ${savedEvents.length}`)
      console.log(`   • Eventos de balizas: ${events.filter((e) => e.eventType === 'BALIZA').length}`)

      // Limpiar errores si todo va bien
      this.errors = this.errors.slice(-5) // Mantener solo los últimos 5 errores
    } catch (error) {
      console.error('❌ Error en ciclo de scraping:', error.message)

      this.errors.push({
        timestamp: new Date(),
        error: error.message,
        stack: error.stack
      })

      // Mantener solo los últimos 10 errores
      this.errors = this.errors.slice(-10)
    } finally {
      this.isRunning = false
    }
  }

  async updateBalizasAvailability() {
    try {
      console.log('🔄 Actualizando disponibilidad de balizas...')
      await this.database.updateAvailableBalizas()
    } catch (error) {
      console.error('❌ Error actualizando balizas:', error.message)
    }
  }

  // Ejecutar scraping inmediatamente (para testing)
  async runNow() {
    console.log('🏃‍♂️ Ejecutando scraping inmediatamente...')
    await this.runScrapingCycle()
  }

  // Obtener estado del servicio
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      runCount: this.runCount,
      errors: this.errors.slice(-5), // Últimos 5 errores
      jobs: {
        scraping: this.scrapingJob ? 'activo' : 'inactivo',
        balizaUpdate: this.balizaJob ? 'activo' : 'inactivo'
      }
    }
  }

  // Detener todos los jobs
  stop() {
    if (this.scrapingJob) {
      this.scrapingJob.stop()
      console.log('⏹️  Job de scraping detenido')
    }

    if (this.balizaJob) {
      this.balizaJob.stop()
      console.log('⏹️  Job de actualización de balizas detenido')
    }
  }

  // Reiniciar jobs
  restart() {
    this.stop()
    this.startScrapingJob()
    this.startBalizaUpdateJob()
    console.log('🔄 Jobs reiniciados')
  }
}

module.exports = CronService
