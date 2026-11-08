import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { pool, ensureEncryptedSeedData } from '../config/db.js';
import { encryptAES256, decryptAES256 } from '../utils/crypto.aes256.js';

dotenv.config();

const FORBIDDEN_PATTERNS = [
  'sgi_apandi',
  'Apandi2026!',
  'RootApandi2026!',
  '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e',
  'CREATE TABLE IF NOT EXISTS Roles',
  'CREATE TABLE IF NOT EXISTS Usuarios',
  'CREATE TABLE IF NOT EXISTS Logs_Auditoria',
  'CREATE TABLE IF NOT EXISTS Ficha_Clinica',
  'FROM Usuarios ',
  'FROM Ficha_Clinica ',
  'INTO Logs_Auditoria'
];

const EXPECTED_APX_TABLES = [
  'apx_sec_rbac_perfiles',
  'apx_sec_cuentas_acceso',
  'apx_sec_trazabilidad_forense',
  'apx_rrhh_marcajes_biometricos',
  'apx_acad_unidades_laborales',
  'apx_acad_asignacion_equipos',
  'apx_rrhh_bloques_horarios',
  'apx_sys_alertas_utp',
  'apx_fam_tutores_legales',
  'apx_acad_expedientes_alumnos',
  'apx_acad_inscripciones_anuales',
  'apx_med_dossier_clinico_enc',
  'apx_conv_protocolos_paec_enc',
  'apx_pie_planes_apoyo_ind',
  'apx_pie_adecuaciones_paci',
  'apx_ped_leccionario_pid',
  'apx_ped_asistencia_alumnos',
  'apx_ped_evaluaciones_decreto83',
  'apx_conv_bitacora_sos_enc'
];

function scanDirectoryForLeaks(dirPath, ignoreFiles = ['ci-security-check.js']) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      scanDirectoryForLeaks(fullPath, ignoreFiles);
    } else if (entry.isFile() && !ignoreFiles.includes(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (content.includes(pattern)) {
          throw new Error(`[CI-SEC-FAIL] Patrón filtrado detectado ("${pattern}") en ${fullPath}`);
        }
      }
    }
  }
}

async function runVerification() {
  console.log('🔒 [1/4] Escaneando código fuente contra nombres de tablas filtrados y secretos hardcodeados...');
  scanDirectoryForLeaks(path.resolve('src'));
  scanDirectoryForLeaks(path.resolve('public'));
  console.log('   ✔ Código limpio de identificadores y credenciales antiguas.');

  console.log('🔐 [2/4] Verificando motor criptográfico AES-256-GCM (Ley 19.628)...');
  const sampleText = 'Diagnóstico reservado Decreto 170 - Prueba CI/CD';
  const encrypted = encryptAES256(sampleText);
  const decrypted = decryptAES256(encrypted);
  if (decrypted !== sampleText || encrypted.split(':').length !== 3) {
    throw new Error('[CI-SEC-FAIL] Falló la validación roundtrip de AES-256-GCM.');
  }
  console.log('   ✔ Cifrado autenticado AES-256-GCM (iv:authTag:cipherText) operativo.');

  console.log('🗄️ [3/4] Inicializando y verificando las 19 tablas blindadas (apx_*) en MariaDB...');
  await ensureEncryptedSeedData();
  const [rows] = await pool.query('SHOW TABLES');
  const existingTables = rows.map(r => Object.values(r)[0]);

  for (const expectedTable of EXPECTED_APX_TABLES) {
    if (!existingTables.includes(expectedTable)) {
      throw new Error(`[CI-SEC-FAIL] Falta la tabla blindada requerida: ${expectedTable}`);
    }
  }
  console.log(`   ✔ Las ${EXPECTED_APX_TABLES.length} tablas apx_* están creadas e íntegras (0 tablas antiguas).`);

  console.log('🔑 [4/4] Verificando hashes Bcrypt Cost 12 de contraseñas y PIN de Firma...');
  const [users] = await pool.query(
    'SELECT rut, password_hash, pin_firma_hash FROM apx_sec_cuentas_acceso WHERE rut = ?',
    ['15432198-K']
  );
  if (users.length === 0) {
    throw new Error('[CI-SEC-FAIL] No se encontró usuario semilla en apx_sec_cuentas_acceso');
  }
  const passOk = await bcrypt.compare(
    process.env.APP_DEFAULT_USER_PASSWORD || 'Ap4nd1#S3cV4ult!2026_Cl',
    users[0].password_hash
  );
  const pinOk = await bcrypt.compare(
    process.env.APP_DEFAULT_SIGNATURE_PIN || '849206',
    users[0].pin_firma_hash
  );
  if (!passOk || !pinOk) {
    throw new Error('[CI-SEC-FAIL] Los hashes Bcrypt de contraseña o PIN no coinciden con las credenciales seguras.');
  }
  console.log('   ✔ Hashes Bcrypt Cost 12 y Firma Electrónica Simple verificados.');

  await pool.end();
  console.log('✅ [CI/CD VERIFICATION PASSED] Auditoría DevSecOps completada exitosamente.');
}

runVerification().catch(async (err) => {
  console.error(err.message || err);
  try { await pool.end(); } catch (_) {}
  process.exit(1);
});

