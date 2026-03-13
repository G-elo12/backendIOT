// ============================================================
//  Servidor Node.js — WebSocket + Express
//  Instalar: npm install ws express
//  Ejecutar: node server.js
// ============================================================

const express = require('express');
const http    = require('http');
const { WebSocketServer, WebSocket } = require('ws');

// ── Configuración ──────────────────────────────────────────
const PORT = process.env.PORT || 3000;

// ── App Express ────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

app.use(express.json());

// Endpoint REST para enviar comandos desde una UI o curl
// POST /cmd   body: { "cmd": "relay1", "state": 1 }
// POST /cmd   body: { "pin": 7,        "state": 0 }
app.post('/cmd', (req, res) => {
  const { cmd, pin, state } = req.body;

  if (state === undefined) {
    return res.status(400).json({ error: 'Falta el campo state' });
  }

  const payload = JSON.stringify({ type: 'cmd', cmd, pin, state });
  broadcast(payload, 'esp32');  // Enviar sólo al ESP32

  console.log(`[REST→WS] Comando enviado: ${payload}`);
  res.json({ ok: true, payload });
});

// Endpoint de estado simple
app.get('/status', (_req, res) => {
  const clientes = [...clienteMap.values()].map(({ device, ip }) => ({ device, ip }));
  res.json({ clientes, total: clienteMap.size });
});

// ── WebSocket Server ───────────────────────────────────────
const wss = new WebSocketServer({ server });

// Map<WebSocket, {device, ip}> — registro de clientes conectados
const clienteMap = new Map();

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  clienteMap.set(ws, { device: 'unknown', ip });

  timestamp(`Cliente conectado desde ${ip}. Total: ${wss.clients.size}`);

  // ── Evento: mensaje recibido ──────────────────────────────
  ws.on('message', (rawData) => {
    let data;

    try {
      data = JSON.parse(rawData.toString());
    } catch (e) {
      console.error('[JSON] Trama inválida:', rawData.toString());
      return;
    }

    const tipo = data.type;

    switch (tipo) {

      // Registro del dispositivo al conectarse
      case 'register': {
        const device = data.device || 'unknown';
        clienteMap.set(ws, { device, ip });
        timestamp(`Dispositivo registrado: ${device} (${ip})`);
        // Confirmar al cliente
        enviar(ws, { type: 'ack', msg: `Bienvenido, ${device}` });
        break;
      }

      // Datos de sensores del ESP32/Arduino
      case 'sensor_data': {
        const { sensors, uptime_ms } = data;
        timestamp(
          `[${data.device || 'esp32'}] ` +
          `A0=${sensors.analog0} A1=${sensors.analog1} ` +
          `D2=${sensors.digital2} D3=${sensors.digital3} ` +
          `| uptime=${uptime_ms}ms`
        );

        // Reenviar a todos los clientes dashboard (no esp32)
        broadcast(JSON.stringify(data), 'dashboard');
        break;
      }

      // Keep-alive del ESP32
      case 'ping':
        enviar(ws, { type: 'pong' });
        break;

      default:
        console.log(`[WS] Tipo desconocido: ${tipo}`);
    }
  });

  // ── Evento: desconexión ───────────────────────────────────
  ws.on('close', (code, reason) => {
    const info = clienteMap.get(ws) || {};
    timestamp(`Desconectado: ${info.device || 'unknown'} (${info.ip}) — código ${code}`);
    clienteMap.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('[WS] Error de socket:', err.message);
  });
});

// ── Helpers ────────────────────────────────────────────────

/**
 * Envía un objeto JSON a un cliente específico.
 */
function enviar(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

/**
 * Envía un mensaje a todos los clientes de un rol determinado.
 * targetDevice: 'esp32' | 'dashboard' | '*'
 */
function broadcast(payload, targetDevice = '*') {
  for (const [ws, info] of clienteMap.entries()) {
    if (ws.readyState !== WebSocket.OPEN) continue;
    if (targetDevice !== '*' && info.device !== targetDevice) continue;
    ws.send(payload);
  }
}

/**
 * Log con timestamp ISO.
 */
function timestamp(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

// ── Arrancar servidor ──────────────────────────────────────
server.listen(PORT, () => {
  timestamp(`Servidor escuchando en http://localhost:${PORT}`);
  timestamp(`WebSocket disponible en ws://localhost:${PORT}`);
  console.log('──────────────────────────────────────────────');
  console.log('  POST /cmd   {"cmd":"relay1","state":1}');
  console.log('  GET  /status');
  console.log('──────────────────────────────────────────────');
});