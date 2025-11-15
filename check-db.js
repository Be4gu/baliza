const { PrismaClient } = require('@prisma/client')

async function checkDatabase() {
  const prisma = new PrismaClient()

  try {
    console.log('=== ESTADO ACTUAL DE BALIZAS ===')
    const balizas = await prisma.balizaStatus.findMany()

    balizas.forEach((baliza) => {
      console.log(`\n${baliza.balizaId}:`)
      console.log(`  Equipo: ${baliza.currentTeam}`)
      console.log(`  Disponible: ${baliza.isAvailable}`)
      console.log(`  Capturada: ${baliza.capturedAt}`)
      console.log(`  Expira: ${baliza.availableAt}`)
      console.log(`  Color: ${baliza.teamColor}`)

      if (baliza.availableAt) {
        const now = new Date()
        const timeRemaining = baliza.availableAt.getTime() - now.getTime()
        console.log(`  Tiempo restante: ${Math.round(timeRemaining / 60000)} minutos`)
        console.log(`  ¿Expiró? ${timeRemaining <= 0 ? 'SÍ' : 'NO'}`)
      }
    })

    console.log('\n=== EVENTOS RECIENTES DE BALIZAS ===')
    const events = await prisma.event.findMany({
      where: { eventType: 'BALIZA' },
      orderBy: { timestamp: 'desc' },
      take: 5
    })

    events.forEach((event) => {
      console.log(`\n${event.timestamp.toLocaleString()}:`)
      console.log(`  Equipo: ${event.teamName}`)
      console.log(`  Acción: ${event.action}`)
    })
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabase()
