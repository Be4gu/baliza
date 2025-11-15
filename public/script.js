// Estado global de la aplicación

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', function () {
  console.log('🚀 Tracker de Balizas iniciado')

  // Cargar datos iniciales
  loadSystemStatus()
  loadBalizasStatus()

  // Solo configurar actualización de countdowns cada segundo
  setInterval(updateAllCountdowns, 1000)

  console.log('✅ Aplicación lista')
})

// === ESTADO DEL SISTEMA ===

async function loadSystemStatus() {
  try {
    const response = await fetch('/api/scraping/status')
    const data = await response.json()

    if (data.success) {
      updateSystemStatusUI(data.data)
    } else {
      console.error('Error obteniendo estado del sistema:', data.error)
    }
  } catch (error) {
    console.error('Error conectando con el servidor:', error)
    updateSystemStatusUI(null, error)
  }
}

function updateSystemStatusUI(statusData, error = null) {
  const scrapingStatus = document.getElementById('scrapingStatus')
  const dbStatus = document.getElementById('dbStatus')
  const lastUpdate = document.getElementById('lastUpdate')

  if (error) {
    scrapingStatus.textContent = 'Error de conexión'
    scrapingStatus.parentElement.className = 'status-card error'
    dbStatus.textContent = 'Desconectado'
    dbStatus.parentElement.className = 'status-card error'
    lastUpdate.textContent = 'Sin conexión'
    return
  }

  if (statusData) {
    // Estado del scraping
    const isActive = statusData.jobs.scraping === 'activo'
    scrapingStatus.textContent = isActive ? 'Scraping activo' : 'Scraping inactivo'
    scrapingStatus.parentElement.className = isActive ? 'status-card' : 'status-card warning'

    // Estado de la base de datos
    dbStatus.textContent = 'Conectado'
    dbStatus.parentElement.className = 'status-card'

    // Última actualización
    if (statusData.lastRunTime) {
      const lastRun = new Date(statusData.lastRunTime)
      lastUpdate.textContent = `Última: ${formatTimeAgo(lastRun)}`
    } else {
      lastUpdate.textContent = 'Sin datos'
    }
  }
}

// === ESTADO DE BALIZAS ===

async function loadBalizasStatus() {
  try {
    showLoading('balizasGrid')

    console.log('🔍 Solicitando estado de balizas...')
    const response = await fetch('/api/balizas/status')
    console.log('📡 Respuesta recibida:', response.status, response.statusText)

    const data = await response.json()
    console.log('📊 Datos de balizas:', data)

    if (data.success) {
      console.log(`✅ ${data.data.length} balizas recibidas`)
      displayBalizas(data.data)
    } else {
      console.error('❌ Error en respuesta API:', data.error)
      showError('balizasGrid', 'Error cargando estado de balizas')
    }
  } catch (error) {
    console.error('❌ Error cargando balizas:', error)
    showError('balizasGrid', 'Error de conexión')
  }
}

