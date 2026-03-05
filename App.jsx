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
  Pencil, Trash2, Save, Settings, Wifi, WifiOff, Bell
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
//  GLOBAL STYLES
// ══════════════════════════════════════════════════════════════════
const G = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=SF+Pro+Display:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --ios-tint:#FF2D55;--ios-tint-dk:#CC1A3E;--ios-tint-lt:rgba(255,45,85,.1);
      --ios-green:#34C759;--ios-orange:#FF9500;--ios-blue:#007AFF;--ios-purple:#AF52DE;
      --ios-bg:#F2F2F7;--ios-bg2:#E5E5EA;--ios-card:#FFFFFF;
      --ios-label:rgba(0,0,0,.85);--ios-label2:rgba(60,60,67,.6);--ios-label3:rgba(60,60,67,.3);
      --ios-sep:rgba(60,60,67,.18);
      --ios-blur:rgba(255,255,255,.82);
      --ios-r:16px;--ios-r-sm:12px;--ios-r-lg:22px;
      --ios-sh:0 2px 20px rgba(0,0,0,.07),0 1px 4px rgba(0,0,0,.04);
      --ios-sh-lg:0 8px 40px rgba(0,0,0,.12),0 2px 8px rgba(0,0,0,.06);
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
    input:focus,select:focus,textarea:focus{outline:none;border-color:var(--ios-tint);box-shadow:0 0 0 3px rgba(255,45,85,.12)}
    input::placeholder,textarea::placeholder{color:var(--ios-label3)}

    /* ── Calendar day ── */
    .cal-day{aspect-ratio:1;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:15px;font-weight:400;cursor:pointer;transition:all .15s;position:relative;user-select:none;color:var(--ios-label)}
    .ca:hover{background:rgba(255,45,85,.1)}
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
    .ss{background:var(--ios-tint)!important;color:#fff!important;box-shadow:0 4px 14px rgba(255,45,85,.35)!important}

    /* ── Service cards ── */
    .svc-c{border-radius:var(--ios-r);border:2px solid transparent;cursor:pointer;transition:all .18s;position:relative;overflow:hidden;text-align:left;padding:0;background:var(--ios-card);box-shadow:var(--ios-sh)}
    .svc-c:active{transform:scale(.96)}
    .svc-sel{border-color:var(--ios-tint)!important;box-shadow:0 0 0 3px rgba(255,45,85,.15),var(--ios-sh)!important}

    /* ── Toggle ── */
    .tog{display:flex;background:rgba(118,118,128,.12);border-radius:10px;padding:2px}
    .tog-btn{flex:1;padding:8px 4px;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:500;transition:all .18s;font-family:-apple-system,sans-serif;color:var(--ios-label2);background:transparent}
    .tog-btn.ton{background:var(--ios-card);color:var(--ios-label);box-shadow:0 2px 8px rgba(0,0,0,.1);font-weight:600}

    /* ── Badge ── */
    .badge{font-size:11px;padding:3px 8px;border-radius:6px;font-weight:600;display:inline-block}

    /* ── Scrollbar ── */
    ::-webkit-scrollbar{width:4px}
    ::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:99px}

    /* ── Live dot ── */
    .live-dot{width:7px;height:7px;border-radius:50%;background:var(--ios-green);display:inline-block;margin-right:5px}
    .live-dot.pulse{animation:pulse 1.5s ease-in-out infinite}

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
    body.dark .btn-o{background:rgba(255,45,85,.18)!important;color:#FF6B8A!important}
    body.dark .btn-ghost{color:#FF6B8A!important}
    body.dark a{color:#FF6B8A}
    body.dark [style*="background:var(--ios-bg)"]{background:#000!important}
    body.dark [style*="background:#F2F2F7"]{background:#000!important}
    body.dark [style*="background:#FFFFFF"]{background:#1C1C1E!important}
    body.dark [style*="background:white"]{background:#1C1C1E!important}
    body.dark ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.2)}
  `}</style>
);

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
  const [cfg, setCfg] = useState({ salonName:"Nail Studio", salonLocation:"Nezahualcóyotl, México" });
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
function CalendarPage({ db, services, cfg, blocked, onNext, onBack }) {
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
  }, [takenMap, blocked, cfg, dims, month, year]);

  const canPrev  = !(year === now.getFullYear() && month === now.getMonth());
  const prevMo   = () => { setMonth(m => m === 0 ? 11 : m-1); if (month===0) setYear(y=>y-1); setSel(""); setSelTime(""); };
  const nextMo   = () => { setMonth(m => m === 11 ? 0 : m+1); if (month===11) setYear(y=>y+1); setSel(""); setSelTime(""); };

  const pickDay  = (ds, dow) => {
    if (ds < today || dow === 0 || dayStatus[ds] === "full") return;
    const isDayOff = (blocked||[]).find(b=>b.type==="day"&&b.date===ds);
    if (isDayOff) return;
    playTap(); setSel(p => p === ds ? "" : ds); setSelTime("");
  };

  const blockedToday = (blocked||[]).filter(b=>b.date===selDate);
  const isDayBlocked = blockedToday.find(b=>b.type==="day");
  const blockedSlotTimes = blockedToday.filter(b=>b.type==="slot").map(b=>b.time);
  const takenToday = [...new Set([...(takenMap[selDate]||[]), ...blockedSlotTimes])];
  const availCount = slots.filter(s=>!takenToday.includes(s)).length;

  return (
    <div className="page slideUp">
      <G/>
      <div className="ios-nav">
        <button className="ios-back" onClick={onBack}><ChevronLeft size={20}/> Volver</button>
        <span className="ios-nav-title">Elige tu fecha</span>
        <div style={{minWidth:60}}/>
      </div>

      <div style={{maxWidth:480,margin:"0 auto",padding:"16px 16px 120px",width:"100%"}}>

        {/* Calendar card */}
        <div className="card fu" style={{padding:"20px 16px",marginBottom:14}}>

          {/* Month nav */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
            <button onClick={prevMo} disabled={!canPrev}
              style={{border:"none",background:canPrev?"rgba(255,45,85,.1)":"rgba(0,0,0,.04)",borderRadius:"50%",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:canPrev?"pointer":"not-allowed",color:canPrev?"var(--ios-tint)":"var(--ios-label3)",transition:"all .2s"}}>
              <ChevronLeft size={16}/>
            </button>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:700,color:"var(--ios-label)",letterSpacing:"-.4px"}}>
                {MONTHS_ES[month]}
              </div>
              <div style={{fontSize:13,color:"var(--ios-label2)",marginTop:1}}>{year}</div>
            </div>
            <button onClick={nextMo}
              style={{border:"none",background:"rgba(255,45,85,.1)",borderRadius:"50%",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--ios-tint)",transition:"all .2s"}}>
              <ChevronRight size={16}/>
            </button>
          </div>

          {/* Day headers Mon-Sun */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:6}}>
            {["L","M","M","J","V","S","D"].map((l,i) => (
              <div key={i} style={{textAlign:"center",fontSize:12,fontWeight:600,color:i===6?"rgba(255,45,85,.5)":"var(--ios-label2)",padding:"3px 0"}}>{l}</div>
            ))}
          </div>

          {/* Days */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
            {Array.from({length:startCol}).map((_,i)=><div key={`e${i}`}/>)}
            {Array.from({length:dims}).map((_,i) => {
              const d   = i+1;
              const dow = new Date(year,month,d).getDay();
              const ds  = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
              const past = ds < today;
              const sun  = dow === 0;
              const full = dayStatus[ds] === "full";
              const isSel= ds === selDate;
              const isT  = ds === today;
              const dis  = past || sun || full;

              let cls = "cal-day";
              if (isSel)       cls += " cs";
              else if (isT)    cls += " ct";
              else if (dis)    cls += " co";
              else if (full)   cls += " cfu";
              else             cls += " ca";

              const st = dayStatus[ds];
              return (
                <div key={d} className={cls} onClick={()=>!dis && pickDay(ds,dow)}>
                  {d}
                  {!dis && (
                    <span className={`dot ${st==="free"?"dg":st==="partial"?"dg":st==="almost"?"dy":"dr"}`}/>
                  )}
                  {full && !past && <span className="dot dr"/>}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{display:"flex",gap:14,justifyContent:"center",marginTop:18,flexWrap:"wrap"}}>
            {[{c:"var(--sage)",l:"Disponible"},{c:"var(--gold)",l:"Pocos horarios"},{c:"#D4A4A4",l:"Sin disponibilidad"}].map(({c,l})=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"var(--ios-label2)"}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:c,display:"block",flexShrink:0}}/>
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* Time slots */}
        {selDate && isDayBlocked && (
          <div className="card fu" style={{padding:"22px",marginBottom:16,background:"#FFF0F0",border:"1.5px solid #F0C8C8",textAlign:"center"}}>
            <div style={{fontSize:24,marginBottom:8}}>🚫</div>
            <div style={{fontWeight:600,color:"#A04040",fontSize:15}}>Día no disponible</div>
            <div style={{fontSize:13,color:"#C07070",marginTop:4}}>{isDayBlocked.reason||"La profesional tiene este día libre"}</div>
          </div>
        )}
        {selDate && !isDayBlocked && (
          <div className="card fu" style={{padding:"16px",marginBottom:12}}>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:17,fontWeight:600,color:"var(--ios-label)",letterSpacing:"-.2px"}}>
                {fmtShort(selDate)}
              </div>
              <div style={{fontSize:13,color:"var(--ios-label2)",marginTop:2}}>
                {availCount} horario{availCount!==1?"s":""} disponible{availCount!==1?"s":""}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7}}>
              {slots.map(t => {
                const taken = takenToday.includes(t);
                const isSel = t === selTime;
                const isBlocked = blockedSlotTimes.includes(t);
                return (
                  <button key={t} disabled={taken||isBlocked}
                    className={`slot slideUp d${Math.min(parseInt(t.split(":")[0])-8,5)} ${isSel?"ss":(taken||isBlocked)?"st":"sa"}`}
                    onClick={()=>!(taken||isBlocked)&&setSelTime(p=>p===t?"":t)}
                    title={isBlocked?"Horario no disponible":""}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* iOS bottom sheet */}
      {selDate && selTime && (
        <div className="ios-bottom pop">
          <div style={{maxWidth:480,margin:"0 auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontSize:14,color:"var(--ios-label2)"}}>{fmtShort(selDate)} · {selTime}</span>
              <span style={{fontSize:14,fontWeight:600,color:"var(--ios-green)"}}>✓ Seleccionado</span>
            </div>
            <button className="btn-r" onClick={()=>{playTap();onNext({date:selDate,time:selTime});}}
              style={{width:"100%",borderRadius:16,padding:"15px",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              Continuar <ArrowRight size={18}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  PÁGINA 2: SERVICIOS + ACOMPAÑANTE
// ══════════════════════════════════════════════════════════════════
function ServicePage({ booking, services, onNext, onBack }) {
  const [mySvc,  setMySvc]  = useState(null);
  const [plus,   setPlus]   = useState(false);
  const [cmpSvc, setCmpSvc] = useState(null);
  const active = services.filter(s => s.active);
  const canContinue = mySvc && (!plus || cmpSvc);
  const total = (mySvc?.price||0) + (plus && cmpSvc ? cmpSvc.price : 0);

  return (
    <div className="page slideUp">
      <G/>
      <div className="ios-nav">
        <button className="ios-back" onClick={onBack}><ChevronLeft size={20}/> Volver</button>
        <span className="ios-nav-title">Elige tu servicio</span>
        <div style={{minWidth:60}}/>
      </div>
      <div className="info-strip">
        <span>📅 {fmtShort(booking.date)} · ⏰ {booking.time}</span>
      </div>

      <div style={{maxWidth:480,margin:"0 auto",padding:"16px 16px 120px",width:"100%"}}>
        <p style={{fontSize:13,color:"var(--ios-label2)",marginBottom:14,paddingLeft:2}}>Toca para seleccionar</p>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
          {active.map((s,i) => (
            <button key={s.id}
              className={`svc-c card-hover slideUp d${Math.min(i+1,5)} ${mySvc?.id===s.id?"svc-sel":""}`}
              style={{background:mySvc?.id===s.id ? s.color : s.color+"55"}}
              onClick={()=>setMySvc(p=>p?.id===s.id?null:s)}>
              <div style={{width:"100%",height:80,borderRadius:10,overflow:"hidden",marginBottom:8,background:s.color||"#F8C8D4",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {s.image
                  ? <img src={s.image} alt={s.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  : <span style={{fontSize:32}}>{s.emoji||"💅"}</span>
                }
              </div>
              <div style={{fontSize:13,fontWeight:600,color:"var(--ios-label)",lineHeight:1.3,marginBottom:3}}>{s.name}</div>
              <div style={{fontSize:11,color:"var(--ios-label2)"}}>{fmtDur(s.duration)}</div>
              <div style={{fontSize:17,fontWeight:700,color:"var(--ios-tint)",marginTop:6}}>${s.price}</div>
              {mySvc?.id===s.id && (
                <div style={{position:"absolute",top:8,right:8,width:22,height:22,background:"var(--rose)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Check size={13} color="#fff"/>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Companion */}
        {mySvc && (
          <div className="card fu" style={{padding:"20px",marginBottom:14}}>
            <h3 style={{fontSize:17,fontWeight:600,color:"var(--ios-label)",marginBottom:4,letterSpacing:"-.2px"}}>¿Te acompaña alguien?</h3>
            <p style={{fontSize:13,color:"var(--ios-label2)",marginBottom:14}}>Pueden venir las dos — el tiempo de la cita se duplica 🕐</p>
            <div className="tog" style={{marginBottom:plus?18:0}}>
              <button className={`tog-btn ${!plus?"ton":""}`} onClick={()=>{setPlus(false);setCmpSvc(null);}}>Solo yo</button>
              <button className={`tog-btn ${plus?"ton":""}`}  onClick={()=>setPlus(true)}>Somos dos</button>
            </div>
            {plus && (
              <div className="fu">
                <p style={{fontSize:13,fontWeight:600,color:"var(--ios-label)",marginBottom:10}}>Servicio de tu acompañante:</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {active.map(s => (
                    <button key={s.id}
                      className={`svc-c ${cmpSvc?.id===s.id?"svc-sel":""}`}
                      style={{background:cmpSvc?.id===s.id?s.color:s.color+"55"}}
                      onClick={()=>setCmpSvc(p=>p?.id===s.id?null:s)}>
                      <div style={{width:"100%",height:60,borderRadius:8,overflow:"hidden",marginBottom:6,background:s.color||"#F8C8D4",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {s.image
                          ? <img src={s.image} alt={s.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                          : <span style={{fontSize:24}}>{s.emoji||"💅"}</span>
                        }
                      </div>
                      <div style={{fontSize:12,fontWeight:600,color:"var(--ios-label)",lineHeight:1.2,marginBottom:2}}>{s.name}</div>
                      <div style={{fontSize:15,fontWeight:700,color:"var(--ios-tint)",marginTop:4}}>${s.price}</div>
                      {cmpSvc?.id===s.id && (
                        <div style={{position:"absolute",top:7,right:7,width:18,height:18,background:"var(--rose)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <Check size={11} color="#fff"/>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {canContinue && (
        <div className="ios-bottom pop">
          <div style={{maxWidth:480,margin:"0 auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontSize:14,color:"var(--ios-label2)"}}>{mySvc.name}{plus&&cmpSvc?` + ${cmpSvc.name}`:""}</span>
              <span style={{fontSize:17,fontWeight:700,color:"var(--ios-tint)"}}>Total ${total}</span>
            </div>
            <button className="btn-r" onClick={()=>{playTap();onNext({...booking,mySvc,plus,cmpSvc:plus?cmpSvc:null});}}
              style={{width:"100%",padding:"15px",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              Siguiente <ArrowRight size={18}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  PÁGINA 3: NOMBRES
// ══════════════════════════════════════════════════════════════════
function NamesPage({ booking, onNext, onBack }) {
  const [myName,  setMyName]  = useState("");
  const [myPhone, setMyPhone] = useState("");
  const [cmpName, setCmpName] = useState("");
  const ok = myName.trim() && myPhone.trim() && (!booking.plus || cmpName.trim());

  return (
    <div className="page">
      <G/>
      <div className="ios-nav">
        <button className="ios-back" onClick={onBack}><ChevronLeft size={20}/> Volver</button>
        <span className="ios-nav-title">¿Quién viene?</span>
        <div style={{minWidth:60}}/>
      </div>
      <div className="info-strip">
        <span>{booking.mySvc.emoji} {booking.mySvc.name}{booking.plus&&booking.cmpSvc?` + ${booking.cmpSvc.emoji} ${booking.cmpSvc.name}`:""} · {booking.time}</span>
      </div>

      <div style={{maxWidth:480,margin:"0 auto",padding:"20px 16px 110px",width:"100%"}}>
        <div className="card fu" style={{padding:"24px",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
            <div style={{width:34,height:34,background:"var(--rose-lt)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <User size={17} color="var(--rose)"/>
            </div>
            <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"var(--ios-label)"}}>Tus datos</h3>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div>
              <label style={{fontSize:12,fontWeight:600,color:"var(--ios-label)",display:"block",marginBottom:5}}>Tu nombre completo</label>
              <input placeholder="Ej. María García" value={myName} onChange={e=>setMyName(e.target.value)}/>
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:600,color:"var(--ios-label)",display:"block",marginBottom:5}}>Tu WhatsApp</label>
              <input type="tel" placeholder="+52 55 1234 5678" value={myPhone} onChange={e=>setMyPhone(e.target.value)}/>
              <p style={{fontSize:11,color:"var(--ios-label2)",marginTop:4}}>Para confirmar tu cita</p>
            </div>
          </div>
        </div>

        {booking.plus && (
          <div className="card fu d1" style={{padding:"24px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
              <div style={{width:34,height:34,background:"#EDF8F4",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Users size={17} color="var(--sage)"/>
              </div>
              <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"var(--ios-label)"}}>Tu acompañante</h3>
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:600,color:"var(--ios-label)",display:"block",marginBottom:5}}>Su nombre</label>
              <input placeholder="Ej. Ana López" value={cmpName} onChange={e=>setCmpName(e.target.value)}/>
            </div>
          </div>
        )}
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"var(--ios-card)",borderTop:"1px solid #F0EAE4",padding:"14px 20px",zIndex:20}}>
        <div style={{maxWidth:480,margin:"0 auto"}}>
          <button className="btn-r" disabled={!ok} onClick={()=>onNext({...booking,myName:myName.trim(),myPhone:myPhone.trim(),cmpName:cmpName.trim()})}
            style={{borderRadius:12,padding:"15px",fontSize:15,width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            Continuar <ArrowRight size={17}/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  PÁGINA 4: NOTAS + CONFIRMAR
// ══════════════════════════════════════════════════════════════════
function NotesPage({ booking, db, cfg, onDone, onBack }) {
  const [notes,  setNotes]  = useState("");
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);
  const total = booking.mySvc.price + (booking.cmpSvc?.price || 0);

  const confirm = async () => {
    setSaving(true);
    try {
      const base = Date.now();
      // Save primary appointment
      await addDoc(collection(db,"appointments"), {
        clientName:       booking.myName,
        phone:            booking.myPhone,
        service:          booking.mySvc.name,
        serviceEmoji:     booking.mySvc.emoji,
        date:             booking.date,
        time:             booking.time,
        price:            booking.mySvc.price,
        confirmed:        false,
        selfBooked:       true,
        notes:            notes.trim(),
        companion:        booking.plus && booking.cmpName ? booking.cmpName : null,
        companionService: booking.cmpSvc?.name || null,
        createdAt:        serverTimestamp(),
      });
      // Save companion appointment
      if (booking.plus && booking.cmpName && booking.cmpSvc) {
        await addDoc(collection(db,"appointments"), {
          clientName:   booking.cmpName,
          phone:        booking.myPhone,
          service:      booking.cmpSvc.name,
          serviceEmoji: booking.cmpSvc.emoji,
          date:         booking.date,
          time:         booking.time,
          price:        booking.cmpSvc.price,
          confirmed:    false,
          selfBooked:   true,
          notes:        `Acompañante de ${booking.myName}`,
          companion:    booking.myName,
          createdAt:    serverTimestamp(),
        });
      }
      // Auto-block slots covered by the appointment duration
      {
        const interval = cfg?.slotInterval || 30;
        const wsH = parseInt((cfg?.workStart||"09:00").split(":")[0]);
        const weH = parseInt((cfg?.workEnd  ||"18:00").split(":")[0]);
        const allSlots = generateTimeSlots(interval, wsH, weH);

        const blockSlotsForService = async (startTime, durationMins) => {
          const [sh, sm] = startTime.split(":").map(Number);
          const startMins = sh * 60 + sm;
          // How many interval slots does this service cover? Round UP
          const slotsNeeded = Math.ceil(durationMins / interval);
          // Find the index of the starting slot
          const startIdx = allSlots.indexOf(startTime);
          if (startIdx === -1) return;
          // Block startIdx+1 onwards (the START slot is the appointment itself, block the rest)
          for (let i = 1; i < slotsNeeded; i++) {
            const slotIdx = startIdx + i;
            if (slotIdx >= allSlots.length) break;
            const t = allSlots[slotIdx];
            // Check not already blocked
            const existingBlocked = await getDocs(collection(db,"blocked"));
            const alreadyBlocked = existingBlocked.docs.find(d => {
              const b = d.data();
              return b.type==="slot" && b.date===booking.date && b.time===t;
            });
            if (!alreadyBlocked) {
              await addDoc(collection(db,"blocked"),{
                type:"slot", date:booking.date, time:t,
                reason:`Cita: ${booking.myName}`, auto:true
              });
            }
          }
        };

        // Block for primary service
        await blockSlotsForService(booking.time, booking.mySvc.duration || interval);
        // Block for companion service (same time, may differ in duration)
        if (booking.plus && booking.cmpSvc) {
          await blockSlotsForService(booking.time, booking.cmpSvc.duration || interval);
        }
      }

      // Upsert client
      const snap = await getDocs(collection(db,"clients"));
      const exists = snap.docs.find(d => cleanPhone(d.data().phone||"") === cleanPhone(booking.myPhone));
      if (!exists) {
        await addDoc(collection(db,"clients"), {
          name: booking.myName, phone: booking.myPhone,
          email:"", lastVisit: booking.date, createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db,"clients",exists.id),{lastVisit:booking.date});
      }

      // WhatsApp to salon
      const salonName = cfg?.salonName || "Nail Studio";
      let msg = `*Nueva cita — ${salonName}*\n\n`;
      msg += `*Clienta:* ${booking.myName}\n`;
      msg += `*WhatsApp:* ${booking.myPhone}\n`;
      msg += `*Servicio:* ${booking.mySvc.name}\n`;
      msg += `*Fecha:* ${fmtLong(booking.date)}\n`;
      msg += `*Hora:* ${booking.time}\n`;
      msg += `*Precio:* $${booking.mySvc.price}\n`;
      if (booking.plus && booking.cmpName && booking.cmpSvc) {
        msg += `\n*Acompañante:* ${booking.cmpName}\n`;
        msg += `*Su servicio:* ${booking.cmpSvc.name} — $${booking.cmpSvc.price}\n`;
      }
      if (notes.trim()) msg += `\n*Notas:* ${notes.trim()}\n`;
      msg += `\n*Total: $${total}*\nAgendado desde el portal.`;
      window.open(`https://wa.me/${cfg?.whatsapp||SALON_PHONE}?text=${encodeURIComponent(msg)}`,"_blank");

      setDone(true);
    } catch(e) { console.error(e); alert("Error al guardar. Intenta de nuevo."); }
    setSaving(false);
  };

  if (done) return (
    <div className="page" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:20}}>
      <G/>
      <div className="card bounceIn" style={{maxWidth:340,padding:"38px 26px",textAlign:"center",borderRadius:22}}>
        <div style={{width:68,height:68,background:"linear-gradient(135deg,#7AC4A8,#5A9E86)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px",boxShadow:"0 8px 24px rgba(90,158,134,.3)"}}>
          <Check size={34} color="#fff"/>
        </div>
        <h2 style={{fontSize:26,fontWeight:700,color:"var(--ios-label)",marginBottom:6,letterSpacing:"-.4px"}}>Cita agendada</h2>
        <p style={{color:"var(--ios-tint)",fontWeight:600,fontSize:15,marginBottom:4}}>{booking.mySvc.name}</p>
        <p style={{color:"var(--ios-label2)",fontSize:14,marginBottom:2}}>{fmtLong(booking.date)}</p>
        <p style={{color:"var(--ios-label2)",fontSize:14,marginBottom:16}}>{booking.time}</p>
        {booking.plus && booking.cmpName && (
          <div style={{background:"var(--rose-lt)",borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:13,color:"var(--rose-dk)"}}>
            👯 También agendada: <strong>{booking.cmpName}</strong>
          </div>
        )}
        <p style={{fontSize:13,color:"var(--ios-label2)",lineHeight:1.6,marginBottom:22}}>
          Se envió el resumen al salón por WhatsApp.<br/>Te esperamos.
        </p>
        <button className="btn-r" onClick={onDone} style={{borderRadius:12,padding:"13px",width:"100%",fontSize:15}}>
          Agendar otra cita
        </button>
      </div>
    </div>
  );

  return (
    <div className="page">
      <G/>
      <div className="ios-nav">
        <button className="ios-back" onClick={onBack}><ChevronLeft size={20}/> Volver</button>
        <span className="ios-nav-title">Confirmar cita</span>
        <div style={{minWidth:60}}/>
      </div>

      <div style={{maxWidth:480,margin:"0 auto",padding:"22px 14px 110px",width:"100%"}}>
        {/* Summary card */}
        <div className="card fu" style={{padding:"20px",marginBottom:14,borderRadius:20}}>
          <h3 style={{fontSize:17,fontWeight:600,color:"var(--ios-label)",marginBottom:16,letterSpacing:"-.2px"}}>Resumen de tu cita</h3>
          <div className="ios-list" style={{borderRadius:14,marginBottom:12}}>
            {[
              ["Nombre",   booking.myName],
              ["WhatsApp", booking.myPhone],
              ["Fecha",    fmtLong(booking.date)],
              ["Hora",     booking.time],
              ["Servicio", booking.mySvc.name],
              ["Duración", fmtDur(booking.mySvc.duration)],
            ].map(([lb,vl])=>(
              <div key={lb} className="ios-row" style={{cursor:"default",padding:"11px 14px"}}>
                <span style={{fontSize:14,color:"var(--ios-label2)",flex:1}}>{lb}</span>
                <span style={{fontSize:14,fontWeight:500,color:"var(--ios-label)",textAlign:"right",maxWidth:"60%"}}>{vl}</span>
              </div>
            ))}
          </div>
          {booking.plus && booking.cmpName && booking.cmpSvc && (
            <div className="ios-list" style={{borderRadius:14,marginBottom:12}}>
              <div className="ios-row" style={{cursor:"default",padding:"11px 14px"}}>
                <span style={{fontSize:14,color:"var(--ios-label2)",flex:1}}>Acompañante</span>
                <span style={{fontSize:14,fontWeight:500,color:"var(--ios-label)"}}>{booking.cmpName}</span>
              </div>
              <div className="ios-row" style={{cursor:"default",padding:"11px 14px"}}>
                <span style={{fontSize:14,color:"var(--ios-label2)",flex:1}}>Su servicio</span>
                <span style={{fontSize:14,fontWeight:500,color:"var(--ios-label)"}}>{booking.cmpSvc.name}</span>
              </div>
            </div>
          )}
          <div style={{background:"rgba(255,45,85,.06)",borderRadius:14,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:15,fontWeight:600,color:"var(--ios-label)"}}>Total</span>
            <span style={{fontSize:32,fontWeight:700,letterSpacing:"-1px",color:"var(--ios-tint)"}}>${total}</span>
          </div>
        </div>

        {/* Notes */}
        <div className="card fu d1" style={{padding:"22px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <FileText size={17} color="var(--rose)"/>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:"var(--ios-label)"}}>Notas adicionales</div>
              <div style={{fontSize:12,color:"var(--ios-label2)"}}>Opcional — diseños, alergias, preferencias…</div>
            </div>
          </div>
          <textarea
            placeholder="Ej. Quiero flores en el dedo anular, gelish color nude…"
            value={notes} onChange={e=>setNotes(e.target.value)}
            rows={3} style={{resize:"none",lineHeight:1.6}}
          />
        </div>
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"var(--ios-card)",borderTop:"1px solid #F0EAE4",padding:"14px 20px",zIndex:20}}>
        <div style={{maxWidth:480,margin:"0 auto"}}>
          <button className="btn-r" disabled={saving} onClick={confirm}
            style={{borderRadius:12,padding:"15px",fontSize:16,width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontWeight:700}}>
            {saving
              ? <div style={{width:20,height:20,border:"2px solid #fff",borderTopColor:"transparent",borderRadius:"50%"}} className="spin"/>
              : <><MessageCircle size={18}/> Confirmar por WhatsApp</>
            }
          </button>
          <p style={{fontSize:11,color:"var(--ios-label2)",textAlign:"center",marginTop:7}}>
            Se abrirá WhatsApp con el resumen completo para el salón
          </p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  PORTAL CLIENTE (landing + flujo)
// ══════════════════════════════════════════════════════════════════
function ClientPortal({ db, services, cfg, blocked, onAdmin }) {
  const [page, setPage]   = useState("landing");
  const [booking, setBk]  = useState({});
  const [taps, setTaps]   = useState(0);
  const salonName = cfg?.salonName || "Nail Studio";
  const salonLoc  = cfg?.salonLocation || "";

  const tapLogo = () => {
    const n = taps + 1; setTaps(n);
    if (n >= 7) { setTaps(0); onAdmin(); }
  };

  if (page === "calendar") return <CalendarPage db={db} services={services} cfg={cfg} blocked={blocked} onBack={()=>setPage("landing")} onNext={d=>{setBk(d);setPage("service");}}/>;
  if (page === "service")  return <ServicePage  booking={booking} services={services} onBack={()=>setPage("calendar")} onNext={d=>{setBk(d);setPage("names");}}/>;
  if (page === "names")    return <NamesPage    booking={booking} onBack={()=>setPage("service")} onNext={d=>{setBk(d);setPage("notes");}}/>;
  if (page === "notes")    return <NotesPage    booking={booking} db={db} cfg={cfg} onBack={()=>setPage("names")} onDone={()=>{setBk({});setPage("landing");}}/>;

  const activeServices = services.filter(s=>s.active);

  return (
    <div className="page" style={{paddingBottom:83}}>
      <G/>
      {/* iOS Hero */}
      <div style={{background: cfg?.heroBg ? `linear-gradient(rgba(0,0,0,.52),rgba(0,0,0,.52)), url(${cfg.heroBg}) center/cover no-repeat` : "linear-gradient(180deg,#1C1018 0%,#3D1528 50%,#8B2252 100%)",padding:"60px 20px 40px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 60% 30%,rgba(255,45,85,.2),transparent 60%)"}}/>
        {/* Dark mode toggle */}

        {/* Logo circle — tappable for admin */}
        <div style={{position:"relative",display:"inline-block",marginBottom:18}}>
          <button onClick={tapLogo}
            style={{background:"linear-gradient(135deg,rgba(255,45,85,.9),rgba(180,20,60,.9))",border:"none",borderRadius:22,width:72,height:72,display:"flex",alignItems:"center",justifyContent:"center",cursor:"default",backdropFilter:"blur(8px)",boxShadow:"0 8px 24px rgba(255,45,85,.4)"}}>
            <Sparkles size={30} color="#fff"/>
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
        <button className="fu d3" onClick={()=>{playTap();setPage("calendar");}}
          style={{background:"var(--ios-tint)",color:"#fff",border:"none",borderRadius:16,padding:"16px 38px",fontSize:17,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:10,boxShadow:"0 4px 20px rgba(255,45,85,.45)",transition:"all .22s",position:"relative",zIndex:1}}
          onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
          onMouseLeave={e=>e.currentTarget.style.transform=""}>
          <Calendar size={20}/> Agendar mi cita
        </button>
        <p className="fu d4" style={{fontSize:11,color:"rgba(255,255,255,.3)",marginTop:12,position:"relative",zIndex:1}}>Proceso rápido · Sin registro</p>
      </div>

      {/* Services */}
      <div style={{padding:"0 0 16px"}}>
        <div className="ios-section-title fu">Servicios</div>
        <div className="ios-caption fu d1">Toca para agendar directamente</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"0 16px"}}>
          {activeServices.map((s,i)=>(
            <button key={s.id} className={`svc-c fu d${Math.min(i+1,5)}`}
              onClick={()=>{playTap();setPage("calendar");}}
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

      {/* WhatsApp row */}
      <div style={{padding:"0 16px 24px"}}>
        <div className="ios-list">
          <a href={`https://wa.me/${cfg?.whatsapp||SALON_PHONE}`} target="_blank" rel="noreferrer"
            className="ios-row" style={{textDecoration:"none"}}>
            <div className="ios-row-icon" style={{background:"#E8F8EE",borderRadius:9}}>
              <MessageCircle size={18} color="#25D366"/>
            </div>
            <div style={{flex:1}}>
              <div className="ios-row-title">¿Tienes dudas?</div>
              <div style={{fontSize:13,color:"var(--ios-label2)"}}>Escríbenos por WhatsApp</div>
            </div>
            <span className="ios-chevron"/>
          </a>
        </div>
        <p style={{textAlign:"center",fontSize:11,color:"var(--ios-label3)",marginTop:20}}>{salonName} © {new Date().getFullYear()}</p>
      </div>

      {/* iOS Tab bar */}
      <div className="ios-tabbar">
        <button className="ios-tab active">
          <span className="ios-tab-icon">🏠</span>
          <span className="ios-tab-label" style={{color:"var(--ios-tint)"}}>Inicio</span>
        </button>
        <button className="ios-tab" onClick={()=>{playTap();setPage("calendar");}}>
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
          {bg:"rgba(255,149,0,.16)",border:"rgba(255,149,0,.6)",c:"#A06000",l:"Pocos horarios"},
          {bg:"rgba(255,59,48,.16)",border:"rgba(255,59,48,.6)",c:"#D02020",l:"Sin disponibilidad"},
        ].map(({bg,border,c,l})=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:c,fontWeight:500}}>
            <span style={{width:11,height:11,borderRadius:"50%",background:bg,border:`1.5px solid ${border}`,display:"block",flexShrink:0}}/>
            {l}
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
  const [pwd,setP]=useState(""); const [show,setSh]=useState(false); const [err,setE]=useState(false);
  const go = () => { if (pwd===ADMIN_PASSWORD) onSuccess(); else {setE(true);setP("");} };
  return (
    <div style={{minHeight:"100vh",background:"var(--ios-bg)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <G/>
      <div className="card pop" style={{maxWidth:300,width:"100%",padding:"34px 26px",textAlign:"center",background:"var(--ios-card)",borderRadius:22}}>
        <div style={{width:52,height:52,background:"linear-gradient(135deg,var(--ios-tint),#9E0030)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",boxShadow:"0 6px 18px rgba(255,45,85,.35)"}}>
          <Lock size={24} color="#fff"/>
        </div>
        <h2 style={{fontSize:24,fontWeight:700,color:"var(--ios-label)",marginBottom:4,letterSpacing:"-.3px"}}>Panel Admin</h2>
        <p style={{fontSize:15,color:"var(--ios-label2)",marginBottom:20}}>Ingresa tu contraseña</p>
        <div style={{position:"relative",marginBottom:err?8:14}}>
          <input type={show?"text":"password"} placeholder="Contraseña" value={pwd}
            onChange={e=>{setP(e.target.value);setE(false);}}
            onKeyDown={e=>e.key==="Enter"&&pwd&&go()}
            style={{borderColor:err?"#E88080":"",paddingRight:44,textAlign:"center",fontSize:16,letterSpacing:"0.1em"}}/>
          <button onClick={()=>setSh(!show)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--ios-label2)"}}>
            {show?<EyeOff size={17}/>:<Eye size={17}/>}
          </button>
        </div>
        {err && <p style={{fontSize:13,color:"#C45050",marginBottom:12}}>Contraseña incorrecta</p>}
        <button className="btn-r" onClick={go} disabled={!pwd} style={{borderRadius:12,padding:"13px",width:"100%",fontSize:15,marginBottom:10}}>
          Entrar
        </button>
        <button className="btn-o" onClick={onBack} style={{borderRadius:12,padding:"11px",width:"100%",fontSize:13}}>
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
  const [view, setView_]  = useState(initialTab||"dashboard");
  const setView = (v) => { setView_(v); onTabChange && onTabChange(v); };
  const { apts, loading} = useAppointments(db);
  const clients          = useClients(db);
  const { services }     = useServices(db);
  const { cfg, save: saveCfg } = useConfig(db);
  const blocked          = useBlocked(db);
  const [toast, setToast]= useState("");
  const [newApts, setNew]= useState(0);
  const lastCount        = useRef(0);

  const showToast = m => { setToast(m); setTimeout(()=>setToast(""),2800); };

  // Notification for new self-booked appointments
  useEffect(() => {
    const selfBooked = apts.filter(a=>a.selfBooked).length;
    if (lastCount.current > 0 && selfBooked > lastCount.current) {
      const diff = selfBooked - lastCount.current;
      setNew(n => n + diff);
      showToast(`🔔 ${diff} nueva${diff>1?"s":""} cita${diff>1?"s":""} en línea!`);
      // Sound
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const playNote = (freq, start, dur) => {
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = freq; osc.type = "sine";
          gain.gain.setValueAtTime(0, ctx.currentTime + start);
          gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
          osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + dur);
        };
        playNote(523, 0, 0.18); playNote(659, 0.18, 0.18); playNote(784, 0.36, 0.28);
      } catch(e) {}
      // Push notification
      if (Notification.permission === "granted") {
        new Notification("💅 Nueva cita", { body: `${diff} nueva${diff>1?"s":""} cita${diff>1?"s":""} agendada${diff>1?"s":""}`, icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💅</text></svg>" });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(p => {
          if (p === "granted") new Notification("💅 Notificaciones activadas", { body: "Te avisaremos cuando lleguen nuevas citas" });
        });
      }
    }
    lastCount.current = selfBooked;
  }, [apts]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      setTimeout(() => Notification.requestPermission(), 3000);
    }
  }, []);

  const today    = todayStr();
  const todayAps = apts.filter(a=>a.date===today).sort((a,b)=>a.time.localeCompare(b.time));
  const upcoming = apts.filter(a=>a.date>today).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));

  const del   = async id => { if(!window.confirm("¿Eliminar esta cita?")) return; await deleteDoc(doc(db,"appointments",id)); showToast("🗑️ Eliminada"); };
  const conf  = async (id,cur) => { await updateDoc(doc(db,"appointments",id),{confirmed:!cur}); };
  const waMsg = apt => {
    const salonName = cfg?.salonName||"Nail Studio";
    let m = `¡Hola ${apt.clientName}! 👋💅\n\nTe confirmamos tu cita en ${salonName}:\n📅 ${fmtLong(apt.date)}\n⏰ ${apt.time}\n${apt.serviceEmoji||"💎"} ${apt.service}\n💰 $${apt.price}`;
    if(apt.notes) m += `\n📝 ${apt.notes}`;
    m += `\n\n¡Te esperamos! ✨`;
    window.open(`https://wa.me/${cleanPhone(apt.phone||"")}?text=${encodeURIComponent(m)}`,"_blank");
  };

  const navItems = [
    {id:"dashboard",label:"Inicio",    icon:Sparkles},
    {id:"citas",    label:"Citas",     icon:Bell},
    {id:"today",    label:"Hoy",       icon:Calendar},
    {id:"clients",  label:"Clientas",  icon:User},
    {id:"services", label:"Servicios", icon:Settings},
    {id:"blocked",  label:"Bloqueos",  icon:Clock},
    {id:"config",   label:"Config",    icon:Settings},
  ];

  const rowStyle = {padding:"14px",background:"var(--ios-bg)",borderRadius:12,marginBottom:10,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10};
  const btnSmall = (color,bg,label) => ({style:{borderRadius:8,padding:"7px 11px",fontSize:12,fontWeight:600,cursor:"pointer",border:"none",background:bg,color,transition:"all .18s",fontFamily:"'DM Sans',sans-serif"},label});

  if (loading) return <div style={{minHeight:"100vh",background:"var(--ios-bg)",display:"flex",alignItems:"center",justifyContent:"center"}}><G/><div style={{width:44,height:44,border:"3px solid rgba(255,45,85,.2)",borderTopColor:"var(--ios-tint)",borderRadius:"50%"}} className="spin"/></div>;

  return (
    <div style={{minHeight:"100vh",background:"var(--ios-bg)",paddingBottom:83}}>
      <G/>
      {toast && <div className="fi" style={{position:"fixed",top:16,right:16,zIndex:50,background:"var(--ios-card)",borderRadius:12,boxShadow:"var(--sh2)",padding:"12px 18px",fontWeight:500,color:"var(--ios-label)",border:"1px solid #F0EAE4",maxWidth:280}}>{toast}</div>}

      {/* iOS top bar */}
      <div className="ios-topbar" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:32,height:32,background:"linear-gradient(135deg,var(--ios-tint),#9E0030)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 3px 10px rgba(255,45,85,.35)"}}>
            <Sparkles size={15} color="#fff"/>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:600,color:"var(--ios-label)",letterSpacing:"-.2px"}}>{cfg?.salonName||"Nail Studio"}</div>
            <div style={{fontSize:11,color:"var(--ios-label2)",display:"flex",alignItems:"center"}}>
              <span className="live-dot pulse"/>En vivo · {todayAps.length} citas hoy
            </div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {newApts > 0 && (
            <button onClick={()=>{setNew(0);setView("citas");}}
              style={{background:"rgba(255,45,85,.1)",border:"none",borderRadius:10,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600,color:"var(--ios-tint)",display:"flex",alignItems:"center",gap:5}}>
              <Bell size={13}/> {newApts}
            </button>
          )}
          <button onClick={onLogout} style={{background:"rgba(255,45,85,.08)",border:"none",borderRadius:9,padding:"7px 12px",cursor:"pointer",fontSize:12,color:"var(--ios-tint)",display:"flex",alignItems:"center",gap:4,fontWeight:500}}>
            <Lock size={12}/> Salir
          </button>
        </div>
      </div>

      {/* iOS Tab nav - horizontal scroll */}
      <div style={{background:"var(--ios-blur)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:".5px solid var(--ios-sep)",display:"flex",overflowX:"auto",padding:"0 8px"}}>
        {navItems.map(({id,label,icon:Icon})=>(
          <button key={id}
            onClick={()=>{playTap();setView(id);if(id==="today"||id==="citas")setNew(0);}}
            style={{padding:"11px 14px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:view===id?600:400,color:view===id?"var(--ios-tint)":"var(--ios-label2)",borderBottom:view===id?"2px solid var(--ios-tint)":"2px solid transparent",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap",transition:"all .18s",fontFamily:"-apple-system,sans-serif"}}>
            <Icon size={13}/>{label}
            {id==="citas" && apts.filter(a=>!a.confirmed).length>0 && (
              <span style={{background:"var(--ios-tint)",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:10,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",marginLeft:2}}>
                {apts.filter(a=>!a.confirmed).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"16px 14px 40px"}}>

        {/* ── DASHBOARD ── */}
        {view==="dashboard" && (
          <div className="fu">
            <div style={{marginBottom:20,display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
              <div>
                <p style={{fontSize:13,color:"var(--ios-label2)",marginBottom:3}}>{new Date().toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long"})}</p>
                <h2 style={{fontSize:32,fontWeight:700,letterSpacing:"-.6px",color:"var(--ios-label)",lineHeight:1.1,marginBottom:1}}>
                  Buenos días,
                </h2>
                <span style={{fontSize:28,fontWeight:300,fontStyle:"italic",letterSpacing:"-.3px",color:"var(--ios-tint)"}}>
                  {cfg?.profName || cfg?.salonName || "Profesional"}
                </span>
              </div>
              {/* Profile photo — click → config */}
              <button onClick={()=>setView("config")} style={{border:"none",background:"none",cursor:"pointer",flexShrink:0,marginTop:4,padding:0}}>
                <div style={{width:46,height:46,borderRadius:"50%",overflow:"hidden",background:"linear-gradient(135deg,var(--ios-tint),#9E0030)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 14px rgba(255,45,85,.3)"}}>
                  {cfg?.profPhoto
                    ? <img src={cfg.profPhoto} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    : <User size={22} color="#fff"/>
                  }
                </div>
              </button>
            </div>

            {/* Stat cards: Citas hoy + Total citas */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div style={{background:"linear-gradient(135deg,#C4627E,#9E3F5A)",borderRadius:20,padding:"20px 18px",color:"#fff",boxShadow:"0 8px 24px rgba(196,98,126,.35)"}}>
                <div style={{fontSize:11,opacity:.8,fontWeight:600,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:6}}>Citas hoy</div>
                <div style={{fontSize:44,fontWeight:700,lineHeight:1,letterSpacing:"-.5px"}}>{todayAps.length}</div>
                <div style={{fontSize:11,opacity:.7,marginTop:4}}>${todayAps.reduce((s,a)=>s+(a.price||0),0)} estimado</div>
              </div>
              <div style={{background:"linear-gradient(135deg,#6C4E8A,#4A2868)",borderRadius:20,padding:"20px 18px",color:"#fff",boxShadow:"0 8px 24px rgba(108,78,138,.35)"}}>
                <div style={{fontSize:11,opacity:.8,fontWeight:600,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:6}}>Total citas</div>
                <div style={{fontSize:44,fontWeight:700,lineHeight:1,letterSpacing:"-.5px"}}>{apts.length}</div>
                <div style={{fontSize:11,opacity:.7,marginTop:4}}>{apts.filter(a=>a.confirmed).length} confirmadas</div>
              </div>
            </div>

            {/* ── BOTÓN CITAS DESTACADO ── */}
            <button
              onClick={()=>{playTap();setView("citas");}}
              style={{width:"100%",marginBottom:16,background:"linear-gradient(135deg,#FF2D55,#9E0030)",borderRadius:20,padding:"20px 22px",color:"#fff",boxShadow:"0 8px 28px rgba(255,45,85,.4)",border:"none",cursor:"pointer",textAlign:"left",transition:"all .2s",display:"flex",alignItems:"center",justifyContent:"space-between"}}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
              onMouseLeave={e=>e.currentTarget.style.transform=""}>
              <div>
                <div style={{fontSize:11,opacity:.8,fontWeight:600,letterSpacing:"0.6px",textTransform:"uppercase",marginBottom:6}}>📋 Gestión de Citas</div>
                <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>Confirmar · Editar · Cancelar</div>
                <div style={{display:"flex",gap:12,alignItems:"center",marginTop:4}}>
                  <span style={{fontSize:13,opacity:.85}}>
                    <span style={{fontWeight:700,fontSize:20}}>{apts.filter(a=>!a.confirmed).length}</span> pendientes
                  </span>
                  <span style={{opacity:.4}}>·</span>
                  <span style={{fontSize:13,opacity:.85}}>
                    <span style={{fontWeight:700,fontSize:20}}>{apts.filter(a=>a.confirmed).length}</span> confirmadas
                  </span>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,flexShrink:0}}>
                {apts.filter(a=>!a.confirmed).length > 0 && (
                  <div style={{background:"#fff",borderRadius:"50%",width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:16,color:"var(--ios-tint)",boxShadow:"0 4px 12px rgba(0,0,0,.2)"}}>
                    {apts.filter(a=>!a.confirmed).length}
                  </div>
                )}
                <span style={{fontSize:22,opacity:.9}}>→</span>
              </div>
            </button>

            {/* Pro calendar mini */}
            <ProCalendar apts={apts} onDayClick={(date)=>{setView("today"); /* could filter */}}/>


          </div>
        )}

        {/* ── CITAS ── */}
        {view==="citas" && (
          <CitasManager apts={apts} db={db} services={services} cfg={cfg} onToast={showToast}/>
        )}

        {/* ── HOY ── */}
        {view==="today" && (
          <div className="fu">
            {/* iOS large hero count */}
            <div className="card" style={{padding:"20px",marginBottom:14,background:"linear-gradient(135deg,var(--ios-tint),#9E0030)",color:"#fff",borderRadius:20}}>
              <div style={{fontSize:11,fontWeight:600,letterSpacing:".6px",textTransform:"uppercase",opacity:.75,marginBottom:2}}>
                {new Date().toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long"})}
              </div>
              <div style={{fontSize:64,fontWeight:700,letterSpacing:"-2px",lineHeight:1,marginBottom:4}}>
                {todayAps.length}
              </div>
              <div style={{fontSize:15,fontWeight:500,opacity:.8}}>
                cita{todayAps.length!==1?"s":""} hoy
              </div>
            </div>
            {/* Quick stats */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div className="card" style={{padding:"14px 16px",borderRadius:16}}>
                <div style={{fontSize:11,color:"var(--ios-label2)",fontWeight:500,marginBottom:3}}>Ingresos del día</div>
                <div style={{fontSize:28,fontWeight:700,letterSpacing:"-.5px",color:"var(--ios-tint)"}}>${todayAps.reduce((s,a)=>s+(a.price||0),0)}</div>
              </div>
              <div className="card" style={{padding:"14px 16px",borderRadius:16}}>
                <div style={{fontSize:11,color:"var(--ios-label2)",fontWeight:500,marginBottom:3}}>Confirmadas</div>
                <div style={{fontSize:28,fontWeight:700,letterSpacing:"-.5px",color:"var(--ios-green)"}}>{todayAps.filter(a=>a.confirmed).length}</div>
              </div>
            </div>
            <AddAppointmentForm db={db} services={services} onSave={()=>showToast("✅ Cita guardada")}/>
            {todayAps.length===0
              ? <div className="card" style={{padding:"32px",textAlign:"center",color:"var(--ios-label2)",fontSize:15}}>Sin citas hoy</div>
              : todayAps.map(apt=><AptCard key={apt._id} apt={apt} db={db} services={services} onDel={()=>del(apt._id)} onConf={()=>conf(apt._id,apt.confirmed)} onWa={()=>waMsg(apt)} onToast={showToast}/>)
            }
          </div>
        )}

        {/* ── CLIENTAS ── */}
        {view==="clients" && (
          <div className="fu">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <h2 style={{fontSize:22,fontWeight:700,color:"var(--ios-label)",letterSpacing:"-.4px"}}>Clientas · {clients.length}</h2>
            </div>
            <ClientsManager db={db} clients={clients} onToast={showToast}/>
          </div>
        )}

        {/* ── BLOQUEOS ── */}
        {view==="blocked" && <BlockedManager db={db} blocked={blocked} cfg={cfg} onToast={showToast}/>}

        {/* ── SERVICIOS ── */}
        {view==="services" && <ServicesManager db={db} services={services} onToast={showToast}/>}

        {/* ── CONFIG ── */}
        {view==="config" && <ConfigPanel cfg={cfg} onSave={saveCfg} onToast={showToast}/>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  CITAS MANAGER — Panel principal de gestión de citas
// ══════════════════════════════════════════════════════════════════
function CitasManager({ apts, db, services, cfg, onToast }) {
  const [filter, setFilter] = useState("pendientes"); // "pendientes" | "todas" | "confirmadas"
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const today = todayStr();

  const filtered = useMemo(() => {
    let list = [...apts];
    if (filter === "pendientes")  list = list.filter(a => !a.confirmed);
    if (filter === "confirmadas") list = list.filter(a =>  a.confirmed);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.clientName?.toLowerCase().includes(q) ||
        a.service?.toLowerCase().includes(q) ||
        a.date?.includes(q)
      );
    }
    return list.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [apts, filter, search]);

  const pending = apts.filter(a => !a.confirmed).length;
  const confirmed = apts.filter(a => a.confirmed).length;

  const salonName = cfg?.salonName || "Nail Studio";

  const sendWa = (phone, msg) => {
    if (!phone) return;
    window.open(`https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const del = async (apt) => {
    if (!window.confirm(`¿Cancelar la cita de ${apt.clientName}?`)) return;
    await deleteDoc(doc(db, "appointments", apt._id));
    // WhatsApp cancelación
    if (apt.phone) {
      const m =
        `Hola, ${apt.clientName} 💅✨\n\n` +
        `Somos *${salonName}* y te contactamos para informarte sobre tu cita.\n\n` +
        `😔 *Lamentablemente tu cita ha sido cancelada:*\n` +
        `📅 ${fmtLong(apt.date)}\n` +
        `⏰ ${apt.time}\n` +
        `${apt.serviceEmoji||"💎"} ${apt.service}\n\n` +
        `Pedimos disculpas por cualquier inconveniente que esto te pueda causar. 🙏\n\n` +
        `Si deseas reagendar tu cita, con gusto te atendemos. ¡Estamos para servirte! 💖\n\n` +
        `— *${salonName}* 💅`;
      sendWa(apt.phone, m);
    }
    onToast("🗑️ Cita cancelada · WhatsApp enviado");
  };

  const toggleConf = async (id, cur, apt) => {
    await updateDoc(doc(db, "appointments", id), { confirmed: !cur });
    if (!cur) {
      // Confirmación
      const m =
        `¡Hola, ${apt.clientName}! 💅🌸\n\n` +
        `Somos *${salonName}* y nos da mucho gusto informarte que...\n\n` +
        `✅ *¡Tu cita ha sido CONFIRMADA!* 🎉\n\n` +
        `📋 *Detalles de tu cita:*\n` +
        `📅 Fecha: ${fmtLong(apt.date)}\n` +
        `⏰ Hora: ${apt.time}\n` +
        `${apt.serviceEmoji||"💎"} Servicio: ${apt.service}\n` +
        `💰 Precio: $${apt.price}\n` +
        (apt.notes ? `📝 Nota: ${apt.notes}\n` : ``) +
        `\n✨ Te esperamos con mucho cariño. Si tienes alguna duda o necesitas hacer algún cambio, no dudes en escribirnos. 💬\n\n` +
        `¡Hasta pronto! 🌺 — *${salonName}*`;
      sendWa(apt.phone, m);
      onToast("✅ Confirmada · WhatsApp enviado");
    } else {
      onToast("↩️ Confirmación quitada");
    }
  };

  const startEdit = (apt) => {
    setEditId(apt._id);
    setEditForm({
      clientName:   apt.clientName,
      phone:        apt.phone || "",
      service:      apt.service,
      serviceEmoji: apt.serviceEmoji || "💅",
      date:         apt.date,
      time:         apt.time,
      price:        apt.price,
      notes:        apt.notes || "",
      // keep originals to detect changes
      _origDate:    apt.date,
      _origTime:    apt.time,
      _origService: apt.service,
    });
  };

  const saveEdit = async () => {
    const svc = services.find(s => s.name === editForm.service);
    await updateDoc(doc(db, "appointments", editId), {
      clientName:   editForm.clientName,
      phone:        editForm.phone,
      service:      editForm.service,
      serviceEmoji: svc?.emoji || editForm.serviceEmoji || "💅",
      date:         editForm.date,
      time:         editForm.time,
      price:        Number(editForm.price),
      notes:        editForm.notes,
    });

    // Detect what changed
    const changed = [];
    if (editForm.date    !== editForm._origDate)    changed.push(`📅 Nueva fecha: *${fmtLong(editForm.date)}*`);
    if (editForm.time    !== editForm._origTime)    changed.push(`⏰ Nueva hora: *${editForm.time}*`);
    if (editForm.service !== editForm._origService) changed.push(`${svc?.emoji||"💎"} Nuevo servicio: *${editForm.service}*`);

    // WhatsApp modificación
    if (editForm.phone) {
      const m =
        `¡Hola, ${editForm.clientName}! 💅✨\n\n` +
        `Somos *${salonName}* y te escribimos para informarte sobre una actualización en tu cita. 📋\n\n` +
        `✏️ *Tu cita ha sido modificada:*\n\n` +
        (changed.length > 0
          ? changed.join("\n") + "\n"
          : ``) +
        `\n📋 *Resumen actualizado:*\n` +
        `📅 Fecha: ${fmtLong(editForm.date)}\n` +
        `⏰ Hora: ${editForm.time}\n` +
        `${svc?.emoji||"💎"} Servicio: ${editForm.service}\n` +
        `💰 Precio: $${editForm.price}\n` +
        (editForm.notes ? `📝 Nota: ${editForm.notes}\n` : ``) +
        `\nSi tienes alguna pregunta o necesitas otro cambio, con gusto te ayudamos. 😊💬\n\n` +
        `¡Gracias por tu preferencia! 🌸 — *${salonName}*`;
      sendWa(editForm.phone, m);
    }

    setEditId(null);
    onToast("✅ Cita actualizada · WhatsApp enviado");
  };

  return (
    <div className="fu">
      {/* Header */}
      <div style={{marginBottom:16}}>
        <h2 style={{fontSize:26,fontWeight:700,color:"var(--ios-label)",letterSpacing:"-.5px",marginBottom:2}}>Citas</h2>
        <p style={{fontSize:13,color:"var(--ios-label2)"}}>Gestiona, confirma y notifica a tus clientas</p>
      </div>

      {/* Stats row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
        <div className="card" style={{padding:"14px",borderRadius:16,textAlign:"center"}}>
          <div style={{fontSize:28,fontWeight:700,color:"var(--ios-orange)"}}>{pending}</div>
          <div style={{fontSize:11,color:"var(--ios-label2)",fontWeight:500}}>Pendientes</div>
        </div>
        <div className="card" style={{padding:"14px",borderRadius:16,textAlign:"center"}}>
          <div style={{fontSize:28,fontWeight:700,color:"var(--ios-green)"}}>{confirmed}</div>
          <div style={{fontSize:11,color:"var(--ios-label2)",fontWeight:500}}>Confirmadas</div>
        </div>
        <div className="card" style={{padding:"14px",borderRadius:16,textAlign:"center"}}>
          <div style={{fontSize:28,fontWeight:700,color:"var(--ios-tint)"}}>{apts.length}</div>
          <div style={{fontSize:11,color:"var(--ios-label2)",fontWeight:500}}>Total</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="tog" style={{marginBottom:12}}>
        {[["pendientes","Pendientes"],["confirmadas","Confirmadas"],["todas","Todas"]].map(([v,l])=>(
          <button key={v} className={`tog-btn ${filter===v?"ton":""}`} onClick={()=>setFilter(v)}>{l}</button>
        ))}
      </div>

      {/* Search */}
      <div style={{position:"relative",marginBottom:14}}>
        <input
          placeholder="Buscar por nombre, servicio o fecha…"
          value={search}
          onChange={e=>setSearch(e.target.value)}
          style={{paddingLeft:36,fontSize:14}}
        />
        <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--ios-label3)",fontSize:14}}>🔍</span>
      </div>

      {/* WhatsApp tip */}
      {filter==="pendientes" && pending>0 && (
        <div style={{background:"rgba(37,211,102,.08)",border:"1px solid rgba(37,211,102,.2)",borderRadius:12,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#1A7A3A",display:"flex",alignItems:"center",gap:8}}>
          Al confirmar, modificar o cancelar una cita se notificará a la clienta por WhatsApp automáticamente.
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card" style={{padding:"40px 24px",textAlign:"center",color:"var(--ios-label2)"}}>
          <div style={{fontSize:36,marginBottom:10}}>🗓️</div>
          <div style={{fontSize:15,fontWeight:500}}>Sin citas{filter==="pendientes"?" pendientes":filter==="confirmadas"?" confirmadas":""}</div>
          <div style={{fontSize:13,marginTop:4}}>
            {filter==="pendientes" ? "¡Todo confirmado! 🎉" : "Aún no hay citas registradas"}
          </div>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.map(apt => {
            const isEditing = editId === apt._id;
            const isPast = apt.date < today;
            return (
              <div key={apt._id} className="card" style={{padding:"16px",borderRadius:16,border:apt.confirmed?"1.5px solid rgba(52,199,89,.25)":apt.selfBooked&&!apt.confirmed?"1.5px solid rgba(255,149,0,.3)":"1.5px solid transparent"}}>
                {isEditing ? (
                  <div>
                    <h4 style={{fontSize:13,fontWeight:600,color:"var(--ios-label)",marginBottom:12}}>✏️ Editar cita</h4>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                      <input placeholder="Nombre" value={editForm.clientName} onChange={e=>setEditForm({...editForm,clientName:e.target.value})} style={{fontSize:14}}/>
                      <input type="tel" placeholder="Teléfono" value={editForm.phone} onChange={e=>setEditForm({...editForm,phone:e.target.value})} style={{fontSize:14}}/>
                      <select value={editForm.service} style={{gridColumn:"1/-1",fontSize:14}} onChange={e=>{const s=services.find(x=>x.name===e.target.value);setEditForm({...editForm,service:e.target.value,price:s?.price||editForm.price});}}>
                        {services.filter(s=>s.active).map(s=><option key={s.id} value={s.name}>{s.emoji} {s.name}</option>)}
                      </select>
                      <input type="date" value={editForm.date} onChange={e=>setEditForm({...editForm,date:e.target.value})} style={{fontSize:14}}/>
                      <input type="time" value={editForm.time} onChange={e=>setEditForm({...editForm,time:e.target.value})} style={{fontSize:14}}/>
                      <input type="number" placeholder="Precio" value={editForm.price} onChange={e=>setEditForm({...editForm,price:e.target.value})} style={{fontSize:14}}/>
                      <input placeholder="Notas" value={editForm.notes} onChange={e=>setEditForm({...editForm,notes:e.target.value})} style={{fontSize:14}}/>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button className="btn-r" onClick={saveEdit} style={{borderRadius:10,padding:"9px 16px",fontSize:13,display:"flex",alignItems:"center",gap:4}}><Save size={13}/>Guardar</button>
                      <button className="btn-o" onClick={()=>setEditId(null)} style={{borderRadius:10,padding:"9px 14px",fontSize:13}}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Top row: date + status badges */}
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:12,fontWeight:600,color:isPast?"var(--ios-label3)":apt.date===today?"var(--ios-tint)":"var(--ios-blue)",background:apt.date===today?"rgba(255,45,85,.08)":"transparent",borderRadius:6,padding:apt.date===today?"2px 6px":""}}>
                          📅 {apt.date===today?"HOY":fmtShort(apt.date)} · {apt.time}
                        </span>
                      </div>
                      <div style={{display:"flex",gap:4}}>
                        {apt.confirmed && <span className="badge" style={{background:"rgba(52,199,89,.15)",color:"#1A7A3A",fontSize:10}}>✓ Confirmada</span>}
                        {apt.selfBooked && <span className="badge" style={{background:"rgba(0,122,255,.1)",color:"#0055CC",fontSize:10}}>En línea</span>}
                        {isPast && <span className="badge" style={{background:"rgba(0,0,0,.06)",color:"var(--ios-label3)",fontSize:10}}>Pasada</span>}
                      </div>
                    </div>

                    {/* Client + service info */}
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:46,height:46,borderRadius:"50%",background:"linear-gradient(135deg,rgba(255,45,85,.15),rgba(255,45,85,.3))",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:18,color:"var(--ios-tint)",flexShrink:0}}>
                        {apt.clientName?.[0]?.toUpperCase()||"?"}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:16,fontWeight:600,color:"var(--ios-label)",letterSpacing:"-.2px",marginBottom:1}}>{apt.clientName}</div>
                        <div style={{fontSize:13,color:"var(--ios-label2)"}}>{apt.serviceEmoji||"💅"} {apt.service}</div>
                        {apt.phone && <div style={{fontSize:12,color:"var(--ios-label3)",marginTop:1}}>📱 {apt.phone}</div>}
                        {apt.notes && <div style={{fontSize:12,color:"var(--ios-orange)",fontStyle:"italic",marginTop:2}}>📝 {apt.notes}</div>}
                        {apt.companion && <div style={{fontSize:12,color:"var(--ios-purple)",marginTop:2}}>👯 Acompañante: {apt.companion}</div>}
                      </div>
                      <div style={{fontSize:18,fontWeight:700,color:"var(--ios-tint)",flexShrink:0}}>${apt.price}</div>
                    </div>

                    {/* Action buttons */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:14}}>
                      {/* Confirm — once confirmed, locked */}
                      {apt.confirmed
                        ? <div style={{borderRadius:10,padding:"9px 6px",fontSize:12,fontWeight:600,border:"none",
                            background:"rgba(52,199,89,.15)",color:"#1A7A3A",
                            display:"flex",alignItems:"center",justifyContent:"center",gap:4,fontFamily:"-apple-system,sans-serif"}}>
                            <Check size={12}/>Confirmada
                          </div>
                        : <button
                            onClick={()=>toggleConf(apt._id, apt.confirmed, apt)}
                            style={{borderRadius:10,padding:"9px 6px",fontSize:12,fontWeight:600,cursor:"pointer",border:"none",
                              background:"rgba(37,211,102,.13)",color:"#1A7A3A",
                              display:"flex",alignItems:"center",justifyContent:"center",gap:4,transition:"all .15s",fontFamily:"-apple-system,sans-serif"}}>
                            <Check size={12}/>Confirmar
                          </button>
                      }

                      {/* Edit */}
                      <button
                        onClick={()=>startEdit(apt)}
                        style={{borderRadius:10,padding:"9px 6px",fontSize:12,fontWeight:600,cursor:"pointer",border:"none",
                          background:"rgba(175,82,222,.12)",color:"var(--ios-purple)",
                          display:"flex",alignItems:"center",justifyContent:"center",gap:4,transition:"all .15s",fontFamily:"-apple-system,sans-serif"}}>
                        <Pencil size={12}/>Modificar
                      </button>

                      {/* Delete */}
                      <button
                        onClick={()=>del(apt)}
                        style={{borderRadius:10,padding:"9px 6px",fontSize:12,fontWeight:600,cursor:"pointer",border:"none",
                          background:"rgba(255,59,48,.1)",color:"#FF3B30",
                          display:"flex",alignItems:"center",justifyContent:"center",gap:4,transition:"all .15s",fontFamily:"-apple-system,sans-serif"}}>
                        <Trash2 size={12}/>Cancelar
                      </button>
                    </div>

                    {/* WhatsApp reminder button */}
                    {apt.phone && (
                      <button
                        onClick={()=>{
                          const m =
                            `¡Hola, ${apt.clientName}! 💅🌸\n\n` +
                            `Somos *${salonName}* y te enviamos este mensaje para recordarte tu próxima cita. 😊\n\n` +
                            `📋 *Recordatorio de cita:*\n` +
                            `📅 Fecha: ${fmtLong(apt.date)}\n` +
                            `⏰ Hora: ${apt.time}\n` +
                            `${apt.serviceEmoji||"💎"} Servicio: ${apt.service}\n` +
                            `💰 Precio: $${apt.price}\n\n` +
                            `Te esperamos con mucho cariño. ✨ Si necesitas hacer algún cambio, no dudes en escribirnos. 💬\n\n` +
                            `¡Hasta pronto! 🌺 — *${salonName}*`;
                          sendWa(apt.phone, m);
                        }}
                        style={{marginTop:8,width:"100%",borderRadius:10,padding:"9px",fontSize:12,fontWeight:600,cursor:"pointer",border:"none",
                          background:"rgba(37,211,102,.12)",color:"#1A7A3A",
                          display:"flex",alignItems:"center",justifyContent:"center",gap:5,fontFamily:"-apple-system,sans-serif"}}>
                        <MessageCircle size={13}/>Enviar recordatorio por WhatsApp
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Appointment card component ─────────────────────────────────────
function AptCard({ apt, db, services, onDel, onConf, onWa, onToast }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({
    clientName: apt.clientName, phone: apt.phone||"",
    service: apt.service, date: apt.date, time: apt.time,
    price: apt.price, notes: apt.notes||"",
  });

  const saveEdit = async () => {
    const svc = services.find(s=>s.name===f.service);
    await updateDoc(doc(db,"appointments",apt._id),{
      clientName: f.clientName, phone: f.phone,
      service: f.service, serviceEmoji: svc?.emoji||apt.serviceEmoji||"💅",
      date: f.date, time: f.time,
      price: Number(f.price), notes: f.notes,
    });
    setEditing(false);
    onToast && onToast("✅ Cita actualizada");
  };

  if (editing) return (
    <div className="card" style={{padding:"18px",marginBottom:10,border:"1.5px solid var(--rose-lt)"}}>
      <h4 style={{fontSize:14,fontWeight:600,color:"var(--ios-label)",marginBottom:12}}>✏️ Editar cita</h4>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <input placeholder="Nombre" value={f.clientName} onChange={e=>setF({...f,clientName:e.target.value})}/>
        <input type="tel" placeholder="Teléfono" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/>
        <select value={f.service} style={{gridColumn:"1/-1"}} onChange={e=>{const s=services.find(x=>x.name===e.target.value);setF({...f,service:e.target.value,price:s?.price||f.price});}}>
          {services.filter(s=>s.active).map(s=><option key={s.id} value={s.name}>{s.emoji} {s.name}</option>)}
        </select>
        <input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/>
        <input type="time" value={f.time} onChange={e=>setF({...f,time:e.target.value})}/>
        <div>
          <label style={{fontSize:11,color:"var(--ios-label2)",display:"block",marginBottom:4}}>Precio ($)</label>
          <input type="number" value={f.price} onChange={e=>setF({...f,price:e.target.value})}/>
        </div>
        <div>
          <label style={{fontSize:11,color:"var(--ios-label2)",display:"block",marginBottom:4}}>Notas</label>
          <input placeholder="Notas opcionales…" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/>
        </div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button className="btn-r" onClick={saveEdit} style={{borderRadius:10,padding:"9px 16px",fontSize:13,display:"flex",alignItems:"center",gap:4}}><Save size={14}/>Guardar</button>
        <button className="btn-o" onClick={()=>setEditing(false)} style={{borderRadius:10,padding:"9px 14px",fontSize:13}}>Cancelar</button>
      </div>
    </div>
  );

  return (
    <div className="card" style={{padding:"14px 16px",marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        {/* Avatar */}
        <div style={{width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,rgba(255,45,85,.2),rgba(255,45,85,.4))",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18,fontWeight:700,color:"var(--ios-tint)"}}>
          {apt.clientName?.[0]?.toUpperCase()||"?"}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:2}}>
            <span style={{fontWeight:600,fontSize:16,color:"var(--ios-label)",letterSpacing:"-.2px"}}>{apt.clientName}</span>
            {apt.confirmed  && <span className="badge" style={{background:"rgba(52,199,89,.15)",color:"#1A7A3A"}}>✓ Conf.</span>}
            {apt.selfBooked && <span className="badge" style={{background:"rgba(0,122,255,.12)",color:"#0055CC"}}>En línea</span>}
          </div>
          <div style={{fontSize:13,color:"var(--ios-label2)",marginBottom:1}}>{apt.serviceEmoji||"💅"} {apt.service}</div>
          <div style={{fontSize:13,color:"var(--ios-tint)",fontWeight:500}}>⏰ {apt.time} · 💰 ${apt.price}</div>
          {apt.companion && <div style={{fontSize:12,color:"var(--ios-purple)",marginTop:2}}>👯 {apt.companion}</div>}
          {apt.notes && <div style={{fontSize:12,color:"var(--ios-orange)",marginTop:2,fontStyle:"italic"}}>📝 {apt.notes}</div>}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0}}>
          <button onClick={onConf}
            style={{borderRadius:9,padding:"6px 10px",fontSize:11,fontWeight:600,cursor:"pointer",border:"none",background:apt.confirmed?"rgba(52,199,89,.15)":"rgba(0,0,0,.05)",color:apt.confirmed?"#1A7A3A":"var(--ios-label2)"}}>
            {apt.confirmed?"✓ Conf.":"Confirmar"}
          </button>
          <button onClick={()=>setEditing(true)}
            style={{borderRadius:9,padding:"6px 10px",fontSize:11,fontWeight:600,cursor:"pointer",border:"none",background:"rgba(175,82,222,.12)",color:"var(--ios-purple)",display:"flex",alignItems:"center",gap:3,justifyContent:"center"}}>
            <Pencil size={10}/>Editar
          </button>
          <button onClick={onWa} style={{borderRadius:9,padding:"6px 10px",fontSize:11,fontWeight:600,cursor:"pointer",border:"none",background:"rgba(52,199,89,.12)",color:"var(--ios-green)",display:"flex",alignItems:"center",gap:3,justifyContent:"center"}}>
            <MessageCircle size={11}/>WA
          </button>
          <button onClick={onDel} style={{borderRadius:9,padding:"6px 10px",fontSize:11,cursor:"pointer",border:"none",background:"rgba(255,45,85,.1)",color:"var(--ios-tint)"}}>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add appointment form ───────────────────────────────────────────
function AddAppointmentForm({ db, services, onSave }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({clientName:"",phone:"",service:"",date:"",time:"",price:0});
  const save = async () => {
    if (!f.clientName||!f.phone||!f.service||!f.date||!f.time) return;
    const svc = services.find(s=>s.name===f.service);
    await addDoc(collection(db,"appointments"),{
      clientName:f.clientName,phone:f.phone,service:f.service,serviceEmoji:svc?.emoji||"💅",
      date:f.date,time:f.time,price:f.price,confirmed:false,selfBooked:false,
      notes:f.notes||"",companion:null,createdAt:serverTimestamp(),
    });
    // upsert client
    const snap = await getDocs(collection(db,"clients"));
    if (!snap.docs.find(d=>cleanPhone(d.data().phone||"")===cleanPhone(f.phone))) {
      await addDoc(collection(db,"clients"),{name:f.clientName,phone:f.phone,email:"",lastVisit:f.date,createdAt:serverTimestamp()});
    }
    setF({clientName:"",phone:"",service:"",date:"",time:"",price:0});
    setOpen(false); onSave();
  };
  return (
    <div style={{marginBottom:14}}>
      {!open
        ? <button className="btn-o" onClick={()=>setOpen(true)} style={{borderRadius:12,padding:"11px 20px",fontSize:13,display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
            <Plus size={15}/> Agregar cita manual
          </button>
        : <div className="card" style={{padding:"20px",marginBottom:14}}>
            <h3 style={{fontSize:15,fontWeight:600,color:"var(--ios-label)",marginBottom:14}}>Nueva cita manual</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <input placeholder="Nombre" value={f.clientName} onChange={e=>setF({...f,clientName:e.target.value})}/>
              <input type="tel" placeholder="Teléfono" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/>
              <select value={f.service} style={{gridColumn:"1/-1"}} onChange={e=>{const s=services.find(x=>x.name===e.target.value);setF({...f,service:e.target.value,price:s?.price||0});}}>
                <option value="">Seleccionar servicio…</option>
                {services.filter(s=>s.active).map(s=><option key={s.id} value={s.name}>{s.emoji} {s.name} — ${s.price}</option>)}
              </select>
              <input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/>
              <input type="time" value={f.time} onChange={e=>setF({...f,time:e.target.value})}/>
              <div><label style={{fontSize:11,color:"var(--ios-label2)",display:"block",marginBottom:3}}>Precio ($)</label><input type="number" value={f.price} onChange={e=>setF({...f,price:Number(e.target.value)})}/></div>
              <div><label style={{fontSize:11,color:"var(--ios-label2)",display:"block",marginBottom:3}}>Notas</label><input placeholder="Notas opcionales…" value={f.notes||""} onChange={e=>setF({...f,notes:e.target.value})}/></div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button className="btn-r" onClick={save} style={{borderRadius:10,padding:"10px 18px",fontSize:13,display:"flex",alignItems:"center",gap:5}}><Check size={14}/>Guardar</button>
              <button className="btn-o" onClick={()=>setOpen(false)} style={{borderRadius:10,padding:"10px 16px",fontSize:13}}>Cancelar</button>
            </div>
          </div>
      }
    </div>
  );
}

// ── Clients manager ───────────────────────────────────────────────
function ClientsManager({ db, clients, onToast }) {
  const [search, setSearch]     = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm]  = useState({name:"",phone:""});
  const [newForm, setNewForm]    = useState({name:"",phone:""});
  const [addOpen, setAddOpen]    = useState(false);

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const startEdit = (c) => { setEditingId(c._id); setEditForm({name:c.name,phone:c.phone||""}); };
  const saveEdit  = async () => {
    await updateDoc(doc(db,"clients",editingId),{name:editForm.name,phone:editForm.phone});
    setEditingId(null);
    onToast("✅ Clienta actualizada");
  };
  const delClient = async (id) => {
    if(!window.confirm("¿Eliminar esta clienta?")) return;
    await deleteDoc(doc(db,"clients",id));
    onToast("🗑️ Clienta eliminada");
  };
  const addClient = async () => {
    if(!newForm.name.trim()) return;
    await addDoc(collection(db,"clients"),{name:newForm.name.trim(),phone:newForm.phone.trim(),email:"",createdAt:serverTimestamp()});
    setNewForm({name:"",phone:""}); setAddOpen(false);
    onToast("✅ Clienta agregada");
  };

  if(clients.length===0 && !addOpen) return (
    <div>
      <button className="btn-o" onClick={()=>setAddOpen(true)} style={{borderRadius:12,padding:"11px 20px",fontSize:13,display:"flex",alignItems:"center",gap:6,marginBottom:14}}>
        <Plus size={15}/> Agregar clienta
      </button>
      <div className="card" style={{padding:"40px",textAlign:"center",color:"var(--ios-label2)",fontSize:15}}>
        Aún no hay clientas registradas
      </div>
    </div>
  );

  return (
    <div>
      {/* Add client form */}
      {addOpen ? (
        <div className="card" style={{padding:"20px",marginBottom:14,borderRadius:16}}>
          <h3 style={{fontSize:15,fontWeight:600,color:"var(--ios-label)",marginBottom:14}}>Nueva clienta</h3>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:12}}>
            <input placeholder="Nombre completo" value={newForm.name} onChange={e=>setNewForm({...newForm,name:e.target.value})} style={{fontSize:15}}/>
            <input type="tel" placeholder="WhatsApp / Teléfono" value={newForm.phone} onChange={e=>setNewForm({...newForm,phone:e.target.value})} style={{fontSize:15}}/>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn-r" onClick={addClient} style={{borderRadius:10,padding:"10px 18px",fontSize:13,display:"flex",alignItems:"center",gap:5}}><Check size={14}/>Guardar</button>
            <button className="btn-o" onClick={()=>setAddOpen(false)} style={{borderRadius:10,padding:"10px 16px",fontSize:13}}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button className="btn-o" onClick={()=>setAddOpen(true)} style={{borderRadius:12,padding:"11px 20px",fontSize:13,display:"flex",alignItems:"center",gap:6,marginBottom:14}}>
          <Plus size={15}/> Agregar clienta
        </button>
      )}

      {/* Search */}
      <input placeholder="Buscar por nombre o teléfono…" value={search} onChange={e=>setSearch(e.target.value)} style={{marginBottom:14,fontSize:15}}/>

      {/* List */}
      <div className="ios-list">
        {filtered.map((c, idx) => {
          const isEditing  = editingId === c._id;
          const colors     = ["#FF2D55","#FF9500","#34C759","#007AFF","#AF52DE","#FF3B30"];
          const avatarColor = colors[c.name?.charCodeAt(0) % colors.length] || "#FF2D55";
          const initial    = (c.name||"?")[0].toUpperCase();

          return (
            <div key={c._id} style={{borderBottom:idx<filtered.length-1?".5px solid var(--ios-sep)":"none"}}>
              {isEditing ? (
                <div style={{padding:"16px"}}>
                  <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:12}}>
                    <input placeholder="Nombre" value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})} style={{fontSize:15}}/>
                    <input type="tel" placeholder="Teléfono" value={editForm.phone} onChange={e=>setEditForm({...editForm,phone:e.target.value})} style={{fontSize:15}}/>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button className="btn-r-sm" onClick={saveEdit} style={{display:"flex",alignItems:"center",gap:4}}><Save size={13}/>Guardar</button>
                    <button className="btn-o" onClick={()=>setEditingId(null)} style={{fontSize:13,padding:"9px 16px",borderRadius:12}}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="ios-row" style={{cursor:"default"}}>
                  {/* Avatar */}
                  <div style={{width:42,height:42,borderRadius:"50%",background:`${avatarColor}20`,border:`2px solid ${avatarColor}40`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:17,fontWeight:700,color:avatarColor}}>
                    {initial}
                  </div>
                  {/* Info */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:16,fontWeight:500,color:"var(--ios-label)",letterSpacing:"-.2px"}}>{c.name}</div>
                    <div style={{fontSize:13,color:"var(--ios-label2)",marginTop:1}}>📱 {c.phone||"Sin teléfono"}</div>
                  </div>
                  {/* Actions */}
                  <div style={{display:"flex",gap:6,flexShrink:0}}>
                    {c.phone && (
                      <button
                        onClick={()=>window.open(`https://wa.me/${cleanPhone(c.phone)}`,"_blank")}
                        style={{background:"rgba(37,211,102,.13)",border:"none",borderRadius:9,padding:"7px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:3,fontSize:12,color:"#1A7A3A",fontWeight:600,fontFamily:"-apple-system,sans-serif"}}>
                        <MessageCircle size={13}/>WA
                      </button>
                    )}
                    <button
                      onClick={()=>startEdit(c)}
                      style={{background:"rgba(175,82,222,.12)",border:"none",borderRadius:9,padding:"7px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:3,fontSize:12,color:"var(--ios-purple)",fontWeight:600,fontFamily:"-apple-system,sans-serif"}}>
                      <Pencil size={13}/>
                    </button>
                    <button
                      onClick={()=>delClient(c._id)}
                      style={{background:"rgba(255,59,48,.1)",border:"none",borderRadius:9,padding:"7px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:3,fontSize:12,color:"#FF3B30",fontWeight:600,fontFamily:"-apple-system,sans-serif"}}>
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Blocked days/slots manager ────────────────────────────────────
function BlockedManager({ db, blocked, cfg, onToast }) {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selDate, setSel] = useState("");
  const [reason, setReason] = useState("");
  const [blockType, setType] = useState("day"); // "day" | "slot"
  const [selSlots, setSelSlots] = useState([]);
  const slots = generateTimeSlots(cfg?.slotInterval||30, parseInt((cfg?.workStart||"09:00").split(":")[0]), parseInt((cfg?.workEnd||"18:00").split(":")[0]));
  const dims  = new Date(year, month+1, 0).getDate();
  const first = new Date(year, month, 1).getDay();
  const startCol = first === 0 ? 6 : first - 1;
  const today = new Date().toISOString().split("T")[0];
  const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  const blockedDays  = blocked.filter(b=>b.type==="day").map(b=>b.date);
  const blockedSlots = blocked.filter(b=>b.type==="slot");

  const prevMo = () => { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); setSel(""); };
  const nextMo = () => { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); setSel(""); };

  const saveDayBlock = async () => {
    if (!selDate) return;
    const existing = blocked.find(b=>b.type==="day"&&b.date===selDate);
    if (existing) { onToast("⚠️ Este día ya está bloqueado"); return; }
    await addDoc(collection(db,"blocked"),{type:"day",date:selDate,reason:reason||"Día libre"});
    setSel(""); setReason(""); onToast("🚫 Día bloqueado");
  };

  const saveSlotBlock = async () => {
    if (!selDate || selSlots.length===0) return;
    for (const t of selSlots) {
      const exists = blocked.find(b=>b.type==="slot"&&b.date===selDate&&b.time===t);
      if (!exists) await addDoc(collection(db,"blocked"),{type:"slot",date:selDate,time:t,reason:reason||"No disponible"});
    }
    setSelSlots([]); setReason(""); onToast(`🚫 ${selSlots.length} horario(s) bloqueado(s)`);
  };

  const unblock = async (id) => {
    await deleteDoc(doc(db,"blocked",id)); onToast("✅ Disponibilidad restaurada");
  };

  const unblockDay = async (date) => {
    const toDelete = blocked.filter(b=>b.date===date);
    for (const b of toDelete) await deleteDoc(doc(db,"blocked",b._id));
    onToast("✅ Día desbloqueado");
  };

  return (
    <div className="fu">
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:"var(--ios-label)",marginBottom:4}}>Bloquear días / horarios</h2>
      <p style={{fontSize:13,color:"var(--ios-label2)",marginBottom:20}}>Marca los días que descansarás o los horarios en que no estarás disponible</p>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
        {/* Calendar */}
        <div className="card" style={{padding:"20px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <button onClick={prevMo} style={{border:"none",background:"var(--rose-lt)",borderRadius:9,padding:"6px 9px",cursor:"pointer",color:"var(--ios-tint)"}}><ChevronLeft size={16}/></button>
            <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:600}}>{MONTHS[month]} {year}</span>
            <button onClick={nextMo} style={{border:"none",background:"var(--rose-lt)",borderRadius:9,padding:"6px 9px",cursor:"pointer",color:"var(--ios-tint)"}}><ChevronRight size={16}/></button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:5}}>
            {["L","M","M","J","V","S","D"].map((l,i)=><div key={i} style={{textAlign:"center",fontSize:10,fontWeight:600,color:"var(--ios-label2)",padding:"2px 0"}}>{l}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
            {Array.from({length:startCol}).map((_,i)=><div key={`e${i}`}/>)}
            {Array.from({length:dims}).map((_,i)=>{
              const d = i+1;
              const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
              const isBlocked = blockedDays.includes(ds);
              const hasSlots  = blockedSlots.some(b=>b.date===ds);
              const isSel     = ds===selDate;
              const isPast    = ds < today;
              return (
                <div key={d} onClick={()=>!isPast&&setSel(isSel?"":ds)}
                  style={{
                    aspectRatio:"1",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:12,fontWeight:500,cursor:isPast?"not-allowed":"pointer",position:"relative",
                    background: isSel?"var(--rose)":isBlocked?"#F0C8C8":hasSlots?"#FFF0C8":"transparent",
                    color: isSel?"#fff":isBlocked?"#A04040":isPast?"#C0B4B4":"var(--text)",
                    border: isSel?"2px solid var(--rose-dk)":"2px solid transparent",
                    transition:"all .15s",
                  }}>
                  {d}
                  {(isBlocked||hasSlots) && !isSel && <span style={{position:"absolute",bottom:1,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:isBlocked?"#E06060":"#E0A040"}}/>}
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:12,marginTop:14,fontSize:11,color:"var(--ios-label2)",flexWrap:"wrap"}}>
            {[{c:"#F0C8C8",l:"Día libre"},{c:"#FFF0C8",l:"Horas bloqueadas"},{c:"var(--rose)",l:"Seleccionado"}].map(({c,l})=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{width:10,height:10,borderRadius:"50%",background:c,border:"1px solid #E0D4D4",display:"block"}}/>
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* Block form */}
        <div>
          {selDate ? (
            <div className="card" style={{padding:"20px",marginBottom:12}}>
              <h3 style={{fontSize:15,fontWeight:600,color:"var(--ios-label)",marginBottom:4}}>{selDate}</h3>
              {blockedDays.includes(selDate) && (
                <div style={{background:"#FFF0F0",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontSize:13,color:"#A04040"}}>🚫 Día completamente bloqueado</span>
                  <button onClick={()=>unblockDay(selDate)} style={{border:"none",background:"#F0C8C8",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:11,color:"#A04040",fontFamily:"'DM Sans',sans-serif"}}>Desbloquear</button>
                </div>
              )}
              {!blockedDays.includes(selDate) && (
                <>
                  <div className="tog" style={{marginBottom:14}}>
                    <button className={`tog-btn ${blockType==="day"?"ton":""}`} onClick={()=>setType("day")}>Día completo</button>
                    <button className={`tog-btn ${blockType==="slot"?"ton":""}`} onClick={()=>setType("slot")}>Horas específicas</button>
                  </div>
                  {blockType==="slot" && (
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5,marginBottom:12}}>
                      {slots.map(t=>{
                        const already = blockedSlots.find(b=>b.date===selDate&&b.time===t);
                        const sel = selSlots.includes(t);
                        return already
                          ? <div key={t} style={{padding:"7px 4px",borderRadius:8,fontSize:11,textAlign:"center",background:"#F0C8C8",color:"#A04040",display:"flex",alignItems:"center",justifyContent:"space-between",gap:2,paddingLeft:8,paddingRight:4}}>
                              {t}<button onClick={()=>unblock(already._id)} style={{background:"none",border:"none",cursor:"pointer",color:"#C06060",padding:0,fontFamily:"'DM Sans',sans-serif",fontSize:13}}>×</button>
                            </div>
                          : <button key={t} onClick={()=>setSelSlots(p=>p.includes(t)?p.filter(x=>x!==t):[...p,t])}
                              style={{padding:"7px",borderRadius:8,fontSize:11,textAlign:"center",cursor:"pointer",border:sel?"1.5px solid var(--rose)":"1.5px solid #E8DDD8",background:sel?"var(--rose-lt)":"transparent",color:sel?"var(--rose)":"var(--text2)",fontFamily:"'DM Sans',sans-serif"}}>
                              {t}
                            </button>
                      })}
                    </div>
                  )}
                  <input placeholder="Motivo (opcional: Descanso, Cita médica…)" value={reason} onChange={e=>setReason(e.target.value)} style={{marginBottom:10,fontSize:13}}/>
                  <button className="btn-r"
                    onClick={blockType==="day"?saveDayBlock:saveSlotBlock}
                    disabled={blockType==="slot"&&selSlots.length===0}
                    style={{borderRadius:10,padding:"10px 18px",fontSize:13,width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                    🚫 {blockType==="day"?"Bloquear día completo":`Bloquear ${selSlots.length} horario(s)`}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="card" style={{padding:"24px",textAlign:"center",color:"var(--ios-label2)",fontSize:14}}>
              <div style={{fontSize:32,marginBottom:8}}>👆</div>
              Selecciona un día del calendario para bloquearlo
            </div>
          )}

          {/* Upcoming blocked list */}
          {blocked.filter(b=>b.date>=today).length > 0 && (
            <div className="card" style={{padding:"18px"}}>
              <h3 style={{fontSize:14,fontWeight:600,color:"var(--ios-label)",marginBottom:10}}>Próximos bloqueos</h3>
              {blocked.filter(b=>b.date>=today).sort((a,b)=>a.date.localeCompare(b.date)).map(b=>(
                <div key={b._id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #F0EAE4",gap:8}}>
                  <div>
                    <span style={{fontSize:13,fontWeight:600,color:"var(--ios-label)"}}>{b.date}</span>
                    <span style={{fontSize:12,color:"var(--ios-label2)",marginLeft:8}}>{b.type==="day"?"📅 Día":"⏰ "+b.time}</span>
                    {b.reason && <span style={{fontSize:11,color:"var(--gold)",marginLeft:6}}>· {b.reason}</span>}
                  </div>
                  <button onClick={()=>unblock(b._id)} style={{background:"#FDE8E8",border:"none",borderRadius:7,padding:"5px 9px",cursor:"pointer",color:"#C05050",fontSize:11,fontFamily:"'DM Sans',sans-serif"}}>
                    <Trash2 size={11}/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Services manager ───────────────────────────────────────────────
// ── Image picker helper ───────────────────────────────────────────
function ImagePicker({ value, onChange, size=80, label="Subir foto" }) {
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Resize to max 600px to keep Firestore doc small
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 600;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      onChange(canvas.toDataURL("image/jpeg", 0.82));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <label style={{display:"inline-block",cursor:"pointer",position:"relative",flexShrink:0}}>
      <input type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
      {value
        ? <div style={{width:size,height:size,borderRadius:14,overflow:"hidden",position:"relative",boxShadow:"0 2px 10px rgba(0,0,0,.15)"}}>
            <img src={value} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.25)",display:"flex",alignItems:"center",justifyContent:"center",opacity:0,transition:"opacity .2s"}}
              onMouseEnter={e=>e.currentTarget.style.opacity=1}
              onMouseLeave={e=>e.currentTarget.style.opacity=0}>
              <Pencil size={16} color="#fff"/>
            </div>
          </div>
        : <div style={{width:size,height:size,borderRadius:14,border:"2px dashed var(--rose)",background:"var(--rose-lt)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,transition:"all .2s"}}
            onMouseEnter={e=>{e.currentTarget.style.background="#E8B8C8"}}
            onMouseLeave={e=>{e.currentTarget.style.background="var(--rose-lt)"}}>
            <Plus size={20} color="var(--rose)"/>
            <span style={{fontSize:9,color:"var(--ios-tint)",fontWeight:600,textAlign:"center",padding:"0 4px",lineHeight:1.2}}>{label}</span>
          </div>
      }
    </label>
  );
}

function ServicesManager({ db, services, onToast }) {
  const [editing, setEditing] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const blank = {name:"",price:0,duration:30,image:"",color:"#F8C8D4",active:true};
  const [newSvc, setNewSvc]   = useState(blank);

  const saveEdit = async (svc) => {
    await setDoc(doc(db,"services",svc.id), svc);
    setEditing(null); onToast("✅ Servicio actualizado");
  };
  const addNew = async () => {
    if (!newSvc.name) return;
    const id = `s${uid()}`;
    await setDoc(doc(db,"services",id),{...newSvc,id,price:Number(newSvc.price),duration:Number(newSvc.duration)});
    setNewSvc(blank); setShowNew(false); onToast("✅ Servicio agregado");
  };
  const toggle = async (svc) => {
    await setDoc(doc(db,"services",svc.id),{...svc,active:!svc.active});
  };
  const del = async (id) => {
    if(!window.confirm("¿Eliminar servicio?")) return;
    await deleteDoc(doc(db,"services",id)); onToast("🗑️ Eliminado");
  };

  return (
    <div className="fu">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
        <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:"var(--ios-label)"}}>Servicios</h2>
        <button className="btn-r" onClick={()=>{setShowNew(!showNew);setNewSvc(blank);}} style={{borderRadius:12,padding:"10px 18px",fontSize:13,display:"flex",alignItems:"center",gap:6}}>
          <Plus size={15}/> Nuevo
        </button>
      </div>

      {showNew && (
        <div className="card" style={{padding:"22px",marginBottom:14,border:"1.5px solid var(--rose-lt)"}}>
          <h3 style={{fontSize:15,fontWeight:600,marginBottom:16}}>Nuevo servicio</h3>
          <ServiceForm svc={newSvc} onChange={setNewSvc}/>
          <div style={{display:"flex",gap:8,marginTop:14}}>
            <button className="btn-r" onClick={addNew} style={{borderRadius:10,padding:"11px 20px",fontSize:13,display:"flex",alignItems:"center",gap:5}}><Check size={14}/>Guardar</button>
            <button className="btn-o" onClick={()=>setShowNew(false)} style={{borderRadius:10,padding:"11px 16px",fontSize:13}}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
        {services.map(svc => (
          <div key={svc.id} className="card" style={{padding:"16px",opacity:svc.active?1:.5,overflow:"hidden"}}>
            {editing === svc.id
              ? <EditSvcInline svc={svc} onSave={saveEdit} onCancel={()=>setEditing(null)}/>
              : (
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  {/* Image or placeholder */}
                  <div style={{width:60,height:60,borderRadius:12,overflow:"hidden",flexShrink:0,background:svc.color||"#F8C8D4",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {svc.image
                      ? <img src={svc.image} alt={svc.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      : <span style={{fontSize:28}}>{svc.emoji||"💅"}</span>
                    }
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,color:"var(--ios-label)",fontSize:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{svc.name}</div>
                    <div style={{fontSize:12,color:"var(--ios-label2)",marginTop:2}}>{fmtDur(svc.duration)} · <span style={{color:"var(--ios-tint)",fontWeight:600}}>${svc.price}</span></div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0}}>
                    <button onClick={()=>toggle(svc)} style={{borderRadius:8,padding:"5px 9px",fontSize:11,cursor:"pointer",border:"none",background:svc.active?"#D0F4E4":"#F0ECEC",color:svc.active?"#1A6E4A":"#806060",fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>
                      {svc.active?"Activo":"Inactivo"}
                    </button>
                    <div style={{display:"flex",gap:4}}>
                      <button className="btn-ghost" onClick={()=>setEditing(svc.id)} style={{padding:"5px",flex:1,display:"flex",justifyContent:"center"}}><Pencil size={14}/></button>
                      <button className="btn-ghost" onClick={()=>del(svc.id)} style={{padding:"5px",flex:1,display:"flex",justifyContent:"center",color:"#C05050"}}><Trash2 size={14}/></button>
                    </div>
                  </div>
                </div>
              )
            }
          </div>
        ))}
      </div>
    </div>
  );
}

function ServiceForm({ svc, onChange }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Image upload */}
      <div>
        <label style={{fontSize:12,fontWeight:600,color:"var(--ios-label)",display:"block",marginBottom:8}}>Foto del servicio</label>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <ImagePicker value={svc.image||""} onChange={img=>onChange({...svc,image:img})} size={90} label="Subir foto"/>
          <div style={{flex:1}}>
            <p style={{fontSize:12,color:"var(--ios-label2)",lineHeight:1.6}}>
              Toca el cuadro para abrir tu galería y elegir una foto del servicio.<br/>
              <span style={{fontSize:11,color:"var(--ios-tint)"}}>Se redimensiona automáticamente ✨</span>
            </p>
            {svc.image && (
              <button onClick={()=>onChange({...svc,image:""})}
                style={{marginTop:6,fontSize:11,color:"#C05050",background:"#FDE8E8",border:"none",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                Quitar foto
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Name */}
      <div>
        <label style={{fontSize:12,fontWeight:600,color:"var(--ios-label)",display:"block",marginBottom:5}}>Nombre del servicio</label>
        <input placeholder="Ej. Manicure con Gelish" value={svc.name} onChange={e=>onChange({...svc,name:e.target.value})}/>
      </div>

      {/* Price + duration */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div>
          <label style={{fontSize:12,fontWeight:600,color:"var(--ios-label)",display:"block",marginBottom:5}}>Precio ($)</label>
          <input type="number" value={svc.price} onChange={e=>onChange({...svc,price:Number(e.target.value)})}/>
        </div>
        <div>
          <label style={{fontSize:12,fontWeight:600,color:"var(--ios-label)",display:"block",marginBottom:5}}>Duración (min)</label>
          <input type="number" step="5" value={svc.duration} onChange={e=>onChange({...svc,duration:Number(e.target.value)})}/>
        </div>
      </div>

      {/* Color accent */}
      <div>
        <label style={{fontSize:12,fontWeight:600,color:"var(--ios-label)",display:"block",marginBottom:8}}>Color de acento (si no hay foto)</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {COLOR_OPTS.map(cl=>(
            <button key={cl} onClick={()=>onChange({...svc,color:cl})}
              style={{width:30,height:30,borderRadius:10,background:cl,border:svc.color===cl?"3px solid var(--rose)":"2px solid transparent",cursor:"pointer",transition:"transform .15s",transform:svc.color===cl?"scale(1.15)":"scale(1)"}}>
            </button>
          ))}
        </div>
      </div>
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

function ConfigPanel({ cfg, onSave, onToast }) {
  const [f, setF] = useState(cfg || {salonName:"",salonLocation:"",profName:"",profPhoto:"",slotInterval:30,workStart:"09:00",workEnd:"18:00",heroTitle:"",heroSubtitle:"",heroBg:""});
  useEffect(()=>{ if(cfg) setF({slotInterval:30,workStart:"09:00",workEnd:"18:00",heroTitle:"",heroSubtitle:"",heroBg:"",profName:"",profPhoto:"",...cfg}); },[cfg]);
  const save = async () => { await onSave(f); onToast("✅ Guardado"); };

  return (
    <div className="fu">
      <h2 style={{fontSize:28,fontWeight:700,color:"var(--ios-label)",letterSpacing:"-.5px",marginBottom:6}}>Configuración</h2>
      <p style={{fontSize:14,color:"var(--ios-label2)",marginBottom:20}}>Personaliza tu panel y portal</p>

      {/* ── Foto de perfil ── */}
      <p style={{fontSize:13,fontWeight:600,color:"var(--ios-label2)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:8,paddingLeft:4}}>Perfil</p>
      <div className="ios-list" style={{marginBottom:20}}>
        <div style={{padding:"16px",display:"flex",alignItems:"center",gap:16}}>
          <div style={{width:64,height:64,borderRadius:"50%",overflow:"hidden",background:"rgba(255,45,85,.12)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:"2px solid rgba(255,45,85,.2)"}}>
            {f.profPhoto
              ? <img src={f.profPhoto} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              : <User size={28} color="var(--ios-tint)"/>
            }
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:500,color:"var(--ios-label)",marginBottom:2}}>{f.profName||"Tu nombre"}</div>
            <div style={{fontSize:13,color:"var(--ios-label2)",marginBottom:8}}>{f.salonName||"Nombre del salón"}</div>
            <label style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(255,45,85,.1)",borderRadius:10,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:500,color:"var(--ios-tint)"}}>
              <input type="file" accept="image/*" style={{display:"none"}}
                onChange={e=>{ if(e.target.files[0]) resizeImage(e.target.files[0],400,.88,d=>setF({...f,profPhoto:d})); }}/>
              Cambiar foto
            </label>
            {f.profPhoto && <button onClick={()=>setF({...f,profPhoto:""})} style={{marginLeft:8,background:"none",border:"none",color:"var(--ios-label2)",cursor:"pointer",fontSize:13}}>Quitar</button>}
          </div>
        </div>
      </div>

      {/* ── Salon info ── */}
      <p style={{fontSize:13,fontWeight:600,color:"var(--ios-label2)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:8,paddingLeft:4}}>Información</p>
      <div className="ios-list" style={{marginBottom:20}}>
        {[
          {label:"Nombre del salón",     key:"salonName",    placeholder:"Nail Studio",       type:"text"},
          {label:"Tu nombre",            key:"profName",     placeholder:"Karla, María…",      type:"text"},
          {label:"Ubicación",            key:"salonLocation",placeholder:"Ciudad, Estado",      type:"text"},
          {label:"WhatsApp del salón",   key:"whatsapp",     placeholder:SALON_PHONE,          type:"tel"},
        ].map(({label,key,placeholder,type},i,arr)=>(
          <div key={key} style={{padding:"12px 16px",borderBottom:i<arr.length-1?".5px solid var(--ios-sep)":"none"}}>
            <div style={{fontSize:12,color:"var(--ios-label2)",marginBottom:4,fontWeight:500}}>{label}</div>
            <input value={f[key]||""} onChange={e=>setF({...f,[key]:e.target.value})} placeholder={placeholder} type={type}
              style={{fontSize:16,border:"none",outline:"none",background:"transparent",width:"100%",padding:0,boxShadow:"none",color:"var(--ios-label)"}}/>
          </div>
        ))}
      </div>

      {/* ── Horario laboral ── */}
      <p style={{fontSize:13,fontWeight:600,color:"var(--ios-label2)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:8,paddingLeft:4}}>Horario laboral</p>
      <div className="ios-list" style={{marginBottom:20}}>
        <div style={{padding:"12px 16px",borderBottom:".5px solid var(--ios-sep)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:15,color:"var(--ios-label)"}}>Hora de entrada</div>
          <input type="time" value={f.workStart||"09:00"} onChange={e=>setF({...f,workStart:e.target.value})}
            style={{border:"none",outline:"none",background:"transparent",fontSize:15,color:"var(--ios-tint)",fontWeight:600,width:"auto",padding:0,boxShadow:"none",textAlign:"right"}}/>
        </div>
        <div style={{padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:15,color:"var(--ios-label)"}}>Hora de salida</div>
          <input type="time" value={f.workEnd||"18:00"} onChange={e=>setF({...f,workEnd:e.target.value})}
            style={{border:"none",outline:"none",background:"transparent",fontSize:15,color:"var(--ios-tint)",fontWeight:600,width:"auto",padding:0,boxShadow:"none",textAlign:"right"}}/>
        </div>
      </div>

      {/* ── Interval ── */}
      <p style={{fontSize:13,fontWeight:600,color:"var(--ios-label2)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:8,paddingLeft:4}}>Intervalo de citas</p>
      <div className="ios-list" style={{marginBottom:20}}>
        {[{v:30,l:"30 min"},{v:45,l:"45 min"},{v:60,l:"1 hora"},{v:90,l:"90 min"},{v:120,l:"2 horas"}].map(({v,l},i,arr)=>(
          <div key={v} className="ios-row" onClick={()=>setF({...f,slotInterval:v})} style={{borderBottom:i<arr.length-1?".5px solid var(--ios-sep)":"none"}}>
            <span style={{fontSize:16,color:"var(--ios-label)",flex:1}}>{l}</span>
            {f.slotInterval===v && <Check size={17} color="var(--ios-tint)"/>}
          </div>
        ))}
      </div>

      {/* ── Portal (landing page) ── */}
      <p style={{fontSize:13,fontWeight:600,color:"var(--ios-label2)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:8,paddingLeft:4}}>Portal de clientas</p>
      <div className="ios-list" style={{marginBottom:20}}>
        {[
          {label:"Título principal",key:"heroTitle",placeholder:f.salonName||"Nail Studio",type:"text"},
          {label:"Subtítulo / slogan",key:"heroSubtitle",placeholder:"Uñas que cuentan historias",type:"text"},
        ].map(({label,key,placeholder,type},i)=>(
          <div key={key} style={{padding:"12px 16px",borderBottom:i===0?".5px solid var(--ios-sep)":"none"}}>
            <div style={{fontSize:12,color:"var(--ios-label2)",marginBottom:4,fontWeight:500}}>{label}</div>
            <input value={f[key]||""} onChange={e=>setF({...f,[key]:e.target.value})} placeholder={placeholder} type={type}
              style={{fontSize:16,border:"none",outline:"none",background:"transparent",width:"100%",padding:0,boxShadow:"none",color:"var(--ios-label)"}}/>
          </div>
        ))}
        <div style={{padding:"12px 16px"}}>
          <div style={{fontSize:12,color:"var(--ios-label2)",marginBottom:8,fontWeight:500}}>Foto de fondo del banner</div>
          {f.heroBg && (
            <div style={{borderRadius:12,overflow:"hidden",height:110,background:`linear-gradient(rgba(0,0,0,.4),rgba(0,0,0,.4)), url(${f.heroBg}) center/cover`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10,position:"relative"}}>
              <span style={{color:"#fff",fontSize:16,fontWeight:600}}>{f.heroTitle||f.salonName||"Nail Studio"}</span>
              <button onClick={()=>setF({...f,heroBg:""})} style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,.5)",border:"none",borderRadius:"50%",width:24,height:24,cursor:"pointer",color:"#fff",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
          )}
          <label style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(255,45,85,.1)",borderRadius:10,padding:"8px 16px",cursor:"pointer",fontSize:14,fontWeight:500,color:"var(--ios-tint)"}}>
            <input type="file" accept="image/*" style={{display:"none"}}
              onChange={e=>{ if(e.target.files[0]) resizeImage(e.target.files[0],1200,.85,d=>setF({...f,heroBg:d})); }}/>
            {f.heroBg ? "Cambiar foto" : "Subir foto desde galería"}
          </label>
        </div>
      </div>

      <button className="btn-r" onClick={save} style={{width:"100%",padding:"15px",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:20}}>
        <Save size={17}/> Guardar cambios
      </button>

      <div className="ios-list" style={{marginBottom:30}}>
        <div className="ios-row" style={{cursor:"default"}}>
          <div style={{flex:1}}>
            <div style={{fontSize:15,color:"var(--ios-label)",marginBottom:2}}>Contraseña del panel</div>
            <div style={{fontSize:13,color:"var(--ios-label2)"}}>Definida en el código fuente</div>
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
  const dark = false;
  const { services }         = useServices(db);
  const { cfg }              = useConfig(db);
  const blocked              = useBlocked(db);

  useEffect(() => { sessionStorage.setItem("ns_screen", screen); }, [screen]);

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
