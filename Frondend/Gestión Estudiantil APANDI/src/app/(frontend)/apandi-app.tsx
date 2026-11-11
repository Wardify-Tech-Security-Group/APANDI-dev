'use client'

import {
  Activity,
  Bell,
  BookOpen,
  CalendarClock,
  ChevronDown,
  CircleUserRound,
  Database,
  Download,
  FilePlus2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  UserRoundPlus,
  UsersRound,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FormEvent, ReactNode, useMemo, useRef, useState, useTransition } from 'react'
import {
  bootstrapAdminAction,
  createUserAction,
  deleteStudentAction,
  importStudentsAction,
  loginAction,
  logoutAction,
  saveDocumentAction,
  saveStudentAction,
} from './actions'
import { formatRut, isValidRut, normalizeRut } from '@/lib/rut'

type AnyRecord = Record<string, any>
type InitialState =
  | { authenticated: false; needsSetup: boolean }
  | {
      authenticated: true
      currentUser: { id: string; name: string; username: string; email: string; role: string }
      students: AnyRecord[]
      documents: AnyRecord[]
      users: AnyRecord[]
      templates: AnyRecord[]
    }

const templateDefinitions = [
  {
    id: 'pai',
    short: 'PAI',
    name: 'Plan de Apoyo Individual',
    description: 'Fortalezas, objetivos prioritarios, apoyos DUA y seguimiento.',
    color: 'bg-teal-50 text-teal-700',
    sections: [
      'Fortalezas y necesidades',
      'Objetivos prioritarios',
      'Apoyos en el aula (DUA)',
      'Estrategias prácticas',
      'Apoyo de la familia',
      'Evaluación',
      'Seguimiento',
    ],
  },
  {
    id: 'paec',
    short: 'PAEC',
    name: 'Plan de Acompañamiento Emocional y/o Conductual',
    description: 'Caracterización, desreguladores, estrategias y acuerdos.',
    color: 'bg-violet-50 text-violet-700',
    sections: [
      'Caracterización del estudiante',
      'Particularidades y factores desencadenantes',
      'Estrategias de regulación',
      'Manejo del ambiente',
      'Acuerdos con familia y responsables',
    ],
  },
  {
    id: 'paci',
    short: 'PACI',
    name: 'Plan de Adecuación Curricular Individual',
    description: 'Adecuaciones, objetivos, recursos, evaluación y seguimiento.',
    color: 'bg-sky-50 text-sky-700',
    sections: [
      'Adaptaciones curriculares',
      'Objetivos de aprendizaje adecuados',
      'Conocimientos, habilidades y actitudes',
      'Recursos',
      'Criterios de evaluación y promoción',
      'Seguimiento del PACI',
    ],
  },
  {
    id: 'psicopedagogico',
    short: 'IEP',
    name: 'Informe de Evaluación Psicopedagógica',
    description: 'Historia escolar, análisis cualitativo, síntesis y sugerencias.',
    color: 'bg-amber-50 text-amber-700',
    sections: [
      'Motivo de evaluación',
      'Instrumentos aplicados',
      'Historia escolar',
      'Habilidades cognitivas y comunicativas',
      'Habilidades socioemocionales',
      'Habilidades motoras, autonomía y sensoriales',
      'Síntesis y conclusión',
      'Sugerencias',
    ],
  },
  {
    id: 'familia',
    short: 'IF',
    name: 'Informe para la Familia',
    description: 'Síntesis clara de avances, apoyos y acuerdos familiares.',
    color: 'bg-rose-50 text-rose-700',
    sections: [
      'Antecedentes generales',
      'Progresos observados',
      'Fortalezas',
      'Necesidades de apoyo',
      'Recomendaciones para el hogar',
      'Acuerdos y compromisos',
    ],
  },
  {
    id: 'anamnesis',
    short: 'AN',
    name: 'Anamnesis',
    description: 'Historia personal, familiar, de salud y trayectoria educativa.',
    color: 'bg-indigo-50 text-indigo-700',
    sections: [
      'Motivo de consulta',
      'Antecedentes familiares',
      'Antecedentes prenatales y perinatales',
      'Desarrollo evolutivo',
      'Salud y tratamientos',
      'Trayectoria escolar',
      'Rutinas, autonomía e intereses',
    ],
  },
  {
    id: 'vocacional',
    short: 'PV',
    name: 'Planificación Vocacional',
    description: 'Unidad, objetivos, competencias y planificación clase a clase.',
    color: 'bg-emerald-50 text-emerald-700',
    sections: [
      'Contextualización del grupo',
      'Unidad y objetivo conductor',
      'Competencias, conocimientos y habilidades',
      'Objetivos complementarios',
      'Proyección de la unidad',
      'Actividades clase a clase',
      'Indicadores de logro y evaluación',
    ],
  },
]

const navItems = [
  { id: 'dashboard', label: 'Panel principal', icon: LayoutDashboard },
  { id: 'students', label: 'Base de estudiantes', icon: Database },
  { id: 'search', label: 'Buscar por RUT', icon: Search },
  { id: 'documents', label: 'Documentación', icon: FileText },
  { id: 'users', label: 'Administración', icon: UsersRound, manager: true },
  { id: 'settings', label: 'Configuración', icon: Settings },
]

const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10'

