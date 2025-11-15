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
      // Balizas ocupadas por 60 minutos (1 hora) - PERO si es un evento muy antiguo, usar tiempo actual para testing
      const now = SpanishTime.now()
      const eventAge = now.getTime() - new Date(capturedAt).getTime()
      const isOldEvent = eventAge > 2 * 60 * 60 * 1000 // Más de 2 horas

      const effectiveCapturedAt = isOldEvent ? new Date(now.getTime() - 10 * 60 * 1000) : capturedAt // Si es evento viejo, simular captura hace 10 minutos
      const availableAt = addHours(effectiveCapturedAt, 1)

      console.log(`⏰ Tiempos calculados:`)
      console.log(`   Evento original: ${capturedAt}`)
      console.log(`   Capturada en: ${effectiveCapturedAt}`)
      console.log(`   Disponible en: ${availableAt}`)
      console.log(`   Hora actual: ${now}`)
      console.log(`   Evento antiguo: ${isOldEvent}`)

      // Buscar una baliza disponible para asignar al equipo
      let assignedBalizaId = null // Primero, buscar si hay balizas completamente libres
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
          capturedAt: effectiveCapturedAt,
          availableAt,
          isAvailable: false,
          lastEventId: balizaEvent.id || null,
          teamColor: balizaEvent.teamColor
        },
        create: {
          balizaId: assignedBalizaId,
          currentTeam: balizaEvent.teamName,
          capturedAt: effectiveCapturedAt,
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
  // NUEVA LÓGICA: Siempre mantener activos los últimos 5 eventos de balizas
  async migrateBalizaEvents() {
    try {
      console.log('🔄 Migrando eventos de balizas para mantener siempre 5 balizas activas...')

      // PASO 1: Limpiar todas las balizas existentes
      console.log('🧹 Limpiando todas las balizas existentes...')
      await this.prisma.balizaStatus.deleteMany({
        where: {
          balizaId: {
            startsWith: 'Baliza_'
          }
        }
      })

      // PASO 2: Obtener los últimos 5 eventos de balizas
      const balizaEvents = await this.prisma.event.findMany({
        where: {
          eventType: 'BALIZA'
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 5 // Solo los últimos 5 eventos
      })

      console.log(`📊 Encontrados ${balizaEvents.length} eventos de balizas`)

      if (balizaEvents.length === 0) {
        console.log('⚠️  No hay eventos de balizas, creando balizas vacías')
        // Crear 5 balizas vacías
        for (let i = 1; i <= 5; i++) {
          await this.prisma.balizaStatus.create({
            data: {
              balizaId: `Baliza_${i}`,
              currentTeam: null,
              teamColor: null,
              capturedAt: null,
              availableAt: null,
              isAvailable: true,
              lastEventId: null
            }
          })
        }
        return
      }

      // PASO 3: Asignar cada evento a una baliza, pero solo si aún está activo
      const now = new Date()
      let balizaIndex = 1

      for (const event of balizaEvents) {
        // Calcular si este evento aún está dentro del tiempo de ocupación (1 hora)
        const eventTime = new Date(event.timestamp)
        const availableAt = new Date(eventTime.getTime() + 60 * 60 * 1000) // +1 hora desde la captura real
        const timeRemaining = availableAt.getTime() - now.getTime()
        const isCurrentlyAvailable = timeRemaining <= 0

        const balizaId = `Baliza_${balizaIndex}`

        console.log(`🎯 Procesando evento de ${event.teamName} (${event.timestamp})`)
        console.log(`   Tiempo restante real: ${Math.round(timeRemaining / 60000)} min`)
        console.log(`   Estado: ${isCurrentlyAvailable ? 'DISPONIBLE' : 'OCUPADA'}`)

        if (!isCurrentlyAvailable && balizaIndex <= 5) {
          // Solo crear baliza si aún está ocupada y tenemos espacio
          console.log(`   ✅ Creando ${balizaId} OCUPADA para ${event.teamName}`)

          await this.prisma.balizaStatus.create({
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

          balizaIndex++
        } else {
          console.log(`   ⏰ Evento ya expirado o sin espacio - saltando`)
        }
      }

      // PASO 4: Completar las balizas restantes como disponibles
      for (let i = balizaIndex; i <= 5; i++) {
        console.log(`📍 Creando Baliza_${i} DISPONIBLE`)

        await this.prisma.balizaStatus.create({
          data: {
            balizaId: `Baliza_${i}`,
            currentTeam: null,
            teamColor: null,
            capturedAt: null,
            availableAt: null,
            isAvailable: true,
            lastEventId: null
          }
        })
      }

      console.log(`✅ Migración completada - ${balizaIndex - 1} balizas ocupadas, ${5 - balizaIndex + 1} disponibles`)
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
          isAvailable: true
          // NO borramos currentTeam ni teamColor - mantienen el último equipo que las capturó
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
          // Verificar si la baliza ya expiró - SOLO LEER, NO MODIFICAR DB
          let timeRemaining = null
          let isCurrentlyAvailable = false // Por defecto NO disponible

          if (baliza.availableAt) {
            // Si tiene fecha de disponibilidad, calcular tiempo restante
            timeRemaining = SpanishTime.timeRemaining(baliza.availableAt)

            if (timeRemaining <= 0) {
              // Esta baliza ya debería estar disponible
              isCurrentlyAvailable = true
              timeRemaining = 0

              // NO ACTUALIZAR LA DB AQUÍ - solo calcular el estado
              console.log(`⏰ ${balizaId} expiró hace ${Math.abs(Math.round(timeRemaining / 60000))} min - mostrando como disponible`)
            } else {
              // Baliza aún ocupada (tiene tiempo restante)
              isCurrentlyAvailable = false
              console.log(`🔒 ${balizaId} ocupada por ${baliza.currentTeam} - ${Math.round(timeRemaining / 60000)} min restantes`)
            }
          } else {
            // No tiene fecha de disponibilidad, usar el campo isAvailable
            isCurrentlyAvailable = baliza.isAvailable
            timeRemaining = null
          }

          balizasFijas.push({
            ...baliza,
            timeRemaining,
            isCurrentlyAvailable,
            displayName: !isCurrentlyAvailable && baliza.currentTeam ? baliza.currentTeam : 'Disponible'
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