function displayBalizas(balizas) {
  console.log('🎯 Mostrando balizas:', balizas)
  const grid = document.getElementById('balizasGrid')

  // Si tenemos datos reales de balizas capturadas, mostrarlos
  if (balizas && balizas.length > 0) {
    console.log(`📋 Procesando ${balizas.length} balizas`)
    // Usar datos reales directamente
    const html = balizas
      .map((baliza, index) => {
        console.log(`🔍 Procesando baliza ${index + 1}:`, baliza)
        console.log(`   - isCurrentlyAvailable: ${baliza.isCurrentlyAvailable}`)
        console.log(`   - isAvailable: ${baliza.isAvailable}`)
        console.log(`   - currentTeam: ${baliza.currentTeam}`)
        console.log(`   - teamColor: ${baliza.teamColor}`)

        const isAvailable = baliza.isCurrentlyAvailable
        const statusClass = isAvailable ? 'available' : 'occupied'
        const statusText = isAvailable ? 'Disponible' : 'Ocupada'

        console.log(`   Estado final: ${statusText}, Clase: ${statusClass}, Disponible: ${isAvailable}`)

        let countdownHtml = ''
        if (!isAvailable && baliza.timeRemaining) {
          countdownHtml = `
                  <div class="countdown" data-time="${baliza.timeRemaining}">
                      ${formatCountdown(baliza.timeRemaining)}
                  </div>
              `
          console.log(`   Countdown: ${formatCountdown(baliza.timeRemaining)}`)
        }

        let teamInfo = ''
        if (baliza.currentTeam) {
          teamInfo = `
                  <div class="baliza-team">
                      <div class="team-color" style="background-color: ${baliza.teamColor || '#666'}"></div>
                      <span>${baliza.currentTeam}</span>
                  </div>
              `
          console.log(`   Equipo: ${baliza.currentTeam}`)
        }

        let capturedInfo = ''
        if (baliza.capturedAt) {
          capturedInfo = `
                  <div class="baliza-info">
                      <small>Capturada: ${formatDateTime(baliza.capturedAt)}</small>
                  </div>
              `
        }

        return `
              <div class="baliza-card ${statusClass}">
                  <div class="baliza-header">
                      <div class="baliza-name">${baliza.displayName || baliza.currentTeam || formatBalizaName(baliza.balizaId)}</div>
                      <div class="baliza-status ${statusClass}">${statusText}</div>
                  </div>
                  
                  ${teamInfo}
                  ${capturedInfo}
                  ${countdownHtml}
              </div>
          `
      })
      .join('')

    grid.innerHTML = html
  } else {
    // Si no hay datos, mostrar 5 balizas predeterminadas vacías
    const defaultBalizas = []
    for (let i = 1; i <= 5; i++) {
      defaultBalizas.push({
        balizaId: i,
        isCurrentlyAvailable: true,
        currentTeam: null,
        capturedAt: null,
        timeRemaining: null,
        teamColor: null
      })
    }

    const html = defaultBalizas
      .map((baliza) => {
        const isAvailable = baliza.isCurrentlyAvailable
        const statusClass = isAvailable ? 'available' : 'occupied'
        const statusText = isAvailable ? 'Disponible' : 'Ocupada'

        let countdownHtml = ''
        if (!isAvailable && baliza.timeRemaining) {
          countdownHtml = `
                <div class="countdown" data-time="${baliza.timeRemaining}">
                    ${formatCountdown(baliza.timeRemaining)}
                </div>
            `
        }

        let teamInfo = ''
        if (baliza.currentTeam) {
          teamInfo = `
                <div class="baliza-team">
                    <div class="team-color" style="background-color: ${baliza.teamColor || '#666'}"></div>
                    <span>${baliza.currentTeam}</span>
                </div>
            `
        }

        let capturedInfo = ''
        if (baliza.capturedAt) {
          capturedInfo = `
                <div class="baliza-info">
                    <small>Capturada: ${formatDateTime(baliza.capturedAt)}</small>
                </div>
            `
        }

        return `
            <div class="baliza-card ${statusClass}">
                <div class="baliza-header">
                    <div class="baliza-name">${baliza.displayName || baliza.currentTeam || formatBalizaName(baliza.balizaId)}</div>
                    <div class="baliza-status ${statusClass}">${statusText}</div>
                </div>
                
                ${teamInfo}
                ${capturedInfo}
                ${countdownHtml}
            </div>
        `
      })
      .join('')

    grid.innerHTML = html
  }

  // Iniciar countdown timers
  startCountdownTimers()
}

function formatBalizaName(balizaId) {
  // Si el balizaId es un nombre de equipo, devolverlo tal como está
  if (balizaId && balizaId.toLowerCase().includes('team')) {
    return balizaId
  }

  // Si es un número (de las predeterminadas), devolver formato de baliza
  if (!isNaN(balizaId)) {
    return `Baliza ${String.fromCharCode(64 + parseInt(balizaId))}` // A, B, C, D, E
  }

  // Fallback para otros casos
  return balizaId ? balizaId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : 'Baliza'
}

