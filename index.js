<<<<<<< HEAD
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

// ── Estado global (se mantiene en memoria) ─────────────────
const estadoRelays = {};   // { relay1: 1, relay2: 0 }
const estadoPines  = {};   // { 5: 1, 6: 0, 7: 0, 8: 1 }

// ── Endpoints REST ─────────────────────────────────────────

// POST /cmd   body: { "cmd": "relay1", "state": 1 }
// POST /cmd   body: { "pin": 7,        "state": 0 }
app.post('/cmd', (req, res) => {
  const { cmd, pin, state } = req.body;

  if (state === undefined) {
    return res.status(400).json({ error: 'Falta el campo state' });
  }

  // Guardar estado en memoria
  if (cmd !== undefined) estadoRelays[cmd] = state;
  if (pin !== undefined) estadoPines[pin]  = state;

  const payload = JSON.stringify({ type: 'cmd', cmd, pin, state });

  broadcast(payload, 'esp32');      // comando al ESP32
  broadcast(payload, 'dashboard');  // ← sincronizar todos los dashboards

  timestamp(`[REST→WS] Comando: ${payload}`);
  res.json({ ok: true, payload });
});

// GET /status — clientes conectados
=======
const express = require("express")
const http = require("http")
const {WebSocketServer,WebSocket} = require("ws")

const PORT = process.env.PORT || 3000;

const app = express()
const server = http.createServer(app)

app.use(express.json())

let estadoBomba = false
let datosSensores = {temperatura:null,ph:null,nivel:null}
const notificaciones = []

app.post("/cmd",(req,res)=>{
  const {bomba}=req.body

  if(typeof bomba !== "boolean"){
    return res.status(400).json({error:'Falta el campo "bomba" (true o false)' })
  }

  estadoBomba = bomba

  const payload = JSON.stringify({ type: 'cmd', bomba: estadoBomba })
  broadcast(payload, 'esp32');     
  broadcast(payload, 'dashboard');
  timestamp(`[REST→WS] Comando: Bomba ${estadoBomba ? 'ENCENDIDA' : 'APAGADA'}`);
  res.json({ ok: true, bomba: estadoBomba });
})

>>>>>>> a0dc576 (Primer commit: Estructura inicial del backend IOT)
app.get('/status', (_req, res) => {
  const clientes = [...clienteMap.values()].map(({ device, ip }) => ({ device, ip }));
  res.json({ clientes, total: clienteMap.size });
});

<<<<<<< HEAD
// GET /state — estado actual de relays y pines
// Útil para que un dashboard nuevo se sincronice al conectarse
app.get('/state', (_req, res) => {
  res.json({ relays: estadoRelays, pins: estadoPines });
});

// ── WebSocket Server ───────────────────────────────────────
const wss       = new WebSocketServer({ server });
=======
app.get('/state', (_req, res) => {
  res.json({ bomba: estadoBomba, sensores: datosSensores });
});

app.get('/notifications', (_req, res) => {
  res.json({ notificaciones });
});

function evaluarNotificaciones(temperatura, ph, nivel) {
  let alerta = null;

  
  if (temperatura > 30) alerta = `Alerta: Temperatura alta (${temperatura}°C)`;
  else if (ph < 6.0 || ph > 8.0) alerta = `Alerta: pH fuera de rango normal (${ph})`;
  else if (nivel < 20) alerta = `Alerta: Nivel de agua muy bajo (${nivel}%)`;

  if (alerta) {
    const nuevaNotificacion = {
      id: Date.now(),
      mensaje: alerta,
      fecha: new Date().toISOString()
    };
    
    notificaciones.push(nuevaNotificacion);
    if (notificaciones.length > 50) notificaciones.shift();

    broadcast(JSON.stringify({ type: 'notification', data: nuevaNotificacion }), 'dashboard');
    timestamp(`[NOTIFICACIÓN] ${alerta}`);
  }
}

