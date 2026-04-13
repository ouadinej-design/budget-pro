import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";
import {
  Wallet, TrendingDown, TrendingUp, Plus, ChevronLeft, ChevronRight,
  Calendar, Save, Trash2, ArrowUpRight, ArrowDownRight, Building2,
  Banknote, BarChart3, Users, X, Check, Edit3, RefreshCw, Camera,
  Share2, FileText, Lock, Eye, EyeOff, LogOut, BookOpen, DollarSign,
  Download, Upload
} from "lucide-react";
import { initialDepenses, initialRevenus } from "./initialData";
import * as XLSX from "xlsx";

/* ═══════ CONSTANTS ═══════ */
const CATS = ["Achat pièce","Attachement","Quincaillerie","Salaire","Transport",
  "Carburant gasoil","GPL Fiesta","Réparation","Peinture","Sable","Ciment",
  "Béton","Plâtre","Ferrailles","Boulons","Électricien","Huile","SONALGAZ",
  "Alimentation","Location","Prime","Repas","Eau","Batteries","Reparation pompe injection",
  "Hourdis","Scanner","Bureau","Informatique","Autre"];
const SOURCES = ["Takieddine","Takiedine","Attachement","Nejemeddine","Autre"];
const LIEUX = ["BABAR 50","BABAR 120","Erbil","Fiesta","Retro","Chechar 60",
  "Camion blanc 2009 Youssef","Camion Foton","Groupe electrogène","Babar Garage","Autre"];
const COLORS = ["#6366f1","#f43f5e","#10b981","#f59e0b","#8b5cf6","#ec4899",
  "#14b8a6","#f97316","#06b6d4","#84cc16","#a855f7","#ef4444","#22d3ee",
  "#eab308","#d946ef","#0ea5e9","#34d399","#fb923c","#c084fc","#fb7185"];
const MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet",
  "Août","Septembre","Octobre","Novembre","Décembre"];
const MOIS_SHORT = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoû","Sep","Oct","Nov","Déc"];
const JOURS = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];

const fmt = n => { if(n==null||isNaN(n))return "0"; const a=Math.abs(n);
  if(a>=1e6)return(n/1e6).toFixed(2).replace(".",",")+"\u00a0M";
  if(a>=1e3)return(n/1e3).toFixed(1).replace(".",",")+"\u00a0k"; return n.toLocaleString("fr-FR");};
const fmtFull = n => n==null?"0":n.toLocaleString("fr-FR");
const toISO = d => d.toISOString().slice(0,10);
const today = () => toISO(new Date());
const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,6);

/* ═══════ STORAGE (localStorage) ═══════ */
const SK = "budgetpro-v2";
const defaultData = {
  users: [
    { id:"admin", nom:"Nejmeddine", email:"ouadi.nej@gmail.com", pin:"1234", role:"admin" },
    { id:"u2", nom:"Mohamed", email:"jawadouadi67@gmail.com", pin:"0000", role:"user" },
    { id:"u3", nom:"Ramzi", email:"ramzimoh518@gmail.com", pin:"0000", role:"user" },
    { id:"u4", nom:"Salah", email:"ouadisalaheddin@gmail.com", pin:"0000", role:"user" },
  ],
  depenses:initialDepenses, revenus:initialRevenus, photos:{},
  budgets:[{ id:"b1", nom:"BABAR 50", total:100000000, apparts:50, parAppart:2000000 }],
  babar50:[]
};

function load() {
  try {
    const raw = localStorage.getItem(SK);
    if (raw) return JSON.parse(raw);
    return defaultData;
  } catch { return defaultData; }
}

function sv(d) {
  try {
    // On stocke les photos séparément pour ne pas exploser le localStorage
    const { photos, ...rest } = d;
    localStorage.setItem(SK, JSON.stringify(d));
  } catch (e) {
    console.error("Save error:", e);
    // Si quota dépassé, on sauvegarde sans les photos
    try {
      const { photos, ...rest } = d;
      localStorage.setItem(SK, JSON.stringify({ ...rest, photos: {} }));
    } catch (e2) { console.error("Critical save error:", e2); }
  }
}

/* ═══════ STYLE TOKENS ═══════ */
const S = {
  bg:"#060611", card:"rgba(255,255,255,0.035)", brd:"rgba(255,255,255,0.07)",
  acc:"#818cf8", acc2:"#6366f1", grn:"#10b981", red:"#f43f5e",
  txt:"#f1f5f9", mut:"rgba(255,255,255,0.4)", dim:"rgba(255,255,255,0.25)"
};

