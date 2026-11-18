// POST /api/tukar  {kode}  ->  {ok:true, hari:30}  atau 404 bila salah / sudah dipakai
const { redis, hashKode, normal } = require("../lib/kode");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false, pesan: "Metode tidak diizinkan." });
  try {
    // Batasi tebak-tebakan: maks 15 percobaan per IP per 10 menit
    const ip = String(req.headers["x-forwarded-for"] || "x").split(",")[0].trim();
    const rk = "rl:" + ip;
    const n = await redis("INCR", rk);
    if (n === 1) await redis("EXPIRE", rk, 600);
    if (n > 15) return res.status(429).json({ ok: false, pesan: "Terlalu banyak percobaan. Coba lagi 10 menit lagi." });

    const kode = normal(req.body && req.body.kode);
    const salah = () => res.status(404).json({ ok: false, pesan: "Kode tidak valid atau sudah pernah dipakai." });
    if (kode.length !== 12) return salah();

    // GETDEL = ambil + hapus dalam satu langkah atomik.
    // Kalau dua orang menukar kode yang sama bersamaan, hanya satu yang dapat nilainya.
    const val = await redis("GETDEL", "kode:" + hashKode(kode));
    const hari = parseInt(val, 10);
    if (!hari || hari <= 0) return salah();
    return res.status(200).json({ ok: true, hari });
  } catch (e) {
    return res.status(500).json({ ok: false, pesan: "Server kode sedang bermasalah. Coba lagi sebentar ya." });
  }
};
