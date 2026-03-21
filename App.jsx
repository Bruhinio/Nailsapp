// ╔══════════════════════════════════════════════════════════════════╗
// ║  NAIL STUDIO — Sistema completo con Firebase                    ║
// ║                                                                  ║
// ║  PASOS PARA CONFIGURAR:                                          ║
// ║  1. Ve a https://console.firebase.google.com                     ║
// ║  2. "Crear proyecto" → nombre → desactiva Analytics → Crear      ║
// ║  3. En el panel: "Firestore Database" → Crear base de datos      ║
// ║     → Modo de prueba → Ubicación: nam5 → Listo                   ║
// ║  4. Configuración (⚙️) → "Agregar app" → Web (</>)               ║
// ║  5. Copia el objeto firebaseConfig y pégalo AQUÍ abajo           ║
// ╚══════════════════════════════════════════════════════════════════╝

import { useState, useEffect, useMemo, useRef } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore, collection, doc,
  onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, getDocs,
  serverTimestamp
} from "firebase/firestore";
import {
  ChevronLeft, ChevronRight, Check, X, ArrowRight, ArrowLeft,
  Sparkles, MessageCircle, Plus, Lock, Eye, EyeOff,
  Calendar, Clock, DollarSign, User, Users, FileText,
  Pencil, Trash2, Save, Settings, Wifi, WifiOff, Bell, Palette, Image
} from "lucide-react";

// ══════════════════════════════════════════════════════════════════
//  🔥 PEGA AQUÍ TU CONFIG DE FIREBASE
// ══════════════════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey:            "AIzaSyAeigTpenwj5V8zg9OdomVzbHjQJFTBeOc",
  authDomain:        "nails-e482f.firebaseapp.com",
  projectId:         "nails-e482f",
  storageBucket:     "nails-e482f.firebasestorage.app",
  messagingSenderId: "290211333937",
  appId:             "1:290211333937:web:8eb4f349bec3eefa699210",
};
// ══════════════════════════════════════════════════════════════════

const ADMIN_PASSWORD = "nail2024";   // ← Cambia tu contraseña
const SALON_PHONE    = "525645431670"; // ← Cotizaciones // ← Tu número WhatsApp (sin + ni espacios)

const DEFAULT_SERVICES = [
  { id:"s1",  name:"Manicure Básico",       price:200, duration:45, emoji:"💅", color:"#F8C8D4", active:true },
  { id:"s2",  name:"Manicure con Gelish",   price:350, duration:60, emoji:"✨", color:"#D4C8F8", active:true },
  { id:"s3",  name:"Uñas Acrílicas",        price:450, duration:90, emoji:"💎", color:"#C8E8F8", active:true },
  { id:"s4",  name:"Relleno Acrílico",      price:300, duration:60, emoji:"🔮", color:"#C8F8E8", active:true },
  { id:"s5",  name:"Pedicure Básico",       price:250, duration:60, emoji:"🌸", color:"#F8E8C8", active:true },
  { id:"s6",  name:"Pedicure con Gelish",   price:400, duration:75, emoji:"🌺", color:"#F8C8E8", active:true },
  { id:"s7",  name:"Diseño Especial",       price:150, duration:30, emoji:"🎨", color:"#E8F8C8", active:true },
  { id:"s8",  name:"Retiro de Gelish",      price:100, duration:30, emoji:"🧴", color:"#F8F0C8", active:true },
  { id:"s9",  name:"Esmaltado Permanente",  price:280, duration:50, emoji:"💫", color:"#F0D8F8", active:true },
  { id:"s10", name:"Nail Art",              price:120, duration:30, emoji:"🌟", color:"#D8F8F0", active:true },
];

const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                   "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const EMOJI_OPTS  = ["💅","✨","💎","🔮","🌸","🌺","🎨","🧴","💫","🌟","🦋","💖","🪷","🌻","💝","🎀","🫧","🍓","🌙","⭐"];
const COLOR_OPTS  = ["#F8C8D4","#D4C8F8","#C8E8F8","#C8F8E8","#F8E8C8","#F8C8E8","#E8F8C8","#F0D8F8","#D8F8F0","#FFE4E1","#E6E6FA","#FFF0D4"];

// Definición de temas
const THEMES = {
  rosa: {
    name: "Rosa",
    primary: "#FF2D55",
    primaryDark: "#CC1A3E",
    primaryLight: "rgba(255,45,85,.1)",
    gradient: "linear-gradient(180deg,#1C1018 0%,#3D1528 50%,#8B2252 100%)",
    icon: "🌸"
  },
  azul: {
    name: "Azul Consultorio",
    primary: "#007AFF",
    primaryDark: "#0051D5",
    primaryLight: "rgba(0,122,255,.1)",
    gradient: "linear-gradient(180deg,#001A33 0%,#003D7A 50%,#0062CC 100%)",
    icon: "💙"
  },
  negro: {
    name: "Negro Elegante",
    primary: "#1C1C1E",
    primaryDark: "#000000",
    primaryLight: "rgba(28,28,30,.1)",
    gradient: "linear-gradient(180deg,#000000 0%,#1C1C1E 50%,#2C2C2E 100%)",
    icon: "🖤"
  },
  blanco: {
    name: "Blanco Minimalista",
    primary: "#5AC8FA",
    primaryDark: "#32ADE6",
    primaryLight: "rgba(90,200,250,.1)",
    gradient: "linear-gradient(180deg,#FFFFFF 0%,#F2F2F7 50%,#E5E5EA 100%)",
    icon: "🤍"
  }
};

const generateTimeSlots = (interval=30, startH=9, endH=18) => {
  const slots = [];
  const totalMins = endH * 60;
  for (let mins = startH * 60; mins < totalMins; mins += interval) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    slots.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
  }
  return slots;
};
const TIME_SLOTS = generateTimeSlots(30);

// ── utils ──────────────────────────────────────────────────────────
const todayStr  = () => new Date().toISOString().split("T")[0];
const fmtLong   = d  => new Date(d+"T12:00").toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
const fmtShort  = d  => new Date(d+"T12:00").toLocaleDateString("es-MX",{day:"numeric",month:"long"});
const fmtDur    = m  => m >= 60 ? `${Math.floor(m/60)}h${m%60?` ${m%60}min`:""}` : `${m} min`;
const cleanPhone= p  => p.replace(/[\s\-\(\)]/g,"");
const uid       = () => Math.random().toString(36).slice(2,10);

// ── Sound engine ──────────────────────────────────────────────────
const AC = typeof AudioContext !== "undefined" ? new AudioContext() : null;
const playTap = () => {
  if (!AC) return;
  if (AC.state === "suspended") AC.resume();
  const o = AC.createOscillator();
  const g = AC.createGain();
  o.connect(g); g.connect(AC.destination);
  o.type = "sine"; o.frequency.setValueAtTime(1200, AC.currentTime);
  o.frequency.exponentialRampToValueAtTime(900, AC.currentTime + 0.04);
  g.gain.setValueAtTime(0.12, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.06);
  o.start(); o.stop(AC.currentTime + 0.06);
};
const playChime = () => {
  if (!AC) return;
  if (AC.state === "suspended") AC.resume();
  [[523.25,0],[659.25,.12],[783.99,.24],[1046.5,.38]].forEach(([f,t]) => {
    const o = AC.createOscillator(); const g = AC.createGain();
    o.connect(g); g.connect(AC.destination);
    o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0, AC.currentTime+t);
    g.gain.linearRampToValueAtTime(0.18, AC.currentTime+t+0.04);
    g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime+t+0.28);
    o.start(AC.currentTime+t); o.stop(AC.currentTime+t+0.3);
  });
};


// ══════════════════════════════════════════════════════════════════
//  FIREBASE HOOK
// ══════════════════════════════════════════════════════════════════
function useFirebase() {
  const [db, setDb]           = useState(null);
  const [ready, setReady]     = useState(false);
  const [error, setError]     = useState(false);

  useEffect(() => {
    try {
      if (firebaseConfig.apiKey === "TU_API_KEY") {
        setError(true); return;
      }
      const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
      setDb(getFirestore(app));
      setReady(true);
    } catch(e) {
      console.error("Firebase init error:", e);
      setError(true);
    }
  }, []);

  return { db, ready, error };
}