function startCountdownTimers() {
  const countdowns = document.querySelectorAll('.countdown[data-time]')

  countdowns.forEach((countdown) => {
    const timeRemainingMs = parseInt(countdown.dataset.time) // milisegundos restantes
    const startTime = Date.now() // cuando empezó el countdown
    const endTime = startTime + timeRemainingMs // timestamp absoluto de cuando expira

    const updateCountdown = () => {
      const now = Date.now()
      const remaining = endTime - now // tiempo restante real

      if (remaining <= 0) {
        countdown.innerHTML = '<i class="fas fa-check-circle"></i> ¡DISPONIBLE!'
        countdown.classList.add('available')
        countdown.style.animation = 'none'

        // Recargar datos después de 2 segundos
        setTimeout(() => {
          if (typeof currentTab !== 'undefined' && currentTab === 'balizas') {
            loadBalizasStatus()
          }
        }, 2000)
      } else {
        const timeText = formatCountdown(remaining)

        // Determinar si mostrar formato extendido para horas
        const totalMinutes = Math.floor(remaining / (1000 * 60))
        const hours = Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60

        let displayText = timeText
        let subText = ''

        if (hours > 0) {
          subText = `(${hours}h ${minutes}m restantes)`
        } else if (minutes > 10) {
          subText = `(${minutes} minutos restantes)`
        } else if (minutes > 1) {
          subText = `(${minutes} minutos restantes)`
        } else {
          subText = '(¡Casi disponible!)'
        }

        countdown.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <div style="font-size: 0.9rem; opacity: 0.8; color: #ffc107;">⏱️ Disponible en:</div>
            <div style="font-size: 1.8rem; font-weight: 900;">${displayText}</div>
            <div style="font-size: 0.8rem; opacity: 0.7;">${subText}</div>
          </div>
        `

        // Cambiar color según el tiempo restante
        if (remaining < 60000) {
          // Menos de 1 minuto
          countdown.style.color = '#ff6b6b'
          countdown.style.animation = 'pulse 0.8s infinite'
        } else if (remaining < 300000) {
          // Menos de 5 minutos
          countdown.style.color = '#ffa500'
        } else if (remaining < 900000) {
          // Menos de 15 minutos
          countdown.style.color = '#ffeb3b'
        } else {
          countdown.style.color = '#dc3545'
        }
      }
    }

    // Actualizar inmediatamente y luego cada segundo
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    // Limpiar intervalo cuando el elemento se elimine
    countdown.dataset.interval = interval
  })
}

function formatCountdown(milliseconds) {
  if (milliseconds <= 0) return '00:00:00'

  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

// === FUNCIONES DE CONTROL ===

async function runManualScraping() {
  try {
    showLoading('eventsTimeline')

    const eventType = document.getElementById('eventTypeFilter')?.value || ''
    const teamName = document.getElementById('teamFilter')?.value || ''

    const params = new URLSearchParams({
      limit: eventsPerPage,
      offset: (currentPage - 1) * eventsPerPage
    })

    if (eventType) params.append('eventType', eventType)
    if (teamName) params.append('teamName', teamName)

    const response = await fetch(`/api/events?${params}`)
    const data = await response.json()

    if (data.success) {
      displayEvents(data.data)
      updatePagination(data.data.length)
    } else {
      showError('eventsTimeline', 'Error cargando eventos')
    }
  } catch (error) {
    console.error('Error cargando eventos:', error)
    showError('eventsTimeline', 'Error de conexión')
  }
}

function displayEvents(events) {
  const timeline = document.getElementById('eventsTimeline')

  if (!events || events.length === 0) {
    timeline.innerHTML = `
            <div class="no-data">
                <i class="fas fa-clock"></i>
                <p>No se encontraron eventos</p>
            </div>
        `
    return
  }

  const html = events
    .map((event) => {
      const eventClass = getEventClass(event.eventType)
      const eventIcon = getEventIcon(event.eventType)

      return `
            <div class="event-item ${eventClass}">
                <div class="event-header">
                    <div class="event-time">
                        <i class="fas fa-clock"></i>
                        ${formatDateTime(event.timestamp)}
                    </div>
                    <div class="event-type ${eventClass}">
                        <i class="${eventIcon}"></i>
                        ${event.eventType.replace('_', ' ')}
                    </div>
                </div>
                
                <div class="event-team" style="color: ${event.teamColor || '#00ff88'}">
                    <div class="team-color" style="background-color: ${event.teamColor || '#666'}"></div>
                    ${event.teamName}
                </div>
                
                <div class="event-description">
                    ${event.playerName ? `<span class="event-player">${event.playerName}</span>: ` : ''}
                    ${event.action}
                </div>
            </div>
        `
    })
    .join('')

  timeline.innerHTML = html
}

function getEventClass(eventType) {
  const classes = {
    BALIZA: 'baliza',
    SCRAP_DEPOSIT: 'scrap',
    ELIMINATION: 'elimination',
    MONUMENT_EVENT: 'monument',
    HELICOPTER: 'helicopter',
    BRADLEY_TANK: 'bradley',
    CARGO_SHIP: 'cargo',
    CHINOOK: 'chinook'
  }
  return classes[eventType] || 'other'
}

function getEventIcon(eventType) {
  const icons = {
    BALIZA: 'fas fa-flag',
    SCRAP_DEPOSIT: 'fas fa-box',
    ELIMINATION: 'fas fa-skull',
    MONUMENT_EVENT: 'fas fa-monument',
    HELICOPTER: 'fas fa-helicopter',
    BRADLEY_TANK: 'fas fa-tank',
    CARGO_SHIP: 'fas fa-ship',
    CHINOOK: 'fas fa-helicopter'
  }
  return icons[eventType] || 'fas fa-circle'
}

// === ESTADÍSTICAS ===

async function loadStats() {
  try {
    showLoading('statsGrid')

    const response = await fetch('/api/stats')
    const data = await response.json()

    if (data.success) {
      displayStats(data.data)
    } else {
      showError('statsGrid', 'Error cargando estadísticas')
    }
  } catch (error) {
    console.error('Error cargando estadísticas:', error)
    showError('statsGrid', 'Error de conexión')
  }
}

function displayStats(stats) {
  const grid = document.getElementById('statsGrid')

  const html = `
        <div class="stat-card">
            <div class="stat-number">${stats.totalEvents.toLocaleString()}</div>
            <div class="stat-label">Total Eventos</div>
        </div>
        
        <div class="stat-card">
            <div class="stat-number">${stats.totalBalizas}</div>
            <div class="stat-label">Balizas Monitoreadas</div>
        </div>
        
        ${stats.eventsByType
          .map(
            (type) => `
            <div class="stat-card">
                <div class="stat-number">${type._count.eventType}</div>
                <div class="stat-label">${type.eventType.replace('_', ' ')}</div>
            </div>
        `
          )
          .join('')}
        
        <div class="stat-card">
            <div class="stat-number">${stats.eventsByTeam[0]?._count.teamName || 0}</div>
            <div class="stat-label">Eventos Equipo Líder</div>
            <small style="color: #a0aec0; margin-top: 5px; display: block;">
                ${stats.eventsByTeam[0]?.teamName || 'N/A'}
            </small>
        </div>
    `

  grid.innerHTML = html
}

// === PAGINACIÓN ===

function updatePagination(eventsCount) {
  const prevBtn = document.getElementById('prevBtn')
  const nextBtn = document.getElementById('nextBtn')
  const pageInfo = document.getElementById('pageInfo')

  prevBtn.disabled = currentPage <= 1
  nextBtn.disabled = eventsCount < eventsPerPage
  pageInfo.textContent = `Página ${currentPage}`
}

function previousPage() {
  if (currentPage > 1) {
    currentPage--
    loadEvents()
  }
}

function nextPage() {
  currentPage++
  loadEvents()
}

// === FUNCIONES DE CONTROL ===

async function runManualScraping() {
  try {
    const btn = event.target.closest('.control-btn')
    const originalHtml = btn.innerHTML

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'
    btn.disabled = true

    const response = await fetch('/api/scraping/run', { method: 'POST' })
    const data = await response.json()

    if (data.success) {
      showNotification('Scraping ejecutado exitosamente', 'success')

      // Recargar datos después de 3 segundos
      setTimeout(() => {
        loadSystemStatus()
        loadBalizasStatus()
      }, 3000)
    } else {
      showNotification('Error ejecutando scraping', 'error')
    }

    btn.innerHTML = originalHtml
    btn.disabled = false
  } catch (error) {
    console.error('Error ejecutando scraping manual:', error)
    showNotification('Error de conexión', 'error')
  }
}

// === UTILIDADES ===

function showLoading(containerId) {
  const container = document.getElementById(containerId)
  container.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            Cargando...
        </div>
    `
}

function showError(containerId, message) {
  const container = document.getElementById(containerId)
  container.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
            <button onclick="location.reload()" class="refresh-btn">
                <i class="fas fa-redo"></i> Reintentar
            </button>
        </div>
    `
}

function showNotification(message, type = 'info') {
  // Crear elemento de notificación
  const notification = document.createElement('div')
  notification.className = `notification ${type}`
  notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `

  // Estilos
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: getNotificationColor(type),
    color: '#fff',
    padding: '12px 20px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    zIndex: '9999',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
    transition: 'all 0.3s ease'
  })

  document.body.appendChild(notification)

  // Remover después de 3 segundos
  setTimeout(() => {
    notification.style.opacity = '0'
    notification.style.transform = 'translateX(-50%) translateY(-20px)'
    setTimeout(() => {
      document.body.removeChild(notification)
    }, 300)
  }, 3000)
}

function getNotificationIcon(type) {
  const icons = {
    success: 'check-circle',
    error: 'exclamation-circle',
    warning: 'exclamation-triangle',
    info: 'info-circle'
  }
  return icons[type] || 'info-circle'
}

function getNotificationColor(type) {
  const colors = {
    success: '#28a745',
    error: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8'
  }
  return colors[type] || '#17a2b8'
}

function formatDateTime(dateString) {
  const date = new Date(dateString)
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function formatTimeAgo(date) {
  const now = new Date()
  const diff = now - new Date(date)
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) return `hace ${hours}h`
  if (minutes > 0) return `hace ${minutes}m`
  return `hace ${seconds}s`
}

function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}
