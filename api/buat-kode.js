// POST /api/buat-kode  (khusus penjual)
// Header: Authorization: Bearer <ADMIN_SECRET>   Body: {"jumlah":5,"hari":30}
const crypto = require("crypto");
const { simpanKode } = require("../lib/kode");

const sama = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const admin = process.env.ADMIN_SECRET;
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (req.method !== "POST" || !admin || !sama(token, admin)) return res.status(401).json({ ok: false });
  try {
    const jumlah = Math.min(Math.max(parseInt(req.body && req.body.jumlah, 10) || 1, 1), 50);
    const hari = Math.min(Math.max(parseInt(req.body && req.body.hari, 10) || 30, 1), 365);
    const kode = [];
    for (let i = 0; i < jumlah; i++) kode.push(await simpanKode(hari));
    return res.status(200).json({ ok: true, hari, kode });
  } catch (e) {
    return res.status(500).json({ ok: false, pesan: String(e.message || e) });
  }
};
