import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Estándar NIST para AES-GCM

/**
 * Obtiene la clave maestra de 32 bytes (256 bits) desde las variables de entorno
 */
function getSecretKey() {
  const hexKey = process.env.AES_MASTER_KEY || '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
  if (hexKey.length === 64) {
    return Buffer.from(hexKey, 'hex');
  }
  return crypto.createHash('sha256').update(hexKey).digest();
}

/**
 * Encripta texto sensible con AES-256-GCM (Cumplimiento Ley 19.628 Chile)
 * Formato almacenado: iv_hex:authTag_hex:cipherText_hex
 * @param {string} plainText
 * @returns {string}
 */
export function encryptAES256(plainText) {
  if (!plainText) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getSecretKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(String(plainText), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Desencripta texto cifrado con AES-256-GCM
 * @param {string} encryptedPayload
 * @returns {string}
 */
export function decryptAES256(encryptedPayload) {
  if (!encryptedPayload || !encryptedPayload.includes(':')) return encryptedPayload || '';
  try {
    const [ivHex, authTagHex, encryptedText] = encryptedPayload.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getSecretKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('[Seguridad Ley 19.628] Error al desencriptar campo sensible:', error.message);
    return '[DATO PROTEGIDO / ERROR DE LLAVE]';
  }
}

/**
 * Genera el sello criptográfico SHA-256 para la Firma Electrónica Simple del Libro de Clases
 */
export function createSignatureHash({ idClase, idDocente, fechaClase, pin }) {
  const payload = `${idClase}|${idDocente}|${fechaClase}|${pin}|${Date.now()}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

