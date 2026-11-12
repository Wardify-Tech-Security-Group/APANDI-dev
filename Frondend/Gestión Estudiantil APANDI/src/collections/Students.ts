import type { CollectionConfig } from 'payload'
import { appUserOnly, managerOnly } from '@/lib/access'
import { formatRut, isValidRut } from '@/lib/rut'

export const Students: CollectionConfig = {
  slug: 'students',
  labels: { singular: 'Estudiante', plural: 'Estudiantes' },
  admin: {
    group: 'Gestión institucional',
    useAsTitle: 'fullName',
    defaultColumns: ['rut', 'fullName', 'course', 'workshop', 'status'],
  },
  access: {
    create: managerOnly,
    delete: managerOnly,
    read: appUserOnly,
    update: managerOnly,
  },
  versions: { maxPerDoc: 30 },
  fields: [
    {
      name: 'registrationNumber',
      label: 'N° de registro',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'rut',
      label: 'RUT',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      hooks: { beforeValidate: [({ value }) => formatRut(String(value ?? ''))] },
      validate: (value: unknown) =>
        isValidRut(String(value ?? '')) || 'Ingrese un RUT chileno válido.',
    },
    { name: 'paternalSurname', label: 'Apellido paterno', type: 'text', required: true },
    { name: 'maternalSurname', label: 'Apellido materno', type: 'text' },
    { name: 'names', label: 'Nombres', type: 'text', required: true },
    {
      name: 'fullName',
      type: 'text',
      admin: { hidden: true },
      hooks: {
        beforeChange: [
          ({ siblingData }) =>
            [siblingData.names, siblingData.paternalSurname, siblingData.maternalSurname]
              .filter(Boolean)
              .join(' '),
        ],
      },
    },
    { name: 'socialName', label: 'Nombre social', type: 'text' },
    { name: 'birthDate', label: 'Fecha de nacimiento', type: 'date', required: true },
    {
      name: 'gender',
      label: 'Género',
      type: 'select',
      options: ['Femenino', 'Masculino', 'No binario', 'Prefiere no indicar', 'Otro'],
    },
    { name: 'nationality', label: 'Nacionalidad', type: 'text', defaultValue: 'Chilena' },
    { name: 'photo', label: 'Fotografía', type: 'upload', relationTo: 'media' },
    { name: 'course', label: 'Curso', type: 'text', required: true, index: true },
    { name: 'level', label: 'Nivel', type: 'text' },
    { name: 'workshop', label: 'Taller laboral', type: 'text', index: true },
    { name: 'enrollmentYear', label: 'Año de matrícula', type: 'number', required: true },
    { name: 'entryDate', label: 'Fecha de ingreso', type: 'date' },
    {
      name: 'status',
      label: 'Estado',
      type: 'select',
      required: true,
      defaultValue: 'activo',
      index: true,
      options: [
        { label: 'Activo', value: 'activo' },
        { label: 'Retirado', value: 'retirado' },
        { label: 'Egresado', value: 'egresado' },
      ],
    },
    { name: 'headTeacher', label: 'Profesor/a jefe', type: 'relationship', relationTo: 'users' },
    {
      name: 'responsibleTeachers',
      label: 'Docentes responsables',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
    },
    { name: 'evaluationDate', label: 'Fecha de evaluación', type: 'date' },
    { name: 'reevaluationDate', label: 'Fecha de reevaluación', type: 'date', index: true },
    {
      name: 'contact',
      label: 'Antecedentes personales y familiares',
      type: 'group',
      fields: [
        { name: 'address', label: 'Domicilio', type: 'text' },
        { name: 'municipality', label: 'Comuna', type: 'text' },
        { name: 'phone', label: 'Teléfono de contacto', type: 'text' },
        { name: 'guardianName', label: 'Nombre del apoderado', type: 'text' },
        { name: 'guardianRut', label: 'RUT del apoderado', type: 'text' },
        { name: 'guardianPhone', label: 'Teléfono del apoderado', type: 'text' },
        { name: 'guardianEmail', label: 'Correo electrónico', type: 'email' },
      ],
    },
    {
      name: 'educational',
      label: 'Antecedentes educativos',
      type: 'group',
      fields: [
        { name: 'primaryDiagnosis', label: 'Diagnóstico principal', type: 'text', index: true },
        { name: 'secondaryDiagnosis', label: 'Diagnóstico secundario', type: 'text' },
        { name: 'supportNeeds', label: 'Necesidades de apoyo', type: 'textarea' },
        { name: 'strengths', label: 'Fortalezas', type: 'textarea' },
        { name: 'pedagogicalObservations', label: 'Observaciones pedagógicas', type: 'textarea' },
        { name: 'relevantBackground', label: 'Antecedentes relevantes', type: 'textarea' },
      ],
    },
    {
      name: 'evaluations',
      label: 'Historial de evaluaciones',
      type: 'array',
      fields: [
        { name: 'date', label: 'Fecha', type: 'date', required: true },
        { name: 'type', label: 'Tipo', type: 'text', required: true },
        { name: 'result', label: 'Resultado / síntesis', type: 'textarea' },
      ],
    },
    {
      name: 'followUps',
      label: 'Historial de seguimiento',
      type: 'array',
      fields: [
        { name: 'date', label: 'Fecha', type: 'date', required: true },
        { name: 'note', label: 'Registro', type: 'textarea', required: true },
        { name: 'responsible', label: 'Responsable', type: 'relationship', relationTo: 'users' },
      ],
    },
  ],
}