function LoginScreen({ needsSetup }: { needsSetup: boolean }) {
  const router = useRouter()
  const [setup, setSetup] = useState(needsSetup)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const data = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = setup
        ? await bootstrapAdminAction({
            name: String(data.get('name') ?? ''),
            username: String(data.get('username') ?? ''),
            email: String(data.get('email') ?? ''),
            password: String(data.get('password') ?? ''),
          })
        : await loginAction({
            identifier: String(data.get('identifier') ?? ''),
            password: String(data.get('password') ?? ''),
          })
      if (!result.ok) return setError(result.error)
      router.refresh()
    })
  }

  return (
    <main className="grid min-h-screen bg-[#f4f7f8] lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-[#073b3a] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full border border-white/10" />
        <div className="absolute -right-4 top-12 h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute bottom-[-18%] left-[-5%] h-[460px] w-[460px] rounded-full bg-teal-400/10 blur-2xl" />
        <Brand inverse />
        <div className="relative max-w-xl">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-200/20 bg-white/10 px-4 py-2 text-sm text-teal-50">
            <ShieldCheck size={16} /> Plataforma institucional segura
          </span>
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.04em]">
            Cada antecedente,
            <br />
            en el lugar correcto.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-teal-50/75">
            Gestiona fichas, evaluaciones y documentación institucional de manera centralizada,
            trazable y protegida.
          </p>
        </div>
        <div className="relative flex gap-8 text-sm text-teal-50/65">
          <span>Centro de Capacitación Laboral APANDI</span>
          <span>Acceso restringido</span>
        </div>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Brand />
          </div>
          <div className="mb-8">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">
              {setup ? 'Configuración inicial' : 'Bienvenido/a'}
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950">
              {setup ? 'Crea la cuenta administradora' : 'Inicia sesión en APANDI'}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {setup
                ? 'Esta opción se desactiva al crear la primera cuenta institucional.'
                : 'Utiliza tu nombre de usuario o correo institucional.'}
            </p>
          </div>
          <form onSubmit={submit} className="space-y-5">
            {setup && (
              <>
                <Field
                  label="Nombre completo"
                  name="name"
                  placeholder="Nombre y apellido"
                  required
                />
                <Field
                  label="Nombre de usuario"
                  name="username"
                  placeholder="ej. mcontreras"
                  required
                />
                <Field
                  label="Correo institucional"
                  name="email"
                  type="email"
                  placeholder="nombre@apandi.cl"
                  required
                />
              </>
            )}
            {!setup && (
              <Field
                label="Usuario o correo"
                name="identifier"
                placeholder="Ingresa tu usuario"
                required
              />
            )}
            <Field
              label={setup ? 'Contraseña segura' : 'Contraseña'}
              name="password"
              type="password"
              placeholder="••••••••••"
              required
            />
            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              disabled={pending}
              className="flex w-full items-center justify-center rounded-xl bg-[#087c78] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-900/10 transition hover:bg-[#066a67] disabled:opacity-60"
            >
              {pending ? 'Procesando…' : setup ? 'Crear cuenta y continuar' : 'Iniciar sesión'}
            </button>
            {!setup && (
              <button
                type="button"
                className="w-full text-center text-sm font-medium text-teal-700 hover:underline"
              >
                ¿Olvidaste tu contraseña? Contacta a administración
              </button>
            )}
          </form>
        </div>
      </section>
    </main>
  )
}

function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="relative flex items-center gap-3">
      <div
        className={`grid h-11 w-11 place-items-center rounded-xl ${inverse ? 'bg-white text-[#087c78]' : 'bg-[#087c78] text-white'}`}
      >
        <GraduationCap size={25} strokeWidth={2.2} />
      </div>
      <div>
        <p
          className={`text-xl font-bold tracking-[0.08em] ${inverse ? 'text-white' : 'text-[#073b3a]'}`}
        >
          APANDI
        </p>
        <p
          className={`text-[10px] uppercase tracking-[0.16em] ${inverse ? 'text-teal-100/70' : 'text-slate-500'}`}
        >
          Gestión educacional
        </p>
      </div>
    </div>
  )
}

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  required,
  defaultValue,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
  defaultValue?: string | number
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        className={inputClass}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
      />
    </label>
  )
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string
  name: string
  options: string[] | { label: string; value: string }[]
  defaultValue?: string
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select className={inputClass} name={name} defaultValue={defaultValue}>
        <option value="">Seleccionar</option>
        {options.map((option) => {
          const item = typeof option === 'string' ? { label: option, value: option } : option
          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          )
        })}
      </select>
    </label>
  )
}

