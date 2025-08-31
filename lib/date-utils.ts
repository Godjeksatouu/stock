/**
 * Safe date formatting utilities to prevent hydration mismatches
 */

export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return ''
  
  try {
    const date = new Date(dateInput)
    if (isNaN(date.getTime())) return ''
    
    // Use consistent formatting that works on both server and client
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  } catch (error) {
    return ''
  }
}

export function formatTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return ''
  
  try {
    const date = new Date(dateInput)
    if (isNaN(date.getTime())) return ''
    
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return ''
  }
}

export function formatDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return ''
  
  try {
    const date = new Date(dateInput)
    if (isNaN(date.getTime())) return ''
    
    return date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return ''
  }
}

export function getCurrentISOString(): string {
  return new Date().toISOString()
}

// Safe client-side only date operations
export function safeClientDate(callback: () => string): string {
  if (typeof window === 'undefined') {
    return '' // Return empty string on server
  }
  return callback()
}
