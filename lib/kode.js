// Util bersama: koneksi Redis (Upstash), hashing, dan pembuat kode sekali pakai
const crypto = require("crypto");

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

async function redis(...cmd) {
  if (!URL_ || !TOKEN) throw new Error("Redis belum dikonfigurasi");
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const d = await r.json();
  if (!r.ok || d.error) throw new Error(d.error || "redis " + r.status);
  return d.result;
}

// Kode tidak disimpan polos: yang tersimpan hanya hash-nya (HMAC dengan KODE_SECRET)
function hashKode(kode) {
  const secret = process.env.KODE_SECRET;
  if (!secret) throw new Error("KODE_SECRET belum diisi");
  return crypto.createHmac("sha256", secret).update(kode).digest("hex");
}

const normal = (x) => String(x || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

// 12 karakter dari 32 huruf/angka (tanpa 0,O,1,I) = sekitar 60 bit, mustahil ditebak
const ALF = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const acak = () => Array.from({ length: 12 }, () => ALF[crypto.randomInt(ALF.length)]).join("");
const tampil = (k) => k.match(/.{4}/g).join("-");

async function simpanKode(hari) {
  for (;;) {
    const k = acak();
    const ok = await redis("SET", "kode:" + hashKode(k), String(hari), "NX");
    if (ok === "OK") return tampil(k);
  }
}

module.exports = { redis, hashKode, normal, simpanKode };
