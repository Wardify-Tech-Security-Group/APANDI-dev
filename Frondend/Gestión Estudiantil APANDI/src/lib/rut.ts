export const normalizeRut = (value: string) =>
  value.replace(/\./g, '').replace(/-/g, '').trim().toUpperCase()

export const isValidRut = (value: string) => {
  const rut = normalizeRut(value)
  if (!/^\d{7,8}[0-9K]$/.test(rut)) return false
  const body = rut.slice(0, -1)
  const provided = rut.slice(-1)
  let sum = 0
  let multiplier = 2
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }
  const result = 11 - (sum % 11)
  const expected = result === 11 ? '0' : result === 10 ? 'K' : String(result)
  return provided === expected
}

export const formatRut = (value: string) => {
  const rut = normalizeRut(value)
  if (rut.length < 2) return rut
  const body = rut.slice(0, -1)
  const verifier = rut.slice(-1)
  return `${Number(body).toLocaleString('es-CL')}-${verifier}`
}