function ApandiShell({ initial }: { initial: Extract<InitialState, { authenticated: true }> }) {
  const router = useRouter()
  const manager =
    initial.currentUser.role === 'administrador' || initial.currentUser.role === 'profesor'
  const [active, setActive] = useState('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [studentModal, setStudentModal] = useState<AnyRecord | null | 'new'>(null)
  const [profileStudent, setProfileStudent] = useState<AnyRecord | null>(null)
  const [documentDraft, setDocumentDraft] = useState<{
    template: AnyRecord
    student?: AnyRecord
  } | null>(null)
  const [pending, startTransition] = useTransition()
  const templates = initial.templates.length
    ? initial.templates.map((template) => {
        const presentation =
          templateDefinitions.find((item) => item.id === template.code) ?? templateDefinitions[0]
        return {
          ...presentation,
          ...template,
          id: template.code,
          sections: template.sections?.map((section: AnyRecord) => section.title) ?? [],
        }
      })
    : templateDefinitions

  function logout() {
    startTransition(async () => {
      await logoutAction()
      router.refresh()
    })
  }

  function navigate(id: string) {
    setActive(id)
    setMobileOpen(false)
  }

  const pageTitle = navItems.find((item) => item.id === active)?.label ?? 'Panel principal'

  return (
    <div className="min-h-screen bg-[#f4f7f8]">
      {mobileOpen && (
        <button
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menú"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[270px] flex-col border-r border-slate-200 bg-white px-4 py-6 transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="px-3 pb-8">
          <Brand />
        </div>
        <nav className="flex-1 space-y-1">
          {navItems
            .filter((item) => !item.manager || manager)
            .map((item) => {
              const Icon = item.icon
              const selected = active === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition ${
                    selected
                      ? 'bg-teal-50 text-teal-800'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  }`}
                >
                  <Icon size={19} strokeWidth={selected ? 2.3 : 1.8} />
                  {item.label}
                  {item.id === 'documents' && initial.documents.length > 0 && (
                    <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                      {initial.documents.length}
                    </span>
                  )}
                </button>
              )
            })}
        </nav>
        <div className="border-t border-slate-100 pt-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#087c78] text-sm font-bold text-white">
              {initial.currentUser.name
                .split(' ')
                .map((part) => part[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {initial.currentUser.name}
              </p>
              <p className="truncate text-xs capitalize text-slate-500">
                {initial.currentUser.role}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            disabled={pending}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut size={18} /> Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="lg:pl-[270px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur md:px-8">
          <button
            className="mr-3 rounded-lg p-2 text-slate-600 lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </button>
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
              Sistema institucional
            </p>
            <h1 className="text-lg font-semibold text-slate-900">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50">
              <Bell size={19} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-amber-500" />
            </button>
            <div className="hidden items-center gap-2 pl-2 sm:flex">
              <CircleUserRound className="text-teal-700" size={28} />
              <ChevronDown size={15} className="text-slate-400" />
            </div>
          </div>
        </header>
        <main className="p-5 md:p-8">
          {active === 'dashboard' && (
            <Dashboard
              students={initial.students}
              documents={initial.documents}
              userName={initial.currentUser.name}
              manager={manager}
              onNavigate={navigate}
              onNew={() => setStudentModal('new')}
            />
          )}
          {active === 'students' && (
            <StudentsView
              students={initial.students}
              manager={manager}
              onNew={() => setStudentModal('new')}
              onView={setProfileStudent}
              onEdit={setStudentModal}
              onDocument={(student: AnyRecord) => {
                setActive('documents')
                setDocumentDraft({ template: templates[0], student })
              }}
            />
          )}
          {active === 'search' && (
            <RutSearch students={initial.students} onView={setProfileStudent} />
          )}
          {active === 'documents' && (
            <DocumentsView
              students={initial.students}
              documents={initial.documents}
              templates={templates}
              draft={documentDraft}
              setDraft={setDocumentDraft}
            />
          )}
          {active === 'users' && manager && <UsersView users={initial.users} />}
          {active === 'settings' && <SettingsView user={initial.currentUser} />}
        </main>
      </div>
      {studentModal && (
        <StudentModal
          student={studentModal === 'new' ? undefined : studentModal}
          onClose={() => setStudentModal(null)}
        />
      )}
      {profileStudent && (
        <StudentProfile
          student={profileStudent}
          documents={initial.documents}
          manager={manager}
          onClose={() => setProfileStudent(null)}
          onEdit={() => {
            setStudentModal(profileStudent)
            setProfileStudent(null)
          }}
          onDocument={() => {
            setDocumentDraft({ template: templates[0], student: profileStudent })
            setProfileStudent(null)
            setActive('documents')
          }}
        />
      )}
    </div>
  )
}

function Dashboard({ students, documents, userName, manager, onNavigate, onNew }: AnyRecord) {
  const active = students.filter((student: AnyRecord) => student.status === 'activo').length
  const retired = students.filter((student: AnyRecord) => student.status === 'retirado').length
  const upcoming = students
    .filter((student: AnyRecord) => student.reevaluationDate)
    .sort(
      (a: AnyRecord, b: AnyRecord) =>
        new Date(a.reevaluationDate).getTime() - new Date(b.reevaluationDate).getTime(),
    )
    .slice(0, 4)
  const courses = Object.entries(
    students.reduce((acc: AnyRecord, student: AnyRecord) => {
      acc[student.course] = (acc[student.course] ?? 0) + 1
      return acc
    }, {}),
  )
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5)

  return (
    <div className="mx-auto max-w-[1480px] space-y-7">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-1 text-sm text-slate-500">
            {new Intl.DateTimeFormat('es-CL', { dateStyle: 'full' }).format(new Date())}
          </p>
          <h2 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">
            Buenos días, {userName.split(' ')[0]}
          </h2>
          <p className="mt-2 text-slate-500">Este es el estado general de la comunidad APANDI.</p>
        </div>
        {manager && (
          <button
            onClick={onNew}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#087c78] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-900/10 hover:bg-[#066a67]"
          >
            <Plus size={18} /> Registrar estudiante
          </button>
        )}
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Total estudiantes"
          value={students.length}
          icon={UsersRound}
          tone="teal"
          note="Registros institucionales"
        />
        <Metric
          label="Estudiantes activos"
          value={active}
          icon={Activity}
          tone="blue"
          note={
            students.length
              ? `${Math.round((active / students.length) * 100)}% de la matrícula`
              : 'Sin matrícula'
          }
        />
        <Metric
          label="Estudiantes retirados"
          value={retired}
          icon={UserRound}
          tone="amber"
          note="Historial conservado"
        />
        <Metric
          label="Documentos generados"
          value={documents.length}
          icon={FileText}
          tone="violet"
          note="Todos los períodos"
        />
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/30">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Distribución por curso</h3>
              <p className="mt-1 text-sm text-slate-500">Estudiantes registrados por nivel</p>
            </div>
            <button
              onClick={() => onNavigate('students')}
              className="text-sm font-semibold text-teal-700"
            >
              Ver base completa
            </button>
          </div>
          {courses.length ? (
            <div className="space-y-5">
              {courses.map(([course, count]: any) => (
                <div key={course}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{course}</span>
                    <span className="text-slate-500">{count} estudiantes</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#15928d]"
                      style={{
                        width: `${Math.max(8, (count / Math.max(...courses.map((c: any) => c[1]))) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon={UsersRound}
              title="Aún no hay estudiantes"
              text="Registra o importa la primera ficha para ver indicadores."
            />
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/30">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
              <CalendarClock size={21} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Próximas reevaluaciones</h3>
              <p className="text-sm text-slate-500">Fechas programadas</p>
            </div>
          </div>
          <div className="space-y-3">
            {upcoming.length ? (
              upcoming.map((student: AnyRecord) => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-xs font-bold text-teal-700">
                    {new Date(student.reevaluationDate).getDate()}
                    <span className="text-[8px] uppercase">
                      {new Intl.DateTimeFormat('es-CL', { month: 'short' }).format(
                        new Date(student.reevaluationDate),
                      )}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {student.fullName}
                    </p>
                    <p className="text-xs text-slate-500">{student.course}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-10 text-center text-sm text-slate-400">No hay fechas programadas.</p>
            )}
          </div>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Quick icon={Search} label="Buscar estudiante" onClick={() => onNavigate('search')} />
        <Quick icon={FilePlus2} label="Generar documento" onClick={() => onNavigate('documents')} />
        <Quick icon={Upload} label="Importar registros" onClick={() => onNavigate('students')} />
        <Quick icon={Settings} label="Configuración" onClick={() => onNavigate('settings')} />
      </section>
    </div>
  )
}

function Metric({ label, value, icon: Icon, tone, note }: AnyRecord) {
  const tones: AnyRecord = {
    teal: 'bg-teal-50 text-teal-700',
    blue: 'bg-sky-50 text-sky-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <div className={`rounded-xl p-3 ${tones[tone]}`}>
          <Icon size={22} />
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-400">{note}</p>
    </div>
  )
}

function Quick({ icon: Icon, label, onClick }: AnyRecord) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
    >
      <span className="rounded-xl bg-slate-50 p-2.5 text-slate-600 group-hover:bg-teal-50 group-hover:text-teal-700">
        <Icon size={20} />
      </span>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
    </button>
  )
}

function StudentsView({ students, manager, onNew, onView, onEdit, onDocument }: AnyRecord) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [course, setCourse] = useState('')
  const [status, setStatus] = useState('')
  const [workshop, setWorkshop] = useState('')
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const courses = [...new Set(students.map((s: AnyRecord) => s.course).filter(Boolean))]
  const workshops = [...new Set(students.map((s: AnyRecord) => s.workshop).filter(Boolean))]
  const filtered = students.filter((s: AnyRecord) => {
    const haystack = `${s.fullName} ${s.rut} ${s.educational?.primaryDiagnosis ?? ''}`.toLowerCase()
    return (
      haystack.includes(query.toLowerCase()) &&
      (!course || s.course === course) &&
      (!status || s.status === status) &&
      (!workshop || s.workshop === workshop)
    )
  })

  async function importFile(file?: File) {
    if (!file) return
    setMessage('Procesando archivo…')
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    const raw = XLSX.utils.sheet_to_json<AnyRecord>(workbook.Sheets[workbook.SheetNames[0]], {
      defval: '',
    })
    const rows = raw.map((row) => ({
      registrationNumber: row['N° registro'] || row['Numero registro'] || row['Registro'],
      rut: row['RUT'] || row['Rut'],
      paternalSurname: row['Apellido paterno'] || row['Apellido Paterno'],
      maternalSurname: row['Apellido materno'] || row['Apellido Materno'],
      names: row['Nombres'] || row['Nombre'],
      birthDate: row['Fecha nacimiento'] || row['Fecha de nacimiento'],
      course: row['Curso'],
      workshop: row['Taller'],
      level: row['Nivel'],
      status: String(row['Estado'] || 'activo').toLowerCase(),
      enrollmentYear: row['Año matrícula'] || new Date().getFullYear(),
      primaryDiagnosis: row['Diagnóstico'] || row['Diagnostico'],
    }))
    startTransition(async () => {
      const result = await importStudentsAction(rows)
      setMessage(
        result.ok
          ? `${result.data?.created} registros importados; ${result.data?.skipped} omitidos.`
          : result.error,
      )
      if (result.ok) router.refresh()
    })
  }

  async function exportExcel() {
    const XLSX = await import('xlsx')
    const rows = filtered.map((s: AnyRecord) => ({
      RUT: s.rut,
      'Nombre completo': s.fullName,
      Curso: s.course,
      Taller: s.workshop,
      Diagnóstico: s.educational?.primaryDiagnosis,
      Estado: s.status,
    }))
    const sheet = XLSX.utils.json_to_sheet(rows)
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, 'Estudiantes')
    XLSX.writeFile(book, `base-estudiantes-apandi-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  function remove(student: AnyRecord) {
    if (
      !window.confirm(
        `¿Eliminar el registro de ${student.fullName}? Esta acción requiere confirmación y quedará auditada.`,
      )
    )
      return
    startTransition(async () => {
      const result = await deleteStudentAction(String(student.id))
      setMessage(result.ok ? 'Registro eliminado.' : result.error)
      if (result.ok) router.refresh()
    })
  }

  return (
    <div className="mx-auto max-w-[1480px] space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Base de estudiantes</h2>
          <p className="mt-1 text-sm text-slate-500">{students.length} registros centralizados</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download size={17} /> Exportar
          </button>
          {manager && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(event) => importFile(event.target.files?.[0])}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Upload size={17} /> Importar Excel
              </button>
              <button
                onClick={onNew}
                className="inline-flex items-center gap-2 rounded-xl bg-[#087c78] px-4 py-2.5 text-sm font-semibold text-white"
              >
                <Plus size={17} /> Nuevo estudiante
              </button>
            </>
          )}
        </div>
      </div>
      {message && (
        <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          {pending ? 'Procesando…' : message}
        </div>
      )}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_repeat(3,.55fr)]">
          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-teal-600"
              placeholder="Buscar por nombre, RUT o diagnóstico…"
            />
          </div>
          <Filter
            value={course}
            setValue={setCourse}
            placeholder="Todos los cursos"
            options={courses}
          />
          <Filter
            value={workshop}
            setValue={setWorkshop}
            placeholder="Todos los talleres"
            options={workshops}
          />
          <Filter
            value={status}
            setValue={setStatus}
            placeholder="Todos los estados"
            options={['activo', 'retirado', 'egresado']}
          />
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4">Estudiante</th>
                <th className="px-4 py-4">RUT</th>
                <th className="px-4 py-4">Curso / Taller</th>
                <th className="px-4 py-4">Diagnóstico</th>
                <th className="px-4 py-4">Estado</th>
                <th className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((student: AnyRecord) => (
                <tr key={student.id} className="text-sm hover:bg-slate-50/60">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={student.fullName} />
                      <div>
                        <p className="font-semibold text-slate-800">{student.fullName}</p>
                        <p className="text-xs text-slate-400">
                          Registro {student.registrationNumber}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-medium text-slate-600">{student.rut}</td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-slate-700">{student.course}</p>
                    <p className="text-xs text-slate-400">{student.workshop || 'Sin taller'}</p>
                  </td>
                  <td className="max-w-[210px] truncate px-4 py-4 text-slate-600">
                    {student.educational?.primaryDiagnosis || 'Sin antecedente'}
                  </td>
                  <td className="px-4 py-4">
                    <Status value={student.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <IconButton
                        title="Ver ficha"
                        icon={BookOpen}
                        onClick={() => onView(student)}
                      />
                      <IconButton
                        title="Generar documento"
                        icon={FilePlus2}
                        onClick={() => onDocument(student)}
                      />
                      {manager && (
                        <>
                          <IconButton
                            title="Editar"
                            icon={Pencil}
                            onClick={() => onEdit(student)}
                          />
                          <IconButton
                            title="Eliminar"
                            icon={Trash2}
                            danger
                            onClick={() => remove(student)}
                          />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <Empty
            icon={Search}
            title="Sin resultados"
            text="Ajusta la búsqueda o los filtros seleccionados."
          />
        )}
      </div>
    </div>
  )
}

function Filter({ value, setValue, placeholder, options }: AnyRecord) {
  return (
    <select
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-teal-600"
    >
      <option value="">{placeholder}</option>
      {options.map((option: string) => (
        <option key={option} value={option} className="capitalize">
          {option}
        </option>
      ))}
    </select>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">
      {name
        ?.split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('') || 'ES'}
    </div>
  )
}

function Status({ value }: { value: string }) {
  const style: AnyRecord = {
    activo: 'bg-emerald-50 text-emerald-700',
    retirado: 'bg-amber-50 text-amber-700',
    egresado: 'bg-slate-100 text-slate-600',
    borrador: 'bg-amber-50 text-amber-700',
    finalizado: 'bg-emerald-50 text-emerald-700',
  }
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${style[value] ?? 'bg-slate-100 text-slate-600'}`}
    >
      {value}
    </span>
  )
}

function IconButton({ title, icon: Icon, onClick, danger }: AnyRecord) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`rounded-lg p-2 transition ${danger ? 'text-slate-400 hover:bg-red-50 hover:text-red-600' : 'text-slate-400 hover:bg-teal-50 hover:text-teal-700'}`}
    >
      <Icon size={17} />
    </button>
  )
}

function RutSearch({ students, onView }: AnyRecord) {
  const [query, setQuery] = useState('')
  const normalized = normalizeRut(query)
  const valid = query.length > 5 && isValidRut(query)
  const matches = valid
    ? students.filter((student: AnyRecord) => normalizeRut(student.rut).includes(normalized))
    : []
  return (
    <div className="mx-auto max-w-4xl pt-4">
      <div className="mb-9 text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-teal-700">
          <Search size={27} />
        </div>
        <h2 className="text-3xl font-semibold tracking-tight">Buscar estudiante por RUT</h2>
        <p className="mt-3 text-slate-500">Puedes escribirlo con o sin puntos y guion.</p>
      </div>
      <div className="relative mx-auto max-w-2xl">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white py-5 pl-14 pr-5 text-lg shadow-lg shadow-slate-200/40 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
          placeholder="12.345.678-5"
        />
      </div>
      {query.length > 5 && !valid && (
        <p className="mt-4 text-center text-sm font-medium text-red-600">
          El RUT ingresado no tiene un dígito verificador válido.
        </p>
      )}
      <div className="mt-8 space-y-3">
        {valid &&
          matches.map((student: AnyRecord) => (
            <button
              key={student.id}
              onClick={() => onView(student)}
              className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-teal-300 hover:shadow-md"
            >
              <Avatar name={student.fullName} />
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{student.fullName}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {student.rut} · {student.course} · {student.workshop || 'Sin taller'}
                </p>
              </div>
              <span className="text-sm font-semibold text-teal-700">Ver ficha</span>
            </button>
          ))}
        {valid && !matches.length && (
          <Empty
            icon={Search}
            title="No se encontraron registros"
            text="Verifica el RUT o consulta con administración."
          />
        )}
      </div>
    </div>
  )
}

function DocumentsView({ students, documents, templates, draft, setDraft }: AnyRecord) {
  if (draft)
    return <DocumentEditor draft={draft} students={students} onBack={() => setDraft(null)} />
  return (
    <div className="mx-auto max-w-[1480px] space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Documentación institucional</h2>
        <p className="mt-1 text-sm text-slate-500">
          Selecciona un formato; los datos del estudiante se completarán automáticamente.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template: AnyRecord) => (
          <div
            key={template.id}
            className="group flex min-h-[190px] flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <span className={`rounded-xl px-3 py-2 text-xs font-bold ${template.color}`}>
                {template.short}
              </span>
              <FilePlus2 size={20} className="text-slate-300 group-hover:text-teal-600" />
            </div>
            <h3 className="mt-5 font-semibold text-slate-900">{template.name}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{template.description}</p>
            <div className="mt-auto flex items-center justify-between pt-4">
              <button
                onClick={() => setDraft({ template })}
                className="text-sm font-semibold text-teal-700"
              >
                Completar formato
              </button>
              {template.originalFile?.url && (
                <a
                  href={template.originalFile.url}
                  className="text-xs font-medium text-slate-400 hover:text-slate-700"
                  download
                >
                  Descargar original
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
      <div>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h3 className="text-lg font-semibold">Documentos recientes</h3>
            <p className="text-sm text-slate-500">Historial generado por el equipo</p>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {documents.length ? (
            <div className="divide-y divide-slate-100">
              {documents.slice(0, 8).map((doc: AnyRecord) => {
                const student =
                  typeof doc.student === 'object'
                    ? doc.student
                    : students.find((s: AnyRecord) => s.id === doc.student)
                return (
                  <div key={doc.id} className="flex flex-wrap items-center gap-4 p-4">
                    <div className="rounded-xl bg-slate-50 p-2.5 text-slate-500">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{doc.title}</p>
                      <p className="text-xs text-slate-500">
                        {student?.fullName || 'Estudiante'} ·{' '}
                        {new Intl.DateTimeFormat('es-CL').format(new Date(doc.date))}
                      </p>
                    </div>
                    <Status value={doc.status} />
                    <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-50">
                      <MoreHorizontal size={19} />
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <Empty
              icon={FileText}
              title="Sin documentos generados"
              text="Elige un formato para crear el primero."
            />
          )}
        </div>
      </div>
    </div>
  )
}

function DocumentEditor({ draft, students, onBack }: AnyRecord) {
  const router = useRouter()
  const [studentId, setStudentId] = useState(draft.student?.id ? String(draft.student.id) : '')
  const [status, setStatus] = useState<'borrador' | 'finalizado'>('borrador')
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const selected = students.find((s: AnyRecord) => String(s.id) === studentId)
  const template = draft.template

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return setMessage('Selecciona un estudiante.')
    const form = new FormData(event.currentTarget)
    const content = Object.fromEntries(
      template.sections.map((section: string, index: number) => [
        section,
        String(form.get(`section-${index}`) ?? ''),
      ]),
    )
    startTransition(async () => {
      const result = await saveDocumentAction({
        studentId,
        type: template.id,
        title: `${template.name} — ${selected.fullName}`,
        status,
        date: String(form.get('date')),
        observations: String(form.get('observations') ?? ''),
        responsibleName: String(form.get('responsibleName') ?? ''),
        content,
      })
      setMessage(result.ok ? 'Documento guardado en el historial del estudiante.' : result.error)
      if (result.ok) router.refresh()
    })
  }

  async function buildExport(kind: 'pdf' | 'word') {
    if (!selected) return setMessage('Selecciona un estudiante antes de exportar.')
    const form = document.getElementById('document-form') as HTMLFormElement
    const data = new FormData(form)
    const sections = template.sections.map((section: string, index: number) => ({
      title: section,
      value: String(data.get(`section-${index}`) || 'Sin información registrada.'),
    }))
    if (kind === 'pdf') {
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(15)
      pdf.text('CENTRO DE CAPACITACIÓN LABORAL APANDI', 20, 20)
      pdf.setFontSize(12)
      pdf.text(template.name.toUpperCase(), 20, 30)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.text(`Estudiante: ${selected.fullName}`, 20, 40)
      pdf.text(`RUT: ${selected.rut}   Curso: ${selected.course}`, 20, 46)
      let y = 58
      for (const section of sections) {
        if (y > 260) {
          pdf.addPage()
          y = 20
        }
        pdf.setFont('helvetica', 'bold')
        pdf.text(section.title, 20, y)
        y += 6
        pdf.setFont('helvetica', 'normal')
        const lines = pdf.splitTextToSize(section.value, 170)
        pdf.text(lines, 20, y)
        y += lines.length * 4.5 + 7
      }
      pdf.save(`${template.short}-${selected.rut}.pdf`)
    } else {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx')
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                text: 'CENTRO DE CAPACITACIÓN LABORAL APANDI',
                heading: HeadingLevel.HEADING_1,
              }),
              new Paragraph({ text: template.name, heading: HeadingLevel.HEADING_2 }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Estudiante: ', bold: true }),
                  new TextRun(selected.fullName),
                ],
              }),
              new Paragraph({
                text: `RUT: ${selected.rut} · Curso: ${selected.course} · Taller: ${selected.workshop || '—'}`,
              }),
              ...sections.flatMap((section: AnyRecord) => [
                new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_3 }),
                new Paragraph(section.value),
              ]),
            ],
          },
        ],
      })
      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${template.short}-${selected.rut}.docx`
      anchor.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <button onClick={onBack} className="mb-5 text-sm font-semibold text-teal-700">
        ← Volver a formatos
      </button>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-[#073b3a] p-6 text-white">
          <div className="flex items-start gap-4">
            <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">
              {template.short}
            </span>
            <div>
              <h2 className="text-xl font-semibold">{template.name}</h2>
              <p className="mt-1 text-sm text-teal-50/70">Formato institucional editable</p>
            </div>
          </div>
        </div>
        <form id="document-form" onSubmit={submit} className="space-y-7 p-6 md:p-8">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Estudiante
              <select
                className={inputClass}
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
              >
                <option value="">Seleccionar estudiante</option>
                {students.map((s: AnyRecord) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} · {s.rut}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Fecha"
              name="date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>
          {selected && (
            <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm md:grid-cols-3">
              <Info label="RUT" value={selected.rut} />
              <Info
                label="Curso / taller"
                value={`${selected.course} · ${selected.workshop || '—'}`}
              />
              <Info
                label="Diagnóstico"
                value={selected.educational?.primaryDiagnosis || 'Sin antecedente'}
              />
            </div>
          )}
          <div className="space-y-5">
            {template.sections.map((section: string, index: number) => (
              <label key={section} className="block text-sm font-semibold text-slate-800">
                {index + 1}. {section}
                <textarea
                  name={`section-${index}`}
                  rows={4}
                  className={`${inputClass} resize-y leading-6`}
                  defaultValue={
                    index === 0 && selected
                      ? selected.educational?.strengths || selected.educational?.relevantBackground
                      : index === 1 && selected
                        ? selected.educational?.supportNeeds
                        : ''
                  }
                  placeholder="Complete este apartado…"
                />
              </label>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Responsable / firma"
              name="responsibleName"
              placeholder="Nombre y cargo"
            />
            <label className="text-sm font-medium text-slate-700">
              Observaciones
              <textarea name="observations" rows={3} className={`${inputClass} resize-y`} />
            </label>
          </div>
          {message && (
            <p className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-800">{message}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-6">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option value="borrador">Guardar como borrador</option>
              <option value="finalizado">Marcar finalizado</option>
            </select>
            <button
              disabled={pending}
              className="rounded-xl bg-[#087c78] px-5 py-2.5 text-sm font-semibold text-white"
            >
              {pending ? 'Guardando…' : 'Guardar documento'}
            </button>
            <button
              type="button"
              onClick={() => buildExport('pdf')}
              className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              <Download size={17} /> PDF
            </button>
            <button
              type="button"
              onClick={() => buildExport('word')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              <FileText size={17} /> Word
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              <Printer size={17} /> Imprimir
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function StudentModal({ student, onClose }: { student?: AnyRecord; onClose: () => void }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget).entries())
    startTransition(async () => {
      const result = await saveStudentAction({
        ...data,
        id: student?.id ? String(student.id) : undefined,
      })
      if (!result.ok) return setError(result.error)
      router.refresh()
      onClose()
    })
  }
  const contact = student?.contact ?? {}
  const educational = student?.educational ?? {}
  return (
    <Modal
      title={student ? 'Editar ficha del estudiante' : 'Registrar estudiante'}
      subtitle="Los campos marcados son obligatorios"
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="space-y-7">
        <FormSection title="Identificación personal">
          <Field
            label="N° de registro *"
            name="registrationNumber"
            defaultValue={student?.registrationNumber}
            required
          />
          <Field
            label="RUT *"
            name="rut"
            placeholder="12.345.678-5"
            defaultValue={student?.rut}
            required
          />
          <Field label="Nombres *" name="names" defaultValue={student?.names} required />
          <Field
            label="Apellido paterno *"
            name="paternalSurname"
            defaultValue={student?.paternalSurname}
            required
          />
          <Field
            label="Apellido materno"
            name="maternalSurname"
            defaultValue={student?.maternalSurname}
          />
          <Field label="Nombre social" name="socialName" defaultValue={student?.socialName} />
          <Field
            label="Fecha de nacimiento *"
            name="birthDate"
            type="date"
            defaultValue={student?.birthDate?.slice(0, 10)}
            required
          />
          <SelectField
            label="Género"
            name="gender"
            options={['Femenino', 'Masculino', 'No binario', 'Prefiere no indicar', 'Otro']}
            defaultValue={student?.gender}
          />
          <Field
            label="Nacionalidad"
            name="nationality"
            defaultValue={student?.nationality ?? 'Chilena'}
          />
        </FormSection>
        <FormSection title="Información académica">
          <Field label="Curso *" name="course" defaultValue={student?.course} required />
          <Field label="Nivel" name="level" defaultValue={student?.level} />
          <Field label="Taller laboral" name="workshop" defaultValue={student?.workshop} />
          <Field
            label="Año de matrícula *"
            name="enrollmentYear"
            type="number"
            defaultValue={student?.enrollmentYear ?? new Date().getFullYear()}
            required
          />
          <Field
            label="Fecha de ingreso"
            name="entryDate"
            type="date"
            defaultValue={student?.entryDate?.slice(0, 10)}
          />
          <SelectField
            label="Estado"
            name="status"
            options={[
              { label: 'Activo', value: 'activo' },
              { label: 'Retirado', value: 'retirado' },
              { label: 'Egresado', value: 'egresado' },
            ]}
            defaultValue={student?.status ?? 'activo'}
          />
          <Field
            label="Fecha de evaluación"
            name="evaluationDate"
            type="date"
            defaultValue={student?.evaluationDate?.slice(0, 10)}
          />
          <Field
            label="Fecha de reevaluación"
            name="reevaluationDate"
            type="date"
            defaultValue={student?.reevaluationDate?.slice(0, 10)}
          />
        </FormSection>
        <FormSection title="Antecedentes familiares y contacto">
          <Field label="Domicilio" name="address" defaultValue={contact.address} />
          <Field label="Comuna" name="municipality" defaultValue={contact.municipality} />
          <Field label="Teléfono estudiante" name="phone" defaultValue={contact.phone} />
          <Field
            label="Nombre del apoderado"
            name="guardianName"
            defaultValue={contact.guardianName}
          />
          <Field label="RUT del apoderado" name="guardianRut" defaultValue={contact.guardianRut} />
          <Field
            label="Teléfono del apoderado"
            name="guardianPhone"
            defaultValue={contact.guardianPhone}
          />
          <Field
            label="Correo del apoderado"
            name="guardianEmail"
            type="email"
            defaultValue={contact.guardianEmail}
          />
        </FormSection>
        <FormSection title="Antecedentes educativos" columns={2}>
          <Field
            label="Diagnóstico principal"
            name="primaryDiagnosis"
            defaultValue={educational.primaryDiagnosis}
          />
          <Field
            label="Diagnóstico secundario"
            name="secondaryDiagnosis"
            defaultValue={educational.secondaryDiagnosis}
          />
          {[
            'supportNeeds|Necesidades de apoyo',
            'strengths|Fortalezas del estudiante',
            'pedagogicalObservations|Observaciones pedagógicas',
            'relevantBackground|Antecedentes relevantes',
          ].map((item) => {
            const [name, label] = item.split('|')
            return (
              <label key={name} className="text-sm font-medium text-slate-700">
                {label}
                <textarea
                  className={`${inputClass} resize-y`}
                  rows={4}
                  name={name}
                  defaultValue={educational[name]}
                />
              </label>
            )
          })}
        </FormSection>
        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-white py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600"
          >
            Cancelar
          </button>
          <button
            disabled={pending}
            className="rounded-xl bg-[#087c78] px-5 py-2.5 text-sm font-semibold text-white"
          >
            {pending ? 'Guardando…' : 'Guardar ficha'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function FormSection({
  title,
  children,
  columns = 3,
}: {
  title: string
  children: ReactNode
  columns?: number
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <span className="h-5 w-1 rounded-full bg-teal-600" />
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <div
        className={`grid gap-4 ${columns === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3'}`}
      >
        {children}
      </div>
    </section>
  )
}

