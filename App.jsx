// ╔══════════════════════════════════════════════════════════════════╗
// ║  CONSULTORIO DENTAL — Sistema completo con Firebase              ║
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

const ADMIN_PASSWORD = "dental2024";   // ← Cambia tu contraseña
const SALON_PHONE    = "525645431670"; // ← Tu número WhatsApp (sin + ni espacios)

const DEFAULT_SERVICES = [
  { id:"s1",  name:"Limpieza Dental",          price:450, duration:45, emoji:"🦷", color:"#C8E8F8", active:true },
  { id:"s2",  name:"Blanqueamiento",           price:1200, duration:60, emoji:"✨", color:"#F8F8FF", active:true },
  { id:"s3",  name:"Resina (Empaste)",         price:600, duration:45, emoji:"🔧", color:"#E8F8C8", active:true },
  { id:"s4",  name:"Extracción Simple",        price:500, duration:30, emoji:"🩺", color:"#FFE4E1", active:true },
  { id:"s5",  name:"Endodoncia (Conducto)",    price:2500, duration:90, emoji:"💉", color:"#F0D8F8", active:true },
  { id:"s6",  name:"Corona Dental",            price:3000, duration:120, emoji:"👑", color:"#FFFACD", active:true },
  { id:"s7",  name:"Ortodoncia - Consulta",    price:300, duration:30, emoji:"🦴", color:"#C8F8E8", active:true },
  { id:"s8",  name:"Placa de Relajación",      price:1800, duration:45, emoji:"😌", color:"#E6E6FA", active:true },
  { id:"s9",  name:"Profilaxis (Prevención)",  price:400, duration:40, emoji:"🛡️", color:"#F0FFF0", active:true },
  { id:"s10", name:"Valoración General",       price:200, duration:30, emoji:"📋", color:"#FFF0D4", active:true },
];

const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                   "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const EMOJI_OPTS  = ["🦷","✨","🔧","🩺","💉","👑","🦴","😌","🛡️","📋","🪥","🦷","💙","🩹","🔬","🏥","⚕️","💊","🌟","💫"];
const COLOR_OPTS  = ["#C8E8F8","#F8F8FF","#E8F8C8","#FFE4E1","#F0D8F8","#FFFACD","#C8F8E8","#E6E6FA","#F0FFF0","#FFF0D4","#E0FFFF","#F5F5DC"];
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
const GlobalStyles = () => (
  <style>{`
    :root {
      --ios-bg:     #f2f2f7;
      --ios-card:   #fff;
      --ios-label:  #000;
      --ios-label2: #8e8e93;
      --ios-sep:    rgba(60,60,67,.16);
      --ios-tint:   #007aff;
      --ios-red:    #ff3b30;
      --ios-green:  #34c759;
      --ios-sh:     0 2px 16px rgba(0,0,0,.08);
    }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'DM Sans',system-ui,sans-serif; -webkit-font-smoothing:antialiased;
      background:var(--ios-bg); color:var(--ios-label); line-height:1.4; }
    .ios-list { background:var(--ios-card); border-radius:14px; overflow:hidden; box-shadow:var(--ios-sh); }
    .btn-r { border:none; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .22s;
      background:var(--ios-tint); color:#fff; font-weight:600; box-shadow:0 4px 14px rgba(0,122,255,.3); }
    .btn-r:active { transform:scale(.98); opacity:.9; }
    .spin { animation:sp .7s linear infinite; }
    @keyframes sp { to{transform:rotate(360deg);} }
  `}</style>
);

