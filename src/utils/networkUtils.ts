export function isLocalUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0' || hostname.endsWith('.local')
  } catch {
    return false
  }
}
