'use server'

import config from '@payload-config'
import { getPayload } from 'payload'
import { clearAppSession, getCurrentUser, setAppSession } from '@/lib/app-auth'
import { formatRut, isValidRut } from '@/lib/rut'

type Result<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fields?: Record<string, string> }
type StudentInput = Record<string, unknown>
type DocumentType =
  | 'pai'
  | 'paec'
  | 'paci'
  | 'psicopedagogico'
  | 'familia'
  | 'anamnesis'
  | 'vocacional'
type DocumentInput = {
  studentId: string
  type: DocumentType
  title: string
  status: 'borrador' | 'finalizado'
  date: string
  observations?: string
  responsibleName?: string
  content: Record<string, string>
}

const text = (value: unknown, max = 4000) =>
  String(value ?? '')
    .trim()
    .slice(0, max)
const email = (value: unknown) => text(value, 200).toLowerCase()
const allowedRoles = ['administrador', 'profesor', 'docente'] as const
const documentTypes: readonly DocumentType[] = [
  'pai',
  'paec',
  'paci',
  'psicopedagogico',
  'familia',
  'anamnesis',
  'vocacional',
]

async function audit(action: string, entity: string, entityId: string | number, details?: unknown) {
  const payload = await getPayload({ config })
  const user = await getCurrentUser()
  await payload.create({
    collection: 'audit-logs',
    data: {
      action,
      entity,
      entityId: String(entityId),
      actor: user?.id,
      details: details as Record<string, unknown>,
    },
    overrideAccess: true,
  })
}

export async function loginAction(input: {
  identifier: string
  password: string
}): Promise<Result> {
  const payload = await getPayload({ config })
  const identifier = text(input.identifier, 200)
  const password = text(input.password, 200)
  if (!identifier || !password) return { ok: false, error: 'Ingrese su usuario y contraseña.' }

  let loginEmail = identifier.toLowerCase()
  if (!identifier.includes('@')) {
    const match = await payload.find({
      collection: 'users',
      where: { username: { equals: identifier } },
      limit: 1,
      overrideAccess: true,
    })
    if (!match.docs[0]) return { ok: false, error: 'Credenciales incorrectas.' }
    loginEmail = match.docs[0].email
  }

  try {
    const result = await payload.login({
      collection: 'users',
      data: { email: loginEmail, password },
    })
    if (!result.token || !result.user || result.user.active === false)
      return { ok: false, error: 'La cuenta está inactiva.' }
    await setAppSession(result.token, result.exp)
    return { ok: true }
  } catch {
    return { ok: false, error: 'Credenciales incorrectas o cuenta temporalmente bloqueada.' }
  }
}

export async function logoutAction(): Promise<Result> {
  await clearAppSession()
  return { ok: true }
}

export async function bootstrapAdminAction(input: {
  name: string
  username: string
  email: string
  password: string
}): Promise<Result> {
  const payload = await getPayload({ config })
  const count = await payload.count({ collection: 'users', overrideAccess: true })
  if (count.totalDocs > 0)
    return { ok: false, error: 'La configuración inicial ya fue completada.' }
  if (text(input.password).length < 10)
    return { ok: false, error: 'La contraseña debe tener al menos 10 caracteres.' }

  try {
    const created = await payload.create({
      collection: 'users',
      data: {
        name: text(input.name, 120),
        username: text(input.username, 60),
        email: email(input.email),
        password: text(input.password, 200),
        role: 'administrador',
        active: true,
      },
      overrideAccess: true,
    })
    await audit('configuración-inicial', 'users', created.id)
    return loginAction({ identifier: input.email, password: input.password })
  } catch {
    return {
      ok: false,
      error: 'No fue posible crear la cuenta. Revise los datos e inténtelo nuevamente.',
    }
  }
}

async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new Error('Sesión expirada')
  return user
}

async function requireManager() {
  const user = await requireUser()
  if (user.role !== 'administrador' && user.role !== 'profesor') throw new Error('Sin permisos')
  return user
}

function mapStudent(input: StudentInput) {
  const rut = text(input.rut, 20)
  const birthDate = text(input.birthDate, 30)
  const enrollmentYear = Number(input.enrollmentYear)
  const status = ['activo', 'retirado', 'egresado'].includes(text(input.status))
    ? text(input.status)
    : 'activo'

  if (!isValidRut(rut)) throw new Error('El RUT del estudiante no es válido.')
  if (!text(input.names) || !text(input.paternalSurname) || !birthDate || !text(input.course)) {
    throw new Error('Complete los campos obligatorios: nombres, apellido, nacimiento y curso.')
  }

  return {
    registrationNumber: text(input.registrationNumber, 40),
    rut: formatRut(rut),
    paternalSurname: text(input.paternalSurname, 100),
    maternalSurname: text(input.maternalSurname, 100),
    names: text(input.names, 160),
    socialName: text(input.socialName, 160),
    birthDate,
    gender: text(input.gender, 40) || undefined,
    nationality: text(input.nationality, 80) || 'Chilena',
    course: text(input.course, 80),
    level: text(input.level, 80),
    workshop: text(input.workshop, 120),
    enrollmentYear: Number.isInteger(enrollmentYear) ? enrollmentYear : new Date().getFullYear(),
    entryDate: text(input.entryDate, 30) || undefined,
    status: status as 'activo' | 'retirado' | 'egresado',
    evaluationDate: text(input.evaluationDate, 30) || undefined,
    reevaluationDate: text(input.reevaluationDate, 30) || undefined,
    contact: {
      address: text(input.address, 250),
      municipality: text(input.municipality, 100),
      phone: text(input.phone, 40),
      guardianName: text(input.guardianName, 160),
      guardianRut: text(input.guardianRut, 20),
      guardianPhone: text(input.guardianPhone, 40),
      guardianEmail: email(input.guardianEmail) || undefined,
    },
    educational: {
      primaryDiagnosis: text(input.primaryDiagnosis, 250),
      secondaryDiagnosis: text(input.secondaryDiagnosis, 250),
      supportNeeds: text(input.supportNeeds),
      strengths: text(input.strengths),
      pedagogicalObservations: text(input.pedagogicalObservations),
      relevantBackground: text(input.relevantBackground),
    },
  }
}

