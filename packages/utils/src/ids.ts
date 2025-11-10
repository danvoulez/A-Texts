/**
 * ID generation utilities
 */

export function generateId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

export function generateUUID(): string {
  // Simple UUID v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
