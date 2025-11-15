// Utilidades para manejar fechas en hora española
const { addHours } = require('date-fns')

class SpanishTimeUtils {
  // Obtener la fecha actual en hora española
  static now() {
    // Crear fecha actual en zona horaria de Madrid
    const now = new Date()
    return new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }))
  }

  // Convertir una fecha UTC a hora española para visualización
  static toSpanishTime(utcDate) {
    return new Date(utcDate.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }))
  }

  // Formatear fecha para mostrar en hora española
  static formatTime(date) {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Madrid'
    })
  }

  // Crear una fecha hace X minutos desde ahora (en hora española)
  static minutesAgo(minutes) {
    const nowSpanish = this.now()
    return new Date(nowSpanish.getTime() - minutes * 60 * 1000)
  }

  // Calcular tiempo restante en milisegundos considerando hora española
  static timeRemaining(futureDate) {
    const nowSpanish = this.now()
    return futureDate.getTime() - nowSpanish.getTime()
  }

  // Verificar si una fecha ya pasó en hora española
  static isPast(date) {
    const nowSpanish = this.now()
    return date.getTime() <= nowSpanish.getTime()
  }

  // Log con hora española
  static log(message) {
    const now = new Date().toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    console.log(`[${now} ES] ${message}`)
  }

  // Mostrar información de zona horaria actual
  static getTimezoneInfo() {
    const now = new Date()
    const utcTime = now.toISOString()
    const spanishTime = now.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })

    return {
      utc: utcTime,
      spanish: spanishTime,
      timezone: 'Europe/Madrid',
      offset: now.getTimezoneOffset()
    }
  }
}

module.exports = SpanishTimeUtils
