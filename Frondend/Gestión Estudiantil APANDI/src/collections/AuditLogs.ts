import type { CollectionConfig } from 'payload'
import { managerOnly } from '@/lib/access'

export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  labels: { singular: 'Registro de auditoría', plural: 'Registros de auditoría' },
  admin: { group: 'Seguridad', useAsTitle: 'action' },
  access: {
    create: () => false,
    delete: () => false,
    read: managerOnly,
    update: () => false,
  },
  fields: [
    { name: 'action', label: 'Acción', type: 'text', required: true, index: true },
    { name: 'entity', label: 'Entidad', type: 'text', required: true },
    { name: 'entityId', label: 'ID de entidad', type: 'text' },
    { name: 'actor', label: 'Usuario', type: 'relationship', relationTo: 'users' },
    { name: 'details', label: 'Detalle', type: 'json' },
  ],
}
