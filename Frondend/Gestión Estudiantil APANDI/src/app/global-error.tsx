'use client'

export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <html lang="es">
      <body>
        <main
          style={{
            alignItems: 'center',
            background: '#f4f7f8',
            display: 'flex',
            fontFamily: 'system-ui, sans-serif',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: 24,
          }}
        >
          <section
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 20,
              maxWidth: 480,
              padding: 32,
              textAlign: 'center',
            }}
          >
            <h1 style={{ color: '#0f172a', fontSize: 24, margin: 0 }}>No pudimos cargar APANDI</h1>
            <p style={{ color: '#64748b', lineHeight: 1.6, margin: '12px 0 24px' }}>
              Ocurrió un problema temporal. Ningún dato fue modificado.
            </p>
            <button
              onClick={() => unstable_retry()}
              style={{
                background: '#087c78',
                border: 0,
                borderRadius: 12,
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
                padding: '12px 18px',
              }}
            >
              Intentar nuevamente
            </button>
          </section>
        </main>
      </body>
    </html>
  )
}
