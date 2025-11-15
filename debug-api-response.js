async function debugApiResponse() {
  try {
    console.log('🔍 Verificando respuesta de la API...\n')

    const fetch = (await import('node-fetch')).default
    const response = await fetch('http://localhost:3000/api/balizas/status')
    const data = await response.json()

    console.log('📡 Respuesta completa de la API:')
    console.log(JSON.stringify(data, null, 2))

    console.log('\n📊 Análisis por baliza:')
    data.balizas.forEach((baliza) => {
      console.log(`\n🎯 ${baliza.name}:`)
      console.log(`   - Status: ${baliza.status}`)
      console.log(`   - Team: ${baliza.teamName || 'NO DEFINIDO'}`)
      console.log(`   - Time Left: ${baliza.timeLeft || 'NO DEFINIDO'}`)
      console.log(`   - Available At: ${baliza.availableAt || 'NO DEFINIDO'}`)
    })
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

debugApiResponse()
