const { PrismaClient } = require('@prisma/client')

async function debugRecentEvents() {
  const prisma = new PrismaClient()

  try {
    console.log('🔍 Verificando eventos recientes...\n')

    // Obtener los últimos 10 eventos
    const recentEvents = await prisma.event.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10
    })

    console.log('📋 Últimos 10 eventos:')
    recentEvents.forEach((event, index) => {
      const eventTime = new Date(event.timestamp)
      const now = new Date()
      const elapsed = Math.round((now - eventTime) / 60000) // minutos

      console.log(`${index + 1}. ${event.teamName} - ${eventTime.toLocaleString()} (hace ${elapsed} min)`)
    })

    // Verificar estado actual de balizas
    console.log('\n📊 Estado actual de balizas en BD:')
    const balizas = await prisma.balizaStatus.findMany({
      orderBy: { balizaId: 'asc' }
    })

    balizas.forEach((baliza) => {
      const now = new Date()
      let status = 'DISPONIBLE'
      let timeLeft = 0

      if (baliza.availableAt && baliza.capturedAt) {
        timeLeft = Math.round((new Date(baliza.availableAt) - now) / 60000)
        status = timeLeft > 0 ? 'OCUPADA' : 'DISPONIBLE'
      }

      console.log(`${baliza.balizaId}: ${status} - Team: ${baliza.currentTeam || 'Ninguno'} - Tiempo: ${timeLeft}min`)
    })
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugRecentEvents()
