/* =====================================================================
   Smart-Classroom Anti-Distraksi — script.js

"use strict";

/* ---------- KONFIGURASI PENTING ---------- */
// ⚠️ WAJIB DIGANTI dengan kredensial dari dashboard akun EmailJS kamu!
const CONFIG = {
  TEACHER_EMAIL: "h1101251071@student.untan.ac.id", 
  EMAILJS_SERVICE_ID:  "service_0farm3d",    // <- Ganti ini
  EMAILJS_TEMPLATE_ID: "template_li7y1bn",   // <- Ganti ini
  EMAILJS_PUBLIC_KEY:  "I9z2sELFHPtfPMOrt",    // <- Ganti ini
};

const DUMMY_NAMES = ["Bella", "Dimas", "Farhan", "Gita", "Hana", "Intan", "Joko", "Laras"];
const COLORS = ["#5b6cff", "#d9534f", "#b05fd1", "#2a9bb5", "#7a8a2e", "#c0508a"];

const $ = (id) => document.getElementById(id);
const state = { stream: null, inRoom: false, locked: false, token: null, name: "Saya", attempts: 0 };

/* ---------- EmailJS ---------- */
function initEmail() {
  if (window.emailjs) emailjs.init({ publicKey: CONFIG.EMAILJS_PUBLIC_KEY });
}

async function sendTokenEmail(token) {
  const status = $("mailStatus");
  if (!window.emailjs) { status.textContent = "Layanan email tidak termuat. Hubungi guru."; return; }
  status.textContent = "Mengirim token ke guru…";
  try {
    await emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ID, {
      to_email: CONFIG.TEACHER_EMAIL,
      token,
      student_name: state.name,
      time: new Date().toLocaleString("id-ID"),
      message: `${state.name} meninggalkan halaman kelas. Token pembuka: ${token}`,
    });
    status.textContent = "Token sudah dikirim ke guru.";
  } catch (err) {
    console.error("EmailJS gagal:", err);
    status.textContent = "Token gagal dikirim. Periksa kredensial EmailJS atau hubungi guru.";
  }
}

/* ---------- Token ---------- */
function generateToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint32Array(4);
  crypto.getRandomValues(buf);
  return "EDU-" + Array.from(buf, (n) => chars[n % chars.length]).join("");
}

/* ---------- Kamera ---------- */
async function startCamera() {
  const box = document.querySelector(".preview");
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    $("lobbyVideo").srcObject = state.stream;
    box.classList.add("live");
  } catch (err) {
    console.warn("Kamera tidak tersedia:", err);
    $("lobbyMsg").textContent = "Kamera/mic tidak bisa diakses. Izinkan akses di browser, atau lanjut tanpa kamera.";
  }
}

/* ---------- Main Room ---------- */
function buildGrid() {
  const grid = $("grid");
  grid.replaceChildren();

  const me = document.createElement("div");
  me.className = "tile self";
  me.id = "selfTile";
  me.innerHTML = '<div class="avatar" id="selfAvatar"></div><video autoplay muted playsinline></video><span class="tag"></span>';
  me.querySelector(".avatar").style.background = COLORS[0];
  me.querySelector(".avatar").textContent = state.name[0].toUpperCase();
  me.querySelector(".tag").textContent = state.name + " (Anda)";
  const v = me.querySelector("video");
  if (state.stream) v.srcObject = state.stream; else v.hidden = true;
  grid.appendChild(me);

  const names = [...DUMMY_NAMES].sort(() => Math.random() - 0.5).slice(0, 9);
  names.forEach((n, i) => {
    const t = document.createElement("div");
    t.className = "tile";
    const a = document.createElement("div");
    a.className = "avatar";
    a.style.background = COLORS[(i + 1) % COLORS.length];
    a.textContent = n[0];
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = n;
    t.append(a, tag);
    grid.appendChild(t);
  });
}

function toggleTrack(kind, btn, label) {
  const tracks = state.stream ? (kind === "audio" ? state.stream.getAudioTracks() : state.stream.getVideoTracks()) : [];
  const off = btn.getAttribute("aria-pressed") !== "true";
  tracks.forEach((t) => (t.enabled = !off));
  btn.setAttribute("aria-pressed", String(off));
  btn.textContent = off ? label + " mati" : label;
  if (kind === "video") {
    const v = document.querySelector("#selfTile video");
    if (v) v.style.visibility = off ? "hidden" : "visible";
  }
}

function toggleHand() {
  const btn = $("handBtn");
  const on = btn.getAttribute("aria-pressed") !== "true";
  btn.setAttribute("aria-pressed", String(on));
  const tile = $("selfTile");
  tile.querySelector(".hand")?.remove();
  if (on) { const h = document.createElement("span"); h.className = "hand"; h.textContent = "Tangan terangkat"; tile.appendChild(h); }
}

let clockTimer;
function startClock() {
  const t0 = Date.now();
  clearInterval(clockTimer);
  clockTimer = setInterval(() => {
    const s = Math.floor((Date.now() - t0) / 1000);
    $("clock").textContent = String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }, 1000);
}

function joinRoom() {
  state.name = $("nameInput").value.trim() || "Saya";
  buildGrid();
  $("lobby").hidden = true;
  $("room").hidden = false;
  state.inRoom = true;
  startClock();
}

function leaveRoom() {
  state.inRoom = false;
  clearInterval(clockTimer);
  $("room").hidden = true;
  $("lobby").hidden = false;
  if (state.stream) $("lobbyVideo").srcObject = state.stream;
}

/* ---------- ANTI-DISTRAKSI ---------- */
function lockSession() {
  if (!state.inRoom || state.locked) return;
  state.locked = true;
  state.attempts = 0;
  state.token = generateToken();
  $("tokenInput").value = "";
  $("tokenError").textContent = "";
  $("lockOverlay").hidden = false;
  $("mailStatus").textContent = "";
  sendTokenEmail(state.token);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) lockSession();
});

/* ---------- Buka kunci ---------- */
function tryUnlock() {
  const input = $("tokenInput").value.trim().toUpperCase();
  if (input && input === state.token) {
    state.locked = false;
    state.token = null;
    $("lockOverlay").hidden = true;
  } else {
    state.attempts++;
    $("tokenError").textContent = "Token salah. Minta token terbaru dari guru." + (state.attempts > 2 ? ` (${state.attempts} percobaan)` : "");
    const card = document.querySelector(".lock-card");
    card.classList.remove("shake"); void card.offsetWidth; card.classList.add("shake");
  }
}

/* ---------- Event ---------- */
window.addEventListener("DOMContentLoaded", () => {
  initEmail();
  startCamera();
  $("joinBtn").addEventListener("click", joinRoom);
  $("leaveBtn").addEventListener("click", leaveRoom);
  $("micBtn").addEventListener("click", (e) => toggleTrack("audio", e.currentTarget, "Mic"));
  $("camBtn").addEventListener("click", (e) => toggleTrack("video", e.currentTarget, "Kamera"));
  $("handBtn").addEventListener("click", toggleHand);
  $("unlockBtn").addEventListener("click", tryUnlock);
  $("tokenInput").addEventListener("keydown", (e) => { if (e.key === "Enter") tryUnlock(); });
});