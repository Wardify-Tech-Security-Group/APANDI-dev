import config from '@payload-config'
import { getPayload } from 'payload'
import { getCurrentUser } from '@/lib/app-auth'
import { ApandiApp } from './apandi-app'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const payload = await getPayload({ config })
  const user = await getCurrentUser()
  const count = await payload.count({ collection: 'users', overrideAccess: true })

  if (!user) {
    return <ApandiApp initial={{ authenticated: false, needsSetup: count.totalDocs === 0 }} />
  }

  const [students, documents, users, templates] = await Promise.all([
    payload.find({
      collection: 'students',
      limit: 500,
      sort: 'paternalSurname',
      depth: 1,
      user,
      overrideAccess: false,
    }),
    payload.find({
      collection: 'student-documents',
      limit: 500,
      sort: '-createdAt',
      depth: 1,
      user,
      overrideAccess: false,
    }),
    user.role === 'administrador' || user.role === 'profesor'
      ? payload.find({ collection: 'users', limit: 200, sort: 'name', user, overrideAccess: false })
      : Promise.resolve({ docs: [], totalDocs: 0 }),
    payload.find({
      collection: 'document-templates',
      where: { active: { equals: true } },
      limit: 20,
      depth: 1,
      sort: 'name',
      user,
      overrideAccess: false,
    }),
  ])

  return (
    <ApandiApp
      initial={{
        authenticated: true,
        currentUser: {
          id: String(user.id),
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        students: students.docs,
        documents: documents.docs,
        users: users.docs,
        templates: templates.docs,
      }}
    />
  )
}