function StudentProfile({ student, documents, manager, onClose, onEdit, onDocument }: AnyRecord) {
  const age = Math.floor((Date.now() - new Date(student.birthDate).getTime()) / 31557600000)
  const related = documents.filter(
    (doc: AnyRecord) =>
      String(typeof doc.student === 'object' ? doc.student.id : doc.student) === String(student.id),
  )
  return (
    <Modal
      title="Ficha individual del estudiante"
      subtitle={`Registro ${student.registrationNumber}`}
      onClose={onClose}
      wide
    >
      <div className="mb-7 flex flex-col gap-5 rounded-2xl bg-[#073b3a] p-6 text-white sm:flex-row sm:items-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-xl font-bold">
          {student.fullName
            .split(' ')
            .map((p: string) => p[0])
            .slice(0, 2)
            .join('')}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-semibold">{student.fullName}</h2>
          <p className="mt-1 text-sm text-teal-50/70">
            {student.rut} · {age} años · {student.course}
          </p>
        </div>
        <Status value={student.status} />
      </div>
      <div className="space-y-7">
        <ProfileSection title="Datos personales">
          <Info label="Nombre social" value={student.socialName} />
          <Info
            label="Fecha de nacimiento"
            value={new Intl.DateTimeFormat('es-CL').format(new Date(student.birthDate))}
          />
          <Info label="Género" value={student.gender} />
          <Info label="Nacionalidad" value={student.nationality} />
        </ProfileSection>
        <ProfileSection title="Antecedentes familiares">
          <Info label="Apoderado/a" value={student.contact?.guardianName} />
          <Info label="RUT apoderado" value={student.contact?.guardianRut} />
          <Info label="Teléfono" value={student.contact?.guardianPhone} />
          <Info label="Correo" value={student.contact?.guardianEmail} />
          <Info
            label="Domicilio"
            value={`${student.contact?.address || ''} ${student.contact?.municipality || ''}`}
          />
        </ProfileSection>
        <ProfileSection title="Información académica">
          <Info label="Curso / nivel" value={`${student.course} · ${student.level || '—'}`} />
          <Info label="Taller laboral" value={student.workshop} />
          <Info label="Año matrícula" value={student.enrollmentYear} />
          <Info
            label="Próxima reevaluación"
            value={
              student.reevaluationDate
                ? new Intl.DateTimeFormat('es-CL').format(new Date(student.reevaluationDate))
                : 'Sin programar'
            }
          />
        </ProfileSection>
        <ProfileSection title="Diagnósticos y necesidades de apoyo">
          <Info label="Diagnóstico principal" value={student.educational?.primaryDiagnosis} />
          <Info label="Diagnóstico secundario" value={student.educational?.secondaryDiagnosis} />
          <Info label="Fortalezas" value={student.educational?.strengths} />
          <Info label="Necesidades de apoyo" value={student.educational?.supportNeeds} />
          <Info
            label="Observaciones pedagógicas"
            value={student.educational?.pedagogicalObservations}
          />
        </ProfileSection>
        <ProfileSection title={`Documentos institucionales (${related.length})`}>
          {related.length ? (
            related.map((doc: AnyRecord) => (
              <div key={doc.id} className="rounded-xl border border-slate-100 p-3">
                <p className="text-sm font-semibold">{doc.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {new Intl.DateTimeFormat('es-CL').format(new Date(doc.date))}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">Sin documentos asociados.</p>
          )}
        </ProfileSection>
      </div>
      <div className="mt-8 flex justify-end gap-2 border-t border-slate-100 pt-5">
        {manager && (
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
          >
            <Pencil size={17} /> Editar
          </button>
        )}
        <button
          onClick={onDocument}
          className="inline-flex items-center gap-2 rounded-xl bg-[#087c78] px-4 py-2.5 text-sm font-semibold text-white"
        >
          <FilePlus2 size={17} /> Generar documento
        </button>
      </div>
    </Modal>
  )
}

function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-[0.08em] text-teal-800">
        {title}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  )
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">{value || '—'}</p>
    </div>
  )
}

