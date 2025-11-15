const { PrismaClient } = require('@prisma/client')
const SpanishTime = require('./src/spanishTime')

async function debugGetBalizasStatus() {
  const prisma = new PrismaClient()

  try {
    console.log('=== DEBUG getBalizasStatus() PASO A PASO ===')

    const now = new Date()
    console.log(`\nHora actual: ${now.toLocaleString()}`)

    for (let i = 1; i <= 5; i++) {
      const balizaId = `Baliza_${i}`
      console.log(`\n--- PROCESANDO ${balizaId} ---`)

      // Buscar la baliza en la base de datos
      let baliza = await prisma.balizaStatus.findUnique({
        where: { balizaId }
      })

      console.log(`Baliza encontrada en DB:`, {
        currentTeam: baliza?.currentTeam,
        isAvailable: baliza?.isAvailable,
        capturedAt: baliza?.capturedAt,
        availableAt: baliza?.availableAt,
        teamColor: baliza?.teamColor
      })

      if (baliza) {
        let timeRemaining = null
        let isCurrentlyAvailable = false

        if (baliza.availableAt) {
          // Calcular tiempo restante
          timeRemaining = baliza.availableAt.getTime() - now.getTime()
          console.log(`Tiempo restante calculado: ${Math.round(timeRemaining / 60000)} min`)

          if (timeRemaining <= 0) {
            console.log('❌ Baliza EXPIRADA - marcando como disponible')
            isCurrentlyAvailable = true
            timeRemaining = 0

            // AQUÍ PUEDE ESTAR EL PROBLEMA - ¿está actualizando la DB?
            if (!baliza.isAvailable) {
              console.log(`🔧 ACTUALIZANDO BALIZA EXPIRADA: ${balizaId}`)
              baliza = await prisma.balizaStatus.update({
                where: { balizaId },
                data: {
                  isAvailable: true
                }
              })
              console.log('Baliza actualizada en DB tras expiración')
            } else {
              isCurrentlyAvailable = true
            }
          } else {
            console.log('✅ Baliza AÚN OCUPADA')
            isCurrentlyAvailable = false
          }
        } else {
          console.log('⚠️ Sin availableAt - usando isAvailable del DB')
          isCurrentlyAvailable = baliza.isAvailable
          timeRemaining = null
        }

        console.log(`Resultado final:`, {
          currentTeam: baliza.currentTeam,
          isCurrentlyAvailable,
          timeRemaining: timeRemaining ? Math.round(timeRemaining / 60000) + ' min' : null
        })
      } else {
        console.log('❌ Baliza NO encontrada - se creará una nueva')
      }
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugGetBalizasStatus()