/* ═══════ MINI COMPONENTS ═══════ */
function Card({children,style,onClick}){
  return <div onClick={onClick} style={{background:S.card,border:`1px solid ${S.brd}`,borderRadius:16,padding:18,...style}}>{children}</div>;
}
function Btn({children,onClick,variant="primary",style,disabled}){
  const b={padding:"11px 20px",borderRadius:12,border:"none",fontSize:14,fontWeight:600,
    cursor:disabled?"not-allowed":"pointer",display:"inline-flex",alignItems:"center",gap:8,
    transition:"all 0.2s",opacity:disabled?0.5:1};
  const v={
    primary:{...b,background:`linear-gradient(135deg,${S.acc2},${S.acc})`,color:"#fff"},
    danger:{...b,background:"rgba(239,68,68,0.15)",color:"#f87171",border:"1px solid rgba(239,68,68,0.2)"},
    ghost:{...b,background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.7)",border:`1px solid ${S.brd}`},
    success:{...b,background:"linear-gradient(135deg,#059669,#10b981)",color:"#fff"},
    outline:{...b,background:"transparent",color:S.acc,border:`1px solid ${S.acc}`}
  };
  return <button onClick={onClick} disabled={disabled} style={{...v[variant],...style}}>{children}</button>;
}
function Badge({children,color=S.acc}){
  return <span style={{display:"inline-flex",alignItems:"center",padding:"3px 10px",borderRadius:20,
    fontSize:11,fontWeight:600,background:`${color}20`,color}}>{children}</span>;
}
function InputF({label,value,onChange,placeholder,type="text",style}){
  return <div style={{marginBottom:12,...style}}>
    {label&&<label style={{display:"block",fontSize:10,fontWeight:700,color:S.mut,
      textTransform:"uppercase",letterSpacing:1.2,marginBottom:5}}>{label}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:"100%",padding:"11px 13px",borderRadius:10,background:"rgba(255,255,255,0.06)",
        border:`1px solid ${S.brd}`,color:S.txt,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
  </div>;
}
function SelectF({label,value,onChange,options,placeholder}){
  return <div style={{marginBottom:12}}>
    {label&&<label style={{display:"block",fontSize:10,fontWeight:700,color:S.mut,
      textTransform:"uppercase",letterSpacing:1.2,marginBottom:5}}>{label}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)} style={{
      width:"100%",padding:"11px 13px",borderRadius:10,background:"rgba(255,255,255,0.06)",
      border:`1px solid ${S.brd}`,color:value?S.txt:"rgba(255,255,255,0.3)",fontSize:14,
      outline:"none",appearance:"none",boxSizing:"border-box",
      backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23888' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`,
      backgroundRepeat:"no-repeat",backgroundPosition:"right 12px center"
    }}>
      <option value="" style={{background:"#12122a"}}>{placeholder||"Choisir..."}</option>
      {options.map(o=><option key={o} value={o} style={{background:"#12122a"}}>{o}</option>)}
    </select>
  </div>;
}
function TextArea({label,value,onChange,placeholder}){
  return <div style={{marginBottom:12}}>
    {label&&<label style={{display:"block",fontSize:10,fontWeight:700,color:S.mut,
      textTransform:"uppercase",letterSpacing:1.2,marginBottom:5}}>{label}</label>}
    <textarea value={value} onChange={e=>onChange(e.target.value)} rows={2} placeholder={placeholder}
      style={{width:"100%",padding:"11px 13px",borderRadius:10,resize:"vertical",
        background:"rgba(255,255,255,0.06)",border:`1px solid ${S.brd}`,
        color:S.txt,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
  </div>;
}

/* ═══════ CALENDAR PICKER ═══════ */
function CalendarPicker({value,onChange,onClose}){
  const sel=value?new Date(value+"T00:00:00"):new Date();
  const [vY,setVY]=useState(sel.getFullYear());
  const [vM,setVM]=useState(sel.getMonth());
  const fd=new Date(vY,vM,1).getDay();
  const dim=new Date(vY,vM+1,0).getDate();
  const cells=[];for(let i=0;i<fd;i++)cells.push(null);for(let d=1;d<=dim;d++)cells.push(d);
  const prev=()=>{if(vM===0){setVM(11);setVY(vY-1);}else setVM(vM-1);};
  const next=()=>{if(vM===11){setVM(0);setVY(vY+1);}else setVM(vM+1);};
  const pick=d=>{const iso=`${vY}-${String(vM+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;onChange(iso);onClose();};
  const sD=sel.getDate(),sM=sel.getMonth(),sY=sel.getFullYear();
  const td=new Date(),tD=td.getDate(),tM=td.getMonth(),tY=td.getFullYear();
  return <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",
    justifyContent:"center",background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#12122a",borderRadius:20,padding:20,
      width:320,maxWidth:"90vw",border:`1px solid ${S.brd}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <button onClick={prev} style={{background:"none",border:"none",color:S.txt,cursor:"pointer",padding:8}}>
          <ChevronLeft size={20}/></button>
        <span style={{fontSize:16,fontWeight:700,color:S.txt}}>{MOIS_FR[vM]} {vY}</span>
        <button onClick={next} style={{background:"none",border:"none",color:S.txt,cursor:"pointer",padding:8}}>
          <ChevronRight size={20}/></button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,textAlign:"center",marginBottom:8}}>
        {JOURS.map(j=><div key={j} style={{fontSize:11,fontWeight:600,color:S.mut,padding:6}}>{j}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {cells.map((d,i)=>{if(!d)return <div key={i}/>;
          const isT=d===tD&&vM===tM&&vY===tY;
          const isS=d===sD&&vM===sM&&vY===sY;
          return <button key={i} onClick={()=>pick(d)} style={{
            width:40,height:40,borderRadius:12,border:"none",fontSize:14,fontWeight:isS?700:400,
            cursor:"pointer",margin:"0 auto",
            background:isS?`linear-gradient(135deg,${S.acc2},${S.acc})`:isT?"rgba(129,140,248,0.15)":"transparent",
            color:isS?"#fff":isT?S.acc:S.txt,transition:"all 0.15s"
          }}>{d}</button>;})}
      </div>
      <div style={{marginTop:14,textAlign:"center"}}>
        <button onClick={()=>{onChange(today());onClose();}} style={{background:"none",border:"none",
          color:S.acc,fontSize:13,fontWeight:600,cursor:"pointer"}}>Aujourd'hui</button>
      </div>
    </div>
  </div>;
}
function DateField({label,value,onChange}){
  const [open,setOpen]=useState(false);
  const d=value?new Date(value+"T00:00:00"):null;
  return <div style={{marginBottom:12}}>
    {label&&<label style={{display:"block",fontSize:10,fontWeight:700,color:S.mut,
      textTransform:"uppercase",letterSpacing:1.2,marginBottom:5}}>{label}</label>}
    <button onClick={()=>setOpen(true)} style={{width:"100%",padding:"11px 13px",borderRadius:10,
      background:"rgba(255,255,255,0.06)",border:`1px solid ${S.brd}`,color:S.txt,fontSize:14,
      textAlign:"left",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",
      boxSizing:"border-box"}}>
      <span>{d?`${d.getDate()} ${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`:"Choisir..."}</span>
      <Calendar size={16} color={S.mut}/>
    </button>
    {open&&<CalendarPicker value={value} onChange={onChange} onClose={()=>setOpen(false)}/>}
  </div>;
}

/* ═══════ PHOTO CAPTURE ═══════ */
function PhotoCapture({photos=[],onChange,max=4}){
  const ref=useRef();
  const handleFile=e=>{const files=Array.from(e.target.files||[]);
    if(photos.length+files.length>max)return;
    files.forEach(f=>{const r=new FileReader();r.onload=()=>onChange([...photos,{id:uid(),data:r.result,name:f.name}]);r.readAsDataURL(f);});
    e.target.value="";};
  return <div style={{marginBottom:12}}>
    <label style={{display:"block",fontSize:10,fontWeight:700,color:S.mut,
      textTransform:"uppercase",letterSpacing:1.2,marginBottom:5}}>Photos factures ({photos.length}/{max})</label>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      {photos.map(p=><div key={p.id} style={{position:"relative",width:60,height:60,borderRadius:10,
        overflow:"hidden",border:`1px solid ${S.brd}`}}>
        <img src={p.data} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        <button onClick={()=>onChange(photos.filter(x=>x.id!==p.id))} style={{position:"absolute",top:2,right:2,
          width:18,height:18,borderRadius:"50%",background:"rgba(0,0,0,0.7)",border:"none",cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center"}}><X size={9} color="#fff"/></button>
      </div>)}
      {photos.length<max&&<button onClick={()=>ref.current?.click()} style={{width:60,height:60,borderRadius:10,
        border:`2px dashed ${S.brd}`,background:"transparent",cursor:"pointer",
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}>
        <Camera size={16} color={S.mut}/><span style={{fontSize:8,color:S.dim}}>Photo</span>
      </button>}
    </div>
    <input ref={ref} type="file" accept="image/*" capture="environment" multiple onChange={handleFile} style={{display:"none"}}/>
  </div>;
}

/* ═══════ MODAL ═══════ */
function Modal({open,onClose,title,children}){
  if(!open)return null;
  return <div style={{position:"fixed",inset:0,zIndex:150,display:"flex",alignItems:"flex-end",
    justifyContent:"center",background:"rgba(0,0,0,0.6)",backdropFilter:"blur(6px)"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#12122a",borderRadius:"20px 20px 0 0",
      padding:20,width:"100%",maxWidth:480,maxHeight:"85vh",overflowY:"auto",
      border:`1px solid ${S.brd}`,borderBottom:"none",animation:"slideUp 0.3s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <span style={{fontSize:17,fontWeight:700,color:S.txt}}>{title}</span>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",border:"none",
          borderRadius:10,width:34,height:34,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <X size={16} color={S.mut}/></button>
      </div>
      {children}
    </div>
  </div>;
}

/* ═══════ BALANCE RING ═══════ */
function Ring({solde,recettes,depenses}){
  const pct=recettes>0?Math.min((depenses/recettes)*100,100):0;
  const r=62,circ=2*Math.PI*r,off=circ-(pct/100)*circ;const neg=solde<0;
  return <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"10px 0"}}>
    <svg width="155" height="155" viewBox="0 0 155 155">
      <circle cx="77" cy="77" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10"/>
      <circle cx="77" cy="77" r={r} fill="none" stroke={neg?S.red:S.grn} strokeWidth="10"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off}
        transform="rotate(-90 77 77)" style={{transition:"stroke-dashoffset 1s ease"}}/>
      <text x="77" y="70" textAnchor="middle" fill={S.mut} fontSize="11">Solde</text>
      <text x="77" y="92" textAnchor="middle" fill={neg?S.red:S.grn}
        fontSize={Math.abs(solde)>=1e6?"15":"19"} fontWeight="700">{fmtFull(solde)}</text>
      <text x="77" y="106" textAnchor="middle" fill={S.dim} fontSize="10">DA</text>
    </svg>
  </div>;
}

/* ══════════════════════════════════════ */
/* ═══════ MAIN APP ═══════ */
/* ══════════════════════════════════════ */
export default function BudgetApp(){
  const [data,setData]=useState(null);
  const [user,setUser]=useState(null);
  const [tab,setTab]=useState("solde");
  const [toast,setToast]=useState(null);

  useEffect(()=>{setData(load());},[]);
  const persist=useCallback(nd=>{setData(nd);sv(nd);},[]);
  const showT=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),2500);};

  if(!data) return <div style={{minHeight:"100vh",background:S.bg,display:"flex",alignItems:"center",
    justifyContent:"center"}}><RefreshCw size={24} color={S.acc} className="spin"/>
    <style>{`@keyframes spin{to{transform:rotate(360deg);}} .spin{animation:spin 1s linear infinite;}`}</style></div>;

  const adm=user?.role==="admin";
  const totalR=data.revenus.reduce((a,r)=>a+(Number(r.montant)||0),0);
  const totalD=data.depenses.reduce((a,d)=>a+(Number(d.montant)||0),0);
  const solde=totalR-totalD;

  /* ═══ LOGIN ═══ */
  if(!user) return <LoginScreen data={data} onLogin={setUser}/>;

  function LoginScreen({data:d,onLogin}){
    const [sel,setSel]=useState(null);
    const [pin,setPin]=useState("");
    const [show,setShow]=useState(false);
    const [err,setErr]=useState("");
    const go=()=>{if(!sel)return;const u=d.users.find(x=>x.id===sel);
      if(!u){setErr("Introuvable");return;}if(u.pin&&u.pin!==pin){setErr("PIN incorrect");return;}onLogin(u);};
    return <div style={{minHeight:"100vh",background:S.bg,display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{marginBottom:28,textAlign:"center"}}>
        <Banknote size={36} color={S.acc} style={{marginBottom:10}}/>
        <div style={{fontSize:26,fontWeight:800,color:S.txt}}>Budget<span style={{color:S.acc}}>Pro</span></div>
        <div style={{fontSize:12,color:S.mut,marginTop:4}}>Gestion financière BABAR</div>
      </div>
      <Card style={{width:"100%",maxWidth:340}}>
        <div style={{fontSize:15,fontWeight:600,color:S.txt,marginBottom:14}}>Connexion</div>
        {d.users.map(u=><button key={u.id} onClick={()=>{setSel(u.id);setErr("");}}
          style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:12,width:"100%",
            border:sel===u.id?`2px solid ${S.acc}`:`1px solid ${S.brd}`,marginBottom:8,
            background:sel===u.id?"rgba(129,140,248,0.08)":"transparent",cursor:"pointer"}}>
          <div style={{width:36,height:36,borderRadius:"50%",flexShrink:0,
            background:`linear-gradient(135deg,${S.acc2},${S.acc})`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:14,fontWeight:700,color:"#fff"}}>{u.nom[0]}</div>
          <div style={{textAlign:"left",flex:1}}>
            <div style={{fontSize:14,fontWeight:600,color:S.txt}}>{u.nom}</div>
            <div style={{fontSize:11,color:S.mut}}>{u.role==="admin"?<span style={{color:S.acc}}>Admin</span>:"Utilisateur"}</div>
          </div>
          {u.role==="admin"&&<Lock size={14} color={S.acc}/>}
        </button>)}
        {sel&&<div style={{marginTop:8,marginBottom:14}}>
          <label style={{display:"block",fontSize:10,fontWeight:700,color:S.mut,textTransform:"uppercase",letterSpacing:1.2,marginBottom:5}}>Code PIN</label>
          <div style={{position:"relative"}}>
            <input type={show?"text":"password"} value={pin} onChange={e=>setPin(e.target.value)}
              placeholder="••••" maxLength={6} onKeyDown={e=>e.key==="Enter"&&go()}
              style={{width:"100%",padding:"12px 44px 12px 14px",borderRadius:10,
                background:"rgba(255,255,255,0.06)",border:`1px solid ${S.brd}`,
                color:S.txt,fontSize:18,letterSpacing:6,outline:"none",boxSizing:"border-box",textAlign:"center"}}/>
            <button onClick={()=>setShow(!show)} style={{position:"absolute",right:10,top:"50%",
              transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer"}}>
              {show?<EyeOff size={16} color={S.mut}/>:<Eye size={16} color={S.mut}/>}</button>
          </div>
          {err&&<div style={{color:S.red,fontSize:12,marginTop:6}}>{err}</div>}
        </div>}
        <Btn onClick={go} disabled={!sel} style={{width:"100%",justifyContent:"center",marginTop:4}}>
          <Lock size={15}/> Se connecter</Btn>
      </Card>
    </div>;
  }

  /* ═══ NAV ITEMS ═══ */
  const navItems=[
    {key:"solde",icon:Wallet,label:"Solde"},
    {key:"saisie",icon:Plus,label:"Saisie"},
    {key:"babar",icon:Building2,label:"BABAR"},
    {key:"stats",icon:BarChart3,label:"Stats"},
    {key:"rapport",icon:FileText,label:"Rapport"},
  ];

  /* ═══ SOLDE TAB ═══ */
  function TabSolde(){
    const [per,setPer]=useState("tout");
    const f=useMemo(()=>{const n=new Date();let fr=new Date(1999,0,1);
      if(per==="jour"){fr=new Date(n);fr.setHours(0,0,0,0);}
      else if(per==="sem"){fr=new Date(n);fr.setDate(fr.getDate()-7);}
      else if(per==="mois"){fr=new Date(n);fr.setMonth(fr.getMonth()-1);}
      else if(per==="an"){fr=new Date(n);fr.setFullYear(fr.getFullYear()-1);}
      const fd=data.depenses.filter(d=>new Date(d.date)>=fr);
      const fv=data.revenus.filter(r=>new Date(r.date)>=fr);
      return{tR:fv.reduce((a,r)=>a+(Number(r.montant)||0),0),tD:fd.reduce((a,d)=>a+(Number(d.montant)||0),0)};
    },[data,per]);
    const bgt=data.budgets[0];const bp=bgt?((totalD/bgt.total)*100).toFixed(1):0;

    return <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {[["tout","Tout"],["jour","Jour"],["sem","Semaine"],["mois","Mois"],["an","Année"]].map(([k,l])=>
          <button key={k} onClick={()=>setPer(k)} style={{padding:"6px 12px",borderRadius:18,border:"none",
            fontSize:12,fontWeight:500,background:per===k?"rgba(129,140,248,0.2)":"rgba(255,255,255,0.04)",
            color:per===k?S.acc:S.mut,cursor:"pointer"}}>{l}</button>)}
      </div>
      <Card><Ring solde={f.tR-f.tD} recettes={f.tR} depenses={f.tD}/></Card>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Card style={{textAlign:"center",padding:12}}>
          <ArrowUpRight size={16} color={S.grn}/><div style={{fontSize:10,color:S.mut,margin:"3px 0"}}>Recettes</div>
          <div style={{fontSize:16,fontWeight:700,color:S.grn}}>{fmt(f.tR)} <span style={{fontSize:9,color:S.dim}}>DA</span></div>
        </Card>
        <Card style={{textAlign:"center",padding:12}}>
          <ArrowDownRight size={16} color={S.red}/><div style={{fontSize:10,color:S.mut,margin:"3px 0"}}>Dépenses</div>
          <div style={{fontSize:16,fontWeight:700,color:S.red}}>{fmt(f.tD)} <span style={{fontSize:9,color:S.dim}}>DA</span></div>
        </Card>
      </div>
      {bgt&&<Card>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <Building2 size={15} color={S.acc}/><span style={{fontSize:14,fontWeight:700,color:S.txt}}>Budget {bgt.nom}</span>
          <Badge>{bp}%</Badge></div>
        <div style={{fontSize:11,color:S.mut,marginBottom:8}}>{fmtFull(bgt.total)} DA · {bgt.apparts} apparts</div>
        <div style={{background:"rgba(255,255,255,0.05)",borderRadius:7,height:7,overflow:"hidden",marginBottom:5}}>
          <div style={{height:"100%",borderRadius:7,width:`${Math.min(bp,100)}%`,
            background:bp>80?"linear-gradient(90deg,#f59e0b,#f43f5e)":`linear-gradient(90deg,${S.acc2},${S.acc})`,
            transition:"width 1s ease"}}/></div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:S.dim}}>
          <span>Dépensé: {fmt(totalD)} DA</span><span>Restant: {fmt(bgt.total-totalD)} DA</span></div>
      </Card>}
      <Card>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <Users size={15} color={S.acc}/><span style={{fontSize:13,fontWeight:600,color:S.txt}}>Comptes</span></div>
        {data.users.map(u=>{const pR=data.revenus.filter(r=>r.personne===u.nom).reduce((a,r)=>a+(Number(r.montant)||0),0);
          const pD=data.depenses.filter(d=>d.personne===u.nom).reduce((a,d)=>a+(Number(d.montant)||0),0);const pS=pR-pD;
          return <div key={u.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
            padding:"9px 11px",borderRadius:11,background:"rgba(255,255,255,0.02)",border:`1px solid rgba(255,255,255,0.04)`,marginBottom:5}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${S.acc2},${S.acc})`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{u.nom[0]}</div>
              <div><div style={{fontSize:12,fontWeight:600,color:S.txt}}>{u.nom}</div>
                <div style={{fontSize:10,color:S.dim}}>{u.email}</div></div></div>
            <div style={{fontSize:13,fontWeight:700,color:pS>=0?S.grn:S.red}}>{fmtFull(pS)} DA</div>
          </div>;})}
      </Card>
      <Card>
        <div style={{fontSize:13,fontWeight:600,color:S.txt,marginBottom:8}}>Dernières transactions</div>
        {[...data.depenses.map(d=>({...d,_t:"d"})),...data.revenus.map(r=>({...r,_t:"r"}))]
          .sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5).map((t,i)=>
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"8px 0",borderBottom:i<4?`1px solid rgba(255,255,255,0.03)`:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:28,height:28,borderRadius:7,
                background:t._t==="d"?"rgba(244,63,94,0.1)":"rgba(16,185,129,0.1)",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                {t._t==="d"?<ArrowDownRight size={13} color={S.red}/>:<ArrowUpRight size={13} color={S.grn}/>}</div>
              <div><div style={{fontSize:11,fontWeight:500,color:S.txt}}>{t.categorie||t.source||"—"}</div>
                <div style={{fontSize:9,color:S.dim}}>{t.date} {t.lieu?`· ${t.lieu}`:""}</div></div></div>
            <span style={{fontSize:12,fontWeight:600,color:t._t==="d"?S.red:S.grn}}>
              {t._t==="d"?"-":"+"}{fmtFull(Number(t.montant))} DA</span>
          </div>)}
        {data.depenses.length===0&&data.revenus.length===0&&
          <div style={{textAlign:"center",padding:14,color:S.dim,fontSize:11}}>Aucune transaction</div>}
      </Card>
    </div>;
  }

  /* ═══ SAISIE TAB ═══ */
  function TabSaisie(){
    const [mode,setMode]=useState("dep");
    const [form,setForm]=useState({date:today(),categorie:"",source:"",lieu:"",montant:"",commentaire:"",personne:user?.nom||"Nejmeddine"});
    const [photos,setPhotos]=useState([]);
    const [editItem,setEditItem]=useState(null);
    const [editModal,setEditModal]=useState(false);
    const set=(k,v)=>setForm(p=>({...p,[k]:v}));

    const handleSave=()=>{
      if(mode==="dep"&&(!form.montant||!form.categorie)){showT("Catégorie et montant requis","error");return;}
      if(mode==="rev"&&(!form.montant||!form.source)){showT("Source et montant requis","error");return;}
      const entry={...form,id:uid(),montant:Number(form.montant),photoIds:photos.map(p=>p.id)};
      let nd={...data};const np={...data.photos};
      photos.forEach(p=>{np[p.id]=p.data;});nd.photos=np;
      if(mode==="dep")nd.depenses=[...data.depenses,entry];else nd.revenus=[...data.revenus,entry];
      persist(nd);
      setForm({date:today(),categorie:"",source:"",lieu:"",montant:"",commentaire:"",personne:user?.nom||"Nejmeddine"});
      setPhotos([]);showT(mode==="dep"?"Dépense enregistrée !":"Revenu enregistré !");
    };

    const handleEdit=upd=>{
      let nd={...data};
      if(upd._t==="d")nd.depenses=data.depenses.map(d=>d.id===upd.id?{...upd}:d);
      else nd.revenus=data.revenus.map(r=>r.id===upd.id?{...upd}:r);
      persist(nd);setEditModal(false);setEditItem(null);showT("Modifié !");
    };

    const handleDel=item=>{
      let nd={...data};
      if(item._t==="d")nd.depenses=data.depenses.filter(d=>d.id!==item.id);
      else nd.revenus=data.revenus.filter(r=>r.id!==item.id);
      persist(nd);showT("Supprimé");
    };

    const recent=useMemo(()=>{
      const items=mode==="dep"?data.depenses.map(d=>({...d,_t:"d"})):data.revenus.map(r=>({...r,_t:"r"}));
      if(!adm)return items.filter(i=>i.personne===user?.nom).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,10);
      return items.sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,15);
    },[data,mode,adm,user]);

    return <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:5,background:"rgba(255,255,255,0.03)",borderRadius:14,padding:4}}>
        <button onClick={()=>setMode("dep")} style={{flex:1,padding:"9px",borderRadius:11,border:"none",
          fontSize:13,fontWeight:600,cursor:"pointer",
          background:mode==="dep"?"rgba(244,63,94,0.15)":"transparent",
          color:mode==="dep"?S.red:S.mut}}>
          <TrendingDown size={14} style={{verticalAlign:"middle",marginRight:5}}/>Dépense</button>
        <button onClick={()=>setMode("rev")} style={{flex:1,padding:"9px",borderRadius:11,border:"none",
          fontSize:13,fontWeight:600,cursor:"pointer",
          background:mode==="rev"?"rgba(16,185,129,0.15)":"transparent",
          color:mode==="rev"?S.grn:S.mut}}>
          <TrendingUp size={14} style={{verticalAlign:"middle",marginRight:5}}/>Revenu</button>
      </div>
      <Card>
        <DateField label="Date" value={form.date} onChange={v=>set("date",v)}/>
        {mode==="dep"
          ?<SelectF label="Catégorie" value={form.categorie} onChange={v=>set("categorie",v)} options={CATS}/>
          :<SelectF label="Source" value={form.source} onChange={v=>set("source",v)} options={SOURCES}/>}
        <SelectF label="Lieu" value={form.lieu} onChange={v=>set("lieu",v)} options={LIEUX} placeholder="Optionnel..."/>
        <SelectF label="Personne" value={form.personne} onChange={v=>set("personne",v)} options={data.users.map(u=>u.nom)}/>
        <InputF label="Montant (DA)" type="number" value={form.montant} onChange={v=>set("montant",v)} placeholder="0"/>
        <TextArea label="Commentaire" value={form.commentaire} onChange={v=>set("commentaire",v)} placeholder="Note..."/>
        <PhotoCapture photos={photos} onChange={setPhotos}/>
        <Btn onClick={handleSave} variant={mode==="dep"?"primary":"success"}
          disabled={!form.montant||(mode==="dep"?!form.categorie:!form.source)}
          style={{width:"100%",justifyContent:"center"}}>
          <Save size={14}/> Enregistrer</Btn>
      </Card>
      <Card style={{padding:0}}>
        <div style={{padding:"10px 14px",borderBottom:`1px solid rgba(255,255,255,0.04)`}}>
          <span style={{fontSize:12,fontWeight:600,color:S.txt}}>Récent ({recent.length}){!adm?" — vos saisies":""}</span></div>
        {recent.map((it,i)=><div key={it.id} style={{display:"flex",justifyContent:"space-between",
          alignItems:"center",padding:"9px 12px",borderBottom:`1px solid rgba(255,255,255,0.02)`,
          background:i%2?"rgba(255,255,255,0.01)":"transparent"}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:2}}>
              <Badge color={it._t==="d"?S.red:S.grn}>{it.categorie||it.source}</Badge>
              {it.lieu&&<span style={{fontSize:9,color:S.dim}}>{it.lieu}</span>}</div>
            <div style={{fontSize:9,color:S.dim}}>{it.date} · {it.personne} {it.photoIds?.length?`· 📷${it.photoIds.length}`:""}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
            <span style={{fontSize:12,fontWeight:700,color:it._t==="d"?S.red:S.grn}}>
              {it._t==="d"?"-":"+"}{fmtFull(it.montant)} DA</span>
            {adm&&<button onClick={()=>{setEditItem(it);setEditModal(true);}}
              style={{background:"none",border:"none",cursor:"pointer",padding:2}}>
              <Edit3 size={12} color={S.acc}/></button>}
            {adm&&<button onClick={()=>handleDel(it)}
              style={{background:"none",border:"none",cursor:"pointer",padding:2}}>
              <Trash2 size={12} color="rgba(255,255,255,0.12)"/></button>}
          </div>
        </div>)}
        {recent.length===0&&<div style={{textAlign:"center",padding:16,color:S.dim,fontSize:11}}>Aucune saisie</div>}
      </Card>
      <Modal open={editModal} onClose={()=>{setEditModal(false);setEditItem(null);}} title="Modifier">
        {editItem&&<EditForm item={editItem} onSave={handleEdit} users={data.users}/>}
      </Modal>
    </div>;
  }

  function EditForm({item,onSave,users}){
    const [f,setF]=useState({...item});const set=(k,v)=>setF(p=>({...p,[k]:v}));
    return <div>
      <DateField label="Date" value={f.date} onChange={v=>set("date",v)}/>
      {f._t==="d"?<SelectF label="Catégorie" value={f.categorie} onChange={v=>set("categorie",v)} options={CATS}/>
        :<SelectF label="Source" value={f.source} onChange={v=>set("source",v)} options={SOURCES}/>}
      <SelectF label="Lieu" value={f.lieu} onChange={v=>set("lieu",v)} options={LIEUX}/>
      <SelectF label="Personne" value={f.personne} onChange={v=>set("personne",v)} options={users.map(u=>u.nom)}/>
      <InputF label="Montant (DA)" type="number" value={String(f.montant)} onChange={v=>set("montant",Number(v))}/>
      <TextArea label="Commentaire" value={f.commentaire||""} onChange={v=>set("commentaire",v)}/>
      <Btn onClick={()=>onSave(f)} style={{width:"100%",justifyContent:"center"}}><Check size={14}/> Sauvegarder</Btn>
    </div>;
  }

  /* ═══ BABAR 50 TAB ═══ */
  function TabBabar(){
    const [showAdd,setShowAdd]=useState(false);
    const [form,setForm]=useState({date:today(),label:"",credit:"",debit:"",commentaire:""});
    const set=(k,v)=>setForm(p=>({...p,[k]:v}));

    const entries=(data.babar50||[]).sort((a,b)=>new Date(a.date)-new Date(b.date));
    let cum=0;const rows=entries.map(e=>{const c=Number(e.credit)||0,d=Number(e.debit)||0;cum+=c-d;return{...e,cum};});
    const tC=entries.reduce((a,e)=>a+(Number(e.credit)||0),0);
    const tDb=entries.reduce((a,e)=>a+(Number(e.debit)||0),0);

    const handleAdd=()=>{
      if(!form.label||(!form.credit&&!form.debit)){showT("Libellé et montant requis","error");return;}
      const nd={...data,babar50:[...(data.babar50||[]),{...form,id:uid(),credit:Number(form.credit)||0,debit:Number(form.debit)||0}]};
      persist(nd);setForm({date:today(),label:"",credit:"",debit:"",commentaire:""});setShowAdd(false);showT("Écriture ajoutée !");
    };

    const genReport=()=>{
      let t=`═══ BABAR 50 — Situation au ${new Date().toLocaleDateString("fr-FR")} ═══\n\n`;
      t+=`Budget total: ${fmtFull(data.budgets[0]?.total||0)} DA\nCrédit: ${fmtFull(tC)} DA\nDébit: ${fmtFull(tDb)} DA\nSolde: ${fmtFull(tC-tDb)} DA\n\n`;
      t+=`${"Date".padEnd(12)}${"Libellé".padEnd(25)}${"Crédit".padEnd(14)}${"Débit".padEnd(14)}${"Solde".padEnd(14)}\n${"─".repeat(80)}\n`;
      rows.forEach(r=>{t+=`${r.date.padEnd(12)}${(r.label||"").slice(0,24).padEnd(25)}${(r.credit?fmtFull(r.credit):"").padEnd(14)}${(r.debit?fmtFull(r.debit):"").padEnd(14)}${fmtFull(r.cum)}\n`;});
      t+=`${"─".repeat(80)}\n${"TOTAUX".padEnd(37)}${fmtFull(tC).padEnd(14)}${fmtFull(tDb).padEnd(14)}${fmtFull(tC-tDb)}\n`;
      if(navigator.share){navigator.share({title:"BABAR 50",text:t}).catch(()=>{navigator.clipboard.writeText(t);showT("Copié !");});}
      else{try{navigator.clipboard.writeText(t);showT("Rapport copié !");}catch{showT("Erreur","error");}}
    };

    return <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:17,fontWeight:700,color:S.txt}}>
          <Building2 size={18} color={S.acc} style={{verticalAlign:"middle",marginRight:7}}/>BABAR 50</div>
        <div style={{display:"flex",gap:5}}>
          <Btn onClick={genReport} variant="outline" style={{padding:"7px 11px",fontSize:11}}>
            <Share2 size={12}/> Envoyer</Btn>
          {adm&&<Btn onClick={()=>setShowAdd(!showAdd)} style={{padding:"7px 11px",fontSize:11}}>
            <Plus size={12}/></Btn>}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        <Card style={{textAlign:"center",padding:10}}><div style={{fontSize:9,color:S.mut}}>Crédit</div>
          <div style={{fontSize:14,fontWeight:700,color:S.grn}}>{fmt(tC)}</div></Card>
        <Card style={{textAlign:"center",padding:10}}><div style={{fontSize:9,color:S.mut}}>Débit</div>
          <div style={{fontSize:14,fontWeight:700,color:S.red}}>{fmt(tDb)}</div></Card>
        <Card style={{textAlign:"center",padding:10}}><div style={{fontSize:9,color:S.mut}}>Solde</div>
          <div style={{fontSize:14,fontWeight:700,color:tC-tDb>=0?S.grn:S.red}}>{fmt(tC-tDb)}</div></Card>
      </div>
      {showAdd&&<Card style={{border:"1px solid rgba(129,140,248,0.2)"}}>
        <div style={{fontSize:13,fontWeight:600,color:S.txt,marginBottom:10}}>Nouvelle écriture</div>
        <DateField label="Date" value={form.date} onChange={v=>set("date",v)}/>
        <InputF label="Libellé" value={form.label} onChange={v=>set("label",v)} placeholder="Description..."/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <InputF label="Crédit (DA)" type="number" value={form.credit} onChange={v=>set("credit",v)} placeholder="0"/>
          <InputF label="Débit (DA)" type="number" value={form.debit} onChange={v=>set("debit",v)} placeholder="0"/>
        </div>
        <TextArea label="Note" value={form.commentaire} onChange={v=>set("commentaire",v)}/>
        <Btn onClick={handleAdd} style={{width:"100%",justifyContent:"center"}}><Save size={13}/> Ajouter</Btn>
      </Card>}
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"10px 12px",borderBottom:`1px solid rgba(255,255,255,0.04)`,background:"rgba(129,140,248,0.04)"}}>
          <BookOpen size={13} style={{verticalAlign:"middle",marginRight:5}}/>
          <span style={{fontSize:12,fontWeight:700,color:S.txt}}>Livre comptable ({rows.length})</span></div>
        <div style={{display:"grid",gridTemplateColumns:"70px 1fr 72px 72px 80px",
          padding:"7px 8px",borderBottom:`1px solid rgba(255,255,255,0.05)`,fontSize:9,
          fontWeight:700,color:S.mut,textTransform:"uppercase",letterSpacing:0.7}}>
          <span>Date</span><span>Libellé</span><span style={{textAlign:"right"}}>Crédit</span>
          <span style={{textAlign:"right"}}>Débit</span><span style={{textAlign:"right"}}>Solde</span></div>
        {rows.map((r,i)=><div key={r.id} style={{display:"grid",gridTemplateColumns:"70px 1fr 72px 72px 80px",
          alignItems:"center",padding:"8px 8px",borderBottom:`1px solid rgba(255,255,255,0.02)`,
          background:i%2?"rgba(255,255,255,0.01)":"transparent",fontSize:11}}>
          <span style={{color:S.dim}}>{r.date.slice(5)}</span>
          <div style={{display:"flex",alignItems:"center",gap:3}}>
            <span style={{color:S.txt,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.label}</span>
            {adm&&<button onClick={()=>{const nd={...data,babar50:(data.babar50||[]).filter(e=>e.id!==r.id)};
              persist(nd);showT("Supprimé");}} style={{background:"none",border:"none",cursor:"pointer",padding:1,flexShrink:0}}>
              <Trash2 size={10} color="rgba(255,255,255,0.1)"/></button>}</div>
          <span style={{textAlign:"right",color:r.credit?S.grn:S.dim}}>{r.credit?fmtFull(r.credit):""}</span>
          <span style={{textAlign:"right",color:r.debit?S.red:S.dim}}>{r.debit?fmtFull(r.debit):""}</span>
          <span style={{textAlign:"right",fontWeight:600,color:r.cum>=0?S.grn:S.red}}>{fmtFull(r.cum)}</span>
        </div>)}
        {rows.length>0&&<div style={{display:"grid",gridTemplateColumns:"70px 1fr 72px 72px 80px",
          padding:"9px 8px",borderTop:`2px solid ${S.brd}`,fontSize:11,fontWeight:700}}>
          <span/><span style={{color:S.txt}}>TOTAUX</span>
          <span style={{textAlign:"right",color:S.grn}}>{fmtFull(tC)}</span>
          <span style={{textAlign:"right",color:S.red}}>{fmtFull(tDb)}</span>
          <span style={{textAlign:"right",color:tC-tDb>=0?S.grn:S.red}}>{fmtFull(tC-tDb)}</span></div>}
        {rows.length===0&&<div style={{textAlign:"center",padding:20,color:S.dim,fontSize:11}}>
          Aucune écriture{adm?" — cliquez + pour ajouter":""}</div>}
      </Card>
    </div>;
  }

  /* ═══ STATS TAB ═══ */
  function TabStats(){
    const [fL,setFL]=useState("");const [fP,setFP]=useState("");
    const fD=useMemo(()=>data.depenses.filter(d=>(!fL||d.lieu===fL)&&(!fP||d.personne===fP)),[data.depenses,fL,fP]);
    const fR=useMemo(()=>data.revenus.filter(r=>(!fL||r.lieu===fL)&&(!fP||r.personne===fP)),[data.revenus,fL,fP]);
    const chrono=useMemo(()=>{const m={};
      fD.forEach(d=>{const dt=new Date(d.date);const k=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`;
        if(!m[k])m[k]={month:k,recettes:0,depenses:0};m[k].depenses+=(Number(d.montant)||0);});
      fR.forEach(r=>{const dt=new Date(r.date);const k=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`;
        if(!m[k])m[k]={month:k,recettes:0,depenses:0};m[k].recettes+=(Number(r.montant)||0);});
      return Object.values(m).sort((a,b)=>a.month.localeCompare(b.month)).map(d=>({...d,
        label:MOIS_SHORT[parseInt(d.month.split("-")[1])-1]+d.month.slice(2,4)}));},[fD,fR]);
    const catD=useMemo(()=>{const m={};fD.forEach(d=>{const c=d.categorie||"Autre";m[c]=(m[c]||0)+(Number(d.montant)||0);});
      return Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value}));},[fD]);
    const tFD=fD.reduce((a,d)=>a+(Number(d.montant)||0),0);
    const CT=({active,payload,label})=>{if(!active||!payload)return null;
      return <div style={{background:"rgba(10,10,20,0.95)",border:`1px solid ${S.brd}`,borderRadius:10,padding:"7px 10px",fontSize:10}}>
        <div style={{fontWeight:600,color:S.txt,marginBottom:2}}>{label}</div>
        {payload.map((p,i)=><div key={i} style={{color:p.color}}>{p.name}: {fmtFull(p.value)} DA</div>)}</div>;};
    return <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{fontSize:17,fontWeight:700,color:S.txt}}>
        <BarChart3 size={18} color={S.acc} style={{verticalAlign:"middle",marginRight:7}}/>Statistiques</div>
      <Card style={{padding:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <SelectF label="Lieu" value={fL} onChange={setFL} options={LIEUX} placeholder="Tous"/>
          <SelectF label="Personne" value={fP} onChange={setFP} options={data.users.map(u=>u.nom)} placeholder="Tous"/>
        </div></Card>
      {chrono.length>0&&<Card>
        <div style={{fontSize:12,fontWeight:600,color:S.txt,marginBottom:10}}>Recettes vs Dépenses</div>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={chrono} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
            <XAxis dataKey="label" tick={{fill:S.mut,fontSize:9}} axisLine={false}/>
            <YAxis tick={{fill:S.dim,fontSize:8}} axisLine={false} tickFormatter={v=>fmt(v)} width={42}/>
            <Tooltip content={<CT/>}/>
            <Bar dataKey="recettes" name="Recettes" fill={S.red} radius={[3,3,0,0]}/>
            <Bar dataKey="depenses" name="Dépenses" fill={S.acc} radius={[3,3,0,0]}/>
          </BarChart></ResponsiveContainer></Card>}
      {catD.length>0&&<Card>
        <div style={{fontSize:12,fontWeight:600,color:S.txt,marginBottom:10}}>Classement dépenses</div>
        {catD.slice(0,10).map((c,i)=>{const p=tFD>0?(c.value/tFD*100):0;
          return <div key={c.name} style={{marginBottom:9}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:11}}>
              <span style={{color:S.txt,fontWeight:500}}>{c.name}</span>
              <span style={{color:S.mut}}>{p.toFixed(0)}% · {fmt(c.value)} DA</span></div>
            <div style={{background:"rgba(255,255,255,0.04)",borderRadius:5,height:6,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:5,width:`${p}%`,background:COLORS[i%COLORS.length],
                transition:"width 0.8s ease"}}/></div></div>;})}
      </Card>}
      {chrono.length===0&&catD.length===0&&<Card style={{textAlign:"center",padding:30}}>
        <BarChart3 size={32} color="rgba(255,255,255,0.08)"/><div style={{color:S.dim,fontSize:12,marginTop:8}}>Pas encore de données</div></Card>}
    </div>;
  }

  /* ═══ RAPPORT TAB ═══ */
  function TabRapport(){
    const [per,setPer]=useState("mois");const [cFrom,setCFrom]=useState("");const [cTo,setCTo]=useState("");
    const range=useMemo(()=>{const n=new Date();let fr=new Date(1999,0,1),to=n;
      if(per==="jour"){fr=new Date(n);fr.setHours(0,0,0,0);}
      else if(per==="sem"){fr=new Date(n);fr.setDate(fr.getDate()-7);}
      else if(per==="mois"){fr=new Date(n);fr.setMonth(fr.getMonth()-1);}
      else if(per==="an"){fr=new Date(n);fr.setFullYear(fr.getFullYear()-1);}
      else if(per==="custom"&&cFrom&&cTo){fr=new Date(cFrom);to=new Date(cTo);}
      return{fr,to};},[per,cFrom,cTo]);
    const rD=useMemo(()=>data.depenses.filter(d=>{const dt=new Date(d.date);return dt>=range.fr&&dt<=range.to;}),[data.depenses,range]);
    const rR=useMemo(()=>data.revenus.filter(r=>{const dt=new Date(r.date);return dt>=range.fr&&dt<=range.to;}),[data.revenus,range]);
    const tR=rR.reduce((a,r)=>a+(Number(r.montant)||0),0);
    const tD=rD.reduce((a,d)=>a+(Number(d.montant)||0),0);
    const catB=useMemo(()=>{const m={};rD.forEach(d=>{const c=d.categorie||"Autre";m[c]=(m[c]||0)+(Number(d.montant)||0);});
      return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[rD]);

    const share=async()=>{
      const fs=range.fr.toLocaleDateString("fr-FR"),ts=range.to.toLocaleDateString("fr-FR");
      let t=`📊 RAPPORT BUDGETPRO\nPériode: ${fs} → ${ts}\n${"─".repeat(30)}\n\n`;
      t+=`💰 Recettes: ${fmtFull(tR)} DA\n💸 Dépenses: ${fmtFull(tD)} DA\n📈 Solde: ${fmtFull(tR-tD)} DA\n\n`;
      t+=`── Dépenses par catégorie ──\n`;
      catB.forEach(([c,v])=>{t+=`• ${c}: ${fmtFull(v)} DA (${tD>0?(v/tD*100).toFixed(1):0}%)\n`;});
      t+=`\n── DÉPENSES (${rD.length}) ──\n`;
      rD.sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(d=>{
        t+=`${d.date} | ${d.categorie} | ${d.lieu||""} | ${fmtFull(d.montant)} DA | ${d.commentaire||""}\n`;});
      t+=`\n── REVENUS (${rR.length}) ──\n`;
      rR.sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(r=>{
        t+=`${r.date} | ${r.source} | ${r.personne} | ${fmtFull(r.montant)} DA | ${r.commentaire||""}\n`;});
      t+=`\n${"─".repeat(30)}\nGénéré le ${new Date().toLocaleString("fr-FR")}`;
      if(navigator.share){try{await navigator.share({title:"Rapport BudgetPro",text:t});}
        catch{try{await navigator.clipboard.writeText(t);showT("Copié !");}catch{}}}
      else{try{await navigator.clipboard.writeText(t);showT("Rapport copié !");}catch{showT("Erreur","error");}}
    };

    const exportExcel=()=>{
      const wb=XLSX.utils.book_new();
      // Dépenses sheet
      const depRows=data.depenses.map(d=>({DATE:d.date,CATEGORIE:d.categorie,MONTANT:d.montant,
        LIEU:d.lieu||"",NOTE:d.commentaire||"",PERSONNE:d.personne||""}));
      const wsDep=XLSX.utils.json_to_sheet(depRows);
      wsDep['!cols']=[{wch:12},{wch:25},{wch:12},{wch:25},{wch:40},{wch:15}];
      XLSX.utils.book_append_sheet(wb,wsDep,"DEPENSES");
      // Revenus sheet
      const revRows=data.revenus.map(r=>({DATE:r.date,SOURCE:r.source,MONTANT:r.montant,
        LIEU:r.lieu||"",NOTE:r.commentaire||"",PERSONNE:r.personne||""}));
      const wsRev=XLSX.utils.json_to_sheet(revRows);
      wsRev['!cols']=[{wch:12},{wch:18},{wch:12},{wch:20},{wch:40},{wch:15}];
      XLSX.utils.book_append_sheet(wb,wsRev,"REVENUS");
      // BABAR 50 sheet
      if(data.babar50?.length){
        const babRows=data.babar50.map(e=>({DATE:e.date,LIBELLE:e.label,CREDIT:e.credit||"",
          DEBIT:e.debit||"",NOTE:e.commentaire||""}));
        const wsBab=XLSX.utils.json_to_sheet(babRows);
        XLSX.utils.book_append_sheet(wb,wsBab,"BABAR50");
      }
      // Résumé sheet
      const resume=[
        {LABEL:"Total Recettes",VALEUR:totalR},
        {LABEL:"Total Dépenses",VALEUR:totalD},
        {LABEL:"Solde",VALEUR:solde},
        {LABEL:"Nb Dépenses",VALEUR:data.depenses.length},
        {LABEL:"Nb Revenus",VALEUR:data.revenus.length},
        {LABEL:"Date export",VALEUR:new Date().toLocaleDateString("fr-FR")},
      ];
      const wsRes=XLSX.utils.json_to_sheet(resume);
      XLSX.utils.book_append_sheet(wb,wsRes,"RESUME");
      XLSX.writeFile(wb,`BudgetPro_${today()}.xlsx`);
      showT("Excel exporté !");
    };

    const importFileRef=useRef();
    const handleImportExcel=async(e)=>{
      const file=e.target.files?.[0];if(!file)return;
      try{
        const buf=await file.arrayBuffer();
        const wb=XLSX.read(buf);
        let imported={dep:0,rev:0};
        let nd={...data};
        if(wb.SheetNames.includes("DEPENSES")){
          const rows=XLSX.utils.sheet_to_json(wb.Sheets["DEPENSES"]);
          const newDeps=rows.map(r=>({id:uid(),date:String(r.DATE||"").slice(0,10),
            categorie:r.CATEGORIE||"",montant:Number(r.MONTANT)||0,lieu:r.LIEU||"",
            commentaire:r.NOTE||"",personne:r.PERSONNE||user?.nom||"Nejmeddine"}));
          nd.depenses=[...nd.depenses,...newDeps];imported.dep=newDeps.length;
        }
        if(wb.SheetNames.includes("REVENUS")){
          const rows=XLSX.utils.sheet_to_json(wb.Sheets["REVENUS"]);
          const newRevs=rows.map(r=>({id:uid(),date:String(r.DATE||"").slice(0,10),
            source:r.SOURCE||"",montant:Number(r.MONTANT)||0,lieu:r.LIEU||"",
            commentaire:r.NOTE||"",personne:r.PERSONNE||user?.nom||"Nejmeddine"}));
          nd.revenus=[...nd.revenus,...newRevs];imported.rev=newRevs.length;
        }
        persist(nd);
        showT(`Importé : ${imported.dep} dépenses, ${imported.rev} revenus`);
      }catch(err){showT("Erreur import: "+err.message,"error");}
      e.target.value="";
    };

    return <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:17,fontWeight:700,color:S.txt}}>
          <FileText size={18} color={S.acc} style={{verticalAlign:"middle",marginRight:7}}/>Rapport</div>
        <div style={{display:"flex",gap:5}}>
          <Btn onClick={exportExcel} variant="outline" style={{padding:"8px 12px",fontSize:11}}>
            <Download size={13}/> Excel</Btn>
          <Btn onClick={share} style={{padding:"8px 12px",fontSize:12}}><Share2 size={13}/> Envoyer</Btn>
        </div>
      </div>
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
        {[["jour","Jour"],["sem","Semaine"],["mois","Mois"],["an","Année"],["custom","Période"]].map(([k,l])=>
          <button key={k} onClick={()=>setPer(k)} style={{padding:"6px 11px",borderRadius:16,border:"none",
            fontSize:11,fontWeight:500,background:per===k?"rgba(129,140,248,0.2)":"rgba(255,255,255,0.04)",
            color:per===k?S.acc:S.mut,cursor:"pointer"}}>{l}</button>)}
      </div>
      {per==="custom"&&<Card style={{padding:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <DateField label="Du" value={cFrom} onChange={setCFrom}/>
          <DateField label="Au" value={cTo} onChange={setCTo}/>
        </div></Card>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        <Card style={{textAlign:"center",padding:10}}>
          <ArrowUpRight size={15} color={S.grn}/><div style={{fontSize:9,color:S.mut,margin:"2px 0"}}>Recettes</div>
          <div style={{fontSize:14,fontWeight:700,color:S.grn}}>{fmt(tR)}</div></Card>
        <Card style={{textAlign:"center",padding:10}}>
          <ArrowDownRight size={15} color={S.red}/><div style={{fontSize:9,color:S.mut,margin:"2px 0"}}>Dépenses</div>
          <div style={{fontSize:14,fontWeight:700,color:S.red}}>{fmt(tD)}</div></Card>
        <Card style={{textAlign:"center",padding:10}}>
          <DollarSign size={15} color={tR-tD>=0?S.grn:S.red}/><div style={{fontSize:9,color:S.mut,margin:"2px 0"}}>Solde</div>
          <div style={{fontSize:14,fontWeight:700,color:tR-tD>=0?S.grn:S.red}}>{fmt(tR-tD)}</div></Card>
      </div>
      {catB.length>0&&<Card>
        <div style={{fontSize:12,fontWeight:600,color:S.txt,marginBottom:10}}>Par catégorie</div>
        {catB.map(([c,v],i)=>{const p=tD>0?(v/tD*100):0;
          return <div key={c} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",
            borderBottom:i<catB.length-1?`1px solid rgba(255,255,255,0.03)`:"none",fontSize:12}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <div style={{width:9,height:9,borderRadius:2,background:COLORS[i%COLORS.length]}}/><span style={{color:S.txt}}>{c}</span></div>
            <span style={{color:S.mut,fontWeight:600}}>{p.toFixed(0)}% · {fmt(v)} DA</span></div>;})}
      </Card>}
      <Card style={{padding:0}}>
        <div style={{padding:"9px 12px",borderBottom:`1px solid rgba(255,255,255,0.04)`}}>
          <span style={{fontSize:12,fontWeight:600,color:S.txt}}>Transactions ({rD.length+rR.length})</span></div>
        {[...rD.map(d=>({...d,_t:"d"})),...rR.map(r=>({...r,_t:"r"}))]
          .sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,30).map((t,i)=>
          <div key={t.id||i} style={{display:"flex",justifyContent:"space-between",padding:"7px 12px",
            borderBottom:`1px solid rgba(255,255,255,0.02)`,fontSize:11}}>
            <div style={{flex:1,minWidth:0}}>
              <span style={{color:S.txt,fontWeight:500}}>{t.categorie||t.source}</span>
              <span style={{color:S.dim,marginLeft:5}}>{t.date} · {t.lieu||""}</span></div>
            <span style={{fontWeight:600,color:t._t==="d"?S.red:S.grn,flexShrink:0}}>
              {t._t==="d"?"-":"+"}{fmtFull(t.montant)}</span></div>)}
        {rD.length===0&&rR.length===0&&<div style={{textAlign:"center",padding:16,color:S.dim,fontSize:11}}>Aucune transaction sur cette période</div>}
      </Card>

      {/* Import/Export section */}
      {adm&&<Card>
        <div style={{fontSize:13,fontWeight:600,color:S.txt,marginBottom:10}}>Gestion des données</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn onClick={exportExcel} variant="outline" style={{fontSize:12,padding:"9px 14px"}}>
            <Download size={14}/> Exporter Excel</Btn>
          <Btn onClick={()=>importFileRef.current?.click()} variant="ghost" style={{fontSize:12,padding:"9px 14px"}}>
            <Upload size={14}/> Importer Excel</Btn>
        </div>
        <div style={{fontSize:10,color:S.dim,marginTop:8}}>
          L'export génère un fichier avec 4 onglets : DEPENSES, REVENUS, BABAR50, RESUME.
          L'import lit les onglets DEPENSES et REVENUS et ajoute les données.
        </div>
        <input ref={importFileRef} type="file" accept=".xlsx,.xls" onChange={handleImportExcel} style={{display:"none"}}/>
      </Card>}
    </div>;
  }

  /* ═══ RENDER ═══ */
  return <div style={{minHeight:"100vh",background:S.bg,color:S.txt,
    fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",paddingBottom:76}}>
    <div style={{position:"sticky",top:0,zIndex:40,
      background:"linear-gradient(to bottom,rgba(6,6,17,0.98),rgba(6,6,17,0.9))",
      backdropFilter:"blur(20px)",borderBottom:`1px solid ${S.brd}`,padding:"11px 14px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Banknote size={16} color={S.acc}/>
          <span style={{fontSize:15,fontWeight:800}}>Budget<span style={{color:S.acc}}>Pro</span></span>
          {adm&&<Badge color={S.acc}>Admin</Badge>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{fontSize:16,fontWeight:800,color:solde>=0?S.grn:S.red}}>
            {fmtFull(solde)} <span style={{fontSize:9,fontWeight:400}}>DA</span></div>
          <button onClick={()=>setUser(null)} style={{background:"rgba(255,255,255,0.05)",
            border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            <LogOut size={13} color={S.mut}/></button>
        </div>
      </div>
    </div>
    <div style={{padding:"12px 12px 0"}}>
      {tab==="solde"&&<TabSolde/>}
      {tab==="saisie"&&<TabSaisie/>}
      {tab==="babar"&&<TabBabar/>}
      {tab==="stats"&&<TabStats/>}
      {tab==="rapport"&&<TabRapport/>}
    </div>
    {toast&&<div style={{position:"fixed",top:14,left:"50%",transform:"translateX(-50%)",zIndex:200,
      padding:"8px 16px",borderRadius:12,
      background:toast.type==="error"?"rgba(239,68,68,0.92)":"rgba(16,185,129,0.92)",
      color:"#fff",fontSize:12,fontWeight:600,boxShadow:"0 8px 30px rgba(0,0,0,0.3)",
      animation:"slideIn 0.3s ease"}}>
      {toast.type==="error"?<X size={12} style={{verticalAlign:"middle",marginRight:4}}/>
        :<Check size={12} style={{verticalAlign:"middle",marginRight:4}}/>}{toast.msg}</div>}
    <nav style={{position:"fixed",bottom:0,left:0,right:0,zIndex:50,
      background:"linear-gradient(to top,rgba(6,6,17,0.98),rgba(6,6,17,0.92))",
      backdropFilter:"blur(20px)",borderTop:`1px solid ${S.brd}`,
      display:"flex",padding:"3px 0 env(safe-area-inset-bottom,5px)"}}>
      {navItems.map(({key,icon:Icon,label})=>{const a=tab===key;
        return <button key={key} onClick={()=>setTab(key)} style={{flex:1,display:"flex",flexDirection:"column",
          alignItems:"center",gap:1,padding:"6px 0",background:"none",border:"none",
          color:a?S.acc:S.mut,transition:"all 0.2s",cursor:"pointer"}}>
          <div style={{padding:"3px 12px",borderRadius:16,background:a?"rgba(129,140,248,0.12)":"transparent"}}>
            <Icon size={18} strokeWidth={a?2.2:1.5}/></div>
          <span style={{fontSize:9,fontWeight:a?600:400}}>{label}</span>
        </button>;})}
    </nav>
    <style>{`
      @keyframes slideIn{from{opacity:0;transform:translateX(-50%) translateY(-10px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
      @keyframes slideUp{from{transform:translateY(100%);}to{transform:translateY(0);}}
      *{-webkit-tap-highlight-color:transparent;}
      ::-webkit-scrollbar{width:3px;height:3px;}
      ::-webkit-scrollbar-track{background:transparent;}
      ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:3px;}
    `}</style>
  </div>;
}
