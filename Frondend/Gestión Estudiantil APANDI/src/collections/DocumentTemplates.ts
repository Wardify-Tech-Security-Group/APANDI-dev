import type { CollectionConfig } from 'payload'
import { appUserOnly, managerOnly } from '@/lib/access'

export const DocumentTemplates: CollectionConfig = {
  slug: 'document-templates',
  labels: { singular: 'Plantilla institucional', plural: 'Plantillas institucionales' },
  admin: {
    group: 'Gestión institucional',
    useAsTitle: 'name',
    defaultColumns: ['code', 'name', 'updatedAt'],
  },
  access: {
    create: managerOnly,
    delete: managerOnly,
    read: appUserOnly,
    update: managerOnly,
  },
  fields: [
    { name: 'code', label: 'Código', type: 'text', required: true, unique: true, index: true },
    { name: 'name', label: 'Nombre', type: 'text', required: true },
    { name: 'description', label: 'Descripción', type: 'textarea' },
    {
      name: 'originalFile',
      label: 'Archivo institucional original',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'sections',
      label: 'Apartados',
      type: 'array',
      fields: [{ name: 'title', label: 'Título', type: 'text', required: true }],
    },
    { name: 'active', label: 'Plantilla activa', type: 'checkbox', defaultValue: true },
  ],
}