export async function saveStudentAction(
  input: StudentInput & { id?: string },
): Promise<Result<{ id: string }>> {
  try {
    const user = await requireManager()
    const payload = await getPayload({ config })
    const data = mapStudent(input) as any
    const doc: any = input.id
      ? await payload.update({
          collection: 'students',
          id: input.id,
          data,
          user,
          overrideAccess: false,
        })
      : await payload.create({ collection: 'students', data, user, overrideAccess: false })
    await audit(input.id ? 'actualizar' : 'crear', 'students', doc.id, { rut: doc.rut })
    return { ok: true, data: { id: String(doc.id) } }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No fue posible guardar el estudiante.',
    }
  }
}

export async function deleteStudentAction(id: string): Promise<Result> {
  try {
    const user = await requireManager()
    const payload = await getPayload({ config })
    await payload.delete({ collection: 'students', id, user, overrideAccess: false })
    await audit('eliminar', 'students', id)
    return { ok: true }
  } catch {
    return {
      ok: false,
      error: 'No fue posible eliminar el registro. Puede tener documentos asociados.',
    }
  }
}

export async function importStudentsAction(
  rows: StudentInput[],
): Promise<Result<{ created: number; skipped: number }>> {
  try {
    const user = await requireManager()
    if (!Array.isArray(rows) || rows.length > 1000)
      return { ok: false, error: 'El archivo admite hasta 1.000 filas por carga.' }
    const payload = await getPayload({ config })
    let created = 0
    let skipped = 0
    for (const row of rows) {
      try {
        const data = mapStudent(row) as any
        const exists = await payload.find({
          collection: 'students',
          where: { rut: { equals: data.rut } },
          limit: 1,
          user,
          overrideAccess: false,
        })
        if (exists.totalDocs) {
          skipped += 1
          continue
        }
        await payload.create({ collection: 'students', data, user, overrideAccess: false })
        created += 1
      } catch {
        skipped += 1
      }
    }
    await audit('importar-excel', 'students', 'bulk', { created, skipped })
    return { ok: true, data: { created, skipped } }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No fue posible importar el archivo.',
    }
  }
}

export async function saveDocumentAction(input: DocumentInput): Promise<Result<{ id: string }>> {
  try {
    const user = await requireUser()
    if (!documentTypes.includes(input.type))
      return { ok: false, error: 'Tipo de documento no permitido.' }
    const payload = await getPayload({ config })
    const student = await payload.findByID({
      collection: 'students',
      id: input.studentId,
      user,
      overrideAccess: false,
    })
    const doc = await payload.create({
      collection: 'student-documents',
      data: {
        title: text(input.title, 180),
        documentType: input.type,
        student: student.id,
        status: input.status,
        date: input.date,
        content: Object.fromEntries(
          Object.entries(input.content ?? {}).map(([key, value]) => [text(key, 80), text(value)]),
        ),
        observations: text(input.observations),
        responsibleName: text(input.responsibleName, 160),
      } as any,
      user,
      overrideAccess: false,
    })
    await audit('generar-documento', 'student-documents', doc.id, {
      type: input.type,
      student: student.id,
    })
    return { ok: true, data: { id: String(doc.id) } }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No fue posible guardar el documento.',
    }
  }
}

export async function createUserAction(input: {
  name: string
  username: string
  email: string
  password: string
  role: string
}): Promise<Result> {
  try {
    const user = await requireManager()
    if (!allowedRoles.includes(input.role as (typeof allowedRoles)[number]))
      return { ok: false, error: 'Perfil no permitido.' }
    if (text(input.password).length < 10)
      return { ok: false, error: 'La contraseña temporal debe tener al menos 10 caracteres.' }
    const payload = await getPayload({ config })
    const created = await payload.create({
      collection: 'users',
      data: {
        name: text(input.name, 120),
        username: text(input.username, 60),
        email: email(input.email),
        password: text(input.password, 200),
        role: input.role as (typeof allowedRoles)[number],
        active: true,
      },
      user,
      overrideAccess: false,
    })
    await audit('crear-cuenta', 'users', created.id, { role: input.role })
    return { ok: true }
  } catch {
    return {
      ok: false,
      error: 'No fue posible crear la cuenta. El usuario o correo puede estar en uso.',
    }
  }
}