// ══════════════════════════════════════════════════════════════════
//  NOT CONFIGURED
// ══════════════════════════════════════════════════════════════════
function NotConfigured() {
  return (
    <div style={{minHeight:"100vh",background:"var(--ios-bg)",padding:20,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20}}>
      <GlobalStyles/>
      <div style={{fontSize:60}}>🦷</div>
      <h1 style={{fontSize:24,fontWeight:700,color:"var(--ios-label)",textAlign:"center"}}>Configura Firebase primero</h1>
      <p style={{color:"var(--ios-label2)",textAlign:"center",maxWidth:400}}>
        Sigue las instrucciones en la parte superior del código para conectar tu proyecto Firebase.
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  GRADIENT LOGO
// ══════════════════════════════════════════════════════════════════
function G() {
  return (
    <div style={{fontSize:48,fontWeight:900,background:"linear-gradient(135deg,#007aff,#00c6ff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
      letterSpacing:"-1px",fontFamily:"'DM Sans',sans-serif"}}>
      🦷
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  HOOKS
// ══════════════════════════════════════════════════════════════════
function useServices(db) {
  const [services, setServices] = useState([]);
  useEffect(() => {
    if (!db) return;
    const un = onSnapshot(collection(db,"services"), sn => {
      if (sn.empty) {
        DEFAULT_SERVICES.forEach(s => setDoc(doc(db,"services",s.id), s));
      } else {
        setServices(sn.docs.map(d => ({id:d.id,...d.data()})));
      }
    });
    return un;
  }, [db]);
  return { services };
}

function useConfig(db) {
  const [cfg, setCfg] = useState({
    salonName:"Consultorio Dental Dr. Martínez",
    salonAddress:"Av. Revolución 123, Ciudad de México",
    salonPhone:"525645431670",
    workStart:"09:00",
    workEnd:"18:00",
    slotInterval:30,
    heroTitle:"Tu Sonrisa, Nuestra Pasión",
    heroSubtitle:"Odontología de excelencia con tecnología de punta",
    heroBg:""
  });
  useEffect(() => {
    if (!db) return;
    const un = onSnapshot(doc(db,"config","main"), sn => {
      if (sn.exists()) setCfg({...cfg,...sn.data()});
      else setDoc(doc(db,"config","main"), cfg);
    }, () => setDoc(doc(db,"config","main"), cfg));
    return un;
  }, [db]);
  return { cfg };
}

function useBlocked(db) {
  const [list, setList] = useState([]);
  useEffect(() => {
    if (!db) return;
    const un = onSnapshot(collection(db,"blocked"), sn => setList(sn.docs.map(d=>({id:d.id,...d.data()}))));
    return un;
  }, [db]);
  return list;
}

function useAppointments(db) {
  const [appts, setAppts] = useState([]);
  useEffect(() => {
    if (!db) return;
    const un = onSnapshot(collection(db,"appointments"), sn => setAppts(sn.docs.map(d=>({id:d.id,...d.data()}))));
    return un;
  }, [db]);
  return appts;
}

function useClients(db) {
  const [clients, setClients] = useState([]);
  useEffect(() => {
    if (!db) return;
    const un = onSnapshot(collection(db,"clients"), sn => setClients(sn.docs.map(d=>({id:d.id,...d.data()}))));
    return un;
  }, [db]);
  return clients;
}

// ══════════════════════════════════════════════════════════════════
//  IMAGE RESIZE
// ══════════════════════════════════════════════════════════════════
function resizeImage(file, maxW, quality, cb) {
  const r = new FileReader();
  r.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ratio = img.width / img.height;
      canvas.width = Math.min(maxW, img.width);
      canvas.height = canvas.width / ratio;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      cb(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = e.target.result;
  };
  r.readAsDataURL(file);
}

// ══════════════════════════════════════════════════════════════════
//  CLIENT PORTAL
// ══════════════════════════════════════════════════════════════════
function ClientPortal({ db, services, cfg, blocked, onAdmin }) {
  const [step, setStep] = useState("date");
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState("");
  const [sid, setSid]   = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [allAppts, setAllAppts] = useState([]);

  useEffect(() => {
    if (!db) return;
    const un = onSnapshot(collection(db,"appointments"), sn => setAllAppts(sn.docs.map(d=>({id:d.id,...d.data()}))));
    return un;
  }, [db]);

  const activeServices = services.filter(s => s.active);
  const selectedService = services.find(s => s.id === sid);

  const busySlots = useMemo(() => {
    const out = new Set();
    allAppts.filter(a => a.date === date && a.status !== "cancelled").forEach(a => {
      const [h, m] = a.time.split(":").map(Number);
      const startMins = h * 60 + m;
      const dur = a.duration || 30;
      for (let offset = 0; offset < dur; offset += (cfg.slotInterval || 30)) {
        const slotMins = startMins + offset;
        const slotH = Math.floor(slotMins / 60);
        const slotM = slotMins % 60;
        out.add(`${String(slotH).padStart(2,"0")}:${String(slotM).padStart(2,"0")}`);
      }
    });
    return out;
  }, [allAppts, date, cfg.slotInterval]);

  const availableSlots = useMemo(() => {
    const [startH] = (cfg.workStart || "09:00").split(":").map(Number);
    const [endH]   = (cfg.workEnd   || "18:00").split(":").map(Number);
    const interval = cfg.slotInterval || 30;
    const slots = generateTimeSlots(interval, startH, endH);
    return slots.filter(s => !busySlots.has(s));
  }, [cfg.workStart, cfg.workEnd, cfg.slotInterval, busySlots]);

  const book = async () => {
    if (!name.trim() || !phone.trim()) { alert("Completa tu nombre y teléfono"); return; }
    const cleanedPhone = cleanPhone(phone);
    const isBlocked = blocked.some(b => cleanPhone(b.phone) === cleanedPhone);
    if (isBlocked) { alert("Este número está bloqueado. Contacta al consultorio."); return; }

    await addDoc(collection(db,"appointments"), {
      date, time,
      serviceId: sid,
      serviceName: selectedService?.name || "",
      duration: selectedService?.duration || 30,
      price: selectedService?.price || 0,
      clientName: name,
      clientPhone: cleanedPhone,
      status: "pending",
      createdAt: serverTimestamp()
    });

    const existing = await getDocs(collection(db,"clients"));
    const found = existing.docs.find(d => cleanPhone(d.data().phone) === cleanedPhone);
    if (!found) {
      await addDoc(collection(db,"clients"), {
        name, phone: cleanedPhone,
        totalVisits:1,
        totalSpent: selectedService?.price || 0,
        lastVisit: date,
        createdAt: serverTimestamp()
      });
    }

    playChime();
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setStep("date");
      setDate(todayStr());
      setTime("");
      setSid("");
      setName("");
      setPhone("");
    }, 3000);
  };

  const Hero = () => (
    <div style={{
      background: cfg.heroBg 
        ? `linear-gradient(135deg, rgba(0,122,255,.85), rgba(0,198,255,.75)), url(${cfg.heroBg}) center/cover`
        : "linear-gradient(135deg, #007aff, #00c6ff)",
      padding:"50px 20px 40px",
      borderRadius:"0 0 30px 30px",
      color:"#fff",
      textAlign:"center",
      boxShadow:"0 8px 30px rgba(0,122,255,.25)",
      marginBottom:30,
      position:"relative"
    }}>
      <div style={{fontSize:56,marginBottom:12}}>🦷</div>
      <h1 style={{fontSize:28,fontWeight:800,marginBottom:8,letterSpacing:"-.5px"}}>
        {cfg.heroTitle || cfg.salonName || "Consultorio Dental"}
      </h1>
      <p style={{fontSize:15,opacity:.95,fontWeight:500}}>
        {cfg.heroSubtitle || "Odontología de excelencia"}
      </p>
      
      {/* Datos del Doctor */}
      <div style={{
        marginTop:25,
        padding:"20px",
        background:"rgba(255,255,255,.15)",
        backdropFilter:"blur(10px)",
        borderRadius:16,
        border:"1px solid rgba(255,255,255,.2)"
      }}>
        <div style={{fontSize:18,fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          ⚕️ Dr. Carlos Martínez Rodríguez
        </div>
        <div style={{fontSize:13,opacity:.9,lineHeight:1.6,marginBottom:10}}>
          <div style={{marginBottom:6}}>🎓 Universidad Nacional Autónoma de México (UNAM)</div>
          <div style={{marginBottom:6}}>📜 Cédula Profesional: 7845621</div>
          <div style={{marginBottom:6}}>🏆 Especialista en Endodoncia - 15 años de experiencia</div>
          <div>💼 Miembro de la Asociación Dental Mexicana</div>
        </div>
      </div>

      {/* Datos Dentales Curiosos */}
      <div style={{
        marginTop:20,
        padding:"18px",
        background:"rgba(255,255,255,.12)",
        backdropFilter:"blur(8px)",
        borderRadius:14,
        border:"1px solid rgba(255,255,255,.15)"
      }}>
        <div style={{fontSize:16,fontWeight:700,marginBottom:10}}>💡 ¿Sabías que...?</div>
        <div style={{fontSize:12,opacity:.92,textAlign:"left",lineHeight:1.7}}>
          <div style={{marginBottom:8}}>🦷 Los humanos tienen 32 dientes permanentes (incluyendo muelas del juicio)</div>
          <div style={{marginBottom:8}}>⚡ El esmalte dental es la sustancia más dura del cuerpo humano</div>
          <div style={{marginBottom:8}}>🔬 Cada diente tiene su propia "huella digital" única</div>
          <div style={{marginBottom:8}}>🪥 Debes cepillarte durante al menos 2 minutos, 2 veces al día</div>
          <div>🦠 Tu boca alberga más de 700 especies diferentes de bacterias</div>
        </div>
      </div>

      <button onClick={onAdmin}
        style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,.2)",
          backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,.3)",
          borderRadius:12,padding:"8px 14px",color:"#fff",fontSize:13,fontWeight:600,
          cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
        <Lock size={14}/> Panel
      </button>
    </div>
  );

  if (showSuccess) {
    return (
      <div style={{minHeight:"100vh",background:"var(--ios-bg)"}}>
        <GlobalStyles/>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:20,textAlign:"center"}}>
          <div style={{width:100,height:100,borderRadius:"50%",background:"linear-gradient(135deg,#34c759,#30d158)",
            display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20,
            boxShadow:"0 12px 40px rgba(52,199,89,.4)"}}>
            <Check size={50} color="#fff" strokeWidth={3}/>
          </div>
          <h2 style={{fontSize:26,fontWeight:800,color:"var(--ios-label)",marginBottom:10}}>¡Cita Confirmada! 🎉</h2>
          <p style={{fontSize:15,color:"var(--ios-label2)",maxWidth:300}}>
            Te esperamos el <strong>{fmtLong(date)}</strong> a las <strong>{time}</strong>
          </p>
          <div style={{marginTop:30,padding:20,background:"var(--ios-card)",borderRadius:16,boxShadow:"var(--ios-sh)",maxWidth:350}}>
            <div style={{fontSize:13,color:"var(--ios-label2)",marginBottom:10}}>Recuerda:</div>
            <div style={{fontSize:14,color:"var(--ios-label)",lineHeight:1.6}}>
              🪥 Cepilla tus dientes antes de venir<br/>
              ⏰ Llega 10 minutos antes<br/>
              📱 Confirmaremos por WhatsApp
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",background:"var(--ios-bg)",paddingBottom:40}}>
      <GlobalStyles/>
      <Hero/>

      <div style={{maxWidth:500,margin:"0 auto",padding:"0 16px"}}>
        {/* Progress */}
        <div style={{display:"flex",gap:8,marginBottom:30}}>
          {["date","service","time","info"].map((s,i) => (
            <div key={s} style={{flex:1,height:4,borderRadius:2,
              background: ["date","service","time","info"].indexOf(step) >= i ? "var(--ios-tint)" : "var(--ios-sep)",
              transition:"all .3s"}}/>
          ))}
        </div>

        {step === "date" && (
          <div>
            <h2 style={{fontSize:22,fontWeight:700,color:"var(--ios-label)",marginBottom:6}}>Selecciona una fecha</h2>
            <p style={{fontSize:14,color:"var(--ios-label2)",marginBottom:20}}>¿Cuándo quieres tu cita?</p>
            <div className="ios-list">
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} min={todayStr()}
                style={{width:"100%",padding:16,border:"none",outline:"none",fontSize:17,background:"transparent",
                  color:"var(--ios-label)",fontFamily:"'DM Sans',sans-serif"}}/>
            </div>
            <button className="btn-r" onClick={()=>setStep("service")}
              style={{width:"100%",padding:16,fontSize:17,borderRadius:14,marginTop:20,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              Continuar <ArrowRight size={18}/>
            </button>
          </div>
        )}

        {step === "service" && (
          <div>
            <button onClick={()=>setStep("date")}
              style={{background:"none",border:"none",cursor:"pointer",color:"var(--ios-tint)",fontSize:15,fontWeight:600,
                marginBottom:16,display:"flex",alignItems:"center",gap:4}}>
              <ArrowLeft size={18}/> Cambiar fecha
            </button>
            <h2 style={{fontSize:22,fontWeight:700,color:"var(--ios-label)",marginBottom:6}}>Elige tu tratamiento</h2>
            <p style={{fontSize:14,color:"var(--ios-label2)",marginBottom:20}}>
              {fmtLong(date)}
            </p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {activeServices.map(s => (
                <div key={s.id} onClick={()=>{setSid(s.id);playTap();}}
                  style={{background:sid===s.id?s.color:"var(--ios-card)",
                    padding:16,borderRadius:14,cursor:"pointer",
                    border:sid===s.id?`2px solid ${s.color}`:"2px solid transparent",
                    boxShadow:sid===s.id?"0 8px 20px rgba(0,0,0,.1)":"var(--ios-sh)",
                    transition:"all .2s",display:"flex",alignItems:"center",gap:12}}>
                  <div style={{fontSize:32}}>{s.emoji}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:16,fontWeight:700,color:"var(--ios-label)",marginBottom:2}}>{s.name}</div>
                    <div style={{fontSize:13,color:"var(--ios-label2)"}}>{fmtDur(s.duration)} • ${s.price}</div>
                  </div>
                  {sid === s.id && <Check size={22} color="var(--ios-tint)"/>}
                </div>
              ))}
            </div>
            <button className="btn-r" onClick={()=>setStep("time")} disabled={!sid}
              style={{width:"100%",padding:16,fontSize:17,borderRadius:14,marginTop:20,display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                opacity:sid?1:.4}}>
              Continuar <ArrowRight size={18}/>
            </button>
          </div>
        )}

        {step === "time" && (
          <div>
            <button onClick={()=>setStep("service")}
              style={{background:"none",border:"none",cursor:"pointer",color:"var(--ios-tint)",fontSize:15,fontWeight:600,
                marginBottom:16,display:"flex",alignItems:"center",gap:4}}>
              <ArrowLeft size={18}/> Cambiar tratamiento
            </button>
            <h2 style={{fontSize:22,fontWeight:700,color:"var(--ios-label)",marginBottom:6}}>Selecciona horario</h2>
            <p style={{fontSize:14,color:"var(--ios-label2)",marginBottom:20}}>
              {selectedService?.name} • {fmtShort(date)}
            </p>
            {availableSlots.length === 0 ? (
              <div style={{background:"var(--ios-card)",padding:30,borderRadius:14,textAlign:"center",boxShadow:"var(--ios-sh)"}}>
                <div style={{fontSize:40,marginBottom:12}}>😔</div>
                <p style={{color:"var(--ios-label2)",fontSize:15}}>No hay horarios disponibles este día</p>
              </div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {availableSlots.map(t => (
                  <button key={t} onClick={()=>{setTime(t);playTap();}}
                    style={{padding:"14px 8px",borderRadius:12,border:"none",cursor:"pointer",fontSize:15,fontWeight:600,
                      background:time===t?"var(--ios-tint)":"var(--ios-card)",
                      color:time===t?"#fff":"var(--ios-label)",
                      boxShadow:time===t?"0 4px 12px rgba(0,122,255,.3)":"var(--ios-sh)",
                      transition:"all .18s"}}>
                    {t}
                  </button>
                ))}
              </div>
            )}
            <button className="btn-r" onClick={()=>setStep("info")} disabled={!time}
              style={{width:"100%",padding:16,fontSize:17,borderRadius:14,marginTop:20,display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                opacity:time?1:.4}}>
              Continuar <ArrowRight size={18}/>
            </button>
          </div>
        )}

        {step === "info" && (
          <div>
            <button onClick={()=>setStep("time")}
              style={{background:"none",border:"none",cursor:"pointer",color:"var(--ios-tint)",fontSize:15,fontWeight:600,
                marginBottom:16,display:"flex",alignItems:"center",gap:4}}>
              <ArrowLeft size={18}/> Cambiar horario
            </button>
            <h2 style={{fontSize:22,fontWeight:700,color:"var(--ios-label)",marginBottom:6}}>Tus datos</h2>
            <p style={{fontSize:14,color:"var(--ios-label2)",marginBottom:20}}>
              {fmtShort(date)} • {time} • {selectedService?.name}
            </p>
            <div className="ios-list" style={{marginBottom:16}}>
              <div style={{padding:16,borderBottom:".5px solid var(--ios-sep)"}}>
                <div style={{fontSize:12,color:"var(--ios-label2)",fontWeight:500,marginBottom:6}}>Nombre completo</div>
                <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Juan Pérez"
                  style={{width:"100%",border:"none",outline:"none",fontSize:17,background:"transparent",color:"var(--ios-label)",fontFamily:"'DM Sans',sans-serif"}}/>
              </div>
              <div style={{padding:16}}>
                <div style={{fontSize:12,color:"var(--ios-label2)",fontWeight:500,marginBottom:6}}>Teléfono / WhatsApp</div>
                <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="55 1234 5678"
                  style={{width:"100%",border:"none",outline:"none",fontSize:17,background:"transparent",color:"var(--ios-label)",fontFamily:"'DM Sans',sans-serif"}}/>
              </div>
            </div>
            <button className="btn-r" onClick={book}
              style={{width:"100%",padding:16,fontSize:17,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              <Check size={18}/> Confirmar cita
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  ADMIN LOGIN
// ══════════════════════════════════════════════════════════════════
function AdminLogin({ onSuccess, onBack }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState(false);

  const login = () => {
    if (pw === ADMIN_PASSWORD) { playChime(); onSuccess(); }
    else { setErr(true); setTimeout(()=>setErr(false),2000); }
  };

  return (
    <div style={{minHeight:"100vh",background:"var(--ios-bg)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
      <GlobalStyles/>
      <button onClick={onBack}
        style={{position:"absolute",top:20,left:20,background:"var(--ios-card)",border:"none",borderRadius:12,
          padding:"10px 16px",cursor:"pointer",fontSize:15,fontWeight:600,color:"var(--ios-tint)",
          boxShadow:"var(--ios-sh)",display:"flex",alignItems:"center",gap:6}}>
        <ArrowLeft size={18}/> Volver
      </button>

      <div style={{maxWidth:360,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:30}}>
          <div style={{fontSize:60,marginBottom:12}}>🦷</div>
          <h1 style={{fontSize:26,fontWeight:800,color:"var(--ios-label)",marginBottom:6}}>Panel Administrativo</h1>
          <p style={{fontSize:14,color:"var(--ios-label2)"}}>Ingresa tu contraseña</p>
        </div>

        <div className="ios-list" style={{marginBottom:20}}>
          <div style={{padding:16,display:"flex",alignItems:"center",gap:12}}>
            <Lock size={20} color="var(--ios-label2)"/>
            <input type={show?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)} placeholder="Contraseña"
              onKeyDown={e=>e.key==="Enter"&&login()}
              style={{flex:1,border:"none",outline:"none",fontSize:17,background:"transparent",color:"var(--ios-label)",fontFamily:"'DM Sans',sans-serif"}}/>
            <button onClick={()=>setShow(!show)}
              style={{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"}}>
              {show ? <EyeOff size={20} color="var(--ios-label2)"/> : <Eye size={20} color="var(--ios-label2)"/>}
            </button>
          </div>
        </div>

        {err && (
          <div style={{padding:12,background:"rgba(255,59,48,.1)",borderRadius:10,marginBottom:16,color:"var(--ios-red)",fontSize:14,textAlign:"center",fontWeight:500}}>
            Contraseña incorrecta
          </div>
        )}

        <button className="btn-r" onClick={login}
          style={{width:"100%",padding:16,fontSize:17,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <Lock size={18}/> Ingresar
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
  const appts = useAppointments(db);
  const clients = useClients(db);
  const { services } = useServices(db);

  const changeTab = t => { setTab(t); onTabChange(t); };

  const tabs = [
    { id:"dashboard", label:"Panel",    icon:FileText },
    { id:"appts",     label:"Citas",    icon:Calendar },
    { id:"clients",   label:"Pacientes",icon:Users },
    { id:"services",  label:"Servicios",icon:Sparkles },
    { id:"settings",  label:"Config",   icon:Settings },
  ];

  return (
    <div style={{minHeight:"100vh",background:"var(--ios-bg)",paddingBottom:80}}>
      <GlobalStyles/>

      {/* Header */}
      <div style={{background:"var(--ios-card)",boxShadow:"0 1px 0 var(--ios-sep)",padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontSize:28}}>🦷</div>
          <div>
            <div style={{fontSize:17,fontWeight:700,color:"var(--ios-label)"}}>Panel Admin</div>
            <div style={{fontSize:12,color:"var(--ios-label2)"}}>Consultorio Dental</div>
          </div>
        </div>
        <button onClick={onLogout}
          style={{background:"rgba(255,59,48,.1)",border:"none",borderRadius:10,padding:"8px 14px",
            cursor:"pointer",fontSize:14,fontWeight:600,color:"var(--ios-red)"}}>
          Cerrar sesión
        </button>
      </div>

      {/* Content */}
      <div style={{maxWidth:900,margin:"0 auto",padding:"20px 16px"}}>
        {tab === "dashboard" && <Dashboard appts={appts} clients={clients} services={services}/>}
        {tab === "appts"     && <ApptsTab db={db} appts={appts} services={services}/>}
        {tab === "clients"   && <ClientsTab db={db} clients={clients}/>}
        {tab === "services"  && <ServicesTab db={db} services={services}/>}
        {tab === "settings"  && <SettingsTab db={db}/>}
      </div>

      {/* Bottom Nav */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"var(--ios-card)",
        borderTop:".5px solid var(--ios-sep)",display:"flex",justifyContent:"space-around",padding:"8px 0",
        boxShadow:"0 -2px 10px rgba(0,0,0,.05)"}}>
        {tabs.map(({id,label,icon:Icon}) => (
          <button key={id} onClick={()=>changeTab(id)}
            style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",
              alignItems:"center",gap:4,padding:"6px 16px",color:tab===id?"var(--ios-tint)":"var(--ios-label2)",
              transition:"all .2s"}}>
            <Icon size={22}/>
            <span style={{fontSize:11,fontWeight:tab===id?600:400}}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════════
function Dashboard({ appts, clients, services }) {
  const today = todayStr();
  const todayAppts = appts.filter(a => a.date === today && a.status !== "cancelled");
  const pending = appts.filter(a => a.status === "pending").length;
  const totalRevenue = appts.filter(a => a.status === "confirmed").reduce((sum,a) => sum + (a.price||0), 0);

  const stats = [
    { label:"Citas Hoy",      value:todayAppts.length, icon:"📅", color:"#007aff" },
    { label:"Pendientes",     value:pending,           icon:"⏳", color:"#ff9500" },
    { label:"Pacientes",      value:clients.length,    icon:"👥", color:"#34c759" },
    { label:"Ingresos Total", value:`$${totalRevenue}`,icon:"💰", color:"#af52de" },
  ];

  return (
    <div>
      <h2 style={{fontSize:24,fontWeight:800,color:"var(--ios-label)",marginBottom:20}}>Resumen del día</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:30}}>
        {stats.map((s,i) => (
          <div key={i} style={{background:"var(--ios-card)",padding:16,borderRadius:14,boxShadow:"var(--ios-sh)"}}>
            <div style={{fontSize:28,marginBottom:8}}>{s.icon}</div>
            <div style={{fontSize:13,color:"var(--ios-label2)",marginBottom:4}}>{s.label}</div>
            <div style={{fontSize:22,fontWeight:700,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      <h3 style={{fontSize:18,fontWeight:700,color:"var(--ios-label)",marginBottom:12}}>Citas de hoy</h3>
      {todayAppts.length === 0 ? (
        <div style={{background:"var(--ios-card)",padding:30,borderRadius:14,textAlign:"center",boxShadow:"var(--ios-sh)"}}>
          <div style={{fontSize:40,marginBottom:10}}>🎉</div>
          <p style={{color:"var(--ios-label2)"}}>No hay citas programadas para hoy</p>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {todayAppts.sort((a,b) => a.time.localeCompare(b.time)).map(a => (
            <div key={a.id} style={{background:"var(--ios-card)",padding:16,borderRadius:14,boxShadow:"var(--ios-sh)",
              borderLeft:`4px solid ${a.status==="confirmed"?"#34c759":a.status==="cancelled"?"#ff3b30":"#ff9500"}`}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <div style={{fontSize:16,fontWeight:700,color:"var(--ios-label)"}}>{a.time}</div>
                <div style={{fontSize:12,padding:"4px 10px",borderRadius:8,
                  background:a.status==="confirmed"?"rgba(52,199,89,.1)":a.status==="cancelled"?"rgba(255,59,48,.1)":"rgba(255,149,0,.1)",
                  color:a.status==="confirmed"?"#34c759":a.status==="cancelled"?"#ff3b30":"#ff9500",fontWeight:600}}>
                  {a.status==="confirmed"?"Confirmada":a.status==="cancelled"?"Cancelada":"Pendiente"}
                </div>
              </div>
              <div style={{fontSize:14,color:"var(--ios-label)",marginBottom:4}}>{a.clientName}</div>
              <div style={{fontSize:13,color:"var(--ios-label2)"}}>{a.serviceName} • ${a.price}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  APPOINTMENTS TAB
// ══════════════════════════════════════════════════════════════════
function ApptsTab({ db, appts, services }) {
  const [filter, setFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");

  const filtered = appts.filter(a => {
    if (filter === "pending" && a.status !== "pending") return false;
    if (filter === "confirmed" && a.status !== "confirmed") return false;
    if (selectedDate && a.date !== selectedDate) return false;
    return true;
  }).sort((a,b) => {
    const dateComp = b.date.localeCompare(a.date);
    if (dateComp !== 0) return dateComp;
    return b.time.localeCompare(a.time);
  });

  const changeStatus = async (id, newStatus) => {
    await updateDoc(doc(db,"appointments",id), { status: newStatus });
    playTap();
  };

  const deleteAppt = async id => {
    if (!confirm("¿Eliminar esta cita?")) return;
    await deleteDoc(doc(db,"appointments",id));
    playTap();
  };

  const sendWhatsApp = (phone, name, date, time, service) => {
    const msg = `Hola ${name}, confirmamos tu cita para ${fmtLong(date)} a las ${time} - ${service}. ¡Te esperamos! 🦷`;
    window.open(`https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(msg)}`);
  };

  return (
    <div>
      <h2 style={{fontSize:24,fontWeight:800,color:"var(--ios-label)",marginBottom:16}}>Gestión de Citas</h2>

      {/* Filtros */}
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {[{v:"all",l:"Todas"},{v:"pending",l:"Pendientes"},{v:"confirmed",l:"Confirmadas"}].map(({v,l}) => (
          <button key={v} onClick={()=>setFilter(v)}
            style={{padding:"8px 16px",borderRadius:10,border:"none",cursor:"pointer",fontSize:14,fontWeight:600,
              background:filter===v?"var(--ios-tint)":"var(--ios-card)",
              color:filter===v?"#fff":"var(--ios-label2)",
              boxShadow:filter===v?"0 4px 12px rgba(0,122,255,.3)":"var(--ios-sh)",
              transition:"all .18s"}}>
            {l}
          </button>
        ))}
      </div>

      <div className="ios-list" style={{marginBottom:16}}>
        <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}
          style={{width:"100%",padding:14,border:"none",outline:"none",fontSize:15,background:"transparent",
            color:"var(--ios-label)",fontFamily:"'DM Sans',sans-serif"}}/>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div style={{background:"var(--ios-card)",padding:30,borderRadius:14,textAlign:"center",boxShadow:"var(--ios-sh)"}}>
          <div style={{fontSize:40,marginBottom:10}}>📅</div>
          <p style={{color:"var(--ios-label2)"}}>No hay citas que mostrar</p>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.map(a => (
            <div key={a.id} style={{background:"var(--ios-card)",padding:16,borderRadius:14,boxShadow:"var(--ios-sh)"}}>
              <div style={{display:"flex",alignItems:"start",justifyContent:"space-between",marginBottom:12}}>
                <div>
                  <div style={{fontSize:16,fontWeight:700,color:"var(--ios-label)",marginBottom:4}}>{a.clientName}</div>
                  <div style={{fontSize:13,color:"var(--ios-label2)",marginBottom:2}}>{fmtLong(a.date)} • {a.time}</div>
                  <div style={{fontSize:13,color:"var(--ios-label2)"}}>{a.serviceName} • ${a.price}</div>
                </div>
                <div style={{fontSize:12,padding:"4px 10px",borderRadius:8,
                  background:a.status==="confirmed"?"rgba(52,199,89,.1)":a.status==="cancelled"?"rgba(255,59,48,.1)":"rgba(255,149,0,.1)",
                  color:a.status==="confirmed"?"#34c759":a.status==="cancelled"?"#ff3b30":"#ff9500",fontWeight:600}}>
                  {a.status==="confirmed"?"Confirmada":a.status==="cancelled"?"Cancelada":"Pendiente"}
                </div>
              </div>

              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {a.status !== "confirmed" && (
                  <button onClick={()=>changeStatus(a.id,"confirmed")}
                    style={{flex:1,minWidth:100,padding:"9px 12px",borderRadius:10,border:"none",cursor:"pointer",
                      background:"rgba(52,199,89,.1)",color:"#34c759",fontSize:13,fontWeight:600,
                      display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                    <Check size={16}/> Confirmar
                  </button>
                )}
                {a.status !== "cancelled" && (
                  <button onClick={()=>changeStatus(a.id,"cancelled")}
                    style={{flex:1,minWidth:100,padding:"9px 12px",borderRadius:10,border:"none",cursor:"pointer",
                      background:"rgba(255,59,48,.1)",color:"#ff3b30",fontSize:13,fontWeight:600,
                      display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                    <X size={16}/> Cancelar
                  </button>
                )}
                <button onClick={()=>sendWhatsApp(a.clientPhone, a.clientName, a.date, a.time, a.serviceName)}
                  style={{flex:1,minWidth:100,padding:"9px 12px",borderRadius:10,border:"none",cursor:"pointer",
                    background:"rgba(52,199,89,.1)",color:"#34c759",fontSize:13,fontWeight:600,
                    display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  <MessageCircle size={16}/> WhatsApp
                </button>
                <button onClick={()=>deleteAppt(a.id)}
                  style={{padding:"9px 12px",borderRadius:10,border:"none",cursor:"pointer",
                    background:"rgba(255,59,48,.08)",color:"#ff3b30",fontSize:13,fontWeight:600}}>
                  <Trash2 size={16}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  CLIENTS TAB
// ══════════════════════════════════════════════════════════════════
function ClientsTab({ db, clients }) {
  const [search, setSearch] = useState("");
  const blocked = useBlocked(db);

  const filtered = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  ).sort((a,b) => b.totalVisits - a.totalVisits);

  const blockClient = async phone => {
    if (!confirm("¿Bloquear este paciente?")) return;
    await addDoc(collection(db,"blocked"), { phone, blockedAt: serverTimestamp() });
    playTap();
  };

  const unblockClient = async phone => {
    const doc_ = blocked.find(b => b.phone === phone);
    if (!doc_) return;
    await deleteDoc(doc(db,"blocked",doc_.id));
    playTap();
  };

  const isBlocked = phone => blocked.some(b => b.phone === phone);

  return (
    <div>
      <h2 style={{fontSize:24,fontWeight:800,color:"var(--ios-label)",marginBottom:16}}>Pacientes</h2>

      <div className="ios-list" style={{marginBottom:16}}>
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre o teléfono..."
          style={{width:"100%",padding:14,border:"none",outline:"none",fontSize:15,background:"transparent",
            color:"var(--ios-label)",fontFamily:"'DM Sans',sans-serif"}}/>
      </div>

      {filtered.length === 0 ? (
        <div style={{background:"var(--ios-card)",padding:30,borderRadius:14,textAlign:"center",boxShadow:"var(--ios-sh)"}}>
          <div style={{fontSize:40,marginBottom:10}}>👥</div>
          <p style={{color:"var(--ios-label2)"}}>No se encontraron pacientes</p>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.map(c => (
            <div key={c.id} style={{background:"var(--ios-card)",padding:16,borderRadius:14,boxShadow:"var(--ios-sh)"}}>
              <div style={{display:"flex",alignItems:"start",justifyContent:"space-between",marginBottom:12}}>
                <div>
                  <div style={{fontSize:16,fontWeight:700,color:"var(--ios-label)",marginBottom:4}}>{c.name}</div>
                  <div style={{fontSize:13,color:"var(--ios-label2)",marginBottom:2}}>{c.phone}</div>
                  <div style={{fontSize:13,color:"var(--ios-label2)"}}>
                    {c.totalVisits} visita{c.totalVisits>1?"s":""} • ${c.totalSpent} total
                  </div>
                </div>
                {isBlocked(c.phone) && (
                  <div style={{fontSize:12,padding:"4px 10px",borderRadius:8,background:"rgba(255,59,48,.1)",
                    color:"#ff3b30",fontWeight:600}}>Bloqueado</div>
                )}
              </div>

              <div style={{display:"flex",gap:6}}>
                {isBlocked(c.phone) ? (
                  <button onClick={()=>unblockClient(c.phone)}
                    style={{flex:1,padding:"9px 12px",borderRadius:10,border:"none",cursor:"pointer",
                      background:"rgba(52,199,89,.1)",color:"#34c759",fontSize:13,fontWeight:600}}>
                    Desbloquear
                  </button>
                ) : (
                  <button onClick={()=>blockClient(c.phone)}
                    style={{flex:1,padding:"9px 12px",borderRadius:10,border:"none",cursor:"pointer",
                      background:"rgba(255,59,48,.08)",color:"#ff3b30",fontSize:13,fontWeight:600}}>
                    Bloquear
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  SERVICES TAB
// ══════════════════════════════════════════════════════════════════
function ServicesTab({ db, services }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const startEdit = s => {
    setEditing(s.id);
    setForm({...s});
  };

  const save = async () => {
    await updateDoc(doc(db,"services",editing), form);
    setEditing(null);
    playTap();
  };

  const toggle = async id => {
    const s = services.find(x => x.id === id);
    await updateDoc(doc(db,"services",id), { active: !s.active });
    playTap();
  };

  const add = async () => {
    const newId = "s_" + uid();
    await setDoc(doc(db,"services",newId), {
      name:"Nuevo Servicio",
      price:500,
      duration:30,
      emoji:"🦷",
      color:"#C8E8F8",
      active:true
    });
    playTap();
  };

  const remove = async id => {
    if (!confirm("¿Eliminar este servicio?")) return;
    await deleteDoc(doc(db,"services",id));
    playTap();
  };

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <h2 style={{fontSize:24,fontWeight:800,color:"var(--ios-label)"}}>Servicios</h2>
        <button onClick={add}
          style={{background:"var(--ios-tint)",border:"none",borderRadius:10,padding:"10px 16px",
            cursor:"pointer",color:"#fff",fontSize:14,fontWeight:600,display:"flex",alignItems:"center",gap:6,
            boxShadow:"0 4px 12px rgba(0,122,255,.3)"}}>
          <Plus size={16}/> Agregar
        </button>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {services.map(s => (
          editing === s.id ? (
            <div key={s.id} style={{background:"var(--ios-card)",padding:16,borderRadius:14,boxShadow:"var(--ios-sh)"}}>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:12,color:"var(--ios-label2)",marginBottom:6}}>Nombre</div>
                <input type="text" value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}
                  style={{width:"100%",padding:10,border:"1px solid var(--ios-sep)",borderRadius:8,fontSize:15,
                    outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div>
                  <div style={{fontSize:12,color:"var(--ios-label2)",marginBottom:6}}>Precio</div>
                  <input type="number" value={form.price||""} onChange={e=>setForm({...form,price:+e.target.value})}
                    style={{width:"100%",padding:10,border:"1px solid var(--ios-sep)",borderRadius:8,fontSize:15,
                      outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
                </div>
                <div>
                  <div style={{fontSize:12,color:"var(--ios-label2)",marginBottom:6}}>Duración (min)</div>
                  <input type="number" value={form.duration||""} onChange={e=>setForm({...form,duration:+e.target.value})}
                    style={{width:"100%",padding:10,border:"1px solid var(--ios-sep)",borderRadius:8,fontSize:15,
                      outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:12,color:"var(--ios-label2)",marginBottom:6}}>Emoji</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {EMOJI_OPTS.map(e => (
                    <button key={e} onClick={()=>setForm({...form,emoji:e})}
                      style={{fontSize:24,background:form.emoji===e?"rgba(0,122,255,.1)":"transparent",
                        border:form.emoji===e?"2px solid var(--ios-tint)":"2px solid transparent",
                        borderRadius:10,padding:8,cursor:"pointer",transition:"all .2s"}}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:12,color:"var(--ios-label2)",marginBottom:6}}>Color</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {COLOR_OPTS.map(c => (
                    <button key={c} onClick={()=>setForm({...form,color:c})}
                      style={{width:40,height:40,background:c,borderRadius:10,cursor:"pointer",
                        border:form.color===c?"3px solid var(--ios-tint)":"3px solid transparent",
                        transition:"all .2s"}}/>
                  ))}
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={save}
                  style={{flex:1,padding:12,borderRadius:10,border:"none",cursor:"pointer",background:"var(--ios-tint)",
                    color:"#fff",fontSize:15,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  <Save size={16}/> Guardar
                </button>
                <button onClick={()=>setEditing(null)}
                  style={{flex:1,padding:12,borderRadius:10,border:"none",cursor:"pointer",background:"var(--ios-card)",
                    color:"var(--ios-label2)",fontSize:15,fontWeight:600,boxShadow:"var(--ios-sh)"}}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div key={s.id} style={{background:"var(--ios-card)",padding:16,borderRadius:14,boxShadow:"var(--ios-sh)",
              opacity:s.active?1:.5}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                <div style={{fontSize:32}}>{s.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:700,color:"var(--ios-label)",marginBottom:2}}>{s.name}</div>
                  <div style={{fontSize:13,color:"var(--ios-label2)"}}>{fmtDur(s.duration)} • ${s.price}</div>
                </div>
                <button onClick={()=>toggle(s.id)}
                  style={{width:48,height:28,borderRadius:14,border:"none",cursor:"pointer",position:"relative",
                    background:s.active?"var(--ios-green)":"var(--ios-label2)",transition:"all .2s"}}>
                  <div style={{position:"absolute",top:2,left:s.active?22:2,width:24,height:24,borderRadius:"50%",
                    background:"#fff",transition:"all .2s",boxShadow:"0 2px 4px rgba(0,0,0,.2)"}}/>
                </button>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>startEdit(s)}
                  style={{flex:1,padding:9,borderRadius:10,border:"none",cursor:"pointer",background:"rgba(0,122,255,.1)",
                    color:"var(--ios-tint)",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  <Pencil size={14}/> Editar
                </button>
                <button onClick={()=>remove(s.id)}
                  style={{padding:9,borderRadius:10,border:"none",cursor:"pointer",background:"rgba(255,59,48,.08)",
                    color:"#ff3b30",fontSize:13,fontWeight:600}}>
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  SETTINGS TAB
// ══════════════════════════════════════════════════════════════════
function SettingsTab({ db }) {
  const { cfg } = useConfig(db);
  const [f, setF] = useState({});

  useEffect(() => { setF(cfg); }, [cfg]);

  const save = async () => {
    await setDoc(doc(db,"config","main"), f);
    playChime();
  };

  return (
    <div>
      <h2 style={{fontSize:24,fontWeight:800,color:"var(--ios-label)",marginBottom:20}}>Configuración</h2>

      {/* ── Info básica ── */}
      <p style={{fontSize:12,fontWeight:700,color:"var(--ios-label2)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:8,paddingLeft:4}}>Información del consultorio</p>
      <div className="ios-list" style={{marginBottom:20}}>
        {[
          {label:"Nombre del consultorio", key:"salonName", placeholder:"Consultorio Dental", icon:"🦷", type:"text"},
          {label:"Dirección",               key:"salonAddress", placeholder:"Calle Principal #123", icon:"📍", type:"text"},
          {label:"Teléfono / WhatsApp",     key:"salonPhone", placeholder:"525512345678", icon:"📱", type:"tel"},
        ].map(({label,key,placeholder,icon,type},i,arr)=>(
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
              boxShadow:f.slotInterval===v?"0 4px 12px rgba(0,122,255,.3)":"var(--ios-sh)",
              transition:"all .18s",fontFamily:"'DM Sans',sans-serif"}}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Portal de pacientes ── */}
      <p style={{fontSize:12,fontWeight:700,color:"var(--ios-label2)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:8,paddingLeft:4}}>Portal de pacientes</p>
      <div className="ios-list" style={{marginBottom:20}}>
        <div style={{padding:"11px 14px",borderBottom:".5px solid var(--ios-sep)",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:"rgba(0,122,255,.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>✏️</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,color:"var(--ios-label2)",fontWeight:500,marginBottom:2}}>Título principal</div>
            <input value={f.heroTitle||""} onChange={e=>setF({...f,heroTitle:e.target.value})} placeholder={f.salonName||"Consultorio Dental"}
              style={{fontSize:15,border:"none",outline:"none",background:"transparent",width:"100%",padding:0,boxShadow:"none",color:"var(--ios-label)"}}/>
          </div>
        </div>
        <div style={{padding:"11px 14px",borderBottom:".5px solid var(--ios-sep)",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:"rgba(175,82,222,.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>💬</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,color:"var(--ios-label2)",fontWeight:500,marginBottom:2}}>Subtítulo / slogan</div>
            <input value={f.heroSubtitle||""} onChange={e=>setF({...f,heroSubtitle:e.target.value})} placeholder="Tu sonrisa es nuestra pasión"
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
              <span style={{color:"#fff",fontSize:16,fontWeight:600}}>{f.heroTitle||f.salonName||"Consultorio Dental"}</span>
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
  const dark = false;
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
