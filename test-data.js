// Script para generar datos de prueba con balizas
const RustKickoffScraper = require('./src/scraper')
const DatabaseService = require('./src/database')

async function insertTestData() {
  const scraper = new RustKickoffScraper()
  const database = new DatabaseService()

  try {
    console.log('🎮 Generando datos de prueba con balizas ocupadas...')

    await database.connect()

    const teams = [
      { name: 'Team SerWinter', color: '#F7F116' },
      { name: 'Team Spoonkid', color: '#FF29D1' },
      { name: 'Team Welyn', color: '#F27C1B' },
      { name: 'Team Panpots', color: '#F5D6A6' }
    ]

    const now = new Date()
    const balizaEvents = []

    // Baliza 1: Capturada hace 10 minutos (ocupada, quedan 50 minutos)
    balizaEvents.push({
      timestamp: new Date(now.getTime() - 10 * 60 * 1000),
      displayTime: new Date(now.getTime() - 10 * 60 * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      eventCategory: 'Major Events',
      eventType: 'BALIZA',
      teamName: 'Team Welyn',
      teamColor: '#F27C1B',
      playerName: 'Alpha',
      action: 'captured Baliza Norte',
      rawDescription: 'captured Baliza Norte',
      scrapedAt: new Date()
    })

    // Baliza 2: Capturada hace 20 minutos (ocupada, quedan 40 minutos)
    balizaEvents.push({
      timestamp: new Date(now.getTime() - 20 * 60 * 1000),
      displayTime: new Date(now.getTime() - 20 * 60 * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      eventCategory: 'Major Events',
      eventType: 'BALIZA',
      teamName: 'Team Spoonkid',
      teamColor: '#FF29D1',
      playerName: 'Beta',
      action: 'captured Baliza Sur',
      rawDescription: 'captured Baliza Sur',
      scrapedAt: new Date()
    })

    // Baliza 3: Capturada hace 30 minutos (ocupada, quedan 30 minutos)
    balizaEvents.push({
      timestamp: new Date(now.getTime() - 30 * 60 * 1000),
      displayTime: new Date(now.getTime() - 30 * 60 * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      eventCategory: 'Major Events',
      eventType: 'BALIZA',
      teamName: 'Team SerWinter',
      teamColor: '#F7F116',
      playerName: 'Gamma',
      action: 'captured Baliza Este',
      rawDescription: 'captured Baliza Este',
      scrapedAt: new Date()
    })

    // Baliza 4: Capturada hace 50 minutos (ocupada, quedan 10 minutos)
    balizaEvents.push({
      timestamp: new Date(now.getTime() - 50 * 60 * 1000),
      displayTime: new Date(now.getTime() - 50 * 60 * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      eventCategory: 'Major Events',
      eventType: 'BALIZA',
      teamName: 'Team Panpots',
      teamColor: '#F5D6A6',
      playerName: 'Delta',
      action: 'captured Baliza Oeste',
      rawDescription: 'captured Baliza Oeste',
      scrapedAt: new Date()
    })

    // Baliza 5: Capturada hace 70 minutos (ya disponible)
    balizaEvents.push({
      timestamp: new Date(now.getTime() - 70 * 60 * 1000),
      displayTime: new Date(now.getTime() - 70 * 60 * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      eventCategory: 'Major Events',
      eventType: 'BALIZA',
      teamName: 'Team SerWinter',
      teamColor: '#F7F116',
      playerName: 'Epsilon',
      action: 'captured Baliza Central',
      rawDescription: 'captured Baliza Central',
      scrapedAt: new Date()
    })

    console.log(`🎯 Insertando ${balizaEvents.length} eventos de balizas con diferentes estados...`)

    // Limpiar datos anteriores
    await database.prisma.balizaStatus.deleteMany({})
    await database.prisma.event.deleteMany({ where: { eventType: 'BALIZA' } })

    // Guardar en base de datos
    const savedEvents = await database.saveEvents(balizaEvents)

    console.log(`✅ ${savedEvents.length} eventos de balizas guardados exitosamente`)
    console.log('📊 Estados esperados:')
    console.log('   🔴 Baliza Norte (Team Welyn) - Ocupada ~50 min restantes')
    console.log('   🔴 Baliza Sur (Team Spoonkid) - Ocupada ~40 min restantes')
    console.log('   🔴 Baliza Este (Team SerWinter) - Ocupada ~30 min restantes')
    console.log('   � Baliza Oeste (Team Panpots) - Ocupada ~10 min restantes')
    console.log('   🟢 Baliza Central (Team SerWinter) - Disponible')

    // Forzar actualización de balizas disponibles
    await database.updateAvailableBalizas()
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await database.disconnect()
    console.log('🎮 Proceso completado. Revisa el dashboard en http://localhost:3000')
    console.log('🎯 Deberías ver balizas ROJAS ocupadas con countdown de 60 minutos y una VERDE disponible')
  }
}

insertTestData()
