const { PrismaClient } = require('@prisma/client')
const { addHours, isAfter } = require('date-fns')
const SpanishTime = require('./spanishTime')

class DatabaseService {
  constructor() {
    this.prisma = new PrismaClient()
  }

  async connect() {
    try {
      await this.prisma.$connect()
      console.log('✅ Conectado a la base de datos')
    } catch (error) {
      console.error('❌ Error conectando a la base de datos:', error)
      throw error
    }
  }

  async disconnect() {
    await this.prisma.$disconnect()
  }

  // Guardar eventos scrapeados
  async saveEvents(events) {
    try {
      // Primero filtrar solo eventos más nuevos que el último en la base de datos
      const newEvents = await this.filterNewEvents(events)

      if (newEvents.length === 0) {
        console.log('✅ No hay eventos nuevos para procesar')
        return []
      }

      const results = []

      for (const event of newEvents) {
        // Verificar si el evento ya existe para evitar duplicados (doble verificación)
        const existingEvent = await this.prisma.event.findFirst({
          where: {
            timestamp: event.timestamp,
            teamName: event.teamName,
            playerName: event.playerName,
            action: event.action
          }
        })

        if (!existingEvent) {
          const savedEvent = await this.prisma.event.create({
            data: event
          })
          results.push(savedEvent)

          // Si es un evento de baliza, actualizar el estado de la baliza
          if (event.eventType === 'BALIZA') {
            await this.updateBalizaStatus(event)
          }
        } else {
          console.log(`⚠️  Evento duplicado encontrado (timestamp: ${event.timestamp}, team: ${event.teamName})`)
        }
      }

      console.log(`💾 Guardados ${results.length} eventos nuevos`)
      return results
    } catch (error) {
      console.error('❌ Error guardando eventos:', error)
      throw error
    }
  }

  // Actualizar estado de balizas
  async updateBalizaStatus(balizaEvent) {
    try {
      // Extraer identificador de baliza del evento (esto puede necesitar ajuste según el formato real)
      const balizaId = this.extractBalizaId(balizaEvent.action)

      if (!balizaId) return

      const capturedAt = balizaEvent.timestamp
      // Balizas ocupadas por 60 minutos (1 hora)
      const availableAt = addHours(capturedAt, 1)

      await this.prisma.balizaStatus.upsert({
        where: { balizaId },
        update: {
          currentTeam: balizaEvent.teamName,
          capturedAt,
          availableAt,
          isAvailable: false,
          lastEventId: balizaEvent.id || null
        },
        create: {
          balizaId,
          currentTeam: balizaEvent.teamName,
          capturedAt,
          availableAt,
          isAvailable: false,
          lastEventId: balizaEvent.id || null
        }
      })

      console.log(`🎯 Actualizado estado de baliza ${balizaId} para equipo ${balizaEvent.teamName}`)
    } catch (error) {
      console.error('❌ Error actualizando estado de baliza:', error)
    }
  }

  // Extraer ID de baliza del texto del evento
  extractBalizaId(actionText) {
    // Esto necesitará ser ajustado según el formato real de los eventos de baliza
    // Por ejemplo, si el texto dice "captured Monument Baliza A" → "monument_a"
    const actionLower = actionText.toLowerCase()

    // Buscar patrones comunes de balizas
    if (actionLower.includes('baliza a') || actionLower.includes('beacon a')) return 'baliza_a'
    if (actionLower.includes('baliza b') || actionLower.includes('beacon b')) return 'baliza_b'
    if (actionLower.includes('baliza c') || actionLower.includes('beacon c')) return 'baliza_c'

    // Si contiene "monument" + alguna letra
    const monumentMatch = actionLower.match(/monument[^a-z]*([a-z])/)
    if (monumentMatch) return `monument_${monumentMatch[1]}`

    // Pattern genérico para capturar identificadores de baliza
    const balizaMatch = actionLower.match(/baliza[^a-z]*([a-z0-9]+)/)
    if (balizaMatch) return `baliza_${balizaMatch[1]}`

    return null
  }

