const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Serve static files (index.html, images)
app.use(express.static(path.join(__dirname)));

// In-memory state for both sets
const state = {
  set1: {},
  set2: {},
};

// Broadcast to all connected clients except sender
function broadcast(data, senderWs) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client !== senderWs && client.readyState === 1) {
      client.send(msg);
    }
  });
}

wss.on('connection', (ws) => {
  // Send current state to newly connected client
  ws.send(JSON.stringify({ type: 'init', state }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);

      if (msg.type === 'update') {
        // msg: { type: 'update', setId: 1|2, panelNum: N, stage: string|null }
        const key = `set${msg.setId}`;
        if (msg.stage === null) {
          delete state[key][msg.panelNum];
        } else {
          state[key][msg.panelNum] = msg.stage;
        }
        broadcast(msg, ws);
      } else if (msg.type === 'reset') {
        // msg: { type: 'reset', setId: 1|2 }
        const key = `set${msg.setId}`;
        state[key] = {};
        broadcast(msg, ws);
      }
    } catch (e) {
      // ignore malformed messages
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
