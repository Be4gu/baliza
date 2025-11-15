const { PrismaClient } = require('@prisma/client')
const DatabaseService = require('./src/database')

async function debugBalizaStatus() {
  const prisma = new PrismaClient()
  const database = new DatabaseService()

  try {
    console.log('=== DEBUG PASO A PASO ===')

    // 1. Estado actual en DB
    console.log('\n1. ESTADO ACTUAL EN BASE DE DATOS:')
    const balizasDB = await prisma.balizaStatus.findMany()
    balizasDB.forEach((b) => {
      console.log(`  ${b.balizaId}: equipo=${b.currentTeam}, disponible=${b.isAvailable}, expira=${b.availableAt}`)
    })

    // 2. Llamar a la función getBalizasStatus() y ver qué hace
    console.log('\n2. LLAMANDO A getBalizasStatus()...')
    const balizasAPI = await database.getBalizasStatus()

    console.log('\n3. RESULTADO DE getBalizasStatus():')
    balizasAPI.forEach((b) => {
      console.log(`  ${b.balizaId}: equipo=${b.currentTeam}, disponible=${b.isCurrentlyAvailable}, timeRemaining=${b.timeRemaining}`)
    })

    // 4. Estado después de la llamada
    console.log('\n4. ESTADO EN DB DESPUÉS DE LA LLAMADA:')
    const balizasDBAfter = await prisma.balizaStatus.findMany()
    balizasDBAfter.forEach((b) => {
      console.log(`  ${b.balizaId}: equipo=${b.currentTeam}, disponible=${b.isAvailable}, expira=${b.availableAt}`)
    })

    // 5. Comparar cambios
    console.log('\n5. ANÁLISIS DE CAMBIOS:')
    const beforeIds = new Set(balizasDB.map((b) => b.id))
    const afterIds = new Set(balizasDBAfter.map((b) => b.id))

    const created = balizasDBAfter.filter((b) => !beforeIds.has(b.id))
    const deleted = balizasDB.filter((b) => !afterIds.has(b.id))

    if (created.length > 0) {
      console.log(`  CREADAS: ${created.map((b) => b.balizaId).join(', ')}`)
    }
    if (deleted.length > 0) {
      console.log(`  ELIMINADAS: ${deleted.map((b) => b.balizaId).join(', ')}`)
    }

    // 6. Verificar si hay algún update automático
    const modified = balizasDBAfter.filter((after) => {
      const before = balizasDB.find((b) => b.id === after.id)
      return before && (before.currentTeam !== after.currentTeam || before.isAvailable !== after.isAvailable || before.capturedAt?.getTime() !== after.capturedAt?.getTime())
    })

    if (modified.length > 0) {
      console.log(`  MODIFICADAS: ${modified.map((b) => b.balizaId).join(', ')}`)
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugBalizaStatus()