  // Actualizar estados de balizas (marcar como disponibles las que ya pasó la hora)
  async updateAvailableBalizas() {
    try {
      const now = SpanishTime.now()
      SpanishTime.log('Verificando balizas disponibles...')

      const result = await this.prisma.balizaStatus.updateMany({
        where: {
          isAvailable: false,
          availableAt: {
            lte: now
          }
        },
        data: {
          isAvailable: true,
          currentTeam: null
        }
      })

      if (result.count > 0) {
        SpanishTime.log(`🔓 ${result.count} balizas ahora disponibles`)
      }

      return result
    } catch (error) {
      console.error('❌ Error actualizando balizas disponibles:', error)
    }
  }

  // Obtener eventos con filtros
  async getEvents(filters = {}) {
    try {
      const { eventType, teamName, limit = 100, offset = 0, startDate, endDate } = filters

      const where = {}

      if (eventType) where.eventType = eventType
      if (teamName) where.teamName = { contains: teamName, mode: 'insensitive' }
      if (startDate || endDate) {
        where.timestamp = {}
        if (startDate) where.timestamp.gte = new Date(startDate)
        if (endDate) where.timestamp.lte = new Date(endDate)
      }

      const events = await this.prisma.event.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
      })

      return events
    } catch (error) {
      console.error('❌ Error obteniendo eventos:', error)
      throw error
    }
  }

  // Obtener estado actual de todas las balizas
  async getBalizasStatus() {
    try {
      const balizas = await this.prisma.balizaStatus.findMany({
        orderBy: { balizaId: 'asc' }
      })

      // Calcular tiempo restante para cada baliza usando hora española
      const now = SpanishTime.now()
      const balizasWithCountdown = balizas.map((baliza) => {
        let timeRemaining = null
        let isCurrentlyAvailable = baliza.isAvailable

        if (!baliza.isAvailable && baliza.availableAt) {
          // Usar la función de tiempo restante de SpanishTime
          timeRemaining = SpanishTime.timeRemaining(baliza.availableAt)

          if (timeRemaining <= 0) {
            // Ya debería estar disponible, marcar para próximo ciclo
            isCurrentlyAvailable = true
            timeRemaining = 0
          }
        }

        return {
          ...baliza,
          timeRemaining,
          isCurrentlyAvailable
        }
      })

      return balizasWithCountdown
    } catch (error) {
      console.error('❌ Error obteniendo estado de balizas:', error)
      throw error
    }
  }

  // Obtener el último evento de la base de datos para verificación
  async getLastEvent() {
    try {
      const lastEvent = await this.prisma.event.findFirst({
        orderBy: {
          timestamp: 'desc'
        }
      })
      return lastEvent
    } catch (error) {
      console.error('❌ Error obteniendo último evento:', error)
      return null
    }
  }

  // Verificar si los eventos scrapeados son más nuevos que el último en DB
  async filterNewEvents(scrapedEvents) {
    try {
      const lastDbEvent = await this.getLastEvent()

      if (!lastDbEvent) {
        console.log('📝 Base de datos vacía, todos los eventos son nuevos')
        return scrapedEvents
      }

      // Filtrar eventos que sean posteriores al último en la base de datos
      const newEvents = scrapedEvents.filter((event) => {
        return event.timestamp > lastDbEvent.timestamp
      })

      console.log(`📊 Eventos analizados: ${scrapedEvents.length}, Nuevos encontrados: ${newEvents.length}`)
      console.log(`🕐 Último evento en DB: ${lastDbEvent.timestamp.toISOString()}`)

      if (newEvents.length > 0) {
        console.log(`🕐 Evento más reciente scrapeado: ${newEvents[0].timestamp.toISOString()}`)
      }

      return newEvents
    } catch (error) {
      console.error('❌ Error filtrando eventos nuevos:', error)
      return scrapedEvents // En caso de error, procesar todos
    }
  }

  // Obtener estadísticas
  async getStats() {
    try {
      const totalEvents = await this.prisma.event.count()
      const eventsByType = await this.prisma.event.groupBy({
        by: ['eventType'],
        _count: { eventType: true }
      })
      const eventsByTeam = await this.prisma.event.groupBy({
        by: ['teamName'],
        _count: { teamName: true },
        orderBy: { _count: { teamName: 'desc' } },
        take: 10
      })
      const totalBalizas = await this.prisma.balizaStatus.count()

      return {
        totalEvents,
        eventsByType,
        eventsByTeam,
        totalBalizas
      }
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error)
      throw error
    }
  }
}

module.exports = DatabaseService
