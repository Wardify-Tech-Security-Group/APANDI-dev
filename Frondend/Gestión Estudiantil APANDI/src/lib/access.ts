import type { Access, FieldAccess } from 'payload'

type AppUser = {
  id: string | number
  collection?: string
  role?: 'administrador' | 'profesor' | 'docente'
  active?: boolean
}

export const isAppUser = (user: unknown): user is AppUser => {
  const candidate = user as AppUser | null
  return Boolean(candidate?.id && candidate.collection === 'users' && candidate.active !== false)
}

export const isManager = (user: unknown) =>
  isAppUser(user) && (user.role === 'administrador' || user.role === 'profesor')

export const appUserOnly: Access = ({ req }) => isAppUser(req.user)
export const managerOnly: Access = ({ req }) => isManager(req.user)

export const ownOrManager: Access = ({ req }) => {
  if (isManager(req.user)) return true
  if (!isAppUser(req.user)) return false
  return { createdBy: { equals: req.user.id } }
}

export const managerFieldOnly: FieldAccess = ({ req }) => isManager(req.user)
