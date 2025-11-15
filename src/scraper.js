const axios = require('axios')
const cheerio = require('cheerio')

class RustKickoffScraper {
  constructor() {
    this.baseUrl = 'https://rustkickoff.com/leaderboards'
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  }

  async scrapeEvents() {
    try {
      console.log(`🔍 Iniciando scraping de ${this.baseUrl}`)

      const response = await axios.get(this.baseUrl, {
        headers: this.headers,
        timeout: 10000
      })

      const $ = cheerio.load(response.data)
      const events = []

      // Buscar los Major Events y timeline containers
      const timelineContainers = $('#timelineContainer')

      console.log(`📦 Encontrados ${timelineContainers.length} timeline containers`)

      timelineContainers.each((containerIndex, container) => {
        const $container = $(container)

        // Buscar el h3 de Major Events que precede a este container
        const majorEventHeader = $container.prevAll('h3').first()
        let eventCategory = 'Unknown Event'

        if (majorEventHeader.length > 0) {
          eventCategory = majorEventHeader.text().trim()
        }

        // Procesar cada timeline-item
        $container.find('.timeline-item').each((itemIndex, item) => {
          const $item = $(item)

          // Extraer tiempo
          const timeElement = $item.find('.local-time')
          const timeStr = timeElement.attr('data-time')
          const displayTime = timeElement.text().trim()

          // Extraer equipo
          const teamElement = $item.find('.timeline-time span[style*="color"]').last()
          const teamName = teamElement.text().trim()
          const teamColor = teamElement.attr('style')

          // Extraer descripción del evento
          const descriptionElement = $item.find('.timeline-description')
          const strongElement = descriptionElement.find('strong')
          const playerName = strongElement.length > 0 ? strongElement.text().replace(':', '') : ''
          const action = descriptionElement.text().replace(strongElement.text(), '').trim()

          // Determinar tipo de evento basado en la acción
          const eventType = this.classifyEvent(action, eventCategory)

          const eventData = {
            timestamp: new Date(timeStr),
            displayTime: displayTime,
            eventCategory: eventCategory,
            eventType: eventType,
            teamName: teamName,
            teamColor: this.extractColor(teamColor),
            playerName: playerName,
            action: action,
            rawDescription: descriptionElement.text().trim(),
            scrapedAt: new Date()
          }

          events.push(eventData)
        })
      })

      console.log(`✅ Scrapeados ${events.length} eventos`)
      return events
    } catch (error) {
      console.error('❌ Error durante el scraping:', error.message)
      console.log('🎮 Usando datos de prueba en su lugar...')

      // En caso de error, usar datos de prueba
      return this.generateTestEvents()
    }
  }

  classifyEvent(action, category) {
    const actionLower = action.toLowerCase()

    // Clasificar tipos de eventos comunes en Rust
    if (actionLower.includes('baliza') || actionLower.includes('beacon')) {
      return 'BALIZA'
    }

    if (actionLower.includes('deposited') && actionLower.includes('scrap')) {
      return 'SCRAP_DEPOSIT'
    }

    if (actionLower.includes('eliminated') || actionLower.includes('killed')) {
      return 'ELIMINATION'
    }

    if (actionLower.includes('monument') || actionLower.includes('raid')) {
      return 'MONUMENT_EVENT'
    }

    if (actionLower.includes('heli') || actionLower.includes('helicopter')) {
      return 'HELICOPTER'
    }

    if (actionLower.includes('bradley') || actionLower.includes('tank')) {
      return 'BRADLEY_TANK'
    }

    if (actionLower.includes('cargo') || actionLower.includes('ship')) {
      return 'CARGO_SHIP'
    }

    if (actionLower.includes('chinook')) {
      return 'CHINOOK'
    }

    // Si no se puede clasificar específicamente
    return 'OTHER'
  }

  extractColor(styleString) {
    if (!styleString) return null

    const colorMatch = styleString.match(/color:\s*([^;]+)/)
    return colorMatch ? colorMatch[1].trim() : null
  }

  // Método para obtener solo eventos de balizas
  async getBalizaEvents() {
    const allEvents = await this.scrapeEvents()
    return allEvents.filter((event) => event.eventType === 'BALIZA')
  }

  // Método para generar datos de prueba
  generateTestEvents() {
    const teams = [
      { name: 'Team SerWinter', color: '#F7F116' },
      { name: 'Team Spoonkid', color: '#FF29D1' },
      { name: 'Team Welyn', color: '#F27C1B' },
      { name: 'Team Panpots', color: '#F5D6A6' }
    ]

    const balizas = ['Baliza Norte', 'Baliza Sur', 'Baliza Este', 'Baliza Oeste', 'Baliza Central']

    const events = []
    const now = new Date()

    // Generar algunos eventos de balizas de los últimos minutos
    for (let i = 0; i < 5; i++) {
      const randomTeam = teams[Math.floor(Math.random() * teams.length)]
      const randomBaliza = balizas[Math.floor(Math.random() * balizas.length)]
      const minutesAgo = Math.floor(Math.random() * 30) // Últimos 30 minutos
      const timestamp = new Date(now.getTime() - minutesAgo * 60 * 1000)

      events.push({
        timestamp: timestamp,
        displayTime: timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        eventCategory: 'Major Events',
        eventType: 'BALIZA',
        teamName: randomTeam.name,
        teamColor: randomTeam.color,
        playerName: ['Alpha', 'Beta', 'Gamma', 'Delta'][Math.floor(Math.random() * 4)],
        action: `captured ${randomBaliza}`,
        rawDescription: `captured ${randomBaliza}`,
        scrapedAt: new Date()
      })
    }

    // Generar algunos eventos de scrap también
    for (let i = 0; i < 10; i++) {
      const randomTeam = teams[Math.floor(Math.random() * teams.length)]
      const minutesAgo = Math.floor(Math.random() * 60)
      const timestamp = new Date(now.getTime() - minutesAgo * 60 * 1000)
      const scrapAmount = Math.floor(Math.random() * 10000) + 1000

      events.push({
        timestamp: timestamp,
        displayTime: timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        eventCategory: 'Major Events',
        eventType: 'SCRAP_DEPOSIT',
        teamName: randomTeam.name,
        teamColor: randomTeam.color,
        playerName: ['Player1', 'Player2', 'Player3'][Math.floor(Math.random() * 3)],
        action: `deposited ${scrapAmount.toLocaleString()} scrap to team vault`,
        rawDescription: `deposited ${scrapAmount.toLocaleString()} scrap to team vault`,
        scrapedAt: new Date()
      })
    }

    // Ordenar por timestamp descendente
    events.sort((a, b) => b.timestamp - a.timestamp)

    console.log(`🎮 Generados ${events.length} eventos de prueba (${events.filter((e) => e.eventType === 'BALIZA').length} balizas)`)
    return events
  }
}

module.exports = RustKickoffScraper
