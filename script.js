/* =====================================================================
   Smart-Classroom Anti-Distraksi — script.js
   ===================================================================== */

"use strict";

/* ---------- KONFIGURASI EMAILJS (JANGAN DIUBAH) ---------- */
const CONFIG = {
  TEACHER_EMAIL: "h1101251071@student.untan.ac.id", 
  EMAILJS_SERVICE_ID:  "service_0farm3d",
  EMAILJS_TEMPLATE_ID: "template_li7y1bn",
  EMAILJS_PUBLIC_KEY:  "I9z2sELFHPtfPMOrt",
};

const $ = (id) => document.getElementById(id);
const state = { stream: null, inRoom: false, locked: false, token: null, name: "Saya", attempts: 0 };

/* ---------- EmailJS ---------- */
function initEmail() {
  if (window.emailjs) emailjs.init({ publicKey: CONFIG.EMAILJS_PUBLIC_KEY });
}

async function sendTokenEmail(token) {
  const status = $("mailStatus");
  if (!window.emailjs) { status.textContent = "Layanan email tidak termuat."; return; }
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
    status.textContent = "Token gagal dikirim. Hubungi guru.";
  }
}

/* ---------- Token ---------- */
function generateToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint32Array(4);
  crypto.getRandomValues(buf);
  return "EDU-" + Array.from(buf, (n) => chars[n % chars.length]).join("");
}

/* ---------- Kamera Lobby ---------- */
async function startCamera() {
  const box = document.querySelector(".preview");
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    $("lobbyVideo").srcObject = state.stream;
    box.classList.add("live");
  } catch (err) {
    console.warn("Kamera tidak tersedia:", err);
    $("lobbyMsg").textContent = "Kamera tidak bisa diakses. Lanjut tanpa kamera.";
  }
}

/* ---------- Main Room & Jitsi ---------- */
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
  
  // Hentikan kamera lobby agar tidak bentrok dengan Jitsi
  if (state.stream) {
    state.stream.getTracks().forEach(track => track.stop());
  }

  // Membuat Iframe Jitsi (Video Conference)
  const jitsiFrame = document.createElement("iframe");
  // Ganti "RuangKelasTOT" dengan nama room unikmu (tanpa spasi)
  jitsiFrame.src = "https://meet.jit.si/RuangKelasTOT"; 
  jitsiFrame.allow = "camera; microphone; fullscreen; display-capture; autoplay";
  jitsiFrame.style.width = "100%";
  jitsiFrame.style.height = "100%";
  jitsiFrame.style.border = "none";

  // Masukkan Jitsi ke dalam layar
  $("jitsi-container").replaceChildren(jitsiFrame);

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
  
  // Hapus iframe Jitsi agar benar-benar keluar dari room video
  $("jitsi-container").replaceChildren();
  
  // Nyalakan lagi kamera lobby
  startCamera();
}

/* ---------- ANTI-DISTRAKSI (JANGAN DIUBAH) ---------- */
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

/* ---------- Event Listener ---------- */
window.addEventListener("DOMContentLoaded", () => {
  initEmail();
  startCamera();
  $("joinBtn").addEventListener("click", joinRoom);
  $("leaveBtn").addEventListener("click", leaveRoom);
  $("unlockBtn").addEventListener("click", tryUnlock);
  $("tokenInput").addEventListener("keydown", (e) => { if (e.key === "Enter") tryUnlock(); });
});