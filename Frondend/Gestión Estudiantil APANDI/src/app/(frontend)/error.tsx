'use client'

export default function AppError({ unstable_retry }: { unstable_retry: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f7f8] p-6">
      <section className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">No pudimos cargar esta sección</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Ocurrió un problema temporal. Ningún dato fue modificado.
        </p>
        <button
          onClick={() => unstable_retry()}
          className="mt-6 rounded-xl bg-[#087c78] px-5 py-3 text-sm font-semibold text-white"
        >
          Intentar nuevamente
        </button>
      </section>
    </main>
  )
}
