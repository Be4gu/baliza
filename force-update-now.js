const DatabaseService = require('./src/database')

async function forceUpdateBalizas() {
  const db = new DatabaseService()

  try {
    await db.connect()
    console.log('🔄 Ejecutando migración manual...\n')

    await db.migrateBalizaEvents()

    console.log('\n✅ Migración completada')
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await db.disconnect()
  }
}

forceUpdateBalizas()