// ══════════════════════════════════════════════════════════════════
//  GLOBAL STYLES CON SISTEMA DE TEMAS
// ══════════════════════════════════════════════════════════════════
const G = ({ theme = "rosa" }) => {
  const currentTheme = THEMES[theme] || THEMES.rosa;
  
  return (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=SF+Pro+Display:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --ios-tint:${currentTheme.primary};
      --ios-tint-dk:${currentTheme.primaryDark};
      --ios-tint-lt:${currentTheme.primaryLight};
      --ios-green:#34C759;--ios-orange:#FF9500;--ios-blue:#007AFF;--ios-purple:#AF52DE;
      --ios-bg:#F2F2F7;--ios-bg2:#E5E5EA;--ios-card:#FFFFFF;
      --ios-label:rgba(0,0,0,.85);--ios-label2:rgba(60,60,67,.6);--ios-label3:rgba(60,60,67,.3);
      --ios-sep:rgba(60,60,67,.18);
      --ios-blur:rgba(255,255,255,.82);
      --ios-r:16px;--ios-r-sm:12px;--ios-r-lg:22px;
      --ios-sh:0 2px 20px rgba(0,0,0,.07),0 1px 4px rgba(0,0,0,.04);
      --ios-sh-lg:0 8px 40px rgba(0,0,0,.12),0 2px 8px rgba(0,0,0,.06);
      /* ── Legacy aliases (compat) ── */
      --rose:${currentTheme.primary};--rose-dk:${currentTheme.primaryDark};--rose-lt:${currentTheme.primaryLight};
      --sage:#5A9E86;--gold:#FF9500;
      --text:rgba(0,0,0,.85);--text2:rgba(60,60,67,.6);
      --sh2:0 8px 40px rgba(0,0,0,.12),0 2px 8px rgba(0,0,0,.06);
    }
    *{font-family:-apple-system,'SF Pro Text','SF Pro Display',BlinkMacSystemFont,'Helvetica Neue',sans-serif}
    body{background:var(--ios-bg)}

    /* ── Animations ── */
    @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes bounceIn{0%{transform:scale(.3);opacity:0}55%{transform:scale(1.06)}75%{transform:scale(.97)}100%{transform:scale(1);opacity:1}}
    @keyframes slideInUp{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .fu{animation:fadeUp .38s ease-out both}
    .fi{animation:fadeIn .28s ease-out both}
    .pop{animation:bounceIn .5s cubic-bezier(.34,1.56,.64,1) both}
    .slideUp{animation:slideInUp .42s cubic-bezier(.22,1,.36,1) both}
    .d1{animation-delay:.06s}.d2{animation-delay:.12s}.d3{animation-delay:.18s}.d4{animation-delay:.24s}.d5{animation-delay:.30s}
    .spin{animation:spin .8s linear infinite}.pulse{animation:pulse 2s ease-in-out infinite}

    /* ── Page shell ── */
    .page{min-height:100vh;background:var(--ios-bg)}

    /* ── iOS card ── */
    .card{background:var(--ios-card);border-radius:var(--ios-r);box-shadow:var(--ios-sh)}
    .card-hover{transition:box-shadow .2s,transform .2s}
    .card-hover:active{transform:scale(.98);box-shadow:var(--ios-sh)}

    /* ── iOS nav bar ── */
    .ios-nav{height:44px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;background:var(--ios-blur);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:.5px solid var(--ios-sep);position:sticky;top:0;z-index:40}
    .ios-nav-title{font-size:17px;font-weight:600;color:var(--ios-label);letter-spacing:-.25px;text-align:center;flex:1}
    .ios-back{font-size:17px;color:var(--ios-tint);display:flex;align-items:center;gap:2px;font-weight:400;background:none;border:none;cursor:pointer;padding:0;min-width:60px}
    .ios-back:active{opacity:.6}
    .ios-action{font-size:17px;color:var(--ios-tint);font-weight:600;background:none;border:none;cursor:pointer;min-width:60px;text-align:right}

    /* ── iOS large title bar ── */
    .ios-topbar{background:var(--ios-blur);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:.5px solid var(--ios-sep);padding:10px 18px 12px;position:sticky;top:0;z-index:40}

    /* ── iOS tab bar ── */
    .ios-tabbar{position:fixed;bottom:0;left:0;right:0;z-index:40;height:83px;background:var(--ios-blur);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-top:.5px solid var(--ios-sep);display:flex;align-items:flex-start;justify-content:space-around;padding:10px 0 0}
    .ios-tab{display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;padding:0 12px;border:none;background:none}
    .ios-tab-icon{font-size:22px;line-height:1;transition:transform .15s}
    .ios-tab-label{font-size:10px;font-weight:500;color:var(--ios-label2);white-space:nowrap}
    .ios-tab.active .ios-tab-label{color:var(--ios-tint);font-weight:600}
    .ios-tab:active .ios-tab-icon{transform:scale(.88)}

    /* ── iOS bottom sheet ── */
    .ios-bottom{background:var(--ios-blur);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-top:.5px solid var(--ios-sep);padding:12px 16px 34px;position:fixed;bottom:0;left:0;right:0;z-index:30}

    /* ── iOS list ── */
    .ios-list{background:var(--ios-card);border-radius:var(--ios-r);overflow:hidden;box-shadow:var(--ios-sh)}
    .ios-row{display:flex;align-items:center;padding:12px 16px;gap:12px;position:relative;cursor:pointer;transition:background .15s}
    .ios-row:active{background:#F0F0F0}
    .ios-row:not(:last-child)::after{content:'';position:absolute;bottom:0;left:56px;right:0;height:.5px;background:var(--ios-sep)}
    .ios-row-icon{width:30px;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
    .ios-row-title{font-size:17px;font-weight:400;color:var(--ios-label);flex:1}
    .ios-row-right{font-size:15px;color:var(--ios-label2)}
    .ios-chevron::after{content:'›';font-size:18px;color:var(--ios-label3);margin-left:4px}

    /* ── iOS section header ── */
    .ios-section-title{font-size:22px;font-weight:700;color:var(--ios-label);letter-spacing:-.4px;padding:20px 16px 8px}
    .ios-caption{font-size:13px;color:var(--ios-label2);padding:6px 16px 12px}

    /* ── Main iOS button ── */
    .btn-r{background:var(--ios-tint);color:#fff;border:none;cursor:pointer;font-weight:600;font-size:17px;border-radius:var(--ios-r);padding:15px 24px;transition:all .18s;font-family:-apple-system,sans-serif}
    .btn-r:hover:not(:disabled){background:var(--ios-tint-dk);transform:translateY(-1px)}
    .btn-r:active:not(:disabled){transform:scale(.97);opacity:.88}
    .btn-r:disabled{opacity:.38;cursor:not-allowed}
    .btn-r-sm{background:var(--ios-tint);color:#fff;border:none;cursor:pointer;font-weight:600;font-size:14px;border-radius:var(--ios-r-sm);padding:9px 16px;transition:all .18s;font-family:-apple-system,sans-serif}
    .btn-r-sm:active{opacity:.8;transform:scale(.96)}

    /* ── Secondary buttons ── */
    .btn-o{background:var(--ios-tint-lt);color:var(--ios-tint);border:none;cursor:pointer;font-weight:600;font-size:15px;border-radius:var(--ios-r);padding:13px 20px;transition:all .18s;font-family:-apple-system,sans-serif}
    .btn-o:active{opacity:.7}
    .btn-ghost{background:none;border:none;cursor:pointer;color:var(--ios-tint);font-size:15px;font-family:-apple-system,sans-serif;transition:opacity .15s}
    .btn-ghost:active{opacity:.6}

    /* ── Inputs iOS style ── */
    input,select,textarea{font-family:-apple-system,sans-serif;border:.5px solid var(--ios-sep);border-radius:var(--ios-r-sm);padding:12px 14px;font-size:17px;color:var(--ios-label);background:var(--ios-card);width:100%;transition:border .18s,box-shadow .18s}
    input:focus,select:focus,textarea:focus{outline:none;border-color:var(--ios-tint);box-shadow:0 0 0 3px ${currentTheme.primaryLight}}
    input::placeholder,textarea::placeholder{color:var(--ios-label3)}

    /* ── Calendar day ── */
    .cal-day{aspect-ratio:1;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:15px;font-weight:400;cursor:pointer;transition:all .15s;position:relative;user-select:none;color:var(--ios-label)}
    .ca:hover{background:${currentTheme.primaryLight}}
    .cs{background:var(--ios-tint)!important;color:#fff!important;font-weight:600!important}
    .ct:not(.cs){font-weight:700;color:var(--ios-tint)}
    .co{color:var(--ios-label3);cursor:not-allowed}
    .cfu{color:var(--ios-label3);cursor:not-allowed}

    /* ── Calendar dots (bigger) ── */
    .dot{position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:6px;height:6px;border-radius:50%}
    .dg{background:var(--ios-green)}.dy{background:var(--ios-orange)}.dr{background:var(--ios-tint)}

    /* ── Time slots ── */
    .slot{padding:10px 6px;border-radius:var(--ios-r-sm);font-size:14px;font-weight:500;cursor:pointer;transition:all .15s;text-align:center;border:none}
    .sa{background:var(--ios-card);color:var(--ios-label);box-shadow:var(--ios-sh)}
    .sa:hover{background:rgba(52,199,89,.12);color:var(--ios-green)}
    .sa:active{transform:scale(.9)}
    .st{background:transparent;color:var(--ios-label3);cursor:not-allowed;text-decoration:line-through}
    .ss{background:var(--ios-tint)!important;color:#fff!important;box-shadow:0 4px 14px ${currentTheme.primaryLight}!important}

    /* ── Service cards ── */
    .svc-c{border-radius:var(--ios-r);border:2px solid transparent;cursor:pointer;transition:all .18s;position:relative;overflow:hidden;text-align:left;padding:0;background:var(--ios-card);box-shadow:var(--ios-sh)}
    .svc-c:active{transform:scale(.96)}
    .svc-sel{border-color:var(--ios-tint)!important;box-shadow:0 0 0 3px ${currentTheme.primaryLight},var(--ios-sh)!important}

    /* ── Toggle ── */
    .tog{display:inline-flex;align-items:center;gap:8px;background:var(--ios-bg2);border-radius:18px;padding:4px;cursor:pointer;transition:all .18s}
    .tog-btn{flex:1;border-radius:14px;padding:6px 14px;font-size:13px;font-weight:500;border:none;cursor:pointer;transition:all .18s;background:transparent;color:var(--ios-label2)}
    .tog-btn.ton{background:var(--ios-card);color:var(--ios-label);box-shadow:0 2px 6px rgba(0,0,0,.1)}

    /* ── Status indicator ── */
    .live-dot{width:7px;height:7px;border-radius:50%;background:var(--ios-green);display:inline-block;margin-right:5px}
    .live-dot.pulse{animation:pulse 1.5s ease-in-out infinite}

    /* ── Timeline (B2 Hoy) ── */
    .tl-slot{display:flex;align-items:stretch;gap:10px;padding:4px 0;margin-bottom:2px}
    .tl-time-col{display:flex;flex-direction:column;align-items:flex-end;width:40px;flex-shrink:0}
    .tl-hour{font-size:11px;font-weight:600;color:var(--ios-label2);line-height:1.2}
    .tl-line{flex:1;width:1px;background:var(--ios-sep);margin:3px auto 0;min-height:8px}
    .tl-content{flex:1;min-width:0}
    .tl-appt{background:var(--ios-card);border-radius:11px;padding:9px 11px;box-shadow:var(--ios-sh);border-left:3px solid var(--ios-tint);margin-bottom:2px}
    .tl-appt.tl-green{border-left-color:var(--ios-green)}
    .tl-appt.tl-orange{border-left-color:var(--ios-orange)}
    .tl-appt.tl-empty{background:transparent;box-shadow:none;border-left:1px dashed rgba(60,60,67,.18);border-radius:0;height:24px}
    .tl-name{font-size:12px;font-weight:600;color:var(--ios-label)}
    .tl-svc{font-size:11px;color:var(--ios-label2);margin-top:1px}
    .tl-tag{font-size:10px;font-weight:600;margin-top:2px}

    /* ── Info banner strip ── */
    .info-strip{background:var(--ios-tint-lt);padding:9px 16px;display:flex;align-items:center;justify-content:center}
    .info-strip span{font-size:13px;color:var(--ios-tint);font-weight:500}

    /* ══════════════════════════════════════════════════════════
       DARK MODE
    ══════════════════════════════════════════════════════════ */
    body.dark{background:#000!important}
    body.dark .page{background:#000}
    body.dark .card,.body.dark .ios-list{background:#1C1C1E!important}
    body.dark .ios-nav,.body.dark .ios-topbar,.body.dark .ios-bottom,.body.dark .ios-tabbar{background:rgba(28,28,30,.85)!important;border-color:rgba(255,255,255,.1)!important}
    body.dark *{color:#F2F2F7}
    body.dark h1,body.dark h2,body.dark h3,body.dark h4{color:#fff!important}
    body.dark .ios-label2,body.dark [style*="ios-label2"]{color:rgba(235,235,245,.6)!important}
    body.dark input,body.dark select,body.dark textarea{background:#2C2C2E;border-color:rgba(255,255,255,.12);color:#F2F2F7!important}
    body.dark input::placeholder,body.dark textarea::placeholder{color:rgba(235,235,245,.3)}
    body.dark .ios-row:active{background:#2C2C2E}
    body.dark .ios-row::after{background:rgba(255,255,255,.1)!important}
    body.dark .slot.sa{background:#2C2C2E!important;color:#F2F2F7!important}
    body.dark .svc-c{background:#1C1C1E!important}
    body.dark .tog{background:rgba(118,118,128,.24)!important}
    body.dark .tog-btn.ton{background:#3A3A3C!important;color:#F2F2F7!important}
    body.dark .cal-day{color:#F2F2F7}
    body.dark .co,.body.dark .cfu{color:rgba(235,235,245,.2)!important}
    body.dark .btn-o{background:${currentTheme.primaryLight.replace('.1', '.18')}!important;color:${currentTheme.primary}!important}
    body.dark .btn-ghost{color:${currentTheme.primary}!important}
    body.dark a{color:${currentTheme.primary}}
    body.dark [style*="background:var(--ios-bg)"]{background:#000!important}
    body.dark [style*="background:#F2F2F7"]{background:#000!important}
    body.dark [style*="background:#FFFFFF"]{background:#1C1C1E!important}
    body.dark [style*="background:white"]{background:#1C1C1E!important}
    body.dark ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.2)}
  `}</style>
  );
};

// ══════════════════════════════════════════════════════════════════
//  CONFIG NOT SET SCREEN
// ══════════════════════════════════════════════════════════════════
function NotConfigured() {
  return (
    <div className="page" style={{display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <G/>
      <div className="card pop" style={{maxWidth:420,padding:"36px 28px",textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>🔥</div>
        <h2 style={{fontSize:26,color:"var(--ios-label)",marginBottom:12}}>Conecta Firebase</h2>
        <p style={{color:"var(--ios-label2)",fontSize:14,lineHeight:1.7,marginBottom:24}}>
          Para que el sistema funcione en todos los dispositivos y guarde datos en tiempo real, necesitas configurar Firebase (gratis).
        </p>
        <div style={{background:"var(--ios-bg)",borderRadius:14,padding:20,textAlign:"left",marginBottom:20}}>
          <p style={{fontSize:13,fontWeight:600,color:"var(--ios-label)",marginBottom:12}}>Pasos (5 minutos):</p>
          {[
            ["1","Ve a console.firebase.google.com"],
            ["2","Crea un proyecto nuevo (gratis)"],
            ["3","Firestore Database → Crear → Modo prueba"],
            ["4","Configuración ⚙️ → Agregar app web (</>)"],
            ["5","Copia el firebaseConfig y pégalo en el código"],
          ].map(([n,t]) => (
            <div key={n} style={{display:"flex",gap:10,marginBottom:8,alignItems:"flex-start"}}>
              <span style={{width:22,height:22,background:"var(--rose)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:700,flexShrink:0}}>{n}</span>
              <span style={{fontSize:13,color:"var(--ios-label2)",lineHeight:1.5}}>{t}</span>
            </div>
          ))}
        </div>
        <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer"
          className="btn-r" style={{borderRadius:12,padding:"14px 28px",fontSize:15,display:"inline-block",textDecoration:"none"}}>
          Ir a Firebase Console →
        </a>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  HOOKS DE DATOS (Firestore)
// ══════════════════════════════════════════════════════════════════
function useAppointments(db) {
  const [apts, setApts] = useState([]);
  const [loading, setL] = useState(true);
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      collection(db, "appointments"),
      snap => {
        const list = snap.docs.map(d => ({ ...d.data(), _id: d.id }));
        list.sort((a, b) => (a.date||"").localeCompare(b.date||"") || (a.time||"").localeCompare(b.time||""));
        setApts(list);
        setL(false);
      },
      err => { console.error("appointments error:", err); setL(false); }
    );
    return unsub;
  }, [db]);
  return { apts, loading };
}

function useClients(db) {
  const [clients, setClients] = useState([]);
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      collection(db, "clients"),
      snap => { setClients(snap.docs.map(d => ({...d.data(), _id: d.id}))); },
      err  => { console.error("clients error:", err); }
    );
    return unsub;
  }, [db]);
  return clients;
}

function useServices(db) {
  const [services, setSvc] = useState(DEFAULT_SERVICES);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db,"services"), snap => {
      if (snap.empty) {
        // Seed default services
        DEFAULT_SERVICES.forEach(s => setDoc(doc(db,"services",s.id), s));
        setSvc(DEFAULT_SERVICES);
      } else {
        setSvc(snap.docs.map(d => ({...d.data(), id: d.id})));
      }
      setLoaded(true);
    });
    return unsub;
  }, [db]);
  return { services, loaded };
}

function useConfig(db) {
  const [cfg, setCfg] = useState({ 
    salonName:"Nail Studio", 
    salonLocation:"Nezahualcóyotl, México",
    theme: "rosa", // tema por defecto
    showServices: true, // mostrar servicios por defecto
    showTrajectory: false, // ocultar trayectoria por defecto
    showPromotions: false, // ocultar promociones por defecto
    trajectoryText: "", // texto de trayectoria
    promotions: [] // array de promociones
  });
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(doc(db,"config","salon"), snap => {
      if (snap.exists()) setCfg(snap.data());
    });
    return unsub;
  }, [db]);
  const save = async (data) => { if (db) await setDoc(doc(db,"config","salon"), data, {merge:true}); };
  return { cfg, save };
}


function useBlocked(db) {
  const [blocked, setBlocked] = useState([]);
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db,"blocked"), snap => {
      setBlocked(snap.docs.map(d => ({...d.data(), _id: d.id})));
    });
    return unsub;
  }, [db]);
  return blocked;
}

// ══════════════════════════════════════════════════════════════════
//  PÁGINA 1: CALENDARIO
// ══════════════════════════════════════════════════════════════════
function CalendarPage({ db, booking, services, cfg, blocked, onNext, onBack }) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selDate, setSel] = useState("");
  const [selTime, setSelTime] = useState("");
  const [takenMap, setTaken]  = useState({});

  // Real-time listener for taken slots
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db,"appointments"), snap => {
      const map = {};
      snap.docs.forEach(d => {
        const a = d.data();
        if (!map[a.date]) map[a.date] = [];
        map[a.date].push(a.time);
      });
      setTaken(map);
    });
    return unsub;
  }, [db]);

  const workStartH = parseInt((cfg?.workStart||"09:00").split(":")[0]);
  const workStartM = parseInt((cfg?.workStart||"09:00").split(":")[1]);
  const workEndH   = parseInt((cfg?.workEnd  ||"18:00").split(":")[0]);
  const workEndM   = parseInt((cfg?.workEnd  ||"18:00").split(":")[1]);
  const slots = generateTimeSlots(cfg?.slotInterval || 30, workStartH + workStartM/60, workEndH + workEndM/60);
  const dims  = new Date(year, month+1, 0).getDate();
  const first = new Date(year, month, 1).getDay();
  const startCol = first === 0 ? 6 : first - 1;
  const today = todayStr();

  const dayStatus = useMemo(() => {
    const _ws = parseInt((cfg?.workStart||"09:00").split(":")[0]);
    const _we = parseInt((cfg?.workEnd  ||"18:00").split(":")[0]);
    const dynSlots = generateTimeSlots(cfg?.slotInterval || 30, _ws, _we);
    const out = {};
    for (let d = 1; d <= dims; d++) {
      const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      // Full day blocked only when type==="day"
      if ((blocked||[]).find(b => b.type==="day" && b.date===ds)) { out[ds]="full"; continue; }
      // Slot-level blocks: only count booked appointments for day color indicator
      const blockedSlots = (blocked||[]).filter(b=>b.type==="slot"&&b.date===ds).map(b=>b.time);
      const takenTimes = [...new Set([...(takenMap[ds]||[]), ...blockedSlots])];
      const total = dynSlots.length;
      // Day is "full" only when ALL slots are taken/blocked
      out[ds] = takenTimes.length === 0 ? "free"
              : takenTimes.length >= total ? "full"
              : takenTimes.length >= total*0.6 ? "almost"
              : "partial";
    }
    return out;
  }, [year, month, cfg, takenMap, blocked]);

  const prev = () => { if (month===0) {setMonth(11);setYear(y=>y-1);} else setMonth(m=>m-1); playTap(); };
  const next = () => { if (month===11){setMonth(0);setYear(y=>y+1);} else setMonth(m=>m+1); playTap(); };

  const selectDate = (d) => {
    const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    if (dayStatus[ds]==="full") return;
    if (ds < today) return;
    setSel(ds); setSelTime(""); playTap();
  };

  const selectTime = (t) => { setSelTime(t); playTap(); };

  const proceed = () => {
    playChime();
    onNext({...booking, date:selDate, time:selTime});
  };

  // Determinar slots disponibles para la fecha seleccionada
  const availableSlots = useMemo(() => {
    if (!selDate) return [];
    const blockedSlots = (blocked||[]).filter(b=>b.type==="slot"&&b.date===selDate).map(b=>b.time);
    const taken = [...new Set([...(takenMap[selDate]||[]), ...blockedSlots])];
    return slots.map(t => ({time:t, available: !taken.includes(t)}));
  }, [selDate, slots, takenMap, blocked]);

  return (
    <div className="page">
      <G theme={cfg?.theme} />
      <div className="ios-nav">
        <button className="ios-back" onClick={onBack}><ArrowLeft size={19}/>Atrás</button>
        <div className="ios-nav-title">Selecciona fecha y hora</div>
        <div style={{width:60}}/>
      </div>

      <div style={{padding:"20px 16px"}}>
        {/* Mes/Año */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <button onClick={prev}
            style={{background:"var(--ios-card)",border:"none",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"var(--ios-sh)"}}>
            <ChevronLeft size={20} color="var(--ios-tint)"/>
          </button>
          <h2 style={{fontSize:20,fontWeight:600,color:"var(--ios-label)",letterSpacing:"-.3px"}}>{MONTHS_ES[month]} {year}</h2>
          <button onClick={next}
            style={{background:"var(--ios-card)",border:"none",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"var(--ios-sh)"}}>
            <ChevronRight size={20} color="var(--ios-tint)"/>
          </button>
        </div>

        {/* Días de la semana */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6,marginBottom:8}}>
          {["L","M","M","J","V","S","D"].map((l,i)=>(
            <div key={i} style={{textAlign:"center",fontSize:11,fontWeight:600,color:i===6?"rgba(255,59,48,.5)":"var(--ios-label2)",padding:"2px 0"}}>{l}</div>
          ))}
        </div>

        {/* Calendario grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6,marginBottom:24}}>
          {Array.from({length:startCol}).map((_,i)=><div key={`e${i}`}/>)}
          {Array.from({length:dims}).map((_,i)=>{
            const d = i+1;
            const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const st = dayStatus[ds] || "free";
            const sel = ds === selDate;
            const isToday = ds === today;
            const isPast = ds < today;
            return (
              <div key={d}
                className={`cal-day ${isPast?"co":st==="full"?"cfu":"ca"} ${sel?"cs":""} ${isToday&&!sel?"ct":""}`}
                onClick={()=>selectDate(d)}
                style={{position:"relative"}}>
                {d}
                {!sel && st!=="free" && st!=="full" && <span className={`dot ${st==="almost"?"dy":"dg"}`}/>}
              </div>
            );
          })}
        </div>

        {/* Time slots */}
        {selDate && (
          <>
            <p style={{fontSize:13,fontWeight:600,color:"var(--ios-label2)",marginBottom:10}}>
              {isToday ? "Hoy" : fmtLong(selDate)}
            </p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:24}}>
              {availableSlots.map(({time,available})=>(
                <button key={time}
                  className={`slot ${available?"sa":"st"} ${selTime===time?"ss":""}`}
                  onClick={()=>available&&selectTime(time)}
                  disabled={!available}>
                  {time}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Continuar */}
        {selDate && selTime && (
          <button className="btn-r pop" onClick={proceed}
            style={{width:"100%",padding:"15px",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",gap:8,borderRadius:16}}>
            <Check size={20}/> Continuar
          </button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  PÁGINA 0: SELECCIÓN DE SERVICIO
// ══════════════════════════════════════════════════════════════════
function ServicePage({ booking, services, onBack, onNext }) {
  const [sel, setSel] = useState(booking?.mySvc || null);
  const activeServices = services.filter(s=>s.active);

  const proceed = () => {
    if (!sel) return;
    playChime();
    onNext({...booking, mySvc:sel});
  };

  return (
    <div className="page">
      <G/>
      <div className="ios-nav">
        <button className="ios-back" onClick={onBack}><ArrowLeft size={19}/>Atrás</button>
        <div className="ios-nav-title">Elige tu servicio</div>
        <div style={{width:60}}/>
      </div>

      <div style={{padding:"20px 16px"}}>
        <p style={{fontSize:13,color:"var(--ios-label2)",marginBottom:14,lineHeight:1.5}}>
          Selecciona el servicio que deseas agendar. Puedes añadir servicios adicionales más adelante.
        </p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
          {activeServices.map((s,i)=>(
            <button key={s.id} className={`svc-c fu d${Math.min(i+1,5)} ${sel?.id===s.id?"svc-sel":""}`}
              onClick={()=>{playTap();setSel(s);}}
              style={{padding:0,background:"var(--ios-card)"}}>
              <div style={{width:"100%",height:90,borderRadius:"14px 14px 0 0",overflow:"hidden",background:s.color||"#F8C8D4",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {s.image
                  ? <img src={s.image} alt={s.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  : <span style={{fontSize:32}}>{s.emoji||"💅"}</span>
                }
              </div>
              <div style={{padding:"10px 12px 14px"}}>
                <div style={{fontSize:14,fontWeight:600,color:"var(--ios-label)",lineHeight:1.3,marginBottom:2}}>{s.name}</div>
                <div style={{fontSize:12,color:"var(--ios-label2)",marginBottom:4}}>{fmtDur(s.duration)}</div>
                <div style={{fontSize:17,fontWeight:700,color:"var(--ios-tint)"}}>${s.price}</div>
              </div>
            </button>
          ))}
        </div>

        {sel && (
          <button className="btn-r pop" onClick={proceed}
            style={{width:"100%",padding:"15px",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",gap:8,borderRadius:16}}>
            <Check size={20}/> Continuar
          </button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  PÁGINA 2: ACOMPAÑANTES
// ══════════════════════════════════════════════════════════════════
function CompanionPage({ booking, services, onBack, onNext }) {
  const [companions, setComp] = useState(booking?.companions || []);
  const add = () => { setComp([...companions, {svc:null}]); playTap(); };
  const remove = (i) => { setComp(companions.filter((_,idx)=>idx!==i)); playTap(); };
  const change = (i,svc) => {
    const n = [...companions];
    n[i] = {svc};
    setComp(n);
    playTap();
  };
  const proceed = () => {
    playChime();
    onNext({...booking, companions});
  };

  const activeServices = services.filter(s=>s.active);

  return (
    <div className="page">
      <G/>
      <div className="ios-nav">
        <button className="ios-back" onClick={onBack}><ArrowLeft size={19}/>Atrás</button>
        <div className="ios-nav-title">Acompañantes</div>
        <div style={{width:60}}/>
      </div>

      <div style={{padding:"20px 16px"}}>
        <p style={{fontSize:13,color:"var(--ios-label2)",marginBottom:14,lineHeight:1.5}}>
          ¿Viene alguien contigo? Agrega sus servicios aquí (opcional).
        </p>

        {companions.map((c,i)=>(
          <div key={i} className="card fu" style={{padding:"14px 16px",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:14,fontWeight:600,color:"var(--ios-label)"}}>Acompañante {i+1}</span>
              <button onClick={()=>remove(i)}
                style={{background:"rgba(255,59,48,.1)",border:"none",borderRadius:"50%",width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#FF3B30"}}>
                <X size={14}/>
              </button>
            </div>
            <select value={c.svc?.id||""} onChange={e=>{const s=activeServices.find(x=>x.id===e.target.value); change(i,s);}}
              style={{width:"100%",padding:"10px 12px",fontSize:14,borderRadius:10,border:".5px solid var(--ios-sep)"}}>
              <option value="">Selecciona servicio</option>
              {activeServices.map(s=>(
                <option key={s.id} value={s.id}>{s.name} - ${s.price}</option>
              ))}
            </select>
          </div>
        ))}

        <button className="btn-o fu" onClick={add}
          style={{width:"100%",padding:"14px",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",gap:8,borderRadius:12,marginBottom:20}}>
          <Plus size={18}/> Agregar acompañante
        </button>

        <button className="btn-r" onClick={proceed}
          style={{width:"100%",padding:"15px",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",gap:8,borderRadius:16}}>
          <Check size={20}/> Continuar
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  PÁGINA 3: NOMBRES
// ══════════════════════════════════════════════════════════════════
function NamesPage({ booking, onBack, onNext }) {
  const [myName, setMyName] = useState(booking?.myName || "");
  const [names, setNames]   = useState(booking?.companionNames || []);

  useEffect(()=>{
    if (booking?.companions) {
      setNames(booking.companionNames || booking.companions.map(()=>""));
    }
  }, [booking]);

  const proceed = () => {
    if (!myName.trim()) return;
    if (booking?.companions?.length && names.some(n=>!n.trim())) return;
    playChime();
    onNext({...booking, myName, companionNames:names});
  };

  return (
    <div className="page">
      <G/>
      <div className="ios-nav">
        <button className="ios-back" onClick={onBack}><ArrowLeft size={19}/>Atrás</button>
        <div className="ios-nav-title">Nombres</div>
        <div style={{width:60}}/>
      </div>

      <div style={{padding:"20px 16px"}}>
        <p style={{fontSize:13,color:"var(--ios-label2)",marginBottom:14,lineHeight:1.5}}>
          Para confirmar tu cita, necesitamos tus datos.
        </p>

        <div className="card fu" style={{padding:"16px",marginBottom:12}}>
          <label style={{fontSize:11,color:"var(--ios-label2)",fontWeight:500,marginBottom:4,display:"block"}}>Tu nombre</label>
          <input value={myName} onChange={e=>setMyName(e.target.value)} placeholder="Nombre completo"
            style={{fontSize:15,border:"none",outline:"none",background:"transparent",width:"100%",padding:0,boxShadow:"none",color:"var(--ios-label)"}}/>
        </div>

        {(booking?.companions||[]).map((c,i)=>(
          <div key={i} className="card fu d1" style={{padding:"16px",marginBottom:12}}>
            <label style={{fontSize:11,color:"var(--ios-label2)",fontWeight:500,marginBottom:4,display:"block"}}>Acompañante {i+1}</label>
            <input value={names[i]||""} onChange={e=>{const n=[...names];n[i]=e.target.value;setNames(n);}} placeholder="Nombre completo"
              style={{fontSize:15,border:"none",outline:"none",background:"transparent",width:"100%",padding:0,boxShadow:"none",color:"var(--ios-label)"}}/>
          </div>
        ))}

        <button className="btn-r" onClick={proceed}
          disabled={!myName.trim() || (booking?.companions?.length && names.some(n=>!n.trim()))}
          style={{width:"100%",padding:"15px",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",gap:8,borderRadius:16,marginTop:8}}>
          <Check size={20}/> Continuar
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  PÁGINA 4: NOTAS Y CONFIRMACIÓN
// ══════════════════════════════════════════════════════════════════
function NotesPage({ booking, db, cfg, onBack, onDone }) {
  const [phone, setPhone] = useState(booking?.phone || "");
  const [notes, setNotes] = useState(booking?.notes || "");
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    if (!phone.trim()) return;
    setSaving(true);
    try {
      const allServices = [booking.mySvc, ...(booking.companions||[]).map(c=>c.svc)].filter(Boolean);
      const totalPrice = allServices.reduce((sum,s)=>sum+s.price, 0);
      const names = [booking.myName, ...(booking.companionNames||[])].join(", ");

      await addDoc(collection(db,"appointments"), {
        date: booking.date,
        time: booking.time,
        service: booking.mySvc.name,
        services: allServices.map(s=>s.name).join(", "),
        clientName: booking.myName,
        allNames: names,
        phone: cleanPhone(phone),
        notes: notes.trim(),
        price: totalPrice,
        status: "pending",
        createdAt: serverTimestamp()
      });

      // Send WhatsApp
      const msg = `¡Hola! He agendado una cita:\n📅 ${fmtLong(booking.date)} a las ${booking.time}\n🛎️ ${allServices.map(s=>s.name).join(", ")}\n👤 ${names}\n💵 $${totalPrice}`;
      window.open(`https://wa.me/${cfg?.whatsapp||SALON_PHONE}?text=${encodeURIComponent(msg)}`);

      playChime();
      onDone();
    } catch(e) {
      console.error(e);
      alert("Error al guardar. Intenta de nuevo.");
    }
    setSaving(false);
  };

  const allServices = [booking.mySvc, ...(booking.companions||[]).map(c=>c.svc)].filter(Boolean);
  const totalPrice = allServices.reduce((sum,s)=>sum+s.price, 0);

  return (
    <div className="page">
      <G theme={cfg?.theme} />
      <div className="ios-nav">
        <button className="ios-back" onClick={onBack}><ArrowLeft size={19}/>Atrás</button>
        <div className="ios-nav-title">Confirmación</div>
        <div style={{width:60}}/>
      </div>

      <div style={{padding:"20px 16px"}}>
        {/* Resumen */}
        <div className="card fu" style={{padding:"16px",marginBottom:16}}>
          <p style={{fontSize:11,fontWeight:700,color:"var(--ios-label2)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:10}}>Resumen de tu cita</p>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:13,color:"var(--ios-label2)",marginBottom:2}}>Fecha y hora</div>
            <div style={{fontSize:17,fontWeight:600,color:"var(--ios-label)"}}>{fmtLong(booking.date)} • {booking.time}</div>
          </div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:13,color:"var(--ios-label2)",marginBottom:2}}>Servicios</div>
            {allServices.map((s,i)=>(
              <div key={i} style={{fontSize:15,color:"var(--ios-label)",marginBottom:2}}>{s.emoji} {s.name} - ${s.price}</div>
            ))}
          </div>
          <div style={{paddingTop:10,borderTop:".5px solid var(--ios-sep)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:15,fontWeight:600,color:"var(--ios-label)"}}>Total</span>
              <span style={{fontSize:20,fontWeight:700,color:"var(--ios-tint)"}}>${totalPrice}</span>
            </div>
          </div>
        </div>

        {/* Teléfono */}
        <div className="card fu d1" style={{padding:"16px",marginBottom:12}}>
          <label style={{fontSize:11,color:"var(--ios-label2)",fontWeight:500,marginBottom:4,display:"block"}}>Tu teléfono</label>
          <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="5512345678"
            style={{fontSize:15,border:"none",outline:"none",background:"transparent",width:"100%",padding:0,boxShadow:"none",color:"var(--ios-label)"}}/>
        </div>

        {/* Notas */}
        <div className="card fu d2" style={{padding:"16px",marginBottom:20}}>
          <label style={{fontSize:11,color:"var(--ios-label2)",fontWeight:500,marginBottom:4,display:"block"}}>Notas adicionales (opcional)</label>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Alguna preferencia o detalle especial..."
            rows={3}
            style={{fontSize:15,border:"none",outline:"none",background:"transparent",width:"100%",padding:0,boxShadow:"none",color:"var(--ios-label)",resize:"none"}}/>
        </div>

        <button className="btn-r" onClick={finish} disabled={!phone.trim() || saving}
          style={{width:"100%",padding:"15px",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",gap:8,borderRadius:16}}>
          {saving ? "Confirmando..." : <><Check size={20}/> Confirmar cita</>}
        </button>

        <p style={{fontSize:11,color:"var(--ios-label3)",textAlign:"center",marginTop:12,lineHeight:1.4}}>
          Al confirmar, recibirás un mensaje de WhatsApp con los detalles de tu cita.
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  PORTAL CLIENTAS - PÁGINA DE INICIO
// ══════════════════════════════════════════════════════════════════
function ClientPortal({ db, services, cfg, blocked, onAdmin }) {
  const [page, setPage]   = useState("landing");
  const [booking, setBk]  = useState({});
  const [taps, setTaps]   = useState(0);
  const salonName = cfg?.salonName || "Nail Studio";
  const salonLoc  = cfg?.salonLocation || "";
  const currentTheme = THEMES[cfg?.theme || "rosa"];

  const tapLogo = () => {
    const n = taps + 1; setTaps(n);
    if (n >= 7) { setTaps(0); onAdmin(); }
  };

  if (page === "service")   return <ServicePage   booking={booking} services={services} onBack={()=>setPage("landing")} onNext={d=>{setBk(d);setPage("calendar");}}/>;
  if (page === "calendar")  return <CalendarPage  db={db} booking={booking} services={services} cfg={cfg} blocked={blocked} onBack={()=>setPage("service")} onNext={d=>{setBk(d);setPage("companion");}}/>;
  if (page === "companion") return <CompanionPage booking={booking} services={services} onBack={()=>setPage("calendar")}  onNext={d=>{setBk(d);setPage("names");}}/>;
  if (page === "names")     return <NamesPage     booking={booking} onBack={()=>setPage("companion")} onNext={d=>{setBk(d);setPage("notes");}}/>;
  if (page === "notes")     return <NotesPage     booking={booking} db={db} cfg={cfg} onBack={()=>setPage("names")} onDone={()=>{setBk({});setPage("landing");}}/>;

  const activeServices = services.filter(s=>s.active);

  return (
    <div className="page" style={{paddingBottom:83}}>
      <G theme={cfg?.theme} />
      {/* iOS Hero */}
      <div style={{background: cfg?.heroBg ? `linear-gradient(rgba(0,0,0,.52),rgba(0,0,0,.52)), url(${cfg.heroBg}) center/cover no-repeat` : currentTheme.gradient,padding:"60px 20px 40px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 60% 30%,rgba(255,45,85,.2),transparent 60%)"}}/>

        {/* Logo circle — tappable for admin */}
        <div style={{position:"relative",display:"inline-block",marginBottom:18}}>
          <button onClick={tapLogo}
            style={{background:`linear-gradient(135deg,${currentTheme.primary},${currentTheme.primaryDark})`,border:"none",borderRadius:22,width:72,height:72,display:"flex",alignItems:"center",justifyContent:"center",cursor:"default",backdropFilter:"blur(8px)",boxShadow:`0 8px 24px ${currentTheme.primaryLight.replace('.1', '.4')}`}}>
            {cfg?.logoImage ? (
              <img src={cfg.logoImage} alt="Logo" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:22}} />
            ) : (
              <Sparkles size={30} color="#fff"/>
            )}
          </button>
          {/* Small circle badge - prof photo */}
          <div style={{position:"absolute",bottom:-3,right:-5,width:24,height:24,borderRadius:"50%",background:"rgba(255,255,255,.15)",backdropFilter:"blur(8px)",border:"1.5px solid rgba(255,255,255,.4)",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
            {cfg?.profPhoto
              ? <img src={cfg.profPhoto} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              : <User size={11} color="rgba(255,255,255,.8)"/>
            }
          </div>
        </div>
        <h1 className="fu" style={{fontSize:34,fontWeight:700,color:"#fff",letterSpacing:"-.5px",lineHeight:1.1,marginBottom:6,position:"relative",zIndex:1}}>
          {cfg?.heroTitle || salonName}
        </h1>
        <p className="fu d1" style={{fontSize:15,color:"rgba(255,255,255,.6)",marginBottom:4,position:"relative",zIndex:1}}>
          {cfg?.heroSubtitle || "Uñas que cuentan historias ✨"}
        </p>
        {salonLoc && <p className="fu d2" style={{fontSize:13,color:"rgba(255,255,255,.4)",marginBottom:28,position:"relative",zIndex:1}}>📍 {salonLoc}</p>}
        <div style={{display:"flex",alignItems:"center",gap:7,background:"rgba(52,199,89,.15)",backdropFilter:"blur(8px)",border:"1px solid rgba(52,199,89,.3)",borderRadius:20,padding:"6px 14px",display:"inline-flex",marginBottom:24,position:"relative",zIndex:1}}>
          <span className="live-dot pulse" style={{background:"#34C759"}}/>
          <span style={{fontSize:12,color:"rgba(255,255,255,.8)",fontWeight:500}}>Abierto ahora</span>
        </div>
        <br/>
        <button className="fu d3" onClick={()=>{playTap();setPage("service");}}
          style={{background:"var(--ios-tint)",color:"#fff",border:"none",borderRadius:16,padding:"16px 38px",fontSize:17,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:10,boxShadow:`0 4px 20px ${currentTheme.primaryLight.replace('.1', '.45')}`,transition:"all .22s",position:"relative",zIndex:1}}
          onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
          onMouseLeave={e=>e.currentTarget.style.transform=""}>
          <Calendar size={20}/> Agendar mi cita
        </button>
        <p className="fu d4" style={{fontSize:11,color:"rgba(255,255,255,.3)",marginTop:12,position:"relative",zIndex:1}}>Proceso rápido · Sin registro</p>
      </div>

      {/* Services */}
      {cfg?.showServices !== false && activeServices.length > 0 && (
        <div style={{padding:"0 0 16px"}}>
          <div className="ios-section-title fu">Servicios</div>
          <div className="ios-caption fu d1">Toca para agendar directamente</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"0 16px"}}>
            {activeServices.map((s,i)=>(
              <button key={s.id} className={`svc-c fu d${Math.min(i+1,5)}`}
                onClick={()=>{playTap();setBk({mySvc:s});setPage("service");}}
                style={{padding:0,background:"var(--ios-card)"}}>
                <div style={{width:"100%",height:90,borderRadius:"14px 14px 0 0",overflow:"hidden",background:s.color||"#F8C8D4",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {s.image
                    ? <img src={s.image} alt={s.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    : <span style={{fontSize:32}}>{s.emoji||"💅"}</span>
                  }
                </div>
                <div style={{padding:"10px 12px 14px"}}>
                  <div style={{fontSize:14,fontWeight:600,color:"var(--ios-label)",lineHeight:1.3,marginBottom:2}}>{s.name}</div>
                  <div style={{fontSize:12,color:"var(--ios-label2)",marginBottom:4}}>{fmtDur(s.duration)}</div>
                  <div style={{fontSize:17,fontWeight:700,color:"var(--ios-tint)"}}>${s.price}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trayectoria */}
      {cfg?.showTrajectory && cfg?.trajectoryText && (
        <div style={{padding:"0 16px 24px"}}>
          <div className="ios-section-title fu">Nuestra Historia</div>
          <div className="card fu d1" style={{padding:"20px"}}>
            <p style={{fontSize:15,color:"var(--ios-label)",lineHeight:1.6,whiteSpace:"pre-wrap"}}>
              {cfg.trajectoryText}
            </p>
          </div>
        </div>
      )}

      {/* Promociones */}
      {cfg?.showPromotions && cfg?.promotions && cfg.promotions.length > 0 && (
        <div style={{padding:"0 16px 24px"}}>
          <div className="ios-section-title fu">Promociones</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {cfg.promotions.map((promo,i)=>(
              <div key={i} className="card fu d1" style={{padding:"16px",background:`linear-gradient(135deg, ${currentTheme.primaryLight}, rgba(255,255,255,.5))`}}>
                {promo.image && (
                  <div style={{width:"100%",height:140,borderRadius:12,overflow:"hidden",marginBottom:12}}>
                    <img src={promo.image} alt={promo.title} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                  </div>
                )}
                <h3 style={{fontSize:17,fontWeight:700,color:"var(--ios-label)",marginBottom:6}}>{promo.title}</h3>
                <p style={{fontSize:14,color:"var(--ios-label2)",lineHeight:1.5}}>{promo.description}</p>
                {promo.validUntil && (
                  <p style={{fontSize:12,color:"var(--ios-tint)",marginTop:8,fontWeight:600}}>
                    Válido hasta: {promo.validUntil}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{padding:"0 16px 24px"}}>
        <p style={{textAlign:"center",fontSize:11,color:"var(--ios-label3)",marginTop:20}}>{salonName} © {new Date().getFullYear()}</p>
      </div>

      {/* iOS Tab bar */}
      <div className="ios-tabbar">
        <button className="ios-tab active">
          <span className="ios-tab-icon">🏠</span>
          <span className="ios-tab-label" style={{color:"var(--ios-tint)"}}>Inicio</span>
        </button>
        <button className="ios-tab" onClick={()=>{playTap();setPage("service");}}>
          <span className="ios-tab-icon">📅</span>
          <span className="ios-tab-label">Agendar</span>
        </button>
        <button className="ios-tab" onClick={()=>window.open(`https://wa.me/${cfg?.whatsapp||SALON_PHONE}`,"_blank")}>
          <span className="ios-tab-icon">💬</span>
          <span className="ios-tab-label">Ayuda</span>
        </button>
      </div>
    </div>
  );
}

// ── Professional mini calendar ────────────────────────────────────
function ProCalendar({ apts, onDayClick }) {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const dims   = new Date(year, month+1, 0).getDate();
  const first  = new Date(year, month, 1).getDay();
  const startCol = first===0?6:first-1;
  const today  = new Date().toISOString().split("T")[0];
  const dayMap = {};
  apts.forEach(a => { dayMap[a.date] = (dayMap[a.date]||[]).concat(a); });
  const prevMo = () => { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMo = () => { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); };
  return (
    <div className="card" style={{padding:"18px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <h3 style={{fontSize:17,fontWeight:600,color:"var(--ios-label)",letterSpacing:"-.2px"}}>Calendario</h3>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <button onClick={prevMo} style={{border:"none",background:"rgba(255,45,85,.1)",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--ios-tint)"}}><ChevronLeft size={13}/></button>
          <span style={{fontSize:13,fontWeight:600,color:"var(--ios-label)",minWidth:88,textAlign:"center"}}>{MONTHS[month]} {year}</span>
          <button onClick={nextMo} style={{border:"none",background:"rgba(255,45,85,.1)",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--ios-tint)"}}><ChevronRight size={13}/></button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:6}}>
        {["L","M","M","J","V","S","D"].map((l,i)=>(
          <div key={i} style={{textAlign:"center",fontSize:11,fontWeight:600,color:i===6?"rgba(255,59,48,.5)":"var(--ios-label2)",padding:"2px 0"}}>{l}</div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {Array.from({length:startCol}).map((_,i)=><div key={`e${i}`}/>)}
        {Array.from({length:dims}).map((_,i)=>{
          const d  = i+1;
          const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const count = (dayMap[ds]||[]).length;
          const isToday = ds===today;
          const isPast  = ds<today;
          const bg = isToday?"var(--ios-tint)" : count===0?"transparent" : count>=4?"rgba(255,59,48,.16)" : count>=2?"rgba(255,149,0,.16)" : "rgba(52,199,89,.16)";
          const textC = isToday?"#fff" : count===0?(isPast?"var(--ios-label3)":"var(--ios-label)") : count>=4?"#D02020":count>=2?"#A06000":"#1A8040";
          return (
            <div key={d} onClick={()=>count>0&&onDayClick&&onDayClick(ds)}
              style={{aspectRatio:"1",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                flexDirection:"column",fontSize:13,fontWeight:isToday?700:400,
                cursor:count>0?"pointer":"default",position:"relative",
                background:bg,color:textC,transition:"all .15s"}}
              onMouseEnter={e=>{if(count>0&&!isToday)e.currentTarget.style.transform="scale(1.1)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";}}>
              {d}
              {count>0&&!isToday&&<span style={{position:"absolute",bottom:0,fontSize:8,fontWeight:700,color:textC,lineHeight:1.2}}>{count}</span>}
            </div>
          );
        })}
      </div>
      <div style={{display:"flex",gap:14,marginTop:14,flexWrap:"wrap",justifyContent:"center"}}>
        {[
          {bg:"rgba(52,199,89,.16)",border:"rgba(52,199,89,.6)",c:"#1A8040",l:"Disponible"},
          {bg:"rgba(255,149,0,.16)",border:"rgba(255,149,0,.6)",c:"#A06000",l:"Media"},
          {bg:"rgba(255,59,48,.16)",border:"rgba(255,59,48,.6)",c:"#D02020",l:"Completo"},
        ].map(({bg,c,l})=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{width:10,height:10,borderRadius:"50%",background:bg,border:`1.5px solid ${c}`}}/>
            <span style={{fontSize:11,color:"var(--ios-label2)"}}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  ADMIN LOGIN
// ══════════════════════════════════════════════════════════════════
function AdminLogin({ onSuccess, onBack }) {
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState(false);

  const login = () => {
    if (pass === ADMIN_PASSWORD) {
      playChime();
      onSuccess();
    } else {
      setErr(true);
      setTimeout(()=>setErr(false), 2000);
    }
  };

  return (
    <div className="page" style={{display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <G/>
      <div className="card pop" style={{width:"100%",maxWidth:360,padding:"32px 28px"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:64,height:64,borderRadius:"50%",background:"linear-gradient(135deg,var(--ios-tint),var(--ios-tint-dk))",margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 8px 24px rgba(255,45,85,.3)"}}>
            <Lock size={28} color="#fff"/>
          </div>
          <h2 style={{fontSize:24,fontWeight:700,color:"var(--ios-label)",marginBottom:4}}>Panel Profesional</h2>
          <p style={{fontSize:14,color:"var(--ios-label2)"}}>Ingresa tu contraseña para continuar</p>
        </div>

        <div style={{position:"relative",marginBottom:20}}>
          <input
            type={show?"text":"password"}
            value={pass}
            onChange={e=>setPass(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&login()}
            placeholder="Contraseña"
            style={{width:"100%",padding:"14px 44px 14px 14px",fontSize:16,borderRadius:12,border:err?"1.5px solid #FF3B30":".5px solid var(--ios-sep)",outline:"none",background:"var(--ios-card)",color:"var(--ios-label)"}}/>
          <button onClick={()=>setShow(!show)}
            style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--ios-label2)"}}>
            {show ? <EyeOff size={20}/> : <Eye size={20}/>}
          </button>
        </div>

        {err && <p style={{fontSize:13,color:"#FF3B30",marginBottom:16,textAlign:"center"}}>⚠️ Contraseña incorrecta</p>}

        <button className="btn-r" onClick={login} disabled={!pass}
          style={{width:"100%",padding:"15px",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",gap:8,borderRadius:14,marginBottom:12}}>
          Ingresar
        </button>

        <button className="btn-ghost" onClick={onBack} style={{width:"100%",padding:"10px",fontSize:15}}>
          ← Volver al portal
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  ADMIN PANEL
// ══════════════════════════════════════════════════════════════════
function AdminPanel({ db, initialTab, onTabChange, onLogout }) {
  const [tab, setTab] = useState(initialTab);
  const [toast, setToast] = useState("");
  const { apts, loading } = useAppointments(db);
  const clients = useClients(db);
  const { services } = useServices(db);
  const { cfg, save: saveCfg } = useConfig(db);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""), 2400); };

  const changeTab = (t) => { setTab(t); onTabChange(t); playTap(); };

  const today = todayStr();
  const todayApts = apts.filter(a=>a.date===today);
  const newApts = apts.filter(a=>a.status==="pending").length;

  return (
    <div className="page" style={{paddingBottom:83}}>
      <G theme={cfg?.theme} />

      {/* Nav */}
      <div className="ios-topbar">
        <h1 style={{fontSize:28,fontWeight:700,color:"var(--ios-label)",letterSpacing:"-.6px"}}>Panel Pro</h1>
      </div>

      {/* Content */}
      <div style={{padding:"16px"}}>
        {tab==="dashboard" && <DashboardTab apts={apts} cfg={cfg} onToast={showToast}/>}
        {tab==="calendar"  && <CalendarTab  apts={apts} db={db} onToast={showToast}/>}
        {tab==="clients"   && <ClientsTab   clients={clients} apts={apts} db={db} onToast={showToast}/>}
        {tab==="services"  && <ServicesTab  db={db} services={services} onToast={showToast}/>}
        {tab==="config"    && <ConfigPanel  cfg={cfg} onSave={saveCfg} onToast={showToast} onLogout={onLogout} newApts={newApts} todayCount={todayApts.length}/>}
      </div>

      {/* Toast */}
      {toast && (
        <div className="pop" style={{position:"fixed",top:70,left:"50%",transform:"translateX(-50%)",background:"var(--ios-card)",boxShadow:"var(--ios-sh-lg)",borderRadius:14,padding:"12px 20px",zIndex:100,fontSize:14,fontWeight:600,color:"var(--ios-label)"}}>
          {toast}
        </div>
      )}

      {/* Tab bar */}
      <div className="ios-tabbar">
        {[
          {id:"dashboard",icon:"📊",label:"Resumen"},
          {id:"calendar", icon:"📅",label:"Agenda"},
          {id:"clients",  icon:"👥",label:"Clientas"},
          {id:"services", icon:"✨",label:"Servicios"},
          {id:"config",   icon:"⚙️",label:"Config"},
        ].map(t=>(
          <button key={t.id} className={`ios-tab ${tab===t.id?"active":""}`} onClick={()=>changeTab(t.id)}>
            <span className="ios-tab-icon">{t.icon}</span>
            <span className="ios-tab-label">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard Tab ──────────────────────────────────────────────────
function DashboardTab({ apts, cfg }) {
  const today = todayStr();
  const todayApts = apts.filter(a=>a.date===today);
  const pending = apts.filter(a=>a.status==="pending");
  const confirmed = apts.filter(a=>a.status==="confirmed");

  return (
    <div>
      <div className="fu" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        <div className="card" style={{padding:"16px"}}>
          <div style={{fontSize:11,color:"var(--ios-label2)",fontWeight:600,textTransform:"uppercase",marginBottom:6}}>Hoy</div>
          <div style={{fontSize:28,fontWeight:700,color:"var(--ios-tint)"}}>{todayApts.length}</div>
        </div>
        <div className="card" style={{padding:"16px"}}>
          <div style={{fontSize:11,color:"var(--ios-label2)",fontWeight:600,textTransform:"uppercase",marginBottom:6}}>Pendientes</div>
          <div style={{fontSize:28,fontWeight:700,color:"var(--ios-orange)"}}>{pending.length}</div>
        </div>
      </div>

      <ProCalendar apts={apts}/>

      <div className="card fu d1" style={{padding:"18px",marginTop:16}}>
        <h3 style={{fontSize:17,fontWeight:600,color:"var(--ios-label)",marginBottom:14}}>Citas de hoy</h3>
        {todayApts.length===0 ? (
          <p style={{fontSize:14,color:"var(--ios-label2)",textAlign:"center",padding:"20px 0"}}>No hay citas programadas para hoy</p>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {todayApts.map(a=>(
              <div key={a._id} style={{background:"var(--ios-bg)",borderRadius:12,padding:"12px",borderLeft:`3px solid ${a.status==="confirmed"?"var(--ios-green)":a.status==="cancelled"?"#FF3B30":"var(--ios-orange)"}"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                  <span style={{fontSize:15,fontWeight:600,color:"var(--ios-label)"}}>{a.time}</span>
                  <span style={{fontSize:11,fontWeight:600,color:a.status==="confirmed"?"var(--ios-green)":a.status==="cancelled"?"#FF3B30":"var(--ios-orange)",textTransform:"uppercase"}}>
                    {a.status==="confirmed"?"✓ Confirmada":a.status==="cancelled"?"✗ Cancelada":"⏱️ Pendiente"}
                  </span>
                </div>
                <div style={{fontSize:14,color:"var(--ios-label)",marginBottom:2}}>{a.clientName}</div>
                <div style={{fontSize:13,color:"var(--ios-label2)"}}>{a.services || a.service}</div>
                <div style={{fontSize:13,color:"var(--ios-tint)",fontWeight:600,marginTop:4}}>${a.price}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Calendar Tab ───────────────────────────────────────────────────
function CalendarTab({ apts, db, onToast }) {
  const [selDate, setSel] = useState(todayStr());
  const [editApt, setEdit] = useState(null);
  const dayApts = apts.filter(a=>a.date===selDate);

  const updateStatus = async (id, status) => {
    await updateDoc(doc(db,"appointments",id), {status});
    playTap();
    onToast(status==="confirmed"?"✅ Confirmada":status==="cancelled"?"❌ Cancelada":"⏱️ Pendiente");
  };

  const deleteApt = async (id) => {
    if (!confirm("¿Eliminar esta cita?")) return;
    await deleteDoc(doc(db,"appointments",id));
    playTap();
    onToast("🗑️ Cita eliminada");
  };

  return (
    <div>
      <ProCalendar apts={apts} onDayClick={d=>setSel(d)}/>

      <div className="card fu d1" style={{padding:"18px",marginTop:16}}>
        <h3 style={{fontSize:17,fontWeight:600,color:"var(--ios-label)",marginBottom:4}}>{fmtLong(selDate)}</h3>
        <p style={{fontSize:13,color:"var(--ios-label2)",marginBottom:14}}>{dayApts.length} cita{dayApts.length!==1?"s":""}</p>

        {dayApts.length===0 ? (
          <p style={{fontSize:14,color:"var(--ios-label2)",textAlign:"center",padding:"20px 0"}}>Sin citas programadas</p>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {dayApts.map(a=>(
              <div key={a._id} style={{background:"var(--ios-bg)",borderRadius:12,padding:"14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:16,fontWeight:600,color:"var(--ios-label)",marginBottom:2}}>{a.time} • {a.clientName}</div>
                    <div style={{fontSize:14,color:"var(--ios-label2)",marginBottom:4}}>{a.services || a.service}</div>
                    <div style={{fontSize:13,color:"var(--ios-tint)",fontWeight:600}}>${a.price}</div>
                    {a.phone && <div style={{fontSize:12,color:"var(--ios-label2)",marginTop:4}}>📱 {a.phone}</div>}
                    {a.notes && <div style={{fontSize:12,color:"var(--ios-label2)",marginTop:4,fontStyle:"italic"}}>"{a.notes}"</div>}
                  </div>
                </div>

                <div style={{display:"flex",gap:6,marginTop:10}}>
                  {a.status!=="confirmed" && (
                    <button onClick={()=>updateStatus(a._id,"confirmed")}
                      style={{flex:1,padding:"8px",fontSize:13,fontWeight:600,background:"rgba(52,199,89,.1)",color:"var(--ios-green)",border:"none",borderRadius:8,cursor:"pointer"}}>
                      ✓ Confirmar
                    </button>
                  )}
                  {a.status!=="cancelled" && (
                    <button onClick={()=>updateStatus(a._id,"cancelled")}
                      style={{flex:1,padding:"8px",fontSize:13,fontWeight:600,background:"rgba(255,59,48,.1)",color:"#FF3B30",border:"none",borderRadius:8,cursor:"pointer"}}>
                      ✗ Cancelar
                    </button>
                  )}
                  <button onClick={()=>deleteApt(a._id)}
                    style={{padding:"8px 12px",fontSize:13,fontWeight:600,background:"rgba(0,0,0,.05)",color:"var(--ios-label2)",border:"none",borderRadius:8,cursor:"pointer"}}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Clients Tab ────────────────────────────────────────────────────
function ClientsTab({ clients, apts, db, onToast }) {
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState(null);

  const filtered = clients.filter(c=>c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));

  const clientApts = (phone) => apts.filter(a=>a.phone===cleanPhone(phone));

  return (
    <div>
      <div className="fu" style={{marginBottom:16}}>
        <input
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Buscar clienta..."
          style={{width:"100%",padding:"14px 16px",fontSize:15,borderRadius:12,border:".5px solid var(--ios-sep)",outline:"none",background:"var(--ios-card)"}}/>
      </div>

      <div className="card fu d1">
        {filtered.length===0 ? (
          <p style={{padding:"32px 20px",textAlign:"center",fontSize:14,color:"var(--ios-label2)"}}>No hay clientas registradas aún</p>
        ) : (
          filtered.map(c=>{
            const count = clientApts(c.phone).length;
            return (
              <div key={c._id} onClick={()=>setSel(c)} className="ios-row">
                <div className="ios-row-icon" style={{background:"rgba(255,45,85,.1)"}}>
                  <User size={16} color="var(--ios-tint)"/>
                </div>
                <div style={{flex:1}}>
                  <div className="ios-row-title">{c.name}</div>
                  <div style={{fontSize:13,color:"var(--ios-label2)"}}>{c.phone} • {count} cita{count!==1?"s":""}</div>
                </div>
                <div className="ios-chevron"/>
              </div>
            );
          })
        )}
      </div>

      {sel && (
        <div className="pop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:50,display:"flex",alignItems:"flex-end"}}>
          <div style={{background:"var(--ios-card)",borderRadius:"20px 20px 0 0",width:"100%",maxHeight:"80vh",overflowY:"auto",padding:"20px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{fontSize:20,fontWeight:700,color:"var(--ios-label)"}}>{sel.name}</h2>
              <button onClick={()=>setSel(null)}
                style={{background:"rgba(0,0,0,.06)",border:"none",borderRadius:"50%",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                <X size={18}/>
              </button>
            </div>
            <p style={{fontSize:14,color:"var(--ios-label2)",marginBottom:16}}>📱 {sel.phone}</p>
            <h3 style={{fontSize:15,fontWeight:600,color:"var(--ios-label)",marginBottom:10}}>Historial de citas</h3>
            {clientApts(sel.phone).map(a=>(
              <div key={a._id} style={{background:"var(--ios-bg)",borderRadius:10,padding:"12px",marginBottom:8}}>
                <div style={{fontSize:14,fontWeight:600,color:"var(--ios-label)"}}>{fmtShort(a.date)} • {a.time}</div>
                <div style={{fontSize:13,color:"var(--ios-label2)",marginTop:2}}>{a.services || a.service}</div>
                <div style={{fontSize:13,color:"var(--ios-tint)",fontWeight:600,marginTop:4}}>${a.price}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Services Tab ───────────────────────────────────────────────────
function ServicesTab({ db, services, onToast }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  const addNew = async (svc) => {
    await setDoc(doc(db,"services",uid()), {...svc, active:true});
    setAdding(false);
    playChime();
    onToast("✅ Servicio agregado");
  };

  const save = async (svc) => {
    await setDoc(doc(db,"services",svc.id), svc);
    setEditing(null);
    playChime();
    onToast("✅ Servicio actualizado");
  };

  const remove = async (id) => {
    if (!confirm("¿Eliminar este servicio?")) return;
    await deleteDoc(doc(db,"services",id));
    playTap();
    onToast("🗑️ Servicio eliminado");
  };

  const toggle = async (id, active) => {
    await updateDoc(doc(db,"services",id), {active});
    playTap();
    onToast(active ? "✅ Activado" : "⏸️ Desactivado");
  };

  return (
    <div>
      <button className="btn-r fu" onClick={()=>setAdding(true)}
        style={{width:"100%",padding:"14px",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",gap:8,borderRadius:12,marginBottom:16}}>
        <Plus size={18}/> Agregar servicio
      </button>

      <div className="card fu d1">
        {services.map((s,i)=>(
          <div key={s.id} style={{padding:"14px 16px",borderBottom:i<services.length-1?".5px solid var(--ios-sep)":"none"}}>
            {editing?.id===s.id ? (
              <EditSvcInline svc={s} onSave={save} onCancel={()=>setEditing(null)}/>
            ) : (
              <>
                <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:10}}>
                  <div style={{width:50,height:50,borderRadius:10,background:s.color||"#F8C8D4",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
                    {s.image ? <img src={s.image} alt={s.name} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:10}}/> : (s.emoji||"💅")}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:16,fontWeight:600,color:"var(--ios-label)",marginBottom:2}}>{s.name}</div>
                    <div style={{fontSize:13,color:"var(--ios-label2)",marginBottom:4}}>{fmtDur(s.duration)} • ${s.price}</div>
                    <div style={{display:"inline-flex",alignItems:"center",gap:6,background:s.active?"rgba(52,199,89,.1)":"rgba(0,0,0,.05)",borderRadius:6,padding:"3px 8px",fontSize:11,fontWeight:600,color:s.active?"var(--ios-green)":"var(--ios-label3)"}}>
                      {s.active ? "✓ Activo" : "⏸️ Pausado"}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>toggle(s.id,!s.active)}
                    style={{flex:1,padding:"8px",fontSize:12,fontWeight:600,background:s.active?"rgba(255,149,0,.1)":"rgba(52,199,89,.1)",color:s.active?"var(--ios-orange)":"var(--ios-green)",border:"none",borderRadius:8,cursor:"pointer"}}>
                    {s.active ? "⏸️ Pausar" : "▶️ Activar"}
                  </button>
                  <button onClick={()=>setEditing(s)}
                    style={{flex:1,padding:"8px",fontSize:12,fontWeight:600,background:"rgba(0,122,255,.1)",color:"var(--ios-blue)",border:"none",borderRadius:8,cursor:"pointer"}}>
                    <Pencil size={12} style={{display:"inline",marginRight:4}}/> Editar
                  </button>
                  <button onClick={()=>remove(s.id)}
                    style={{padding:"8px 12px",fontSize:12,fontWeight:600,background:"rgba(255,59,48,.1)",color:"#FF3B30",border:"none",borderRadius:8,cursor:"pointer"}}>
                    <Trash2 size={12}/>
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {adding && (
        <div className="pop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div className="card" style={{width:"100%",maxWidth:400,padding:"24px"}}>
            <h2 style={{fontSize:20,fontWeight:700,color:"var(--ios-label)",marginBottom:16}}>Nuevo servicio</h2>
            <ServiceForm onSave={addNew} onCancel={()=>setAdding(false)}/>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceForm({ svc, onChange, onSave, onCancel }) {
  const [s, setS] = useState(svc || {name:"",price:0,duration:30,emoji:"💅",color:"#F8C8D4",image:""});

  const handleSave = () => {
    if (!s.name || !s.price || !s.duration) return;
    if (onSave) onSave({...s,price:Number(s.price),duration:Number(s.duration)});
    else if (onChange) onChange(s);
  };

  return (
    <div>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:11,color:"var(--ios-label2)",fontWeight:600,marginBottom:4,display:"block"}}>Nombre del servicio</label>
        <input value={s.name} onChange={e=>setS({...s,name:e.target.value})} placeholder="Ej: Manicure Básico"
          style={{width:"100%",padding:"10px 12px",fontSize:15,borderRadius:10,border:".5px solid var(--ios-sep)"}}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <div>
          <label style={{fontSize:11,color:"var(--ios-label2)",fontWeight:600,marginBottom:4,display:"block"}}>Precio ($)</label>
          <input type="number" value={s.price||""} onChange={e=>setS({...s,price:e.target.value})} placeholder="200"
            style={{width:"100%",padding:"10px 12px",fontSize:15,borderRadius:10,border:".5px solid var(--ios-sep)"}}/>
        </div>
        <div>
          <label style={{fontSize:11,color:"var(--ios-label2)",fontWeight:600,marginBottom:4,display:"block"}}>Duración (min)</label>
          <input type="number" value={s.duration||""} onChange={e=>setS({...s,duration:e.target.value})} placeholder="45"
            style={{width:"100%",padding:"10px 12px",fontSize:15,borderRadius:10,border:".5px solid var(--ios-sep)"}}/>
        </div>
      </div>

      <div style={{marginBottom:14}}>
        <label style={{fontSize:11,color:"var(--ios-label2)",fontWeight:600,marginBottom:6,display:"block"}}>Emoji</label>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {EMOJI_OPTS.map(em=>(
            <button key={em} onClick={()=>setS({...s,emoji:em})}
              style={{width:38,height:38,borderRadius:8,background:s.emoji===em?"var(--ios-tint-lt)":"var(--ios-bg)",border:s.emoji===em?"2px solid var(--ios-tint)":"2px solid transparent",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
              {em}
            </button>
          ))}
        </div>
      </div>

      <div style={{marginBottom:20}}>
        <label style={{fontSize:11,color:"var(--ios-label2)",fontWeight:600,marginBottom:6,display:"block"}}>Color</label>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {COLOR_OPTS.map(cl=>(
            <button key={cl} onClick={()=>setS({...s,color:cl})}
              style={{width:30,height:30,borderRadius:10,background:cl,border:s.color===cl?"3px solid var(--rose)":"2px solid transparent",cursor:"pointer",transition:"transform .15s",transform:s.color===cl?"scale(1.15)":"scale(1)"}}>
            </button>
          ))}
        </div>
      </div>

      {onSave && (
        <div style={{display:"flex",gap:8}}>
          <button className="btn-r" onClick={handleSave} style={{borderRadius:10,padding:"12px 20px",fontSize:14,flex:1}}>
            <Save size={14} style={{display:"inline",marginRight:6}}/> Guardar
          </button>
          <button className="btn-o" onClick={onCancel} style={{borderRadius:10,padding:"12px 18px",fontSize:14}}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

function EditSvcInline({ svc, onSave, onCancel }) {
  const [s, setS] = useState(svc);
  return (
    <div>
      <p style={{fontSize:13,fontWeight:600,color:"var(--ios-label)",marginBottom:12}}>✏️ Editando: {s.name}</p>
      <ServiceForm svc={s} onChange={setS}/>
      <div style={{display:"flex",gap:8,marginTop:14}}>
        <button className="btn-r" onClick={()=>onSave({...s,price:Number(s.price),duration:Number(s.duration)})} style={{borderRadius:10,padding:"10px 18px",fontSize:13,display:"flex",alignItems:"center",gap:4}}><Save size={14}/>Guardar</button>
        <button className="btn-o" onClick={onCancel} style={{borderRadius:10,padding:"10px 16px",fontSize:13}}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Config panel ───────────────────────────────────────────────────
function resizeImage(file, maxPx, quality, cb) {
  const img = new Image(); const url = URL.createObjectURL(file);
  img.onload = () => {
    const s = Math.min(1, maxPx / Math.max(img.width, img.height));
    const w = Math.round(img.width*s); const h = Math.round(img.height*s);
    const c = document.createElement("canvas"); c.width=w; c.height=h;
    c.getContext("2d").drawImage(img,0,0,w,h);
    cb(c.toDataURL("image/jpeg", quality)); URL.revokeObjectURL(url);
  }; img.src=url;
}

function ConfigPanel({ cfg, onSave, onToast, onLogout, newApts, todayCount }) {
  const [f, setF] = useState(cfg || {
    salonName:"",salonLocation:"",profName:"",profPhoto:"",slotInterval:30,
    workStart:"09:00",workEnd:"18:00",heroTitle:"",heroSubtitle:"",heroBg:"",
    theme:"rosa",logoImage:"",showServices:true,showTrajectory:false,
    showPromotions:false,trajectoryText:"",promotions:[]
  });
  
  const [newPromo, setNewPromo] = useState({title:"",description:"",validUntil:"",image:""});
  const [addingPromo, setAddingPromo] = useState(false);

  useEffect(()=>{ 
    if(cfg) setF({
      slotInterval:30,workStart:"09:00",workEnd:"18:00",heroTitle:"",heroSubtitle:"",
      heroBg:"",profName:"",profPhoto:"",theme:"rosa",logoImage:"",
      showServices:true,showTrajectory:false,showPromotions:false,
      trajectoryText:"",promotions:[],...cfg
    }); 
  },[cfg]);
  
  const save = async () => { await onSave(f); onToast("✅ Guardado"); };

  const addPromotion = () => {
    if (!newPromo.title || !newPromo.description) return;
    setF({...f, promotions: [...(f.promotions||[]), newPromo]});
    setNewPromo({title:"",description:"",validUntil:"",image:""});
    setAddingPromo(false);
    playTap();
  };

  const removePromotion = (idx) => {
    setF({...f, promotions: f.promotions.filter((_,i)=>i!==idx)});
    playTap();
  };

  return (
    <div className="fu">

      {/* ── Perfil header con logout ── */}
      <div style={{background:`linear-gradient(135deg,var(--ios-tint),${THEMES[f.theme||"rosa"].primaryDark})`,borderRadius:20,padding:"20px",marginBottom:20,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 80% 20%,rgba(255,255,255,.12),transparent 60%)"}}/>
        <div style={{display:"flex",alignItems:"center",gap:14,position:"relative"}}>
          {/* Avatar */}
          <div style={{width:60,height:60,borderRadius:"50%",overflow:"hidden",background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:"2.5px solid rgba(255,255,255,.4)"}}>
            {f.profPhoto
              ? <img src={f.profPhoto} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              : <span style={{fontSize:26}}>💅</span>
            }
          </div>
          {/* Info */}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:17,fontWeight:700,color:"#fff",letterSpacing:"-.3px",marginBottom:1}}>{f.profName||f.salonName||"Nail Studio Pro"}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginBottom:6}}>{f.salonName||"Mi salón"} · {f.salonLocation||""}</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{background:"rgba(255,255,255,.15)",borderRadius:8,padding:"3px 9px",fontSize:11,fontWeight:600,color:"rgba(255,255,255,.9)"}}>
                <span className="live-dot pulse" style={{background:"#4eff7c",width:6,height:6}}/>
                {todayCount||0} citas hoy
              </div>
              {newApts>0 && (
                <div style={{background:"rgba(255,255,255,.2)",borderRadius:8,padding:"3px 9px",fontSize:11,fontWeight:600,color:"#fff"}}>
                  🔔 {newApts} nueva{newApts>1?"s":""}
                </div>
              )}
            </div>
          </div>
          {/* Logout */}
          <button onClick={onLogout}
            style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.25)",borderRadius:10,padding:"8px 12px",cursor:"pointer",
              fontSize:12,fontWeight:600,color:"#fff",display:"flex",alignItems:"center",gap:5,flexShrink:0,backdropFilter:"blur(8px)"}}>
            <Lock size={13} color="#fff"/> Salir
          </button>
        </div>
        {/* Cambiar foto link */}
        <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid rgba(255,255,255,.15)",position:"relative"}}>
          <label style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.18)",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:600,color:"#fff"}}>
            <input type="file" accept="image/*" style={{display:"none"}}
              onChange={e=>{ if(e.target.files[0]) resizeImage(e.target.files[0],400,.88,d=>setF({...f,profPhoto:d})); }}/>
            📷 Cambiar foto de perfil
          </label>
          {f.profPhoto && (
            <button onClick={()=>setF({...f,profPhoto:""})}
              style={{marginLeft:8,background:"rgba(255,255,255,.1)",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",color:"rgba(255,255,255,.75)",fontSize:12,fontFamily:"'DM Sans',sans-serif"}}>
              Quitar foto
            </button>
          )}
        </div>
      </div>

      {/* ── TEMA DE COLORES ── */}
      <p style={{fontSize:12,fontWeight:700,color:"var(--ios-label2)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:8,paddingLeft:4}}>Tema de colores</p>
      <div className="ios-list" style={{marginBottom:20}}>
        <div style={{padding:"14px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {Object.entries(THEMES).map(([key, theme]) => (
              <button key={key} onClick={()=>setF({...f,theme:key})}
                style={{padding:"16px",borderRadius:12,border:f.theme===key?"2px solid var(--ios-tint)":"2px solid transparent",
                  background:f.theme===key?theme.primaryLight:"var(--ios-bg)",cursor:"pointer",transition:"all .18s",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                <div style={{fontSize:32}}>{theme.icon}</div>
                <div style={{fontSize:14,fontWeight:600,color:"var(--ios-label)"}}>{theme.name}</div>
                {f.theme===key && <Check size={16} color={theme.primary}/>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── LOGO PERSONALIZADO ── */}
      <p style={{fontSize:12,fontWeight:700,color:"var(--ios-label2)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:8,paddingLeft:4}}>Logo de inicio</p>
      <div className="ios-list" style={{marginBottom:20}}>
        <div style={{padding:"14px"}}>
          <div style={{fontSize:11,color:"var(--ios-label2)",fontWeight:500,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
            <Image size={16}/> Imagen del logo (reemplaza la estrellita)
          </div>
          {f.logoImage && (
            <div style={{borderRadius:14,overflow:"hidden",width:72,height:72,background:`url(${f.logoImage}) center/cover`,
              marginBottom:10,position:"relative",border:"2px solid var(--ios-sep)"}}>
              <button onClick={()=>setF({...f,logoImage:""})}
                style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,.7)",border:"none",borderRadius:"50%",
                  width:22,height:22,cursor:"pointer",color:"#fff",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
          )}
          <label style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(0,122,255,.08)",borderRadius:10,padding:"9px 16px",cursor:"pointer",fontSize:13,fontWeight:500,color:"var(--ios-blue)"}}>
            <input type="file" accept="image/*" style={{display:"none"}}
              onChange={e=>{ if(e.target.files[0]) resizeImage(e.target.files[0],200,.9,d=>setF({...f,logoImage:d})); }}/>
            {f.logoImage ? "Cambiar logo" : "📷 Subir logo"}
          </label>
          {f.logoImage && (
            <button onClick={()=>setF({...f,logoImage:""})}
              style={{marginLeft:8,background:"rgba(255,59,48,.08)",border:"none",borderRadius:10,padding:"9px 16px",cursor:"pointer",color:"#FF3B30",fontSize:13,fontWeight:500}}>
              Quitar logo
            </button>
          )}
        </div>
      </div>

      {/* ── VISIBILIDAD DE SECCIONES ── */}
      <p style={{fontSize:12,fontWeight:700,color:"var(--ios-label2)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:8,paddingLeft:4}}>Visibilidad en página de inicio</p>
      <div className="ios-list" style={{marginBottom:20}}>
        <div style={{padding:"11px 14px",borderBottom:".5px solid var(--ios-sep)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:8,background:"rgba(255,149,0,.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>✨</div>
            <div style={{fontSize:15,color:"var(--ios-label)"}}>Mostrar servicios</div>
          </div>
          <label className="tog">
            <button className={`tog-btn ${f.showServices?"ton":""}`} onClick={()=>setF({...f,showServices:!f.showServices})}>
              {f.showServices?"Sí":"No"}
            </button>
          </label>
        </div>

        <div style={{padding:"11px 14px",borderBottom:".5px solid var(--ios-sep)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:8,background:"rgba(0,122,255,.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>📖</div>
            <div style={{fontSize:15,color:"var(--ios-label)"}}>Mostrar trayectoria</div>
          </div>
          <label className="tog">
            <button className={`tog-btn ${f.showTrajectory?"ton":""}`} onClick={()=>setF({...f,showTrajectory:!f.showTrajectory})}>
              {f.showTrajectory?"Sí":"No"}
            </button>
          </label>
        </div>

        <div style={{padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:8,background:"rgba(255,45,85,.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>🎁</div>
            <div style={{fontSize:15,color:"var(--ios-label)"}}>Mostrar promociones</div>
          </div>
          <label className="tog">
            <button className={`tog-btn ${f.showPromotions?"ton":""}`} onClick={()=>setF({...f,showPromotions:!f.showPromotions})}>
              {f.showPromotions?"Sí":"No"}
            </button>
          </label>
        </div>
      </div>

      {/* ── TRAYECTORIA ── */}
      {f.showTrajectory && (
        <>
          <p style={{fontSize:12,fontWeight:700,color:"var(--ios-label2)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:8,paddingLeft:4}}>Trayectoria / Historia</p>
          <div className="ios-list" style={{marginBottom:20}}>
            <div style={{padding:"14px"}}>
              <label style={{fontSize:11,color:"var(--ios-label2)",fontWeight:500,marginBottom:6,display:"block"}}>Texto de trayectoria</label>
              <textarea value={f.trajectoryText||""} onChange={e=>setF({...f,trajectoryText:e.target.value})}
                placeholder="Escribe aquí la historia de tu negocio, experiencia, logros, etc..."
                rows={6}
                style={{width:"100%",padding:"12px",fontSize:15,borderRadius:10,border:".5px solid var(--ios-sep)",resize:"vertical"}}/>
            </div>
          </div>
        </>
      )}

      {/* ── PROMOCIONES ── */}
      {f.showPromotions && (
        <>
          <p style={{fontSize:12,fontWeight:700,color:"var(--ios-label2)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:8,paddingLeft:4}}>Promociones activas</p>
          <div className="ios-list" style={{marginBottom:12}}>
            {(!f.promotions || f.promotions.length === 0) ? (
              <div style={{padding:"20px",textAlign:"center",color:"var(--ios-label2)",fontSize:14}}>
                No hay promociones. Agrega una nueva.
              </div>
            ) : (
              f.promotions.map((promo,i)=>(
                <div key={i} style={{padding:"14px",borderBottom:i<f.promotions.length-1?".5px solid var(--ios-sep)":"none"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:15,fontWeight:600,color:"var(--ios-label)",marginBottom:2}}>{promo.title}</div>
                      <div style={{fontSize:13,color:"var(--ios-label2)",marginBottom:4}}>{promo.description}</div>
                      {promo.validUntil && <div style={{fontSize:12,color:"var(--ios-tint)",fontWeight:500}}>Válido hasta: {promo.validUntil}</div>}
                    </div>
                    <button onClick={()=>removePromotion(i)}
                      style={{background:"rgba(255,59,48,.1)",border:"none",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#FF3B30",flexShrink:0,marginLeft:10}}>
                      <X size={14}/>
                    </button>
                  </div>
                  {promo.image && (
                    <div style={{width:"100%",height:100,borderRadius:10,overflow:"hidden",background:`url(${promo.image}) center/cover`}}/>
                  )}
                </div>
              ))
            )}
          </div>

          <button className="btn-o" onClick={()=>setAddingPromo(true)}
            style={{width:"100%",padding:"12px",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:6,borderRadius:12,marginBottom:20}}>
            <Plus size={16}/> Agregar promoción
          </button>
        </>
      )}

      {/* Modal para agregar promoción */}
      {addingPromo && (
        <div className="pop" style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div className="card" style={{width:"100%",maxWidth:400,padding:"24px",maxHeight:"90vh",overflowY:"auto"}}>
            <h2 style={{fontSize:20,fontWeight:700,color:"var(--ios-label)",marginBottom:16}}>Nueva promoción</h2>
            
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,color:"var(--ios-label2)",fontWeight:600,marginBottom:4,display:"block"}}>Título</label>
              <input value={newPromo.title} onChange={e=>setNewPromo({...newPromo,title:e.target.value})}
                placeholder="Ej: 2x1 en Manicure"
                style={{width:"100%",padding:"10px 12px",fontSize:15,borderRadius:10,border:".5px solid var(--ios-sep)"}}/>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,color:"var(--ios-label2)",fontWeight:600,marginBottom:4,display:"block"}}>Descripción</label>
              <textarea value={newPromo.description} onChange={e=>setNewPromo({...newPromo,description:e.target.value})}
                placeholder="Detalles de la promoción..."
                rows={3}
                style={{width:"100%",padding:"10px 12px",fontSize:15,borderRadius:10,border:".5px solid var(--ios-sep)",resize:"vertical"}}/>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,color:"var(--ios-label2)",fontWeight:600,marginBottom:4,display:"block"}}>Válido hasta (opcional)</label>
              <input type="date" value={newPromo.validUntil} onChange={e=>setNewPromo({...newPromo,validUntil:e.target.value})}
                style={{width:"100%",padding:"10px 12px",fontSize:15,borderRadius:10,border:".5px solid var(--ios-sep)"}}/>
            </div>

            <div style={{marginBottom:20}}>
              <label style={{fontSize:11,color:"var(--ios-label2)",fontWeight:600,marginBottom:6,display:"block"}}>Imagen (opcional)</label>
              {newPromo.image && (
                <div style={{borderRadius:12,overflow:"hidden",height:140,background:`url(${newPromo.image}) center/cover`,marginBottom:10,position:"relative"}}>
                  <button onClick={()=>setNewPromo({...newPromo,image:""})}
                    style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,.7)",border:"none",borderRadius:"50%",
                      width:26,height:26,cursor:"pointer",color:"#fff",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                </div>
              )}
              <label style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(0,122,255,.08)",borderRadius:10,padding:"9px 16px",cursor:"pointer",fontSize:13,fontWeight:500,color:"var(--ios-blue)"}}>
                <input type="file" accept="image/*" style={{display:"none"}}
                  onChange={e=>{ if(e.target.files[0]) resizeImage(e.target.files[0],800,.85,d=>setNewPromo({...newPromo,image:d})); }}/>
                {newPromo.image ? "Cambiar imagen" : "📷 Subir imagen"}
              </label>
            </div>

            <div style={{display:"flex",gap:8}}>
              <button className="btn-r" onClick={addPromotion} disabled={!newPromo.title || !newPromo.description}
                style={{flex:1,borderRadius:10,padding:"12px",fontSize:14}}>
                Agregar
              </button>
              <button className="btn-o" onClick={()=>{setAddingPromo(false);setNewPromo({title:"",description:"",validUntil:"",image:""});}}
                style={{borderRadius:10,padding:"12px 18px",fontSize:14}}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mi negocio ── */}
      <p style={{fontSize:12,fontWeight:700,color:"var(--ios-label2)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:8,paddingLeft:4}}>Mi negocio</p>
      <div className="ios-list" style={{marginBottom:20}}>
        {[
          {label:"Nombre del salón", key:"salonName",    icon:"🏪", placeholder:"Nail Studio",    type:"text"},
          {label:"Tu nombre",        key:"profName",     icon:"👤", placeholder:"Karla, María…",  type:"text"},
          {label:"Ubicación",        key:"salonLocation",icon:"📍", placeholder:"Ciudad, Estado", type:"text"},
          {label:"WhatsApp del salón",key:"whatsapp",    icon:"💬", placeholder:SALON_PHONE,      type:"tel"},
        ].map(({label,key,placeholder,type,icon},i,arr)=>(
          <div key={key} style={{padding:"11px 14px",borderBottom:i<arr.length-1?".5px solid var(--ios-sep)":"none",display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:8,background:"rgba(255,45,85,.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{icon}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,color:"var(--ios-label2)",fontWeight:500,marginBottom:2}}>{label}</div>
              <input value={f[key]||""} onChange={e=>setF({...f,[key]:e.target.value})} placeholder={placeholder} type={type}
                style={{fontSize:15,border:"none",outline:"none",background:"transparent",width:"100%",padding:0,boxShadow:"none",color:"var(--ios-label)"}}/>
            </div>
          </div>
        ))}
      </div>

      {/* ── Horario ── */}
      <p style={{fontSize:12,fontWeight:700,color:"var(--ios-label2)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:8,paddingLeft:4}}>Horario laboral</p>
      <div className="ios-list" style={{marginBottom:20}}>
        {[
          {label:"Entrada", key:"workStart", default:"09:00", icon:"🌅"},
          {label:"Salida",  key:"workEnd",   default:"18:00", icon:"🌙"},
        ].map(({label,key,default:def,icon},i)=>(
          <div key={key} style={{padding:"11px 14px",borderBottom:i===0?".5px solid var(--ios-sep)":"none",display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:8,background:"rgba(255,149,0,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{icon}</div>
            <div style={{fontSize:15,color:"var(--ios-label)",flex:1}}>{label}</div>
            <input type="time" value={f[key]||def} onChange={e=>setF({...f,[key]:e.target.value})}
              style={{border:"none",outline:"none",background:"rgba(255,45,85,.06)",borderRadius:8,padding:"5px 10px",fontSize:14,color:"var(--ios-tint)",fontWeight:600,width:"auto",boxShadow:"none"}}/>
          </div>
        ))}
      </div>

      {/* ── Intervalo ── */}
      <p style={{fontSize:12,fontWeight:700,color:"var(--ios-label2)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:8,paddingLeft:4}}>Intervalo de citas</p>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
        {[{v:30,l:"30 min"},{v:45,l:"45 min"},{v:60,l:"1 h"},{v:90,l:"1.5 h"},{v:120,l:"2 h"}].map(({v,l})=>(
          <button key={v} onClick={()=>setF({...f,slotInterval:v})}
            style={{padding:"9px 16px",borderRadius:10,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,
              background:f.slotInterval===v?"var(--ios-tint)":"var(--ios-card)",
              color:f.slotInterval===v?"#fff":"var(--ios-label2)",
              boxShadow:f.slotInterval===v?"0 4px 12px rgba(255,45,85,.3)":"var(--ios-sh)",
              transition:"all .18s",fontFamily:"'DM Sans',sans-serif"}}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Portal de clientas ── */}
      <p style={{fontSize:12,fontWeight:700,color:"var(--ios-label2)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:8,paddingLeft:4}}>Portal de clientas</p>
      <div className="ios-list" style={{marginBottom:20}}>
        <div style={{padding:"11px 14px",borderBottom:".5px solid var(--ios-sep)",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:"rgba(0,122,255,.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>✏️</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,color:"var(--ios-label2)",fontWeight:500,marginBottom:2}}>Título principal</div>
            <input value={f.heroTitle||""} onChange={e=>setF({...f,heroTitle:e.target.value})} placeholder={f.salonName||"Nail Studio"}
              style={{fontSize:15,border:"none",outline:"none",background:"transparent",width:"100%",padding:0,boxShadow:"none",color:"var(--ios-label)"}}/>
          </div>
        </div>
        <div style={{padding:"11px 14px",borderBottom:".5px solid var(--ios-sep)",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:"rgba(175,82,222,.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>💬</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,color:"var(--ios-label2)",fontWeight:500,marginBottom:2}}>Subtítulo / slogan</div>
            <input value={f.heroSubtitle||""} onChange={e=>setF({...f,heroSubtitle:e.target.value})} placeholder="Uñas que cuentan historias"
              style={{fontSize:15,border:"none",outline:"none",background:"transparent",width:"100%",padding:0,boxShadow:"none",color:"var(--ios-label)"}}/>
          </div>
        </div>
        <div style={{padding:"14px"}}>
          <div style={{fontSize:11,color:"var(--ios-label2)",fontWeight:500,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:16}}>🖼️</span> Foto de fondo del banner
          </div>
          {f.heroBg && (
            <div style={{borderRadius:14,overflow:"hidden",height:110,background:`linear-gradient(rgba(0,0,0,.4),rgba(0,0,0,.4)), url(${f.heroBg}) center/cover`,
              display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10,position:"relative"}}>
              <span style={{color:"#fff",fontSize:16,fontWeight:600}}>{f.heroTitle||f.salonName||"Nail Studio"}</span>
              <button onClick={()=>setF({...f,heroBg:""})}
                style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,.5)",border:"none",borderRadius:"50%",
                  width:26,height:26,cursor:"pointer",color:"#fff",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
          )}
          <label style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(255,45,85,.08)",borderRadius:10,padding:"9px 16px",cursor:"pointer",fontSize:13,fontWeight:500,color:"var(--ios-tint)"}}>
            <input type="file" accept="image/*" style={{display:"none"}}
              onChange={e=>{ if(e.target.files[0]) resizeImage(e.target.files[0],1200,.85,d=>setF({...f,heroBg:d})); }}/>
            {f.heroBg ? "Cambiar foto" : "📷 Subir foto de fondo"}
          </label>
        </div>
      </div>

      {/* ── Guardar ── */}
      <button className="btn-r" onClick={save}
        style={{width:"100%",padding:"15px",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",gap:8,borderRadius:16,marginBottom:20}}>
        <Save size={17}/> Guardar cambios
      </button>

      {/* ── Seguridad ── */}
      <p style={{fontSize:12,fontWeight:700,color:"var(--ios-label2)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:8,paddingLeft:4}}>Seguridad</p>
      <div className="ios-list" style={{marginBottom:30}}>
        <div style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:"rgba(255,45,85,.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>🔒</div>
          <div style={{flex:1}}>
            <div style={{fontSize:15,color:"var(--ios-label)",marginBottom:2}}>Contraseña del panel</div>
            <div style={{fontSize:12,color:"var(--ios-label2)"}}>Definida en el código fuente</div>
          </div>
          <code style={{fontSize:13,background:"rgba(0,0,0,.06)",padding:"4px 10px",borderRadius:8,color:"var(--ios-label2)"}}>{ADMIN_PASSWORD}</code>
        </div>
      </div>

    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  ROOT
// ══════════════════════════════════════════════════════════════════
export default function App() {
  const { db, ready, error } = useFirebase();
  const [screen, setScreen]  = useState(() => sessionStorage.getItem("ns_screen") || "client");
  const [adminTab, setAdminTab] = useState(() => sessionStorage.getItem("ns_tab") || "dashboard");
  const { services }         = useServices(db);
  const { cfg }              = useConfig(db);
  const blocked              = useBlocked(db);

  useEffect(() => { sessionStorage.setItem("ns_screen", screen); }, [screen]);
  useEffect(() => { sessionStorage.setItem("ns_tab", adminTab); }, [adminTab]);

  if (error) return <NotConfigured/>;
  if (!ready) return (
    <div style={{minHeight:"100vh",background:"var(--ios-bg)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
      <G/>
      <div style={{width:40,height:40,border:"3px solid rgba(255,45,85,.2)",borderTopColor:"var(--ios-tint)",borderRadius:"50%"}} className="spin"/>
      <p style={{color:"var(--ios-label2)",fontSize:14}}>Conectando…</p>
    </div>
  );

  return (
    screen === "client" ? <ClientPortal db={db} services={services} cfg={cfg} blocked={blocked} onAdmin={()=>setScreen("login")}/> :
    screen === "login"  ? <AdminLogin onSuccess={()=>setScreen("admin")} onBack={()=>setScreen("client")}/> :
                          <AdminPanel db={db} initialTab={adminTab} onTabChange={t=>setAdminTab(t)} onLogout={()=>{setScreen("client");sessionStorage.removeItem("ns_screen");}}/>
  );
}
