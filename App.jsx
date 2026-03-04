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
const SALON_PHONE    = "521234567890"; // ← Tu número WhatsApp (sin + ni espacios)

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
const TIME_SLOTS  = ["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00"];

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
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --rose:#C4627E;--rose-lt:#F0CDD6;--rose-dk:#9E3F5A;
      --cream:#FAF6F0;--cream2:#F3EDE4;
      --gold:#C9956A;--sage:#7A9E8E;--sage-lt:#C8E0D8;
      --text:#2C1A1A;--text2:#7A6060;--white:#FFFFFF;
      --sh:0 4px 24px rgba(44,26,26,.08);--sh2:0 8px 40px rgba(44,26,26,.15);
    }
    *{font-family:'DM Sans',sans-serif} h1,h2,h3,h4{font-family:'Cormorant Garamond',serif}
    @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes pop{0%{transform:scale(.9);opacity:0}70%{transform:scale(1.04)}100%{transform:scale(1);opacity:1}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
    .fu{animation:fadeUp .38s ease-out both}.fi{animation:fadeIn .3s ease-out both}.pop{animation:pop .4s cubic-bezier(.34,1.56,.64,1) both}
    .d1{animation-delay:.05s}.d2{animation-delay:.1s}.d3{animation-delay:.15s}.d4{animation-delay:.2s}.d5{animation-delay:.25s}
    .spin{animation:spin .8s linear infinite}.pulse{animation:pulse 2s ease-in-out infinite}
    .page{min-height:100vh;background:var(--cream)}
    .card{background:var(--white);border-radius:18px;box-shadow:var(--sh)}
    .card-hover{transition:box-shadow .2s,transform .2s}.card-hover:hover{box-shadow:var(--sh2);transform:translateY(-2px)}
    .btn-r{background:var(--rose);color:#fff;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:600;transition:all .22s}
    .btn-r:hover:not(:disabled){background:var(--rose-dk);transform:translateY(-1px);box-shadow:0 6px 18px rgba(196,98,126,.35)}
    .btn-r:disabled{opacity:.4;cursor:not-allowed}
    .btn-o{background:transparent;color:var(--rose);border:1.5px solid var(--rose-lt);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s}
    .btn-o:hover{background:var(--rose-lt)}
    .btn-ghost{background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;color:var(--text2);transition:color .2s}
    .btn-ghost:hover{color:var(--rose)}
    input,select,textarea{font-family:'DM Sans',sans-serif;border:1.5px solid #E8DDD8;border-radius:12px;padding:11px 14px;font-size:14px;color:var(--text);background:var(--white);width:100%;transition:border .2s,box-shadow .2s}
    input:focus,select:focus,textarea:focus{outline:none;border-color:var(--rose);box-shadow:0 0 0 3px rgba(196,98,126,.1)}
    input::placeholder,textarea::placeholder{color:#B8A8A8}
    ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:var(--rose-lt);border-radius:99px}
    .topbar{background:var(--white);border-bottom:1px solid #F0EAE4;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40}
    .cal-day{aspect-ratio:1;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:500;cursor:pointer;transition:all .18s;position:relative;user-select:none}
    .ca:hover{background:var(--rose-lt);color:var(--rose-dk)}
    .cs{background:var(--rose)!important;color:#fff!important;font-weight:600!important}
    .ct:not(.cs){border:2px solid var(--rose);color:var(--rose);font-weight:600}
    .co{color:#D0C4C4;cursor:not-allowed}.cfu{color:#C4A4A4;cursor:not-allowed}
    .dot{position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%}
    .dg{background:var(--sage)}.dy{background:var(--gold)}.dr{background:#D4A4A4}
    .slot{padding:8px 10px;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;transition:all .18s;text-align:center;border:1.5px solid transparent}
    .sa{background:var(--sage-lt);color:#3A7060;border-color:#A8D0C4}.sa:hover{background:var(--sage);color:#fff}
    .st{background:#F0ECEC;color:#C4B4B4;cursor:not-allowed;text-decoration:line-through}
    .ss{background:var(--rose)!important;color:#fff!important;border-color:var(--rose)!important}
    .svc-c{border-radius:16px;border:2px solid transparent;cursor:pointer;transition:all .2s;position:relative;overflow:hidden;text-align:left;padding:14px;background:white}
    .svc-c:hover{transform:translateY(-2px);box-shadow:var(--sh)}
    .svc-sel{border-color:var(--rose)!important;box-shadow:0 0 0 3px rgba(196,98,126,.12)!important}
    .tog{display:flex;background:#F0EAE4;border-radius:12px;padding:3px}
    .tog-btn{flex:1;padding:9px;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:500;transition:all .2s;font-family:'DM Sans',sans-serif;color:var(--text2);background:transparent}
    .tog-btn.ton{background:var(--white);color:var(--rose);box-shadow:0 2px 8px rgba(0,0,0,.1);font-weight:600}
    .badge{font-size:11px;padding:3px 8px;border-radius:6px;font-weight:600;display:inline-block}
    .nav-tab{padding:13px 16px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:400;color:var(--text2);border-bottom:2px solid transparent;display:flex;align-items:center;gap:5px;white-space:nowrap;transition:all .18s;font-family:'DM Sans',sans-serif}
    .nav-tab.act{font-weight:600;color:var(--rose);border-bottom-color:var(--rose)}
    .modal-bg{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center}
    @media(min-width:600px){.modal-bg{align-items:center;padding:16px}}
    .modal{background:var(--white);width:100%;max-height:92vh;overflow-y:auto}
    @media(min-width:600px){.modal{max-width:500px;border-radius:24px!important}}
    .modal-mob{border-radius:24px 24px 0 0}
    .fab{position:fixed;bottom:24px;right:24px;z-index:30;width:58px;height:58px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px rgba(196,98,126,.45);transition:all .22s}
    .fab:hover{transform:scale(1.1)}
    .live-dot{width:8px;height:8px;border-radius:50%;background:#4CAF50;display:inline-block;margin-right:6px}
    .live-dot.pulse{animation:pulse 1.5s ease-in-out infinite}
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

// ══════════════════════════════════════════════════════════════════
//  PÁGINA 1: CALENDARIO
// ══════════════════════════════════════════════════════════════════
function CalendarPage({ db, services, cfg, onNext, onBack }) {
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

  const dims  = new Date(year, month+1, 0).getDate();
  const first = new Date(year, month, 1).getDay(); // 0=Sun
  const startCol = first === 0 ? 6 : first - 1;   // Monday-based
  const today = todayStr();

  const dayStatus = useMemo(() => {
    const out = {};
    for (let d = 1; d <= dims; d++) {
      const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const taken = (takenMap[ds]||[]).length;
      const total = TIME_SLOTS.length;
      out[ds] = taken === 0 ? "free" : taken >= total ? "full" : taken >= total*0.7 ? "almost" : "partial";
    }
    return out;
  }, [takenMap, dims, month, year]);

  const canPrev  = !(year === now.getFullYear() && month === now.getMonth());
  const prevMo   = () => { setMonth(m => m === 0 ? 11 : m-1); if (month===0) setYear(y=>y-1); setSel(""); setSelTime(""); };
  const nextMo   = () => { setMonth(m => m === 11 ? 0 : m+1); if (month===11) setYear(y=>y+1); setSel(""); setSelTime(""); };

  const pickDay  = (ds, dow) => {
    if (ds < today || dow === 0 || dayStatus[ds] === "full") return;
    setSel(p => p === ds ? "" : ds); setSelTime("");
  };

  const takenToday = takenMap[selDate] || [];
  const availCount = TIME_SLOTS.length - takenToday.length;

  return (
    <div className="page">
      <G/>
      <div className="topbar">
        <button className="btn-ghost" onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,fontSize:14}}>
          <ArrowLeft size={17}/> Volver
        </button>
        <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:600,color:"var(--text)"}}>
          Elige tu fecha
        </span>
        <div style={{width:70}}/>
      </div>

      <div style={{maxWidth:480,margin:"0 auto",padding:"20px 14px 100px"}}>

        {/* Calendar card */}
        <div className="card fu" style={{padding:"24px 18px",marginBottom:16}}>

          {/* Month nav */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
            <button onClick={prevMo} disabled={!canPrev}
              style={{border:"none",background:canPrev?"var(--rose-lt)":"#F0ECEC",borderRadius:10,padding:"8px 10px",cursor:canPrev?"pointer":"not-allowed",color:canPrev?"var(--rose)":"#C4B4B4",transition:"all .2s"}}>
              <ChevronLeft size={18}/>
            </button>
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:600,color:"var(--text)",lineHeight:1}}>
                {MONTHS_ES[month]}
              </div>
              <div style={{fontSize:13,color:"var(--text2)",marginTop:2}}>{year}</div>
            </div>
            <button onClick={nextMo}
              style={{border:"none",background:"var(--rose-lt)",borderRadius:10,padding:"8px 10px",cursor:"pointer",color:"var(--rose)",transition:"all .2s"}}>
              <ChevronRight size={18}/>
            </button>
          </div>

          {/* Day headers Mon-Sun */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:6}}>
            {["L","M","M","J","V","S","D"].map((l,i) => (
              <div key={i} style={{textAlign:"center",fontSize:11,fontWeight:600,color:i===6?"#D4B4B4":"var(--text2)",padding:"3px 0"}}>{l}</div>
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
        {selDate && (
          <div className="card fu" style={{padding:"22px",marginBottom:16}}>
            <div style={{marginBottom:14}}>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:"var(--text)"}}>
                {fmtShort(selDate)}
              </div>
              <div style={{fontSize:13,color:"var(--text2)",marginTop:2}}>
                {availCount} horario{availCount!==1?"s":""} disponible{availCount!==1?"s":""}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7}}>
              {TIME_SLOTS.map(t => {
                const taken = takenToday.includes(t);
                const isSel = t === selTime;
                return (
                  <button key={t} disabled={taken}
                    className={`slot ${isSel?"ss":taken?"st":"sa"}`}
                    onClick={()=>setSelTime(p=>p===t?"":t)}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      {selDate && selTime && (
        <div className="pop" style={{position:"fixed",bottom:0,left:0,right:0,background:"var(--white)",borderTop:"1px solid #F0EAE4",padding:"14px 20px",zIndex:20}}>
          <div style={{maxWidth:480,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
            <div>
              <div style={{fontSize:12,color:"var(--text2)"}}>Tu cita</div>
              <div style={{fontSize:15,fontWeight:600,color:"var(--text)"}}>{fmtShort(selDate)} · {selTime}</div>
            </div>
            <button className="btn-r" onClick={()=>onNext({date:selDate,time:selTime})}
              style={{borderRadius:12,padding:"13px 26px",fontSize:15,display:"flex",alignItems:"center",gap:8}}>
              Continuar <ArrowRight size={17}/>
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
    <div className="page">
      <G/>
      <div className="topbar">
        <button className="btn-ghost" onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,fontSize:14}}>
          <ArrowLeft size={17}/> Volver
        </button>
        <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:600}}>Elige tu servicio</span>
        <div style={{width:70}}/>
      </div>
      <div style={{background:"var(--rose-lt)",padding:"9px 20px",textAlign:"center"}}>
        <span style={{fontSize:13,color:"var(--rose-dk)",fontWeight:500}}>
          📅 {fmtShort(booking.date)} · ⏰ {booking.time}
        </span>
      </div>

      <div style={{maxWidth:480,margin:"0 auto",padding:"22px 14px 110px"}}>
        <h3 className="fu" style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,color:"var(--text)",marginBottom:4}}>¿Qué quieres hacerte?</h3>
        <p className="fu d1" style={{fontSize:14,color:"var(--text2)",marginBottom:18}}>Toca para seleccionar</p>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
          {active.map((s,i) => (
            <button key={s.id}
              className={`svc-c card-hover fu d${Math.min(i+1,5)} ${mySvc?.id===s.id?"svc-sel":""}`}
              style={{background:mySvc?.id===s.id ? s.color : s.color+"55"}}
              onClick={()=>setMySvc(p=>p?.id===s.id?null:s)}>
              <div style={{fontSize:26,marginBottom:6}}>{s.emoji}</div>
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
            <p style={{fontSize:13,color:"var(--text2)",marginBottom:14}}>Pueden venir las dos al mismo horario</p>
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
                      <div style={{fontSize:22,marginBottom:4}}>{s.emoji}</div>
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
        <div className="pop" style={{position:"fixed",bottom:0,left:0,right:0,background:"var(--white)",borderTop:"1px solid #F0EAE4",padding:"14px 20px",zIndex:20}}>
          <div style={{maxWidth:480,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
            <div>
              <div style={{fontSize:12,color:"var(--text2)",lineHeight:1.4}}>{mySvc.name}{plus&&cmpSvc?` + ${cmpSvc.name}`:""}</div>
              <div style={{fontSize:16,fontWeight:700,color:"var(--rose)"}}>Total ${total}</div>
            </div>
            <button className="btn-r" onClick={()=>onNext({...booking,mySvc,plus,cmpSvc:plus?cmpSvc:null})}
              style={{borderRadius:12,padding:"13px 26px",fontSize:15,display:"flex",alignItems:"center",gap:8}}>
              Siguiente <ArrowRight size={17}/>
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
      <div className="topbar">
        <button className="btn-ghost" onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,fontSize:14}}>
          <ArrowLeft size={17}/> Volver
        </button>
        <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:600}}>¿Quién viene?</span>
        <div style={{width:70}}/>
      </div>
      <div style={{background:"var(--rose-lt)",padding:"9px 20px",textAlign:"center"}}>
        <span style={{fontSize:13,color:"var(--rose-dk)",fontWeight:500}}>
          {booking.mySvc.emoji} {booking.mySvc.name}
          {booking.plus&&booking.cmpSvc?` + ${booking.cmpSvc.emoji} ${booking.cmpSvc.name}`:""} · {booking.time}
        </span>
      </div>

      <div style={{maxWidth:480,margin:"0 auto",padding:"28px 14px 110px"}}>
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
      window.open(`https://wa.me/${SALON_PHONE}?text=${encodeURIComponent(msg)}`,"_blank");

      setDone(true);
    } catch(e) { console.error(e); alert("Error al guardar. Intenta de nuevo."); }
    setSaving(false);
  };

  if (done) return (
    <div className="page" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:20}}>
      <G/>
      <div className="card pop" style={{maxWidth:340,padding:"38px 26px",textAlign:"center"}}>
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

      <div style={{maxWidth:480,margin:"0 auto",padding:"22px 14px 110px"}}>
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
function ClientPortal({ db, services, cfg, onAdmin }) {
  const [page, setPage]   = useState("landing");
  const [booking, setBk]  = useState({});
  const [taps, setTaps]   = useState(0);
  const salonName = cfg?.salonName || "Nail Studio";
  const salonLoc  = cfg?.salonLocation || "";

  const tapLogo = () => {
    const n = taps + 1; setTaps(n);
    if (n >= 7) { setTaps(0); onAdmin(); }
  };

  if (page === "calendar") return <CalendarPage db={db} services={services} cfg={cfg} onBack={()=>setPage("landing")} onNext={d=>{setBk(d);setPage("service");}}/>;
  if (page === "service")  return <ServicePage  booking={booking} services={services} onBack={()=>setPage("calendar")} onNext={d=>{setBk(d);setPage("names");}}/>;
  if (page === "names")    return <NamesPage    booking={booking} onBack={()=>setPage("service")} onNext={d=>{setBk(d);setPage("notes");}}/>;
  if (page === "notes")    return <NotesPage    booking={booking} db={db} cfg={cfg} onBack={()=>setPage("names")} onDone={()=>{setBk({});setPage("landing");}}/>;

  const activeServices = services.filter(s=>s.active);

  return (
    <div className="page">
      <G/>
      {/* Hero */}
      <div style={{background:"linear-gradient(160deg,#2C1A1A 0%,#5A2535 55%,#8A3050 100%)",padding:"56px 20px 72px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-50,right:-50,width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,.04)"}}/>
        <div style={{position:"absolute",bottom:-60,left:-30,width:230,height:230,borderRadius:"50%",background:"rgba(255,255,255,.03)"}}/>
        <button onClick={tapLogo}
          style={{background:"rgba(255,255,255,.12)",border:"none",borderRadius:"50%",width:70,height:70,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px",cursor:"default",backdropFilter:"blur(8px)"}}>
          <Sparkles size={32} color="#F0CDD6"/>
        </button>
        <h1 className="fu" style={{fontFamily:"'Cormorant Garamond',serif",fontSize:42,color:"#FAF0EC",lineHeight:1.1,marginBottom:6,fontWeight:700}}>
          {salonName}
        </h1>
        <p className="fu d1" style={{fontSize:15,color:"#D4A4B4",marginBottom:4,fontStyle:"italic",fontFamily:"'Cormorant Garamond',serif"}}>
          Uñas que cuentan historias ✨
        </p>
        {salonLoc && <p className="fu d2" style={{fontSize:13,color:"rgba(255,255,255,.45)",marginBottom:32}}>📍 {salonLoc}</p>}
        <button className="fu d3" onClick={()=>setPage("calendar")}
          style={{background:"var(--white)",color:"var(--rose)",border:"none",borderRadius:16,padding:"17px 38px",fontSize:17,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:10,boxShadow:"0 12px 36px rgba(0,0,0,.3)",transition:"all .25s",fontFamily:"'DM Sans',sans-serif"}}
          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 16px 44px rgba(0,0,0,.35)"}}
          onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 12px 36px rgba(0,0,0,.3)"}}>
          <Calendar size={21}/> Agendar mi cita
        </button>
        <p className="fu d4" style={{fontSize:11,color:"rgba(255,255,255,.3)",marginTop:14}}>Proceso rápido · Sin registro</p>
      </div>

      <div style={{maxWidth:480,margin:"0 auto",padding:"28px 14px 40px"}}>
        {/* Services grid */}
        <h2 className="fu" style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:"var(--text)",marginBottom:4}}>Servicios</h2>
        <p className="fu d1" style={{fontSize:14,color:"var(--text2)",marginBottom:18}}>Toca cualquier servicio para agendar</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
          {activeServices.map((s,i)=>(
            <button key={s.id} className={`card card-hover fu d${Math.min(i+1,5)}`}
              onClick={()=>setPage("calendar")}
              style={{padding:"16px",cursor:"pointer",background:s.color+"60",border:"none",textAlign:"left",borderRadius:18}}>
              <div style={{fontSize:24,marginBottom:7}}>{s.emoji}</div>
              <div style={{fontSize:13,fontWeight:600,color:"var(--text)",lineHeight:1.3}}>{s.name}</div>
              <div style={{fontSize:11,color:"var(--text2)",marginTop:2}}>{fmtDur(s.duration)}</div>
              <div style={{fontSize:17,fontWeight:700,color:"var(--rose)",marginTop:6}}>${s.price}</div>
            </button>
          ))}
        </div>

        {/* Schedule */}
        <div className="card" style={{padding:"20px",marginBottom:12}}>
          <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"var(--text)",marginBottom:14}}>Horario</h3>
          {[["Lunes – Viernes","9:00 – 19:00"],["Sábado","9:00 – 17:00"],["Domingo","Cerrado"]].map(([d,h])=>(
            <div key={d} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #F0EAE4",fontSize:14}}>
              <span style={{color:"var(--text2)"}}>{d}</span>
              <span style={{fontWeight:600,color:h==="Cerrado"?"#C4B4B4":"var(--rose)"}}>{h}</span>
            </div>
          ))}
        </div>

        {/* WhatsApp */}
        <a href={`https://wa.me/${SALON_PHONE}`} target="_blank" rel="noreferrer"
          className="card card-hover"
          style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",textDecoration:"none",background:"#F0FBF6",border:"1px solid #C0E8D4",borderRadius:18}}>
          <div style={{width:40,height:40,background:"#25D366",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <MessageCircle size={19} color="#fff"/>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>¿Tienes dudas?</div>
            <div style={{fontSize:12,color:"var(--text2)"}}>Escríbenos por WhatsApp</div>
          </div>
          <ArrowRight size={15} color="#B4C4BC" style={{marginLeft:"auto"}}/>
        </a>

        <p style={{textAlign:"center",fontSize:11,color:"#C4B4B4",marginTop:24}}>{salonName} © {new Date().getFullYear()}</p>
      </div>

      {/* FAB */}
      <button className="btn-r fab" onClick={()=>setPage("calendar")}>
        <Calendar size={23} color="#fff"/>
      </button>
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
      <div className="card pop" style={{maxWidth:300,width:"100%",padding:"34px 26px",textAlign:"center"}}>
        <div style={{width:52,height:52,background:"linear-gradient(135deg,#6C4E8A,#9B6DC0)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",boxShadow:"0 6px 18px rgba(108,78,138,.3)"}}>
          <Lock size={24} color="#fff"/>
        </div>
        <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,color:"var(--text)",marginBottom:4}}>Panel Admin</h2>
        <p style={{fontSize:13,color:"var(--text2)",marginBottom:20}}>Ingresa tu contraseña</p>
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
function AdminPanel({ db, onLogout }) {
  const [view, setView]  = useState("dashboard");
  const { apts, loading} = useAppointments(db);
  const clients          = useClients(db);
  const { services }     = useServices(db);
  const { cfg, save: saveCfg } = useConfig(db);
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
    }
    lastCount.current = selfBooked;
  }, [apts]);

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
    {id:"config",   label:"Config",    icon:Settings},
  ];

  const rowStyle = {padding:"14px",background:"var(--cream)",borderRadius:12,marginBottom:10,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10};
  const btnSmall = (color,bg,label) => ({style:{borderRadius:8,padding:"7px 11px",fontSize:12,fontWeight:600,cursor:"pointer",border:"none",background:bg,color,transition:"all .18s",fontFamily:"'DM Sans',sans-serif"},label});

  if (loading) return <div style={{minHeight:"100vh",background:"var(--cream)",display:"flex",alignItems:"center",justifyContent:"center"}}><G/><Sparkles className="spin" size={40} color="var(--rose)"/></div>;

  return (
    <div style={{minHeight:"100vh",background:"var(--cream)"}}>
      <G/>
      {toast && <div className="fi" style={{position:"fixed",top:16,right:16,zIndex:50,background:"var(--white)",borderRadius:12,boxShadow:"var(--sh2)",padding:"12px 18px",fontWeight:500,color:"var(--text)",border:"1px solid #F0EAE4",maxWidth:280}}>{toast}</div>}

      {/* Header */}
      <div style={{background:"var(--white)",borderBottom:"1px solid #F0EAE4",padding:"13px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:40}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,background:"linear-gradient(135deg,var(--rose),var(--rose-dk))",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Sparkles size={16} color="#fff"/>
          </div>
          <div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:600,color:"var(--text)"}}>{cfg?.salonName||"Nail Studio"} Admin</div>
            <div style={{fontSize:11,color:"var(--text2)",display:"flex",alignItems:"center"}}>
              <span className="live-dot pulse"/>En vivo · {todayAps.length} citas hoy
            </div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {newApts > 0 && (
            <button onClick={()=>{setNew(0);setView("today");}}
              style={{background:"#FDE8F0",border:"none",borderRadius:10,padding:"7px 12px",cursor:"pointer",fontSize:12,fontWeight:600,color:"var(--rose)",display:"flex",alignItems:"center",gap:5}}>
              <Bell size={13}/> {newApts} nueva{newApts>1?"s":""}
            </button>
          )}
          <button onClick={onLogout} style={{background:"none",border:"1.5px solid #E8DDD8",borderRadius:10,padding:"7px 13px",cursor:"pointer",fontSize:12,color:"var(--text2)",display:"flex",alignItems:"center",gap:5}}>
            <Lock size={12}/> Salir
          </button>
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{background:"var(--white)",borderBottom:"1px solid #F0EAE4",display:"flex",overflowX:"auto",padding:"0 14px"}}>
        {navItems.map(({id,label,icon:Icon})=>(
          <button key={id} className={`nav-tab ${view===id?"act":""}`} onClick={()=>{setView(id);if(id==="today")setNew(0);}}>
            <Icon size={14}/>{label}
          </button>
        ))}
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"20px 14px 40px"}}>

        {/* ── DASHBOARD ── */}
        {view==="dashboard" && (
          <div className="fu">
            <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:"var(--text)",marginBottom:18}}>Resumen general</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:20}}>
              {[
                {l:"Citas hoy",    v:todayAps.length,              c:"var(--rose)",bg:"#FDF0F3"},
                {l:"Esta semana",  v:upcoming.filter(a=>{const d=new Date(a.date+"T12:00");const now=new Date();const w=new Date(now);w.setDate(now.getDate()+7);return d<=w;}).length + todayAps.length, c:"var(--gold)",bg:"#FDF8F0"},
                {l:"Total citas",  v:apts.length,                  c:"#6C4E8A",bg:"#F8F0FF"},
                {l:"Clientas",     v:clients.length,               c:"var(--sage)",bg:"#F0FBF6"},
              ].map(({l,v,c,bg})=>(
                <div key={l} style={{background:bg,borderRadius:14,padding:"16px 14px",textAlign:"center"}}>
                  <div style={{fontSize:11,color:c,fontWeight:600,marginBottom:5}}>{l}</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:30,fontWeight:700,color:c,lineHeight:1}}>{v}</div>
                </div>
              ))}
            </div>
            {/* Recent self-booked */}
            <div className="card" style={{padding:"20px"}}>
              <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"var(--text)",marginBottom:14}}>
                Últimas citas en línea
              </h3>
              {apts.filter(a=>a.selfBooked).slice(-5).reverse().map(apt=>(
                <div key={apt._id} style={rowStyle}>
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
    <div className="card" style={{padding:"16px",marginBottom:10}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:5}}>
            <span style={{fontWeight:700,fontSize:15,color:"var(--text)"}}>{apt.clientName}</span>
            {apt.confirmed  && <span className="badge" style={{background:"#D0F4E4",color:"#1A6E4A"}}>✓ Conf.</span>}
            {apt.selfBooked && <span className="badge" style={{background:"#D0E4F4",color:"#1A4E8A"}}>En línea</span>}
          </div>
          <div style={{fontSize:13,color:"var(--text2)",marginBottom:3}}>{apt.serviceEmoji||"💅"} {apt.service} · {apt.phone}</div>
          <div style={{fontSize:13,color:"var(--rose)",fontWeight:500}}>📅 {apt.date} · ⏰ {apt.time} · 💰 ${apt.price}</div>
          {apt.companion && <div style={{fontSize:12,color:"#9060B0",marginTop:3}}>👯 Acompañante: {apt.companion}{apt.companionService?` (${apt.companionService})`:""}</div>}
          {apt.notes && <div style={{fontSize:12,color:"var(--gold)",marginTop:3,fontStyle:"italic"}}>📝 "{apt.notes}"</div>}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
          <button onClick={onConf}
            style={{borderRadius:8,padding:"7px 10px",fontSize:11,fontWeight:600,cursor:"pointer",border:"none",background:apt.confirmed?"#D0F4E4":"#F0ECEC",color:apt.confirmed?"#1A6E4A":"#806060",transition:"all .18s",fontFamily:"'DM Sans',sans-serif"}}>
            {apt.confirmed?"✓ Conf.":"Confirmar"}
          </button>
          <button onClick={()=>setEditing(true)}
            style={{borderRadius:8,padding:"7px 10px",fontSize:11,fontWeight:600,cursor:"pointer",border:"none",background:"#F0EAF8",color:"#7040A0",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:3,justifyContent:"center"}}>
            <Pencil size={11}/>Editar
          </button>
          <button className="btn-r" onClick={onWa} style={{borderRadius:8,padding:"7px 10px",fontSize:11,display:"flex",alignItems:"center",gap:3,justifyContent:"center"}}>
            <MessageCircle size={12}/>WA
          </button>
          <button onClick={onDel} style={{borderRadius:8,padding:"7px 10px",fontSize:11,cursor:"pointer",border:"none",background:"#FDE8E8",color:"#C05050",fontFamily:"'DM Sans',sans-serif"}}>
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

// ── Services manager ───────────────────────────────────────────────
function ServicesManager({ db, services, onToast }) {
  const [editing, setEditing] = useState(null);  // id being edited
  const [showNew, setShowNew] = useState(false);
  const blank = {name:"",price:0,duration:30,emoji:"💅",color:"#F8C8D4",active:true};
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
        <button className="btn-r" onClick={()=>setShowNew(!showNew)} style={{borderRadius:12,padding:"10px 18px",fontSize:13,display:"flex",alignItems:"center",gap:6}}>
          <Plus size={15}/> Nuevo
        </button>
      </div>

      {showNew && (
        <div className="card" style={{padding:"22px",marginBottom:14,border:"1.5px solid var(--rose-lt)"}}>
          <h3 style={{fontSize:15,fontWeight:600,marginBottom:14}}>Nuevo servicio</h3>
          <ServiceForm svc={newSvc} onChange={setNewSvc}/>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <button className="btn-r" onClick={addNew} style={{borderRadius:10,padding:"10px 18px",fontSize:13,display:"flex",alignItems:"center",gap:5}}><Check size={14}/>Guardar</button>
            <button className="btn-o" onClick={()=>setShowNew(false)} style={{borderRadius:10,padding:"10px 16px",fontSize:13}}>Cancelar</button>
          </div>
        </div>
      )}

      {services.map(svc => (
        <div key={svc.id} className="card" style={{padding:"16px",marginBottom:10,opacity:svc.active?1:.55}}>
          {editing === svc.id
            ? <EditSvcInline svc={svc} onSave={saveEdit} onCancel={()=>setEditing(null)}/>
            : (
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:42,height:42,background:svc.color,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{svc.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,color:"var(--text)",fontSize:14}}>{svc.name}</div>
                  <div style={{fontSize:12,color:"var(--text2)"}}>{fmtDur(svc.duration)} · ${svc.price}</div>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <button onClick={()=>toggle(svc)} style={{borderRadius:8,padding:"6px 10px",fontSize:11,cursor:"pointer",border:"none",background:svc.active?"#D0F4E4":"#F0ECEC",color:svc.active?"#1A6E4A":"#806060",fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>
                    {svc.active?"Activo":"Inactivo"}
                  </button>
                  <button className="btn-ghost" onClick={()=>setEditing(svc.id)} style={{padding:"6px"}}><Pencil size={15}/></button>
                  <button className="btn-ghost" onClick={()=>del(svc.id)} style={{padding:"6px",color:"#C05050"}}><Trash2 size={15}/></button>
                </div>
              </div>
            )
          }
        </div>
      ))}
    </div>
  );
}

function ServiceForm({ svc, onChange }) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <input placeholder="Nombre del servicio" value={svc.name} onChange={e=>onChange({...svc,name:e.target.value})} style={{gridColumn:"1/-1"}}/>
      <div>
        <label style={{fontSize:11,color:"var(--text2)",display:"block",marginBottom:4}}>Precio ($)</label>
        <input type="number" value={svc.price} onChange={e=>onChange({...svc,price:Number(e.target.value)})}/>
      </div>
      <div>
        <label style={{fontSize:11,color:"var(--text2)",display:"block",marginBottom:4}}>Duración (min)</label>
        <input type="number" step="5" value={svc.duration} onChange={e=>onChange({...svc,duration:Number(e.target.value)})}/>
      </div>
      <div>
        <label style={{fontSize:11,color:"var(--text2)",display:"block",marginBottom:6}}>Emoji</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {EMOJI_OPTS.map(em=>(
            <button key={em} onClick={()=>onChange({...svc,emoji:em})}
              style={{fontSize:20,background:svc.emoji===em?"var(--rose-lt)":"transparent",border:svc.emoji===em?"1.5px solid var(--rose)":"1.5px solid transparent",borderRadius:8,padding:"4px 6px",cursor:"pointer"}}>
              {em}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={{fontSize:11,color:"var(--text2)",display:"block",marginBottom:6}}>Color de fondo</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {COLOR_OPTS.map(cl=>(
            <button key={cl} onClick={()=>onChange({...svc,color:cl})}
              style={{width:26,height:26,borderRadius:8,background:cl,border:svc.color===cl?"2px solid var(--rose)":"2px solid transparent",cursor:"pointer"}}>
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
      <ServiceForm svc={s} onChange={setS}/>
      <div style={{display:"flex",gap:8,marginTop:12}}>
        <button className="btn-r" onClick={()=>onSave({...s,price:Number(s.price),duration:Number(s.duration)})} style={{borderRadius:10,padding:"9px 16px",fontSize:13,display:"flex",alignItems:"center",gap:4}}><Save size={14}/>Guardar</button>
        <button className="btn-o" onClick={onCancel} style={{borderRadius:10,padding:"9px 14px",fontSize:13}}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Config panel ───────────────────────────────────────────────────
function ConfigPanel({ cfg, onSave, onToast }) {
  const [f, setF] = useState(cfg || {salonName:"",salonLocation:""});
  useEffect(()=>{ if(cfg) setF(cfg); },[cfg]);
  const save = async () => { await onSave(f); onToast("✅ Configuración guardada"); };
  return (
    <div className="fu">
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:"var(--text)",marginBottom:18}}>Configuración</h2>
      <div className="card" style={{padding:"24px",marginBottom:14}}>
        <h3 style={{fontSize:15,fontWeight:600,marginBottom:16}}>Información del salón</h3>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:"var(--text)",display:"block",marginBottom:5}}>Nombre del salón</label>
            <input value={f.salonName||""} onChange={e=>setF({...f,salonName:e.target.value})} placeholder="Nail Studio"/>
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:"var(--text)",display:"block",marginBottom:5}}>Ubicación</label>
            <input value={f.salonLocation||""} onChange={e=>setF({...f,salonLocation:e.target.value})} placeholder="Ciudad, Estado"/>
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:"var(--text)",display:"block",marginBottom:5}}>Número de WhatsApp (sin + ni espacios)</label>
            <input value={f.whatsapp||SALON_PHONE} onChange={e=>setF({...f,whatsapp:e.target.value})} placeholder="521234567890"/>
          </div>
        </div>
        <button className="btn-r" onClick={save} style={{borderRadius:12,padding:"12px 24px",fontSize:14,marginTop:18,display:"flex",alignItems:"center",gap:6}}>
          <Save size={15}/> Guardar cambios
        </button>
      </div>
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
  const [screen, setScreen]  = useState("client");
  const { services }         = useServices(db);
  const { cfg }              = useConfig(db);

  if (error) return <NotConfigured/>;
  if (!ready) return (
    <div style={{minHeight:"100vh",background:"var(--cream)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
      <G/>
      <Sparkles className="spin" size={38} color="#C4627E"/>
      <p style={{color:"var(--text2)",fontSize:14}}>Conectando con Firebase…</p>
    </div>
  );

  return (
    screen === "client" ? <ClientPortal db={db} services={services} cfg={cfg} onAdmin={()=>setScreen("login")}/> :
    screen === "login"  ? <AdminLogin onSuccess={()=>setScreen("admin")} onBack={()=>setScreen("client")}/> :
                          <AdminPanel db={db} onLogout={()=>setScreen("client")}/>
  );
}
