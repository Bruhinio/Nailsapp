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
  query, orderBy, serverTimestamp
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
        <h2 style={{fontSize:26,color:"var(--text)",marginBottom:12}}>Conecta Firebase</h2>
        <p style={{color:"var(--text2)",fontSize:14,lineHeight:1.7,marginBottom:24}}>
          Para que el sistema funcione en todos los dispositivos y guarde datos en tiempo real, necesitas configurar Firebase (gratis).
        </p>
        <div style={{background:"var(--cream)",borderRadius:14,padding:20,textAlign:"left",marginBottom:20}}>
          <p style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:12}}>Pasos (5 minutos):</p>
          {[
            ["1","Ve a console.firebase.google.com"],
            ["2","Crea un proyecto nuevo (gratis)"],
            ["3","Firestore Database → Crear → Modo prueba"],
            ["4","Configuración ⚙️ → Agregar app web (</>)"],
            ["5","Copia el firebaseConfig y pégalo en el código"],
          ].map(([n,t]) => (
            <div key={n} style={{display:"flex",gap:10,marginBottom:8,alignItems:"flex-start"}}>
              <span style={{width:22,height:22,background:"var(--rose)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:700,flexShrink:0}}>{n}</span>
              <span style={{fontSize:13,color:"var(--text2)",lineHeight:1.5}}>{t}</span>
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
    const q = query(collection(db,"appointments"), orderBy("date"), orderBy("time"));
    const unsub = onSnapshot(q, snap => {
      setApts(snap.docs.map(d => ({...d.data(), _id: d.id})));
      setL(false);
    }, () => setL(false));
    return unsub;
  }, [db]);
  return { apts, loading };
}

function useClients(db) {
  const [clients, setClients] = useState([]);
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db,"clients"), snap => {
      setClients(snap.docs.map(d => ({...d.data(), _id: d.id})));
    });
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

  const slots = generateTimeSlots(cfg?.slotInterval || 30);
  const dims  = new Date(year, month+1, 0).getDate();
  const first = new Date(year, month, 1).getDay();
  const startCol = first === 0 ? 6 : first - 1;
  const today = todayStr();

  const dayStatus = useMemo(() => {
    const dynSlots = generateTimeSlots(cfg?.slotInterval || 30);
    const out = {};
    for (let d = 1; d <= dims; d++) {
      const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      // Full day blocked?
      if ((blocked||[]).find(b => b.type==="day" && b.date===ds)) { out[ds]="full"; continue; }
      const blockedSlots = (blocked||[]).filter(b=>b.type==="slot"&&b.date===ds).map(b=>b.time);
      const takenTimes = [...new Set([...(takenMap[ds]||[]), ...blockedSlots])];
      const total = dynSlots.length;
      out[ds] = takenTimes.length === 0 ? "free" : takenTimes.length >= total ? "full" : takenTimes.length >= total*0.7 ? "almost" : "partial";
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
    setSel(p => p === ds ? "" : ds); setSelTime("");
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
              <div key={l} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"var(--text2)"}}>
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
            <button className="btn-r" onClick={()=>onNext({date:selDate,time:selTime})}
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
              <div style={{fontSize:13,fontWeight:600,color:"var(--text)",lineHeight:1.3,marginBottom:3}}>{s.name}</div>
              <div style={{fontSize:11,color:"var(--text2)"}}>{fmtDur(s.duration)}</div>
              <div style={{fontSize:17,fontWeight:700,color:"var(--rose)",marginTop:6}}>${s.price}</div>
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
            <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"var(--text)",marginBottom:4}}>¿Te acompaña alguien? 👯</h3>
            <p style={{fontSize:13,color:"var(--text2)",marginBottom:14}}>Pueden venir las dos — el tiempo de la cita se duplica 🕐</p>
            <div className="tog" style={{marginBottom:plus?18:0}}>
              <button className={`tog-btn ${!plus?"ton":""}`} onClick={()=>{setPlus(false);setCmpSvc(null);}}>Solo yo</button>
              <button className={`tog-btn ${plus?"ton":""}`}  onClick={()=>setPlus(true)}>Sí, somos dos ✌️</button>
            </div>
            {plus && (
              <div className="fu">
                <p style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:10}}>Servicio de tu acompañante:</p>
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
                      <div style={{fontSize:12,fontWeight:600,color:"var(--text)",lineHeight:1.2,marginBottom:2}}>{s.name}</div>
                      <div style={{fontSize:15,fontWeight:700,color:"var(--rose)",marginTop:4}}>${s.price}</div>
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
            <button className="btn-r" onClick={()=>onNext({...booking,mySvc,plus,cmpSvc:plus?cmpSvc:null})}
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
            <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"var(--text)"}}>Tus datos</h3>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div>
              <label style={{fontSize:12,fontWeight:600,color:"var(--text)",display:"block",marginBottom:5}}>Tu nombre completo</label>
              <input placeholder="Ej. María García" value={myName} onChange={e=>setMyName(e.target.value)}/>
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:600,color:"var(--text)",display:"block",marginBottom:5}}>Tu WhatsApp</label>
              <input type="tel" placeholder="+52 55 1234 5678" value={myPhone} onChange={e=>setMyPhone(e.target.value)}/>
              <p style={{fontSize:11,color:"var(--text2)",marginTop:4}}>Para confirmar tu cita</p>
            </div>
          </div>
        </div>

        {booking.plus && (
          <div className="card fu d1" style={{padding:"24px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
              <div style={{width:34,height:34,background:"#EDF8F4",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Users size={17} color="var(--sage)"/>
              </div>
              <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"var(--text)"}}>Tu acompañante</h3>
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:600,color:"var(--text)",display:"block",marginBottom:5}}>Su nombre</label>
              <input placeholder="Ej. Ana López" value={cmpName} onChange={e=>setCmpName(e.target.value)}/>
            </div>
          </div>
        )}
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"var(--white)",borderTop:"1px solid #F0EAE4",padding:"14px 20px",zIndex:20}}>
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
      let msg = `🌸 *Nueva cita — ${salonName}*\n\n`;
      msg += `👤 *Clienta:* ${booking.myName}\n`;
      msg += `📱 *WhatsApp:* ${booking.myPhone}\n`;
      msg += `${booking.mySvc.emoji} *Servicio:* ${booking.mySvc.name}\n`;
      msg += `📅 *Fecha:* ${fmtLong(booking.date)}\n`;
      msg += `⏰ *Hora:* ${booking.time}\n`;
      msg += `💰 *Precio:* $${booking.mySvc.price}\n`;
      if (booking.plus && booking.cmpName && booking.cmpSvc) {
        msg += `\n👯 *Acompañante:* ${booking.cmpName}\n`;
        msg += `${booking.cmpSvc.emoji} *Su servicio:* ${booking.cmpSvc.name} — $${booking.cmpSvc.price}\n`;
      }
      if (notes.trim()) msg += `\n📝 *Notas:* ${notes.trim()}\n`;
      msg += `\n💳 *Total: $${total}*\n\n¡Agendado desde el portal! ✨`;
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
        <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:"var(--text)",marginBottom:8}}>¡Cita agendada! 🎉</h2>
        <p style={{color:"var(--rose)",fontWeight:600,fontSize:14,marginBottom:4}}>{booking.mySvc.emoji} {booking.mySvc.name}</p>
        <p style={{color:"var(--text2)",fontSize:14,marginBottom:4}}>{fmtLong(booking.date)}</p>
        <p style={{color:"var(--text2)",fontSize:14,marginBottom:16}}>⏰ {booking.time}</p>
        {booking.plus && booking.cmpName && (
          <div style={{background:"var(--rose-lt)",borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:13,color:"var(--rose-dk)"}}>
            👯 También agendada: <strong>{booking.cmpName}</strong>
          </div>
        )}
        <p style={{fontSize:13,color:"var(--text2)",lineHeight:1.6,marginBottom:22}}>
          Se envió el resumen al salón por WhatsApp.<br/>¡Te esperamos! 💅
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
      <div className="topbar">
        <button className="btn-ghost" onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,fontSize:14}}>
          <ArrowLeft size={17}/> Volver
        </button>
        <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:600}}>Confirmar cita</span>
        <div style={{width:70}}/>
      </div>

      <div style={{maxWidth:480,margin:"0 auto",padding:"22px 14px 110px",width:"100%"}}>
        {/* Summary card */}
        <div className="card fu" style={{padding:"22px",marginBottom:14,background:"linear-gradient(135deg,#FDF4F6,#F8F4FF)"}}>
          <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:"var(--text)",marginBottom:16}}>Resumen</h3>
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            {[
              ["👤","Nombre",   booking.myName],
              ["📱","WhatsApp", booking.myPhone],
              ["📅","Fecha",    fmtLong(booking.date)],
              ["⏰","Hora",     booking.time],
              [booking.mySvc.emoji,"Servicio", booking.mySvc.name],
              ["⏱️","Duración", fmtDur(booking.mySvc.duration)],
              ["💰","Precio",   `$${booking.mySvc.price}`],
            ].map(([ic,lb,vl])=>(
              <div key={lb} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                <span style={{fontSize:13,color:"var(--text2)",whiteSpace:"nowrap"}}>{ic} {lb}</span>
                <span style={{fontSize:13,fontWeight:600,color:"var(--text)",textAlign:"right"}}>{vl}</span>
              </div>
            ))}
            {booking.plus && booking.cmpName && booking.cmpSvc && (
              <>
                <div style={{borderTop:"1px dashed #E0D4D4",margin:"2px 0"}}/>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:13,color:"var(--text2)"}}>👯 Acompañante</span>
                  <span style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{booking.cmpName}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:13,color:"var(--text2)"}}>{booking.cmpSvc.emoji} Su servicio</span>
                  <span style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{booking.cmpSvc.name} · ${booking.cmpSvc.price}</span>
                </div>
              </>
            )}
            <div style={{borderTop:"1.5px solid #E0D4D4",paddingTop:11,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:14,fontWeight:600}}>Total</span>
              <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:700,color:"var(--rose)"}}>${total}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card fu d1" style={{padding:"22px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <FileText size={17} color="var(--rose)"/>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>Notas adicionales</div>
              <div style={{fontSize:12,color:"var(--text2)"}}>Opcional — diseños, alergias, preferencias…</div>
            </div>
          </div>
          <textarea
            placeholder="Ej. Quiero flores en el dedo anular, gelish color nude…"
            value={notes} onChange={e=>setNotes(e.target.value)}
            rows={3} style={{resize:"none",lineHeight:1.6}}
          />
        </div>
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"var(--white)",borderTop:"1px solid #F0EAE4",padding:"14px 20px",zIndex:20}}>
        <div style={{maxWidth:480,margin:"0 auto"}}>
          <button className="btn-r" disabled={saving} onClick={confirm}
            style={{borderRadius:12,padding:"15px",fontSize:16,width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontWeight:700}}>
            {saving
              ? <div style={{width:20,height:20,border:"2px solid #fff",borderTopColor:"transparent",borderRadius:"50%"}} className="spin"/>
              : <><MessageCircle size={19}/> Enviar por WhatsApp 🚀</>
            }
          </button>
          <p style={{fontSize:11,color:"var(--text2)",textAlign:"center",marginTop:7}}>
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
function ClientPortal({ db, services, cfg, blocked, dark, onToggleDark, onAdmin }) {
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
        <button onClick={onToggleDark} style={{position:"absolute",top:52,right:16,background:"rgba(255,255,255,.12)",border:"none",borderRadius:10,padding:"7px 11px",cursor:"pointer",fontSize:18,backdropFilter:"blur(8px)",zIndex:2}} title={dark?"Modo claro":"Modo oscuro"}>
          {dark?"☀️":"🌙"}
        </button>
        {/* Logo circle — tappable for admin */}
        <div style={{position:"relative",display:"inline-block",marginBottom:18}}>
          <button onClick={tapLogo}
            style={{background:"linear-gradient(135deg,rgba(255,45,85,.9),rgba(180,20,60,.9))",border:"none",borderRadius:22,width:72,height:72,display:"flex",alignItems:"center",justifyContent:"center",cursor:"default",backdropFilter:"blur(8px)",boxShadow:"0 8px 24px rgba(255,45,85,.4)"}}>
            <Sparkles size={30} color="#fff"/>
          </button>
          {/* Small circle badge */}
          <div style={{position:"absolute",bottom:-3,right:-5,width:24,height:24,borderRadius:"50%",background:"rgba(255,255,255,.15)",backdropFilter:"blur(8px)",border:"1.5px solid rgba(255,255,255,.3)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <User size={12} color="rgba(255,255,255,.8)"/>
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
        <button className="fu d3" onClick={()=>setPage("calendar")}
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
              onClick={()=>setPage("calendar")}
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
        <button className="ios-tab" onClick={()=>setPage("calendar")}>
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
        <h3 style={{fontSize:20,fontWeight:700,color:"var(--ios-label)",letterSpacing:"-.3px"}}>📅 Calendario</h3>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={prevMo} style={{border:"none",background:"rgba(255,45,85,.1)",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--ios-tint)"}}><ChevronLeft size={13}/></button>
          <span style={{fontSize:14,fontWeight:600,color:"var(--ios-label)",minWidth:90,textAlign:"center"}}>{MONTHS[month]} {year}</span>
          <button onClick={nextMo} style={{border:"none",background:"rgba(255,45,85,.1)",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--ios-tint)"}}><ChevronRight size={13}/></button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:6}}>
        {["L","M","M","J","V","S","D"].map((l,i)=>(
          <div key={i} style={{textAlign:"center",fontSize:11,fontWeight:600,color:i===6?"rgba(255,45,85,.5)":"var(--ios-label2)",padding:"2px 0"}}>{l}</div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
        {Array.from({length:startCol}).map((_,i)=><div key={`e${i}`}/>)}
        {Array.from({length:dims}).map((_,i)=>{
          const d  = i+1;
          const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const dayCits = dayMap[ds]||[];
          const count   = dayCits.length;
          const isToday = ds===today;
          const isPast  = ds<today;
          const bg = count===0 ? "transparent" : count>=4 ? "#F0C8C8" : count>=2 ? "#FFF0C8" : "#D4F0E4";
          const textC = count===0 ? (isPast?"#C0B4B4":"var(--text)") : count>=4?"#A04040":count>=2?"#806020":"#1A6E4A";
          return (
            <div key={d} onClick={()=>count>0&&onDayClick&&onDayClick(ds)}
              style={{
                aspectRatio:"1",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                flexDirection:"column",fontSize:12,fontWeight:isToday?700:500,
                cursor:count>0?"pointer":"default",position:"relative",
                background:isToday?"var(--rose)":bg,
                color:isToday?"#fff":textC,
                border:isToday?"2px solid var(--rose-dk)":"2px solid transparent",
                transition:"all .18s",
                transform:"scale(1)",
              }}
              onMouseEnter={e=>{if(count>0){e.currentTarget.style.transform="scale(1.15)";e.currentTarget.style.boxShadow="0 3px 10px rgba(0,0,0,.15)";}}}
              onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="";}}>
              {d}
              {count>0 && !isToday && (
                <span style={{position:"absolute",bottom:1,fontSize:8,fontWeight:700,color:textC}}>{count}</span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{display:"flex",gap:14,marginTop:14,fontSize:11,color:"var(--text2)",flexWrap:"wrap",justifyContent:"center"}}>
        {[{c:"#D4F0E4",l:"1 cita"},{c:"#FFF0C8",l:"2-3 citas"},{c:"#F0C8C8",l:"4+ citas"}].map(({c,l})=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{width:10,height:10,borderRadius:"50%",background:c,display:"block",border:"1px solid rgba(0,0,0,.1)"}}/>
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
    <div style={{minHeight:"100vh",background:"var(--cream)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
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
          <button onClick={()=>setSh(!show)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--text2)"}}>
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
function AdminPanel({ db, initialTab, onTabChange, dark, onToggleDark, onLogout }) {
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
    {id:"today",    label:"Hoy",       icon:Calendar},
    {id:"upcoming", label:"Próximas",  icon:Clock},
    {id:"clients",  label:"Clientas",  icon:User},
    {id:"services", label:"Servicios", icon:Settings},
    {id:"blocked",  label:"Bloqueos",  icon:Clock},
    {id:"config",   label:"Config",    icon:Settings},
  ];

  const rowStyle = {padding:"14px",background:"var(--cream)",borderRadius:12,marginBottom:10,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10};
  const btnSmall = (color,bg,label) => ({style:{borderRadius:8,padding:"7px 11px",fontSize:12,fontWeight:600,cursor:"pointer",border:"none",background:bg,color,transition:"all .18s",fontFamily:"'DM Sans',sans-serif"},label});

  if (loading) return <div style={{minHeight:"100vh",background:"var(--ios-bg)",display:"flex",alignItems:"center",justifyContent:"center"}}><G/><div style={{width:44,height:44,border:"3px solid rgba(255,45,85,.2)",borderTopColor:"var(--ios-tint)",borderRadius:"50%"}} className="spin"/></div>;

  return (
    <div style={{minHeight:"100vh",background:"var(--ios-bg)",paddingBottom:83}}>
      <G/>
      {toast && <div className="fi" style={{position:"fixed",top:16,right:16,zIndex:50,background:"var(--white)",borderRadius:12,boxShadow:"var(--sh2)",padding:"12px 18px",fontWeight:500,color:"var(--text)",border:"1px solid #F0EAE4",maxWidth:280}}>{toast}</div>}

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
            <button onClick={()=>{setNew(0);setView("today");}}
              style={{background:"rgba(255,45,85,.1)",border:"none",borderRadius:10,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600,color:"var(--ios-tint)",display:"flex",alignItems:"center",gap:5}}>
              <Bell size={13}/> {newApts}
            </button>
          )}
          <button onClick={onToggleDark} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,padding:"4px"}} title={dark?"Modo claro":"Modo oscuro"}>
            {dark?"☀️":"🌙"}
          </button>
          <button onClick={onLogout} style={{background:"rgba(255,45,85,.08)",border:"none",borderRadius:9,padding:"7px 12px",cursor:"pointer",fontSize:12,color:"var(--ios-tint)",display:"flex",alignItems:"center",gap:4,fontWeight:500}}>
            <Lock size={12}/> Salir
          </button>
        </div>
      </div>

      {/* iOS Tab nav - horizontal scroll */}
      <div style={{background:"var(--ios-blur)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:".5px solid var(--ios-sep)",display:"flex",overflowX:"auto",padding:"0 8px"}}>
        {navItems.map(({id,label,icon:Icon})=>(
          <button key={id}
            onClick={()=>{setView(id);if(id==="today")setNew(0);}}
            style={{padding:"11px 14px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:view===id?600:400,color:view===id?"var(--ios-tint)":"var(--ios-label2)",borderBottom:view===id?"2px solid var(--ios-tint)":"2px solid transparent",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap",transition:"all .18s",fontFamily:"-apple-system,sans-serif"}}>
            <Icon size={13}/>{label}
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
              {/* Profile avatar circle */}
              <div style={{position:"relative",flexShrink:0,marginTop:4}}>
                <div style={{width:46,height:46,borderRadius:"50%",background:"linear-gradient(135deg,var(--ios-tint),#9E0030)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 14px rgba(255,45,85,.35)"}}>
                  <Sparkles size={20} color="#fff"/>
                </div>
                <div style={{position:"absolute",bottom:0,right:-2,width:18,height:18,borderRadius:"50%",background:"linear-gradient(135deg,#34C759,#1A8E3A)",display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid var(--ios-bg)",boxShadow:"0 2px 6px rgba(52,199,89,.4)"}}>
                  <User size={9} color="#fff"/>
                </div>
              </div>
            </div>

            {/* iPhone-style stat cards */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div style={{background:"linear-gradient(135deg,#C4627E,#9E3F5A)",borderRadius:20,padding:"20px 18px",color:"#fff",boxShadow:"0 8px 24px rgba(196,98,126,.35)"}}>
                <div style={{fontSize:11,opacity:.8,fontWeight:600,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:6}}>Citas hoy</div>
                <div style={{fontSize:44,fontWeight:700,lineHeight:1,letterSpacing:"-.5px"}}>{todayAps.length}</div>
                <div style={{fontSize:11,opacity:.7,marginTop:4}}>${todayAps.reduce((s,a)=>s+(a.price||0),0)} estimado</div>
              </div>
              <div style={{background:"linear-gradient(135deg,#C9956A,#A07040)",borderRadius:20,padding:"20px 18px",color:"#fff",boxShadow:"0 8px 24px rgba(201,149,106,.35)"}}>
                <div style={{fontSize:11,opacity:.8,fontWeight:600,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:6}}>Esta semana</div>
                <div style={{fontSize:44,fontWeight:700,lineHeight:1,letterSpacing:"-.5px"}}>
                  {apts.filter(a=>{const d=new Date(a.date+"T12:00");const now=new Date();const w=new Date(now);w.setDate(now.getDate()+7);return d>=now&&d<=w;}).length}
                </div>
                <div style={{fontSize:11,opacity:.7,marginTop:4}}>próximos 7 días</div>
              </div>
              <div style={{background:"linear-gradient(135deg,#6C4E8A,#4A2868)",borderRadius:20,padding:"20px 18px",color:"#fff",boxShadow:"0 8px 24px rgba(108,78,138,.35)"}}>
                <div style={{fontSize:11,opacity:.8,fontWeight:600,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:6}}>Total citas</div>
                <div style={{fontSize:44,fontWeight:700,lineHeight:1,letterSpacing:"-.5px"}}>{apts.length}</div>
                <div style={{fontSize:11,opacity:.7,marginTop:4}}>{apts.filter(a=>a.confirmed).length} confirmadas</div>
              </div>
              <button onClick={()=>setView("clients")} style={{background:"linear-gradient(135deg,#7A9E8E,#4A7060)",borderRadius:20,padding:"20px 18px",color:"#fff",boxShadow:"0 8px 24px rgba(122,158,142,.35)",border:"none",cursor:"pointer",textAlign:"left",transition:"all .2s"}}
                onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
                onMouseLeave={e=>e.currentTarget.style.transform=""}>
                <div style={{fontSize:11,opacity:.8,fontWeight:600,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:6}}>Clientas →</div>
                <div style={{fontSize:44,fontWeight:700,lineHeight:1,letterSpacing:"-.5px",color:"#fff"}}>{clients.length}</div>
                <div style={{fontSize:11,opacity:.7,marginTop:4}}>toca para ver</div>
              </button>
            </div>

            {/* Pro calendar mini */}
            <ProCalendar apts={apts} onDayClick={(date)=>{setView("today"); /* could filter */}}/>

            {/* Recent online appointments */}
            <div className="card" style={{padding:"20px",marginTop:14}}>
              <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"var(--text)",marginBottom:14}}>
                🔔 Últimas citas en línea
              </h3>
              {apts.filter(a=>a.selfBooked).slice(-5).reverse().map(apt=>(
                <div key={apt._id} style={{padding:"12px",background:"var(--cream)",borderRadius:12,marginBottom:8,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:3}}>
                      <span style={{fontWeight:600,color:"var(--text)",fontSize:14}}>{apt.clientName}</span>
                      <span className="badge" style={{background:"#D0E4F4",color:"#1A4E8A"}}>En línea</span>
                      {apt.confirmed && <span className="badge" style={{background:"#D0F4E4",color:"#1A6E4A"}}>✓</span>}
                    </div>
                    <div style={{fontSize:12,color:"var(--text2)"}}>{apt.serviceEmoji} {apt.service} · {apt.date} {apt.time} · ${apt.price}</div>
                    {apt.companion && <div style={{fontSize:11,color:"#9060B0",marginTop:2}}>👯 + {apt.companion}</div>}
                    {apt.notes && <div style={{fontSize:11,color:"var(--gold)",marginTop:2,fontStyle:"italic"}}>📝 {apt.notes}</div>}
                  </div>
                  <button className="btn-r" onClick={()=>waMsg(apt)} style={{borderRadius:9,padding:"8px 12px",fontSize:12,display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                    <MessageCircle size={13}/>WA
                  </button>
                </div>
              ))}
              {apts.filter(a=>a.selfBooked).length===0 && (
                <p style={{color:"var(--text2)",fontSize:14,textAlign:"center",padding:"16px 0"}}>Aún no hay citas en línea 🌸</p>
              )}
            </div>
          </div>
        )}

        {/* ── HOY ── */}
        {view==="today" && (
          <div className="fu">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
              <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:"var(--text)"}}>
                Hoy — {new Date().toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long"})}
              </h2>
              <span style={{fontSize:13,fontWeight:600,color:"var(--rose)"}}>{todayAps.length} cita{todayAps.length!==1?"s":""}</span>
            </div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:18}}>
              <div style={{background:"#FDF0F3",borderRadius:12,padding:"12px 18px",textAlign:"center",flex:1,minWidth:120}}>
                <div style={{fontSize:11,color:"var(--rose)",fontWeight:600}}>Ingresos del día</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,color:"var(--rose)"}}>${todayAps.reduce((s,a)=>s+a.price,0)}</div>
              </div>
              <div style={{background:"#F0FBF6",borderRadius:12,padding:"12px 18px",textAlign:"center",flex:1,minWidth:120}}>
                <div style={{fontSize:11,color:"var(--sage)",fontWeight:600}}>Confirmadas</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,color:"var(--sage)"}}>{todayAps.filter(a=>a.confirmed).length}</div>
              </div>
            </div>
            <AddAppointmentForm db={db} services={services} onSave={()=>showToast("✅ Cita guardada")}/>
            {todayAps.length===0
              ? <div className="card" style={{padding:"32px",textAlign:"center",color:"var(--text2)",fontSize:14}}>Sin citas hoy 🌸</div>
              : todayAps.map(apt=><AptCard key={apt._id} apt={apt} db={db} services={services} onDel={()=>del(apt._id)} onConf={()=>conf(apt._id,apt.confirmed)} onWa={()=>waMsg(apt)} onToast={showToast}/>)
            }
          </div>
        )}

        {/* ── PRÓXIMAS ── */}
        {view==="upcoming" && (
          <div className="fu">
            <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:"var(--text)",marginBottom:18}}>Próximas citas</h2>
            <AddAppointmentForm db={db} services={services} onSave={()=>showToast("✅ Cita guardada")}/>
            {[...apts].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)).map(apt=>(
              <AptCard key={apt._id} apt={apt} db={db} services={services} onDel={()=>del(apt._id)} onConf={()=>conf(apt._id,apt.confirmed)} onWa={()=>waMsg(apt)} onToast={showToast}/>
            ))}
            {apts.length===0 && <div className="card" style={{padding:"32px",textAlign:"center",color:"var(--text2)",fontSize:14}}>Sin citas aún</div>}
          </div>
        )}

        {/* ── CLIENTAS ── */}
        {view==="clients" && (
          <div className="fu">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:"var(--text)"}}>Clientas ({clients.length})</h2>
            </div>
            <ClientsManager db={db} clients={clients} apts={apts} onToast={showToast}/>
          </div>
        )}

        {/* ── BLOQUEOS ── */}
        {view==="blocked" && <BlockedManager db={db} blocked={blocked} onToast={showToast}/>}

        {/* ── SERVICIOS ── */}
        {view==="services" && <ServicesManager db={db} services={services} onToast={showToast}/>}

        {/* ── CONFIG ── */}
        {view==="config" && <ConfigPanel cfg={cfg} onSave={saveCfg} onToast={showToast}/>}
      </div>
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
      <h4 style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:12}}>✏️ Editar cita</h4>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <input placeholder="Nombre" value={f.clientName} onChange={e=>setF({...f,clientName:e.target.value})}/>
        <input type="tel" placeholder="Teléfono" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/>
        <select value={f.service} style={{gridColumn:"1/-1"}} onChange={e=>{const s=services.find(x=>x.name===e.target.value);setF({...f,service:e.target.value,price:s?.price||f.price});}}>
          {services.filter(s=>s.active).map(s=><option key={s.id} value={s.name}>{s.emoji} {s.name}</option>)}
        </select>
        <input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/>
        <input type="time" value={f.time} onChange={e=>setF({...f,time:e.target.value})}/>
        <div>
          <label style={{fontSize:11,color:"var(--text2)",display:"block",marginBottom:4}}>Precio ($)</label>
          <input type="number" value={f.price} onChange={e=>setF({...f,price:e.target.value})}/>
        </div>
        <div>
          <label style={{fontSize:11,color:"var(--text2)",display:"block",marginBottom:4}}>Notas</label>
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
            <h3 style={{fontSize:15,fontWeight:600,color:"var(--text)",marginBottom:14}}>Nueva cita manual</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <input placeholder="Nombre" value={f.clientName} onChange={e=>setF({...f,clientName:e.target.value})}/>
              <input type="tel" placeholder="Teléfono" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/>
              <select value={f.service} style={{gridColumn:"1/-1"}} onChange={e=>{const s=services.find(x=>x.name===e.target.value);setF({...f,service:e.target.value,price:s?.price||0});}}>
                <option value="">Seleccionar servicio…</option>
                {services.filter(s=>s.active).map(s=><option key={s.id} value={s.name}>{s.emoji} {s.name} — ${s.price}</option>)}
              </select>
              <input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/>
              <input type="time" value={f.time} onChange={e=>setF({...f,time:e.target.value})}/>
              <div><label style={{fontSize:11,color:"var(--text2)",display:"block",marginBottom:3}}>Precio ($)</label><input type="number" value={f.price} onChange={e=>setF({...f,price:Number(e.target.value)})}/></div>
              <div><label style={{fontSize:11,color:"var(--text2)",display:"block",marginBottom:3}}>Notas</label><input placeholder="Notas opcionales…" value={f.notes||""} onChange={e=>setF({...f,notes:e.target.value})}/></div>
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
function ClientsManager({ db, clients, apts, onToast }) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({name:"",phone:""});

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const startEdit = (c) => { setEditingId(c._id); setEditForm({name:c.name,phone:c.phone||""}); };
  const saveEdit = async () => {
    await updateDoc(doc(db,"clients",editingId),{name:editForm.name,phone:editForm.phone});
    setEditingId(null);
    onToast("✅ Clienta actualizada");
  };
  const delClient = async (id) => {
    if(!window.confirm("¿Eliminar esta clienta?")) return;
    await deleteDoc(doc(db,"clients",id));
    onToast("🗑️ Clienta eliminada");
  };

  if(clients.length===0) return <div className="card" style={{padding:"32px",textAlign:"center",color:"var(--text2)",fontSize:14}}>Cuando alguien agende aparecerá aquí 🌸</div>;

  return (
    <div>
      <input placeholder="🔍 Buscar por nombre o teléfono…" value={search} onChange={e=>setSearch(e.target.value)} style={{marginBottom:16}}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:12}}>
        {filtered.map(c=>{
          const cnt   = apts.filter(a=>cleanPhone(a.phone||"")===cleanPhone(c.phone||"")).length;
          const total = apts.filter(a=>cleanPhone(a.phone||"")===cleanPhone(c.phone||"")).reduce((s,a)=>s+(a.price||0),0);
          const isEditing = editingId === c._id;
          return (
            <div key={c._id} className="card" style={{padding:"18px"}}>
              {isEditing ? (
                <div>
                  <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
                    <input placeholder="Nombre" value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})}/>
                    <input type="tel" placeholder="Teléfono" value={editForm.phone} onChange={e=>setEditForm({...editForm,phone:e.target.value})}/>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button className="btn-r" onClick={saveEdit} style={{borderRadius:9,padding:"8px 14px",fontSize:12,display:"flex",alignItems:"center",gap:3}}><Save size={12}/>Guardar</button>
                    <button className="btn-o" onClick={()=>setEditingId(null)} style={{borderRadius:9,padding:"8px 12px",fontSize:12}}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:38,height:38,background:"var(--rose-lt)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <User size={17} color="var(--rose)"/>
                      </div>
                      <div>
                        <div style={{fontWeight:600,color:"var(--text)",fontSize:14}}>{c.name}</div>
                        <div style={{fontSize:11,color:"var(--text2)"}}>{c.phone}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:5}}>
                      <button onClick={()=>startEdit(c)} style={{background:"#F0EAF8",border:"none",borderRadius:8,padding:"6px 8px",cursor:"pointer",color:"#7040A0",display:"flex",alignItems:"center"}}><Pencil size={13}/></button>
                      <button onClick={()=>delClient(c._id)} style={{background:"#FDE8E8",border:"none",borderRadius:8,padding:"6px 8px",cursor:"pointer",color:"#C05050",display:"flex",alignItems:"center"}}><Trash2 size={13}/></button>
                    </div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,borderTop:"1px solid #F0EAE4"}}>
                    <div><div style={{fontSize:10,color:"var(--text2)"}}>Citas</div><div style={{fontWeight:700,color:"var(--rose)",fontSize:18,fontFamily:"'Cormorant Garamond',serif"}}>{cnt}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"var(--text2)"}}>Gastado</div><div style={{fontWeight:600,color:"var(--sage)",fontSize:14}}>${total}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"var(--text2)"}}>Última visita</div><div style={{fontWeight:500,color:"var(--text)",fontSize:11}}>{c.lastVisit||"—"}</div></div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Blocked days/slots manager ────────────────────────────────────
