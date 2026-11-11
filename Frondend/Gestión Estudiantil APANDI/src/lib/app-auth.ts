import config from '@payload-config'
import { getPayload } from 'payload'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'app-session'

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null

  const payload = await getPayload({ config })
  const authHeaders = new Headers({ Authorization: `JWT ${token}` })
  const { user } = await payload.auth({ headers: authHeaders })

  if (!user || user.collection !== 'users' || user.active === false) return null
  return user
}

export async function setAppSession(token: string, expiration?: number) {
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiration ? new Date(expiration * 1000) : undefined,
    maxAge: 60 * 60 * 8,
  })
}

export async function clearAppSession() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}
