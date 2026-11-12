import type { CollectionConfig } from 'payload'
import { appUserOnly, managerFieldOnly, managerOnly } from '@/lib/access'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 60 * 60 * 8,
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
  },
  admin: {
    group: 'Gestión institucional',
    useAsTitle: 'name',
  },
  access: {
    admin: () => false,
    create: managerOnly,
    delete: managerOnly,
    read: ({ req }) => {
      if (req.user?.collection !== 'users') return false
      if (req.user.role === 'administrador' || req.user.role === 'profesor') return true
      return { id: { equals: req.user.id } }
    },
    update: ({ req }) => {
      if (req.user?.collection !== 'users') return false
      if (req.user.role === 'administrador' || req.user.role === 'profesor') return true
      return { id: { equals: req.user.id } }
    },
  },
  fields: [
    { name: 'name', label: 'Nombre completo', type: 'text', required: true },
    {
      name: 'username',
      label: 'Nombre de usuario',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'role',
      label: 'Perfil',
      type: 'select',
      required: true,
      defaultValue: 'docente',
      access: { create: managerFieldOnly, update: managerFieldOnly },
      options: [
        { label: 'Administrador', value: 'administrador' },
        { label: 'Profesor', value: 'profesor' },
        { label: 'Docente', value: 'docente' },
      ],
    },
    {
      name: 'active',
      label: 'Cuenta activa',
      type: 'checkbox',
      defaultValue: true,
      access: { create: managerFieldOnly, update: managerFieldOnly },
    },
    {
      name: 'lastLoginAt',
      label: 'Último acceso',
      type: 'date',
      access: { create: managerFieldOnly, update: managerFieldOnly },
    },
  ],
  hooks: {
    afterLogin: [
      async ({ req, user }) => {
        await req.payload.update({
          collection: 'users',
          id: user.id,
          data: { lastLoginAt: new Date().toISOString() },
          overrideAccess: true,
        })
        return user
      },
    ],
  },
}