function BlockedManager({ db, blocked, onToast }) {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selDate, setSel] = useState("");
  const [reason, setReason] = useState("");
  const [blockType, setType] = useState("day"); // "day" | "slot"
  const [selSlots, setSelSlots] = useState([]);
  const [slotInterval] = useState(30);

  const slots = generateTimeSlots(slotInterval);
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
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:"var(--text)",marginBottom:4}}>Bloquear días / horarios</h2>
      <p style={{fontSize:13,color:"var(--text2)",marginBottom:20}}>Marca los días que descansarás o los horarios en que no estarás disponible</p>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
        {/* Calendar */}
        <div className="card" style={{padding:"20px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <button onClick={prevMo} style={{border:"none",background:"var(--rose-lt)",borderRadius:9,padding:"6px 9px",cursor:"pointer",color:"var(--rose)"}}><ChevronLeft size={16}/></button>
            <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:600}}>{MONTHS[month]} {year}</span>
            <button onClick={nextMo} style={{border:"none",background:"var(--rose-lt)",borderRadius:9,padding:"6px 9px",cursor:"pointer",color:"var(--rose)"}}><ChevronRight size={16}/></button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:5}}>
            {["L","M","M","J","V","S","D"].map((l,i)=><div key={i} style={{textAlign:"center",fontSize:10,fontWeight:600,color:"var(--text2)",padding:"2px 0"}}>{l}</div>)}
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
          <div style={{display:"flex",gap:12,marginTop:14,fontSize:11,color:"var(--text2)",flexWrap:"wrap"}}>
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
              <h3 style={{fontSize:15,fontWeight:600,color:"var(--text)",marginBottom:4}}>{selDate}</h3>
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
            <div className="card" style={{padding:"24px",textAlign:"center",color:"var(--text2)",fontSize:14}}>
              <div style={{fontSize:32,marginBottom:8}}>👆</div>
              Selecciona un día del calendario para bloquearlo
            </div>
          )}

          {/* Upcoming blocked list */}
          {blocked.filter(b=>b.date>=today).length > 0 && (
            <div className="card" style={{padding:"18px"}}>
              <h3 style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:10}}>Próximos bloqueos</h3>
              {blocked.filter(b=>b.date>=today).sort((a,b)=>a.date.localeCompare(b.date)).map(b=>(
                <div key={b._id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #F0EAE4",gap:8}}>
                  <div>
                    <span style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{b.date}</span>
                    <span style={{fontSize:12,color:"var(--text2)",marginLeft:8}}>{b.type==="day"?"📅 Día":"⏰ "+b.time}</span>
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
            <span style={{fontSize:9,color:"var(--rose)",fontWeight:600,textAlign:"center",padding:"0 4px",lineHeight:1.2}}>{label}</span>
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
        <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:"var(--text)"}}>Servicios</h2>
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
                    <div style={{fontWeight:600,color:"var(--text)",fontSize:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{svc.name}</div>
                    <div style={{fontSize:12,color:"var(--text2)",marginTop:2}}>{fmtDur(svc.duration)} · <span style={{color:"var(--rose)",fontWeight:600}}>${svc.price}</span></div>
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
        <label style={{fontSize:12,fontWeight:600,color:"var(--text)",display:"block",marginBottom:8}}>Foto del servicio</label>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <ImagePicker value={svc.image||""} onChange={img=>onChange({...svc,image:img})} size={90} label="Subir foto"/>
          <div style={{flex:1}}>
            <p style={{fontSize:12,color:"var(--text2)",lineHeight:1.6}}>
              Toca el cuadro para abrir tu galería y elegir una foto del servicio.<br/>
              <span style={{fontSize:11,color:"var(--rose)"}}>Se redimensiona automáticamente ✨</span>
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
        <label style={{fontSize:12,fontWeight:600,color:"var(--text)",display:"block",marginBottom:5}}>Nombre del servicio</label>
        <input placeholder="Ej. Manicure con Gelish" value={svc.name} onChange={e=>onChange({...svc,name:e.target.value})}/>
      </div>

      {/* Price + duration */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div>
          <label style={{fontSize:12,fontWeight:600,color:"var(--text)",display:"block",marginBottom:5}}>Precio ($)</label>
          <input type="number" value={svc.price} onChange={e=>onChange({...svc,price:Number(e.target.value)})}/>
        </div>
        <div>
          <label style={{fontSize:12,fontWeight:600,color:"var(--text)",display:"block",marginBottom:5}}>Duración (min)</label>
          <input type="number" step="5" value={svc.duration} onChange={e=>onChange({...svc,duration:Number(e.target.value)})}/>
        </div>
      </div>

      {/* Color accent */}
      <div>
        <label style={{fontSize:12,fontWeight:600,color:"var(--text)",display:"block",marginBottom:8}}>Color de acento (si no hay foto)</label>
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
      <p style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:12}}>✏️ Editando: {s.name}</p>
      <ServiceForm svc={s} onChange={setS}/>
      <div style={{display:"flex",gap:8,marginTop:14}}>
        <button className="btn-r" onClick={()=>onSave({...s,price:Number(s.price),duration:Number(s.duration)})} style={{borderRadius:10,padding:"10px 18px",fontSize:13,display:"flex",alignItems:"center",gap:4}}><Save size={14}/>Guardar</button>
        <button className="btn-o" onClick={onCancel} style={{borderRadius:10,padding:"10px 16px",fontSize:13}}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Config panel ───────────────────────────────────────────────────
function ConfigPanel({ cfg, onSave, onToast }) {
  const [f, setF] = useState(cfg || {salonName:"",salonLocation:"",profName:"",slotInterval:30,heroTitle:"",heroSubtitle:"",heroBg:""});
  useEffect(()=>{ if(cfg) setF({slotInterval:30,heroTitle:"",heroSubtitle:"",heroBg:"",profName:"",...cfg}); },[cfg]);
  const save = async () => { await onSave(f); onToast("✅ Configuración guardada"); };

  return (
    <div className="fu">
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:"var(--text)",marginBottom:18}}>Configuración</h2>

      {/* Salon info */}
      <div className="card" style={{padding:"24px",marginBottom:14}}>
        <h3 style={{fontSize:15,fontWeight:600,marginBottom:16}}>🏠 Información del salón</h3>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:"var(--text)",display:"block",marginBottom:5}}>Nombre del salón</label>
            <input value={f.salonName||""} onChange={e=>setF({...f,salonName:e.target.value})} placeholder="Nail Studio"/>
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:"var(--text)",display:"block",marginBottom:5}}>Tu nombre (aparece en el saludo del panel)</label>
            <input value={f.profName||""} onChange={e=>setF({...f,profName:e.target.value})} placeholder="Ej. Karla, María, Sofía…"/>
            <p style={{fontSize:11,color:"var(--text2)",marginTop:4,fontStyle:"italic"}}>Así aparecerá: "Buenos días, {f.profName||"Karla"}"</p>
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:"var(--text)",display:"block",marginBottom:5}}>Ubicación</label>
            <input value={f.salonLocation||""} onChange={e=>setF({...f,salonLocation:e.target.value})} placeholder="Ciudad, Estado"/>
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:"var(--text)",display:"block",marginBottom:5}}>Número de WhatsApp para cotizaciones</label>
            <input value={f.whatsapp||SALON_PHONE} onChange={e=>setF({...f,whatsapp:e.target.value})} placeholder="525645431670"/>
          </div>
        </div>
      </div>

      {/* Slot interval */}
      <div className="card" style={{padding:"24px",marginBottom:14}}>
        <h3 style={{fontSize:15,fontWeight:600,marginBottom:4}}>⏱️ Duración de citas</h3>
        <p style={{fontSize:12,color:"var(--text2)",marginBottom:14}}>Cada cuánto tiempo se generan los horarios disponibles. Si 2 personas reservan juntas, se ocupa el doble del tiempo.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
          {[
            {v:30,l:"30 min"},{v:45,l:"45 min"},{v:60,l:"1 hora"},{v:90,l:"90 min"},{v:120,l:"2 horas"},
          ].map(({v,l})=>(
            <button key={v} onClick={()=>setF({...f,slotInterval:v})}
              style={{padding:"12px 6px",borderRadius:12,border:f.slotInterval===v?"2px solid var(--rose)":"2px solid #E8DDD8",background:f.slotInterval===v?"var(--rose-lt)":"var(--white)",color:f.slotInterval===v?"var(--rose)":"var(--text2)",cursor:"pointer",fontSize:13,fontWeight:f.slotInterval===v?700:400,fontFamily:"'DM Sans',sans-serif",transition:"all .18s",textAlign:"center"}}>
              {l}
            </button>
          ))}
        </div>
        <p style={{fontSize:11,color:"var(--text2)",marginTop:10}}>
          Horarios actuales con {f.slotInterval||30} min: {generateTimeSlots(f.slotInterval||30).join(", ")}
        </p>
      </div>

      {/* Landing page editor */}
      <div className="card" style={{padding:"24px",marginBottom:14}}>
        <h3 style={{fontSize:15,fontWeight:600,marginBottom:4}}>🎨 Página principal (lo que ven las clientas)</h3>
        <p style={{fontSize:12,color:"var(--text2)",marginBottom:16}}>Personaliza el título, subtítulo y la foto de fondo del hero</p>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:"var(--text)",display:"block",marginBottom:5}}>Título principal</label>
            <input value={f.heroTitle||""} onChange={e=>setF({...f,heroTitle:e.target.value})} placeholder={f.salonName||"Nail Studio"}/>
            <p style={{fontSize:11,color:"var(--text2)",marginTop:3}}>Vacío = usa el nombre del salón</p>
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:"var(--text)",display:"block",marginBottom:5}}>Subtítulo / slogan</label>
            <input value={f.heroSubtitle||""} onChange={e=>setF({...f,heroSubtitle:e.target.value})} placeholder="Uñas que cuentan historias ✨"/>
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:"var(--text)",display:"block",marginBottom:8}}>Foto de fondo del banner</label>
            {/* Preview */}
            {f.heroBg && (
              <div style={{borderRadius:14,overflow:"hidden",height:140,background:`linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.45)), url(${f.heroBg}) center/cover no-repeat`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10,position:"relative"}}>
                <span style={{color:"#fff",fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:600,textShadow:"0 2px 8px rgba(0,0,0,.4)"}}>{f.heroTitle||f.salonName||"Nail Studio"}</span>
                <button onClick={()=>setF({...f,heroBg:""})}
                  style={{position:"absolute",top:10,right:10,background:"rgba(0,0,0,.55)",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",color:"#fff",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>
                  ×
                </button>
              </div>
            )}
            {/* Upload button */}
            <label style={{display:"flex",alignItems:"center",gap:12,padding:"16px 18px",background:"var(--rose-lt)",border:"2px dashed var(--rose)",borderRadius:14,cursor:"pointer",transition:"background .2s"}}
              onMouseEnter={e=>e.currentTarget.style.background="#E8B8C8"}
              onMouseLeave={e=>e.currentTarget.style.background="var(--rose-lt)"}>
              <input type="file" accept="image/*" style={{display:"none"}}
                onChange={e=>{
                  const file = e.target.files[0];
                  if (!file) return;
                  const img = new Image();
                  const url = URL.createObjectURL(file);
                  img.onload = () => {
                    const MAX = 1200;
                    const scale = Math.min(1, MAX / Math.max(img.width, img.height));
                    const w = Math.round(img.width * scale);
                    const h = Math.round(img.height * scale);
                    const canvas = document.createElement("canvas");
                    canvas.width = w; canvas.height = h;
                    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
                    setF({...f, heroBg: canvas.toDataURL("image/jpeg", 0.85)});
                    URL.revokeObjectURL(url);
                  };
                  img.src = url;
                }}/>
              <span style={{fontSize:28}}>🖼️</span>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:"var(--rose)"}}>{f.heroBg ? "Cambiar foto de fondo" : "Subir foto desde galería"}</div>
                <div style={{fontSize:11,color:"var(--text2)",marginTop:2}}>JPG, PNG · Se ajusta automáticamente al tamaño correcto</div>
              </div>
            </label>
          </div>
        </div>
      </div>

      <button className="btn-r" onClick={save} style={{borderRadius:12,padding:"14px 28px",fontSize:15,display:"flex",alignItems:"center",gap:6,width:"100%",justifyContent:"center",marginBottom:14}}>
        <Save size={16}/> Guardar todos los cambios
      </button>

      <div className="card" style={{padding:"22px",background:"#F8F4F0"}}>
        <h3 style={{fontSize:15,fontWeight:600,marginBottom:10}}>🔑 Contraseña del panel</h3>
        <p style={{fontSize:13,color:"var(--text2)",lineHeight:1.6}}>
          La contraseña actual está definida en el código:<br/>
          <code style={{background:"var(--cream2)",padding:"2px 8px",borderRadius:6,fontSize:13,fontWeight:600}}>ADMIN_PASSWORD = "{ADMIN_PASSWORD}"</code><br/>
          <span style={{fontSize:12,marginTop:4,display:"block"}}>Cámbiala directamente en el código fuente para mayor seguridad.</span>
        </p>
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
  const [dark, setDark]      = useState(() => localStorage.getItem("ns_dark") === "1");
  const { services }         = useServices(db);
  const { cfg }              = useConfig(db);
  const blocked              = useBlocked(db);

  useEffect(() => { sessionStorage.setItem("ns_screen", screen); }, [screen]);
  useEffect(() => {
    localStorage.setItem("ns_dark", dark ? "1" : "0");
    document.body.className = dark ? "dark" : "";
  }, [dark]);

  if (error) return <NotConfigured/>;
  if (!ready) return (
    <div style={{minHeight:"100vh",background:"var(--cream)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
      <G/>
      <Sparkles className="spin" size={38} color="#C4627E"/>
      <p style={{color:"var(--text2)",fontSize:14}}>Conectando con Firebase…</p>
    </div>
  );

  return (
    screen === "client" ? <ClientPortal db={db} services={services} cfg={cfg} blocked={blocked} dark={dark} onToggleDark={()=>setDark(d=>!d)} onAdmin={()=>setScreen("login")}/> :
    screen === "login"  ? <AdminLogin onSuccess={()=>setScreen("admin")} onBack={()=>setScreen("client")}/> :
                          <AdminPanel db={db} initialTab={adminTab} onTabChange={t=>setAdminTab(t)} dark={dark} onToggleDark={()=>setDark(d=>!d)} onLogout={()=>{setScreen("client");sessionStorage.removeItem("ns_screen");}}/>
  );
}
