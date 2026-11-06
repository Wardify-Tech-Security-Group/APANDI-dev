import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'sgi_apandi_super_secret_jwt_key_mineduc_2026_chile';

/**
 * Verifica que la petición contenga un token JWT válido
 */
export function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      ok: false,
      error: 'No autenticado. Debe iniciar sesión en el SGI APANDI.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id_usuario, rut, nombre_completo, rol_codigo, email }
    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      error: 'Sesión expirada o token inválido.'
    });
  }
}

/**
 * Control de Acceso Basado en Roles (RBAC)
 * @param {string[]} allowedRoles Ej: ['ESPECIALISTA_PIE', 'DIRECTOR_UTP', 'DOCENTE']
 */
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Usuario no autenticado' });
    }
    if (!allowedRoles.includes(req.user.rol_codigo)) {
      return res.status(403).json({
        ok: false,
        error: `Acceso denegado (Ley 19.628 / RBAC). Su rol (${req.user.rol_codigo}) no tiene permisos para esta operación. Roles autorizados: ${allowedRoles.join(', ')}`
      });
    }
    next();
  };
}

