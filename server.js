const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Railway پورت رو خودش از طریق متغیر محیطی PORT می‌ده
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// آخرین وضعیت اتصال دستگاه (برای نمایش در صفحه)
let lastSeen = null;

// ------------------- دریافت دیتا از ESP8266 -------------------
app.post('/ecg', (req, res) => {
  const { device_id, sample_rate, lead_off, millis, samples } = req.body;

  if (!Array.isArray(samples)) {
    return res.status(400).json({ error: 'فرمت داده نامعتبر است' });
  }

  lastSeen = Date.now();

  const payload = JSON.stringify({
    type: 'ecg_batch',
    device_id,
    sample_rate,
    lead_off,
    device_millis: millis,
    samples,
    server_time: lastSeen
  });

  // پخش به تمام کلاینت‌های وب متصل
  wss.clients.forEach((client) => {
    if (client.readyState === 1 /* OPEN */) {
      client.send(payload);
    }
  });

  res.status(200).json({ status: 'ok', received: samples.length });
});

// ------------------- وضعیت سلامت سرور -------------------
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    lastSeen,
    secondsSinceLastData: lastSeen ? Math.round((Date.now() - lastSeen) / 1000) : null
  });
});

server.listen(PORT, () => {
  console.log(`سرور روی پورت ${PORT} در حال اجراست`);
});
