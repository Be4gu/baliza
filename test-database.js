const { PrismaClient } = require('@prisma/client')

async function testDatabase() {
  const prisma = new PrismaClient()

  try {
    console.log('=== TESTING DATABASE CONNECTION ===')

    // 1. Verificar conexión a la base de datos
    console.log('\n1. Probando conexión...')
    await prisma.$connect()
    console.log('✅ Conectado a la base de datos')

    // 2. Verificar qué eventos existen
    console.log('\n2. Verificando eventos...')
    const balizaEvents = await prisma.event.findMany({
      where: { eventType: 'BALIZA' },
      orderBy: { timestamp: 'desc' },
      take: 3
    })
    console.log(`Eventos encontrados: ${balizaEvents.length}`)
    balizaEvents.forEach((e) => {
      console.log(`- ${e.teamName}: ${e.timestamp.toLocaleString()}`)
    })

    // 3. Verificar estado actual de balizas
    console.log('\n3. Estado actual de balizas...')
    const currentBalizas = await prisma.balizaStatus.findMany()
    console.log(`Balizas encontradas: ${currentBalizas.length}`)
    currentBalizas.forEach((b) => {
      console.log(`- ${b.balizaId}: ${b.currentTeam} (disponible: ${b.isAvailable})`)
    })

    // 4. Intentar crear una baliza de prueba
    console.log('\n4. Intentando crear baliza de prueba...')

    const testBaliza = await prisma.balizaStatus.create({
      data: {
        balizaId: 'Test_Baliza',
        currentTeam: 'Team Test',
        teamColor: '#FF0000',
        capturedAt: new Date(),
        availableAt: new Date(Date.now() + 60 * 60 * 1000),
        isAvailable: false,
        lastEventId: null
      }
    })
    console.log('✅ Baliza de prueba creada:', testBaliza.balizaId)

    // 5. Verificar que se creó
    const verification = await prisma.balizaStatus.findUnique({
      where: { balizaId: 'Test_Baliza' }
    })
    console.log('Verificación:', verification ? '✅ Encontrada' : '❌ No encontrada')

    // 6. Limpiar la prueba
    await prisma.balizaStatus.delete({
      where: { balizaId: 'Test_Baliza' }
    })
    console.log('✅ Baliza de prueba eliminada')

    console.log('\n=== PRUEBA DE BASE DE DATOS COMPLETADA ===')
  } catch (error) {
    console.error('❌ Error en prueba de base de datos:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabase()