function UsersView({ users }: { users: AnyRecord[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = await createUserAction({
        name: String(data.get('name')),
        username: String(data.get('username')),
        email: String(data.get('email')),
        password: String(data.get('password')),
        role: String(data.get('role')),
      })
      setMessage(result.ok ? 'Cuenta creada correctamente.' : result.error)
      if (result.ok) {
        setOpen(false)
        router.refresh()
      }
    })
  }
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Cuentas del equipo</h2>
          <p className="mt-1 text-sm text-slate-500">Perfiles y permisos de acceso institucional</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#087c78] px-4 py-2.5 text-sm font-semibold text-white"
        >
          <UserRoundPlus size={18} /> Crear cuenta
        </button>
      </div>
      {message && (
        <p className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-800">{message}</p>
      )}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="divide-y divide-slate-100">
          {users.map((user) => (
            <div key={user.id} className="flex items-center gap-4 p-4">
              <Avatar name={user.name} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800">{user.name}</p>
                <p className="text-sm text-slate-500">
                  @{user.username} · {user.email}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">
                {user.role}
              </span>
              <span
                className={`h-2 w-2 rounded-full ${user.active ? 'bg-emerald-500' : 'bg-slate-300'}`}
              />
            </div>
          ))}
        </div>
      </div>
      {open && (
        <Modal
          title="Crear cuenta de usuario"
          subtitle="La contraseña temporal debe tener al menos 10 caracteres"
          onClose={() => setOpen(false)}
        >
          <form onSubmit={submit} className="space-y-4">
            <Field label="Nombre completo" name="name" required />
            <Field label="Nombre de usuario" name="username" required />
            <Field label="Correo institucional" name="email" type="email" required />
            <Field label="Contraseña temporal" name="password" type="password" required />
            <SelectField
              label="Perfil"
              name="role"
              options={[
                { label: 'Administrador', value: 'administrador' },
                { label: 'Profesor', value: 'profesor' },
                { label: 'Docente', value: 'docente' },
              ]}
            />
            <button
              disabled={pending}
              className="w-full rounded-xl bg-[#087c78] py-3 text-sm font-semibold text-white"
            >
              {pending ? 'Creando…' : 'Crear cuenta'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}

function SettingsView({ user }: { user: AnyRecord }) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Configuración</h2>
        <p className="mt-1 text-sm text-slate-500">Seguridad y preferencias institucionales</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <SettingCard
          icon={ShieldCheck}
          title="Seguridad de la cuenta"
          text={`Sesión protegida por 8 horas. Perfil actual: ${user.role}.`}
        />
        <SettingCard
          icon={Database}
          title="Base de datos"
          text="Información centralizada en Payload Cloud con control de acceso y versiones."
        />
        <SettingCard
          icon={Activity}
          title="Trazabilidad"
          text="Las altas, modificaciones, eliminaciones e importaciones quedan auditadas."
        />
        <SettingCard
          icon={Download}
          title="Copias y exportación"
          text="Exporta la base estudiantil en Excel desde la sección Estudiantes."
        />
      </div>
    </div>
  )
}

function SettingCard({ icon: Icon, title, text }: AnyRecord) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 w-fit rounded-xl bg-teal-50 p-2.5 text-teal-700">
        <Icon size={21} />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  )
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm">
      <div
        className={`max-h-[94vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${wide ? 'max-w-6xl' : 'max-w-lg'}`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function Empty({ icon: Icon, title, text }: AnyRecord) {
  return (
    <div className="grid place-items-center px-5 py-14 text-center">
      <div className="mb-3 rounded-2xl bg-slate-50 p-3 text-slate-300">
        <Icon size={25} />
      </div>
      <p className="font-semibold text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-400">{text}</p>
    </div>
  )
}

export function ApandiApp({ initial }: { initial: InitialState }) {
  if (!initial.authenticated) return <LoginScreen needsSetup={initial.needsSetup} />
  return <ApandiShell initial={initial} />
}