const wss        = new WebSocketServer({ server });
>>>>>>> a0dc576 (Primer commit: Estructura inicial del backend IOT)
const clienteMap = new Map();

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  clienteMap.set(ws, { device: 'unknown', ip });
  timestamp(`Cliente conectado desde ${ip}. Total: ${wss.clients.size}`);

  ws.on('message', (rawData) => {
    let data;
    try {
      data = JSON.parse(rawData.toString());
    } catch (e) {
      console.error('[JSON] Trama inválida:', rawData.toString());
      return;
    }

    switch (data.type) {

      case 'register': {
<<<<<<< HEAD
        const device = data.device || 'unknown';
        clienteMap.set(ws, { device, ip });
        timestamp(`Dispositivo registrado: ${device} (${ip})`);

        // Confirmar registro
        enviar(ws, { type: 'ack', msg: `Bienvenido, ${device}` });

        // Si es un dashboard, enviarle el estado actual para sincronizar
        if (device === 'dashboard') {
          enviar(ws, {
            type:   'state_sync',
            relays: estadoRelays,
            pins:   estadoPines,
          });
          timestamp(`[SYNC] Estado enviado a nuevo dashboard (${ip})`);
=======
        const device = data.device || 'unknown'; 
        timestamp(`Dispositivo registrado: ${device} (${ip})`);

        enviar(ws, { type: 'ack', msg: `Bienvenido, ${device}` });

        if (device === 'dashboard') {
          enviar(ws, {
            type:   'state_sync',
            bomba:  estadoBomba,
            sensores: datosSensores
          });
          timestamp(`[SYNC] Estado enviado a la nueva app (${ip})`);
>>>>>>> a0dc576 (Primer commit: Estructura inicial del backend IOT)
        }
        break;
      }

      case 'sensor_data': {
<<<<<<< HEAD
        const { sensors, uptime_ms } = data;
        timestamp(
          `[${data.device || 'esp32'}] ` +
          `A0=${sensors.analog0} A1=${sensors.analog1} ` +
          `D2=${sensors.digital2} D3=${sensors.digital3} ` +
          `| uptime=${uptime_ms}ms`
        );
        broadcast(JSON.stringify(data), 'dashboard');
=======

        const { temperatura, ph, nivel } = data;

        datosSensores = { temperatura, ph, nivel };

        timestamp(`[${data.device || 'esp32'}] Temp=${temperatura}°C | pH=${ph} | Nivel=${nivel}%`);
        broadcast(JSON.stringify({ type: 'sensor_data', sensores: datosSensores }), 'dashboard');
        evaluarNotificaciones(temperatura, ph, nivel);
>>>>>>> a0dc576 (Primer commit: Estructura inicial del backend IOT)
        break;
      }

      case 'ping':
        enviar(ws, { type: 'pong' });
        break;

      default:
        console.log(`[WS] Tipo desconocido: ${data.type}`);
    }
  });

  ws.on('close', (code) => {
    const info = clienteMap.get(ws) || {};
    timestamp(`Desconectado: ${info.device || 'unknown'} (${info.ip}) — código ${code}`);
    clienteMap.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('[WS] Error de socket:', err.message);
  });
});

<<<<<<< HEAD
// ── Helpers ────────────────────────────────────────────────
=======
>>>>>>> a0dc576 (Primer commit: Estructura inicial del backend IOT)
function enviar(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

function broadcast(payload, targetDevice = '*') {
  for (const [ws, info] of clienteMap.entries()) {
    if (ws.readyState !== WebSocket.OPEN) continue;
    if (targetDevice !== '*' && info.device !== targetDevice) continue;
    ws.send(payload);
  }
}

function timestamp(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

<<<<<<< HEAD
// ── Arrancar servidor ──────────────────────────────────────
=======
>>>>>>> a0dc576 (Primer commit: Estructura inicial del backend IOT)
server.listen(PORT, () => {
  timestamp(`Servidor escuchando en http://localhost:${PORT}`);
  timestamp(`WebSocket disponible en ws://localhost:${PORT}`);
  console.log('──────────────────────────────────────────────');
<<<<<<< HEAD
  console.log('  POST /cmd    {"cmd":"relay1","state":1}');
  console.log('  POST /cmd    {"pin":7,"state":0}');
  console.log('  GET  /status');
  console.log('  GET  /state');
=======
  console.log('  POST /cmd            {"bomba": true/false}');
  console.log('  GET  /state          Estado de bomba y sensores');
  console.log('  GET  /notifications  Historial de alertas');
  console.log('  GET  /status         Clientes conectados');
>>>>>>> a0dc576 (Primer commit: Estructura inicial del backend IOT)
  console.log('──────────────────────────────────────────────');
});