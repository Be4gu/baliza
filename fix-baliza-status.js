const { PrismaClient } = require('@prisma/client')
const DatabaseService = require('./src/database')

async function fixBalizaStatus() {
  const prisma = new PrismaClient()
  const database = new DatabaseService()

  try {
    console.log('=== ARREGLANDO ESTADO DE BALIZAS ===')

    // 1. Obtener el evento más reciente de Team SerWinter
    const latestEvent = await prisma.event.findFirst({
      where: {
        eventType: 'BALIZA',
        teamName: 'Team SerWinter'
      },
      orderBy: { timestamp: 'desc' }
    })

    if (latestEvent) {
      console.log('Procesando evento de Team SerWinter:', latestEvent)
      await database.updateBalizaStatus(latestEvent)
    }

    // 2. Arreglar las balizas que tienen tiempo restante pero están marcadas como disponibles
    console.log('\n=== ARREGLANDO BALIZAS CON TIEMPO RESTANTE ===')

    const now = new Date()
    const balizasToFix = await prisma.balizaStatus.findMany({
      where: {
        isAvailable: true,
        availableAt: {
          gt: now // Que expiren en el futuro
        }
      }
    })

    console.log(`Encontradas ${balizasToFix.length} balizas que deberían estar ocupadas`)

    for (const baliza of balizasToFix) {
      console.log(`Arreglando ${baliza.balizaId}...`)
      await prisma.balizaStatus.update({
        where: { id: baliza.id },
        data: { isAvailable: false }
      })
    }

    console.log('\n=== ESTADO FINAL ===')
    const finalBalizas = await prisma.balizaStatus.findMany()
    finalBalizas.forEach((baliza) => {
      const timeRemaining = baliza.availableAt ? Math.round((baliza.availableAt.getTime() - now.getTime()) / 60000) : 0
      console.log(`${baliza.balizaId}: ${baliza.isAvailable ? 'DISPONIBLE' : 'OCUPADA'} - Tiempo restante: ${timeRemaining}min`)
    })
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixBalizaStatus()
