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
            console.log(`🔄 Procesando evento de baliza: ${event.teamName} - ${event.action}`)
            // Pasar el evento con el ID actualizado
            await this.updateBalizaStatus({
              ...event,
              id: savedEvent.id
            })
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
      console.log(`🔄 Datos del evento de baliza:`, {
        teamName: balizaEvent.teamName,
        timestamp: balizaEvent.timestamp,
        teamColor: balizaEvent.teamColor,
        eventId: balizaEvent.id
      })

      const capturedAt = balizaEvent.timestamp
      // Balizas ocupadas por 60 minutos (1 hora)
      const availableAt = addHours(capturedAt, 1)

      // Buscar una baliza disponible para asignar al equipo
      let assignedBalizaId = null

      // Primero, buscar si hay balizas completamente libres
      for (let i = 1; i <= 5; i++) {
        const balizaId = `Baliza_${i}`

        const existingBaliza = await this.prisma.balizaStatus.findUnique({
          where: { balizaId }
        })

        // Si la baliza no existe o está disponible, asignarla
        if (!existingBaliza || existingBaliza.isAvailable || SpanishTime.isPast(existingBaliza.availableAt)) {
          assignedBalizaId = balizaId
          break
        }
      }

      if (!assignedBalizaId) {
        // Si no hay balizas disponibles, tomar la que expire más pronto
        const oldestBaliza = await this.prisma.balizaStatus.findFirst({
          orderBy: { availableAt: 'asc' }
        })
        if (oldestBaliza) {
          assignedBalizaId = oldestBaliza.balizaId
        } else {
          // Fallback: asignar Baliza_1
          assignedBalizaId = 'Baliza_1'
        }
      }

      console.log(`📝 Asignando ${assignedBalizaId} a ${balizaEvent.teamName} hasta ${availableAt}`)

      const result = await this.prisma.balizaStatus.upsert({
        where: { balizaId: assignedBalizaId },
        update: {
          currentTeam: balizaEvent.teamName,
          capturedAt,
          availableAt,
          isAvailable: false,
          lastEventId: balizaEvent.id || null,
          teamColor: balizaEvent.teamColor
        },
        create: {
          balizaId: assignedBalizaId,
          currentTeam: balizaEvent.teamName,
          capturedAt,
          availableAt,
          isAvailable: false,
          lastEventId: balizaEvent.id || null,
          teamColor: balizaEvent.teamColor
        }
      })

      console.log(`🎯 ${assignedBalizaId} actualizada exitosamente:`, result.id)

      console.log(`🎯 Actualizado estado de ${assignedBalizaId} para equipo ${balizaEvent.teamName}`)
    } catch (error) {
      console.error('❌ Error actualizando estado de baliza:', error)
    }
  }

  // Migrar eventos de balizas existentes para crear registros de BalizaStatus
  async migrateBalizaEvents() {
    try {
      console.log('🔄 Migrando eventos de balizas existentes...')

      // PASO 1: Limpiar BalizaStatus existentes (formato antiguo)
      console.log('🧹 Limpiando registros de balizas con formato antiguo...')
      await this.prisma.balizaStatus.deleteMany({
        where: {
          balizaId: {
            not: {
              startsWith: 'Baliza_'
            }
          }
        }
      })

      // PASO 2: Obtener todos los eventos de balizas que no han sido procesados
      const balizaEvents = await this.prisma.event.findMany({
        where: {
          eventType: 'BALIZA'
        },
        orderBy: {
          timestamp: 'desc'
        }
      })

      console.log(`📊 Encontrados ${balizaEvents.length} eventos de balizas para procesar`)

      for (const event of balizaEvents) {
        console.log(`🔄 Procesando evento de baliza: ${event.teamName} - ${event.timestamp}`)
        await this.updateBalizaStatus(event)
      }

      console.log(`✅ Migración completada`)
    } catch (error) {
      console.error('❌ Error migrando eventos de balizas:', error)
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
      const now = SpanishTime.now()
      const balizasFijas = []

      // Asegurar que existen las 5 balizas y obtener su estado
      for (let i = 1; i <= 5; i++) {
        const balizaId = `Baliza_${i}`

        // Buscar la baliza en la base de datos
        let baliza = await this.prisma.balizaStatus.findUnique({
          where: { balizaId }
        })

        if (baliza) {
          // Verificar si la baliza ya expiró
          let timeRemaining = null
          let isCurrentlyAvailable = true // Por defecto disponible

          if (baliza.availableAt && !baliza.isAvailable) {
            timeRemaining = SpanishTime.timeRemaining(baliza.availableAt)

            if (timeRemaining <= 0) {
              // Esta baliza ya debería estar disponible
              isCurrentlyAvailable = true
              timeRemaining = 0

              // Actualizar el estado en la base de datos
              baliza = await this.prisma.balizaStatus.update({
                where: { balizaId },
                data: {
                  isAvailable: true,
                  currentTeam: null,
                  teamColor: null,
                  capturedAt: null,
                  availableAt: null,
                  lastEventId: null
                }
              })
            } else {
              // Baliza aún ocupada
              isCurrentlyAvailable = false
            }
          } else if (baliza.isAvailable) {
            // Baliza marcada como disponible
            isCurrentlyAvailable = true
            timeRemaining = null
          }

          balizasFijas.push({
            ...baliza,
            timeRemaining,
            isCurrentlyAvailable,
            displayName: baliza.currentTeam || 'Disponible'
          })
        } else {
          // Crear una baliza disponible si no existe
          baliza = await this.prisma.balizaStatus.create({
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

          balizasFijas.push({
            ...baliza,
            timeRemaining: null,
            isCurrentlyAvailable: true,
            displayName: 'Disponible'
          })
        }
      }

      return balizasFijas
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
