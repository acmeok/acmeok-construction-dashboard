export const ADMIN_EMAILS = [
  'david@acmeok.com',
  'taha@acmeok.com',
]

export function isAdmin(email) {
  return ADMIN_EMAILS.includes((email || '').toLowerCase())
}
