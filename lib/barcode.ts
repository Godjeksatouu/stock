// Shared barcode utilities: clean scanner input and detection helpers

export function cleanBarcode(input: string): string {
  if (!input) return ''

  // Remove non-digits
  let cleaned = input.replace(/[^0-9]/g, '')

  // Map common French AZERTY scanner characters to digits
  const frenchToNumeric: Record<string, string> = {
    'à': '0', '&': '1', 'é': '2', '"': '3', "'": '4',
    '(': '5', '-': '6', 'è': '7', '_': '8', 'ç': '9',
    'À': '0', '0': '0', '1': '1', '2': '2', '3': '3',
    '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9'
  }
  const mapped = input.split('').map(ch => frenchToNumeric[ch] || '').join('')
  if (mapped.length > cleaned.length) cleaned = mapped

  return cleaned.replace(/[^0-9]/g, '')
}

export function isLikelyScanner(lastKeyTime: number, now: number, key: string): boolean {
  const diff = now - lastKeyTime
  // Very fast stream of keys (< 50ms) from scanners; non-character keys ignored
  return diff < 50 && key.length === 1
}

export function isScanTerminator(key: string): boolean {
  // Many scanners send Enter or Tab at the end
  return key === 'Enter' || key === 'Tab'
}

