import type { CollectionConfig } from 'payload'
import { appUserOnly, isAppUser, managerOnly, ownOrManager } from '@/lib/access'

export const Documents: CollectionConfig = {
  slug: 'student-documents',
  labels: { singular: 'Documento estudiantil', plural: 'Documentos estudiantiles' },
  admin: {
    group: 'Gestión institucional',
    useAsTitle: 'title',
    defaultColumns: ['title', 'documentType', 'student', 'status', 'createdAt'],
  },
  access: {
    create: appUserOnly,
    delete: managerOnly,
    read: appUserOnly,
    update: ownOrManager,
  },
  versions: { maxPerDoc: 20 },
  fields: [
    { name: 'title', label: 'Título', type: 'text', required: true },
    {
      name: 'documentType',
      label: 'Tipo de documento',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Plan de Apoyo Individual (PAI)', value: 'pai' },
        { label: 'Plan de Acompañamiento Emocional y/o Conductual (PAEC)', value: 'paec' },
        { label: 'Plan de Adecuación Curricular Individual (PACI)', value: 'paci' },
        { label: 'Informe de Evaluación Psicopedagógica', value: 'psicopedagogico' },
        { label: 'Informe para la Familia', value: 'familia' },
        { label: 'Anamnesis', value: 'anamnesis' },
        { label: 'Planificación Vocacional', value: 'vocacional' },
      ],
    },
    {
      name: 'student',
      label: 'Estudiante',
      type: 'relationship',
      relationTo: 'students',
      required: true,
      index: true,
    },
    {
      name: 'createdBy',
      label: 'Creado por',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: { create: () => false, update: () => false },
      hooks: {
        beforeChange: [
          ({ req, value, operation }) =>
            operation === 'create' && isAppUser(req.user) ? req.user.id : value,
        ],
      },
    },
    {
      name: 'status',
      label: 'Estado',
      type: 'select',
      defaultValue: 'borrador',
      options: [
        { label: 'Borrador', value: 'borrador' },
        { label: 'Finalizado', value: 'finalizado' },
      ],
    },
    { name: 'date', label: 'Fecha del documento', type: 'date', required: true },
    { name: 'content', label: 'Contenido estructurado', type: 'json', required: true },
    { name: 'observations', label: 'Observaciones', type: 'textarea' },
    { name: 'responsibleName', label: 'Responsable / firma', type: 'text' },
    {
      name: 'originalTemplate',
      label: 'Formato institucional original',
      type: 'upload',
      relationTo: 'media',
    },
    { name: 'generatedFile', label: 'Archivo generado', type: 'upload', relationTo: 'media' },
  ],
}
