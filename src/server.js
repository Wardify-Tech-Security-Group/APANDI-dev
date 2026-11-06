import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { ensureEncryptedSeedData } from './config/db.js';
import apiRoutes from './routes/api.routes.js';
import { startAttendanceAlertCron } from './jobs/attendanceAlerts.job.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*' }
});

app.set('io', io);

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir Frontend estático (HTML5 + Tailwind CSS + Vanilla JS)
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// Rutas de la API REST
app.use('/api', apiRoutes);

// Healthcheck endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    sistema: 'SGI APANDI - Educación Especial Nivel Laboral',
    normativa: ['Decreto 83', 'Decreto 170', 'Ley 19.628 AES-256'],
    timestamp: new Date().toISOString()
  });
});

// Conexión en tiempo real para Botón SOS en Aula
io.on('connection', (socket) => {
  console.log(`🔌 [Socket.io SOS] Dispositivo conectado al canal de emergencia PAEC: ${socket.id}`);
});

const PORT = Number(process.env.APP_PORT || 3000);

async function bootstrap() {
  // Esperar y sembrar datos clínicos encriptados en MariaDB
  let retries = 10;
  while (retries > 0) {
    try {
      await ensureEncryptedSeedData();
      break;
    } catch (err) {
      retries -= 1;
      console.log(`⏳ Esperando conexión a MariaDB... (${retries} intentos restantes)`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  startAttendanceAlertCron();

  server.listen(PORT, '0.0.0.0', () => {
    console.log('==================================================================');
    console.log(`🚀 SGI APANDI ejecutándose en: http://localhost:${PORT}`);
    console.log(`🗄️  phpMyAdmin disponible en:  http://localhost:${process.env.PMA_PORT || 8080}`);
    console.log('🔒 Encriptación AES-256-GCM (Ley 19.628) y RBAC activos.');
    console.log('==================================================================');
  });
}

bootstrap();

