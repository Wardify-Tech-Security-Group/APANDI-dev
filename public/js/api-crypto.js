/** Utilidades de RUT y conversión de bytes para APANDI. */

window.ApandiCrypto = {
  // Nota de seguridad: La llave maestra AES-256-GCM reside exclusivamente en el servidor (.env)
  hexToBytes: function (hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
  },

  bytesToHex: function (bytes) {
    return Array.from(bytes)
      .map(function (b) {
        return b.toString(16).padStart(2, '0');
      })
      .join('');
  },

  // Migrado desde Frondend/src/lib/rut.ts
  normalizeRut: function (value) {
    return String(value || '')
      .replace(/\./g, '')
      .replace(/-/g, '')
      .trim()
      .toUpperCase();
  },

  isValidRut: function (value) {
    const rut = this.normalizeRut(value);
    if (!/^\d{7,8}[0-9K]$/.test(rut)) return false;
    const body = rut.slice(0, -1);
    const provided = rut.slice(-1);
    let sum = 0;
    let multiplier = 2;
    for (let index = body.length - 1; index >= 0; index -= 1) {
      sum += Number(body[index]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    const result = 11 - (sum % 11);
    const expected = result === 11 ? '0' : result === 10 ? 'K' : String(result);
    return provided === expected;
  },

  formatRut: function (rut) {
    const clean = String(rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
    if (clean.length < 2) return clean;
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    return body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
  }
};

