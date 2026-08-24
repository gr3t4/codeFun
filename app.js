
const D=window.CODEFUN_DATA;
const CFG=window.CODEFUN_CONFIG||{};
const hasSupabase=!!(CFG.supabaseUrl&&CFG.supabaseAnonKey&&window.supabase);
const sb=hasSupabase?window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey):null;
const el=document.getElementById('app');
const DEMO_KEY='codefun-v10-demo';
const USERNAME_DOMAIN='@codefun.local';
function usernameToEmail(u){
 const v=String(u||'').trim().toLowerCase();
 return v.includes('@')?v:v+USERNAME_DOMAIN;
}
let app={mode:hasSupabase?'cloud':'demo',user:null,profile:null,view:'home',subject:'python',session:null,lesson:null,groups:[],students:[],progress:[],attempts:[],leaderboard:[],admin:{profiles:[],groups:[],members:[],progress:[]}};

const LEVELS=[
 {name:'Novato',min:0},
 {name:'Aprendiz',min:100},
 {name:'Practicante',min:300},
 {name:'Competente',min:600},
 {name:'Avanzado',min:1000},
 {name:'Experto',min:1500},
 {name:'Maestro',min:2500}
];
function levelFor(xp){
 let idx=0;
 for(let i=0;i<LEVELS.length;i++)if(xp>=LEVELS[i].min)idx=i;
 const cur=LEVELS[idx],next=LEVELS[idx+1];
 return {name:cur.name,number:idx+1,xp,min:cur.min,next,progress:next?pct(xp-cur.min,next.min-cur.min):100};
}
const BADGES=[
 {id:'first',name:'Primer paso',desc:'Responde tu primer ejercicio.',test:c=>c.done>=1},
 {id:'ten',name:'En marcha',desc:'Responde 10 ejercicios.',test:c=>c.done>=10},
 {id:'fifty',name:'Constante',desc:'Responde 50 ejercicios.',test:c=>c.done>=50},
 {id:'hundred',name:'Imparable',desc:'Responde 100 ejercicios.',test:c=>c.done>=100},
 {id:'streak3',name:'Racha de 3 días',desc:'Practica 3 días seguidos.',test:c=>c.streakBest>=3},
 {id:'streak7',name:'Racha de 7 días',desc:'Practica 7 días seguidos.',test:c=>c.streakBest>=7},
 {id:'accuracy',name:'Precisión de oro',desc:'90% de aciertos o más (mín. 20 ejercicios).',test:c=>c.done>=20&&pct(c.correct,c.done)>=90},
 {id:'python',name:'Python dominado',desc:'Completa todos los ejercicios de Python.',test:c=>c.pythonDone>=c.pythonTotal&&c.pythonTotal>0},
 {id:'logic',name:'Lógica dominada',desc:'Completa todos los ejercicios de Lógica.',test:c=>c.logicDone>=c.logicTotal&&c.logicTotal>0}
];
function badgeContext(){
 let done=0,correct=0,streakBest=0;
 const pythonTotal=exBySubject('python').length,logicTotal=exBySubject('logic').length;
 let pythonDone=0,logicDone=0;
 if(app.mode==='demo'){
   const d=demoState();done=Object.keys(d.answers).length;correct=Object.values(d.answers).filter(a=>a.correct).length;
   pythonDone=exBySubject('python').filter(e=>d.answers[e.id]).length;logicDone=exBySubject('logic').filter(e=>d.answers[e.id]).length;
 }else{
   done=app.progress.reduce((a,p)=>a+p.exercises_done,0);correct=app.progress.reduce((a,p)=>a+p.correct_answers,0);
   streakBest=app.profile?.streak_best||0;
   pythonDone=app.progress.find(p=>p.subject_id==='python')?.exercises_done||0;
   logicDone=app.progress.find(p=>p.subject_id==='logic')?.exercises_done||0;
 }
 return {done,correct,streakBest,pythonDone,pythonTotal,logicDone,logicTotal};
}

function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function shuffled(arr){
 const a=arr.slice();
 for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
 return a;
}
function pct(a,b){return b?Math.round(a/b*100):0}
function demoState(){return JSON.parse(localStorage.getItem(DEMO_KEY)||'null')||{answers:{},xp:0,role:null,name:''}}
function saveDemo(x){localStorage.setItem(DEMO_KEY,JSON.stringify(x))}
function exBySubject(id){return D.exercises.filter(e=>e.subject===id)}
function subjectsCards(){
 return Object.entries(D.subjects).map(([id,s])=>{
   let done=0,score=0;
   if(app.mode==='demo'){const d=demoState();const ids=exBySubject(id).map(x=>x.id);done=ids.filter(x=>d.answers[x]).length;let c=ids.filter(x=>d.answers[x]?.correct).length;score=pct(c,done)}
   else {const p=app.progress.find(x=>x.subject_id===id);done=p?.exercises_done||0;score=pct(p?.correct_answers||0,done)}
   return `<div class="c s6 subject" data-sub="${id}"><span class="badge">${s.short}</span><h3>${s.name}</h3><p class="muted">${s.description}</p><div class="progress"><span style="width:${pct(done,exBySubject(id).length)}%"></span></div><div class="row"><span class="muted">${done}/${exBySubject(id).length} ejercicios</span><b>${score||0}% aciertos</b></div></div>`
 }).join('')
}
function modeNotice(){
 return app.mode==='demo'?`<div class="notice">Modo demo: los datos se guardan solamente en este navegador. Para que el docente vea alumnos desde otros equipos, configura Supabase en <b>config.js</b>.</div>`:'';
}
function renderAuth(tab='login',msg=''){
 el.innerHTML=`<main class="login-only-page">
   <section class="login-only-wrap">
     <div class="login-logo">Code<span>Fun</span></div>
     <div class="login-subtitle">Plataforma académica de programación</div>

     <div class="login-card">
       <h2>${tab==='login'?'Iniciar sesión':'Crear cuenta de alumno'}</h2>
       <p class="muted">${tab==='login'?'Ingresa con tu cuenta para continuar aprendiendo.':'Regístrate para comenzar tu ruta académica.'}</p>

       ${msg?`<div class="notice ${msg.startsWith('Error')?'error':''}">${esc(msg)}</div>`:''}

       <div class="tabs">
         <button data-tab="login" class="${tab==='login'?'active':''}">Iniciar sesión</button>
         <button data-tab="signup" class="${tab==='signup'?'active':''}">Crear cuenta</button>
       </div>

       ${tab==='login'?`
       <form id="loginForm">
         <div class="field">
           <label>Usuario</label>
           <input name="username" required placeholder="tu.usuario" autocomplete="username">
         </div>

         <div class="field">
           <div class="login-label-row">
             <label>Contraseña</label>
             <button class="forgot-link" type="button" id="forgotPassword">¿Olvidaste tu contraseña?</button>
           </div>
           <input name="password" type="password" required minlength="6" placeholder="••••••••" autocomplete="current-password">
         </div>

         <button class="btn block login-main-btn">Iniciar sesión</button>
       </form>

       ${!hasSupabase?`<div class="notice demo-login">
         <b>Modo demo:</b><br>
         Docente: usuario <b>docente</b><br>
         Alumno: cualquier otro usuario<br>
         Contraseña: mínimo 6 caracteres
       </div>`:''}
       `:`
       <form id="signupForm">
         <div class="field"><label>Nombre completo</label><input name="full_name" required placeholder="Nombre y apellidos"></div>
         <div class="field"><label>Usuario</label><input name="username" required minlength="3" pattern="[A-Za-z0-9._\\-]+" title="Solo letras, números, punto, guion y guion bajo" placeholder="tu.usuario" autocomplete="username"></div>
         <div class="field"><label>Contraseña</label><input name="password" type="password" required minlength="6" placeholder="Mínimo 6 caracteres" autocomplete="new-password"></div>
         <div class="field"><label>Código de grupo <span class="muted">(opcional)</span></label><input name="group_code" placeholder="Ej. PB3102"></div>
         <button class="btn block login-main-btn">Crear cuenta</button>
       </form>`}

       <div class="login-footer">
         ${tab==='login'
           ? `¿No tienes cuenta? <button data-tab="signup" class="inline-auth-link">Crear cuenta de alumno</button>`
           : `¿Ya tienes cuenta? <button data-tab="login" class="inline-auth-link">Iniciar sesión</button>`}
       </div>
     </div>

     <div class="login-bottom">CodeFun · Apoyo académico para programación</div>
   </section>
 </main>`;

 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>renderAuth(b.dataset.tab));

 if(tab==='login'){
   document.getElementById('loginForm').onsubmit=login;
   const forgot=document.getElementById('forgotPassword');
   if(forgot) forgot.onclick=()=>alert('Para recuperar tu contraseña, comunícate con el administrador de CodeFun.');
 } else {
   document.getElementById('signupForm').onsubmit=signup;
 }
}
function authErrorMessage(error){
 const m=error?.message||'';
 if(m.includes('Invalid login credentials'))return 'Usuario o contraseña incorrectos.';
 if(m.includes('already registered')||m.includes('already exists')||m.includes('duplicate'))return 'Ese usuario ya existe, elige otro.';
 return m;
}
async function login(e){
 e.preventDefault();const f=new FormData(e.target),username=f.get('username'),password=f.get('password');
 if(app.mode==='demo'){
   const role=username.trim().toLowerCase()==='docente'?'teacher':'student';
   const d=demoState();d.role=role;d.name=role==='teacher'?'Docente Demo':'Alumno Demo';d.username=username;saveDemo(d);
   app.user={id:'demo',username};app.profile={id:'demo',full_name:d.name,username,role};app.view=role==='teacher'?'teacher':'home';return render();
 }
 const {data,error}=await sb.auth.signInWithPassword({email:usernameToEmail(username),password});
 if(error)return renderAuth('login','Error: '+authErrorMessage(error));
 await loadCloudSession(data.session);render();
}
async function signup(e){
 e.preventDefault();const f=new FormData(e.target);
 const username=String(f.get('username')||'').trim();
 if(app.mode==='demo'){
   const d=demoState();d.role='student';d.name=f.get('full_name');d.username=username;saveDemo(d);
   app.user={id:'demo',username};app.profile={id:'demo',full_name:d.name,username,role:'student'};app.view='home';render();return;
 }
 const password=f.get('password');
 const {data,error}=await sb.auth.signUp({email:usernameToEmail(username),password,options:{data:{full_name:f.get('full_name'),username}}});
 if(error)return renderAuth('signup','Error: '+authErrorMessage(error));
 if(!data.session)return renderAuth('login','Cuenta creada. Ahora inicia sesión.');
 await loadCloudSession(data.session);
 const code=String(f.get('group_code')||'').trim();
 if(code){const {error:ge}=await sb.rpc('join_group_by_code',{p_code:code});if(ge)alert('Cuenta creada, pero no se pudo unir al grupo: '+ge.message)}
 await refreshCloud();render();
}
async function logout(){
 if(app.mode==='cloud')await sb.auth.signOut();
 else {const d=demoState();d.role=null;saveDemo(d)}
 app.user=null;app.profile=null;renderAuth('login');
}
async function loadCloudSession(session){
 app.user=session?.user||null;if(!app.user)return;
 const {data,error}=await sb.from('profiles').select('*').eq('id',app.user.id).single();
 if(error){alert(error.message);return}
 app.profile=data;app.view=data.role==='teacher'?'teacher':data.role==='admin'?'admin':'home';await refreshCloud();
}
async function refreshCloud(){
 if(app.mode!=='cloud'||!app.profile)return;
 if(app.profile.role==='student'){
   let {data:p}=await sb.from('student_progress').select('*').eq('student_id',app.profile.id);app.progress=p||[];
   let {data:g}=await sb.from('group_members').select('group_id,school_groups(id,name,code,school_year)').eq('student_id',app.profile.id);app.groups=(g||[]).map(x=>x.school_groups).filter(Boolean);
   let {data:prof}=await sb.from('profiles').select('*').eq('id',app.profile.id).single();if(prof)app.profile=prof;
   if(app.groups[0]){const {data:lb}=await sb.rpc('group_leaderboard',{p_group_id:app.groups[0].id});app.leaderboard=lb||[]}else app.leaderboard=[];
 }else if(app.profile.role==='admin'){
   await loadAdminData();
 }else{
   let {data:g}=await sb.from('school_groups').select('*').eq('teacher_id',app.profile.id).order('created_at');app.groups=g||[];
   await loadTeacherStudents();
 }
}
async function loadAdminData(){
 const [profiles,groups,members,progress]=await Promise.all([
   sb.from('profiles').select('*').order('created_at'),
   sb.from('school_groups').select('*').order('created_at'),
   sb.from('group_members').select('*'),
   sb.from('student_progress').select('*')
 ]);
 app.admin={
   profiles:profiles.data||[],
   groups:groups.data||[],
   members:members.data||[],
   progress:progress.data||[]
 };
}
async function loadTeacherStudents(){
 if(app.mode!=='cloud'){app.students=demoStudents();return}
 if(!app.groups.length){app.students=[];return}
 const gids=app.groups.map(g=>g.id);
 const {data:m,error}=await sb.from('group_members').select('group_id,student_id,profiles!group_members_student_id_fkey(id,full_name)').in('group_id',gids);
 if(error){console.error(error);app.students=[];return}
 const ids=[...new Set((m||[]).map(x=>x.student_id))];
 let prog=[];if(ids.length){const r=await sb.from('student_progress').select('*').in('student_id',ids);prog=r.data||[]}
 app.students=(m||[]).map(x=>({group_id:x.group_id,...(x.profiles||{}),progress:prog.filter(p=>p.student_id===x.student_id)}));
}
function nav(){
 const student=[['home','Inicio'],['subjects','Materias'],['practice','Práctica'],['achievements','Logros'],['grades','Calificaciones'],['group','Mi grupo'],['profile','Mi perfil']];
 const teacher=[['teacher','Resumen'],['groups','Mis grupos'],['students','Alumnos'],['tracking','Seguimiento'],['teacherSubjects','Materias']];
 const admin=[['admin','Resumen'],['adminUsers','Cuentas'],['adminGroups','Grupos'],['teacherSubjects','Materias']];
 const role=app.profile?.role;
 return role==='admin'?admin:role==='teacher'?teacher:student;
}
function layout(content){
 const n=nav();
 const role=app.profile?.role;
 const roleTxt=roleLabel(role);
 const mobileNav=n.slice(0,4);

 el.innerHTML=`<div class="app-shell">
   <header class="mobile-topbar">
     <button class="icon-btn" id="mobileMenuBtn" aria-label="Abrir menú">${svgIcon('menu')}</button>
     <div class="mobile-brand">Code<span>Fun</span></div>
     <div class="mobile-avatar">${esc((app.profile?.full_name||'U').charAt(0).toUpperCase())}</div>
   </header>

   <div class="mobile-overlay" id="mobileOverlay"></div>

   <aside class="side" id="sideNav">
     <div class="side-head">
       <div class="logo">Code<span>Fun</span></div>
       <button class="icon-btn side-close" id="sideClose" aria-label="Cerrar menú">${svgIcon('close')}</button>
     </div>
     <div class="meta">${role==='admin'?'Panel administrador':role==='teacher'?'Panel docente':'Espacio del alumno'} · ${app.mode==='cloud'?'En línea':'Demo local'}</div>

     <div class="profile-card-mini">
       <div class="avatar">${esc((app.profile?.full_name||'U').charAt(0).toUpperCase())}</div>
       <div><b>${esc(app.profile?.full_name||'Usuario')}</b><div class="muted">${roleTxt}</div></div>
     </div>

     <div class="nav">${n.map(([v,l])=>`<button data-nav="${v}" class="${app.view===v?'active':''}"><span>${navIcon(v)}</span>${l}</button>`).join('')}</div>
     <div class="side-bottom"><button class="btn ghost block" id="logout">Cerrar sesión</button></div>
   </aside>

   <main class="main">
     <div class="desktop-top">
       <div><div class="page-eyebrow">${role==='admin'?'Panel administrador':role==='teacher'?'Panel docente':'Panel del alumno'}</div><b>CodeFun Académico</b></div>
       <div class="profile-chip">${roleTxt} · ${esc(app.profile?.username||app.user?.email||'')}</div>
     </div>
     ${modeNotice()}
     ${content}
   </main>

   <nav class="mobile-bottom-nav">
     ${mobileNav.map(([v,l])=>`<button data-nav="${v}" class="${app.view===v?'active':''}"><span>${navIcon(v)}</span><small>${l}</small></button>`).join('')}
     <button id="mobileMore"><span>${svgIcon('more')}</span><small>Más</small></button>
   </nav>
 </div>`;

 const side=document.getElementById('sideNav');
 const overlay=document.getElementById('mobileOverlay');
 const open=()=>{side?.classList.add('open');overlay?.classList.add('show');document.body.classList.add('menu-open')};
 const close=()=>{side?.classList.remove('open');overlay?.classList.remove('show');document.body.classList.remove('menu-open')};

 document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=async()=>{
   app.view=b.dataset.nav;app.session=null;close();
   if(app.profile?.role==='admin'&&app.mode==='cloud')await loadAdminData();
   render();
 });
 document.getElementById('logout').onclick=logout;
 document.getElementById('mobileMenuBtn')?.addEventListener('click',open);
 document.getElementById('mobileMore')?.addEventListener('click',open);
 document.getElementById('sideClose')?.addEventListener('click',close);
 overlay?.addEventListener('click',close);
}

const ICON_PATHS={
 home:'<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>',
 grid:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
 code:'<path d="M9 8 4.5 12 9 16"/><path d="M15 8l4.5 4-4.5 4"/>',
 star:'<path d="M12 3.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6-4.4-4.2 6-.8Z"/>',
 users:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6"/><circle cx="17.5" cy="9" r="2.6"/><path d="M15.5 14.2c2.6.3 4.5 2.4 4.5 5.3"/>',
 user:'<circle cx="12" cy="8.5" r="3.7"/><path d="M4.5 20c.7-4 3.6-6 7.5-6s6.8 2 7.5 6"/>',
 trending:'<path d="M4 16l5.2-5.5 3.6 3 6.2-6.8"/><path d="M15 6.5h4.5V11"/>',
 close:'<path d="M6 6l12 12M18 6 6 18"/>',
 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 more:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
 trophy:'<path d="M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M7 5H4.5A2.5 2.5 0 0 0 7 9"/><path d="M17 5h2.5A2.5 2.5 0 0 1 17 9"/><path d="M12 13v3"/><path d="M9 20h6"/><path d="M10.5 16h3l.5 2h-4l.5-2Z"/>'
};
function svgIcon(name){return `<svg class="icon" viewBox="0 0 24 24">${ICON_PATHS[name]||''}</svg>`}
function navIcon(v){
 const icons={home:'home',subjects:'grid',practice:'code',achievements:'trophy',grades:'star',group:'users',profile:'user',teacher:'home',groups:'grid',students:'users',tracking:'trending',teacherSubjects:'code',admin:'home',adminUsers:'users',adminGroups:'grid'};
 return svgIcon(icons[v]||'grid');
}
function studentHome(){
 let total=0,done=0,correct=0,xp=0;
 if(app.mode==='demo'){const d=demoState();total=260;done=Object.keys(d.answers).length;correct=Object.values(d.answers).filter(a=>a.correct).length;xp=d.xp||0}
 else {total=260;done=app.progress.reduce((a,p)=>a+p.exercises_done,0);correct=app.progress.reduce((a,p)=>a+p.correct_answers,0);xp=app.progress.reduce((a,p)=>a+p.xp,0)}
 const lvl=levelFor(xp);
 const streak=app.mode==='demo'?null:(app.profile?.streak_current||0);
 return `<section class="hero"><h1>Hola, ${esc((app.profile.full_name||'Alumno').split(' ')[0])} 👋</h1><p>Revisa tus materias, continúa practicando y consulta tu avance académico.</p></section>
 <div class="grid"><div class="c s3"><div class="muted">Ejercicios realizados</div><div class="metric">${done}</div></div><div class="c s3"><div class="muted">Precisión</div><div class="metric">${pct(correct,done)}%</div></div><div class="c s3"><div class="muted">Nivel ${lvl.number} · ${xp} XP</div><div class="metric" style="font-size:19px">${esc(lvl.name)}</div></div><div class="c s3"><div class="muted">${streak===null?'Grupo':'Racha'}</div><div class="metric" style="font-size:19px">${streak===null?esc(app.groups[0]?.name||'Sin grupo'):streak+' día'+(streak===1?'':'s')}</div></div>${subjectsCards()}</div>`;
}
function subjectsPage(){return `<h2>Mis materias</h2><p class="muted">Elige una materia para consultar sus unidades y practicar.</p><div class="grid">${subjectsCards()}</div>`}
function practicePage(){
 const s=D.subjects[app.subject];
 return `<div class="row"><div><h2>${s.name}</h2><div class="muted">${exBySubject(app.subject).length} ejercicios</div></div><button class="btn soft" id="switchSub">Cambiar a ${app.subject==='python'?'Lógica':'Python'}</button></div>
 <div class="grid">${s.units.map(u=>`<div class="c s6"><span class="badge">${u.id}</span><h3>${u.title}</h3><p class="muted">${u.topics.join(' · ')}</p>${u.topics.map(t=>`<button class="btn ghost" data-topic="${esc(t)}" style="margin:4px">${esc(t)}</button>`).join('')}</div>`).join('')}</div>`;
}
const PY_LESSONS={
 'Variables y operadores':{
   title:'Variables y operadores',
   body:`<p>Una <b>variable</b> guarda un valor con un nombre para poder usarlo después. Los <b>operadores aritméticos</b> combinan valores: <code>+</code> <code>-</code> <code>*</code> <code>/</code> (división con decimales), <code>//</code> (división entera) y <code>%</code> (residuo o resto).</p>
     <div class="code">x = 7
y = 2
print(x + y)   # 9
print(x // y)  # 3  división entera
print(x % y)   # 1  residuo</div>
     <p class="muted">Como en matemáticas, primero se resuelven los paréntesis, luego <code>* / // %</code>, y al final <code>+ -</code>.</p>`
 },
 'Tipos y entrada':{
   title:'Tipos de dato y entrada de datos',
   body:`<p>Python maneja varios tipos: <b>int</b> (enteros), <b>float</b> (decimales), <b>str</b> (texto) y <b>bool</b> (verdadero/falso). La función <code>input()</code> siempre devuelve <b>texto</b>, aunque la persona escriba un número.</p>
     <div class="code">edad = input('Edad: ')   # edad es str, aunque escribas 15
edad = int(edad)         # ahora sí es un número entero
print(edad + 1)</div>
     <p class="muted">Si olvidas convertir con <code>int()</code> o <code>float()</code>, no podrás sumar ese valor como número.</p>`
 },
 'Condicionales':{
   title:'Condicionales: if / elif / else',
   body:`<p><code>if</code> ejecuta su bloque solo si la condición es verdadera. <code>elif</code> prueba otra condición si la anterior fue falsa. <code>else</code> se ejecuta si ninguna de las anteriores fue verdadera. Python revisa las condiciones en orden, de arriba hacia abajo, y solo entra a la primera que sea verdadera.</p>
     <div class="code">n = -5
if n > 0:
    print('positivo')
elif n == 0:
    print('cero')
else:
    print('negativo')</div>`
 },
 'Ciclos':{
   title:'Ciclos: for y while',
   body:`<p><code>for</code> repite un bloque una cantidad conocida de veces, normalmente recorriendo <code>range(n)</code> o una lista. <code>while</code> repite mientras una condición siga siendo verdadera. <code>range(3)</code> genera los valores 0, 1 y 2: empieza en 0 y no incluye el número final.</p>
     <div class="code">for i in range(3):
    print(i)
# imprime: 0  1  2</div>`
 },
 'Funciones':{
   title:'Funciones',
   body:`<p><code>def</code> crea una función reutilizable. Los <b>parámetros</b> son los datos que recibe entre paréntesis; <code>return</code> entrega un resultado a quien la llamó. Si una función no tiene <code>return</code>, su resultado es <code>None</code>.</p>
     <div class="code">def cuadrado(n):
    return n * n

print(cuadrado(4))  # 16</div>`
 },
 'Listas':{
   title:'Listas',
   body:`<p>Una <b>lista</b> guarda varios valores en orden, entre corchetes <code>[ ]</code>. Cada elemento tiene una posición o <b>índice</b>, y en Python los índices <b>empiezan en 0</b>, no en 1.</p>
     <div class="code">datos = [10, 20, 30]
print(datos[0])   # 10 (primer elemento)
print(datos[1])   # 20 (segundo elemento)
print(len(datos)) # 3  (cuántos elementos hay)</div>`
 },
 'Depuración':{
   title:'Depuración: encontrar y corregir errores',
   body:`<p>Depurar es leer el código con cuidado para encontrar qué falla. Los errores más comunes al empezar: sumar texto con números sin convertir con <code>int()</code>/<code>float()</code>, indentación incorrecta, paréntesis sin cerrar, o usar <code>=</code> (asignar) en vez de <code>==</code> (comparar).</p>
     <div class="code">edad = input('Edad: ')
print(edad + 1)        # error: str + int

# corrección:
print(int(edad) + 1)</div>
     <p class="muted">Antes de ejecutar, lee línea por línea e imagina qué hace cada una.</p>`
 }
};
function openTopic(topic){
 const lesson=app.subject==='python'?PY_LESSONS[topic]:null;
 if(lesson){app.lesson=topic;render()}
 else startTopic(topic);
}
function lessonPage(){
 const topic=app.lesson,lesson=PY_LESSONS[topic];
 layout(`<div class="exercise">
   <div class="exercise-top">
     <button class="icon-btn" id="exitLesson" aria-label="Salir">${svgIcon('close')}</button>
     <div class="exercise-progress-wrap"><div class="muted small">Lección antes de practicar</div></div>
     <span class="badge">${esc(topic)}</span>
   </div>
   <div class="c exercise-card">
     <h2>${esc(lesson.title)}</h2>
     ${lesson.body}
     <button class="btn" id="startExercises" style="margin-top:16px">Comenzar ejercicios →</button>
   </div>
 </div>`);
 document.getElementById('exitLesson').onclick=()=>{app.lesson=null;app.view='practice';render()};
 document.getElementById('startExercises').onclick=()=>{app.lesson=null;startTopic(topic)};
}
function startTopic(topic){const ids=shuffled(D.exercises.filter(e=>e.subject===app.subject&&e.topic===topic).map(e=>e.id));app.session={ids,index:0,topic};renderExercise()}
function renderExercise(){
 const ss=app.session,ex=D.exercises.find(e=>e.id===ss.ids[ss.index]);
 if(!ex){app.session=null;app.view='practice';return render()}
 const opts=shuffled(ex.options);
 const prog=pct(ss.index,ss.ids.length);
 layout(`<div class="exercise">
   <div class="exercise-top">
     <button class="icon-btn" id="exitEx" aria-label="Salir">${svgIcon('close')}</button>
     <div class="exercise-progress-wrap">
       <div class="progress exercise-progress"><span style="width:${prog}%"></span></div>
       <div class="muted small">Ejercicio ${ss.index+1} de ${ss.ids.length}</div>
     </div>
     <span class="badge">${esc(ex.difficulty)}</span>
   </div>
   <div class="c exercise-card">
     <div class="exercise-meta"><span class="badge">${esc(ex.topic)}</span><span class="muted">${ex.id}</span></div>
     <div class="q">${esc(ex.prompt)}</div>
     ${ex.code?`<div class="code">${esc(ex.code)}</div>`:''}
     <div class="opts">${opts.map((o,i)=>`<button class="opt" data-answer="${encodeURIComponent(o)}"><span class="option-key">${String.fromCharCode(65+i)}</span><span>${esc(o)}</span></button>`).join('')}</div>
     <div id="feed"></div>
   </div>
 </div>`);
 document.getElementById('exitEx').onclick=()=>{app.session=null;app.view='practice';render()};
 document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>answerExercise(ex,decodeURIComponent(b.dataset.answer)));
}
function exerciseHint(ex){
 const topic=(ex.topic||'').toLowerCase();
 if(topic.includes('variables')||topic.includes('operadores')){
   return 'Identifica primero el valor de cada variable y después aplica el operador paso a paso. Revisa especialmente la diferencia entre +, -, *, /, // y %.';
 }
 if(topic.includes('tipos')||topic.includes('entrada')){
   return 'Piensa qué tipo de dato produce cada instrucción. Recuerda revisar si el dato necesita convertirse antes de realizar una operación numérica.';
 }
 if(topic.includes('condicional')){
   return 'Evalúa la condición desde arriba hacia abajo. Decide si cada comparación es verdadera o falsa antes de elegir qué bloque se ejecuta.';
 }
 if(topic.includes('ciclo')){
   return 'Determina el valor inicial, el límite y cuántas veces cambia la variable. Si aparece range(), escribe primero los valores que generaría.';
 }
 if(topic.includes('funcion')){
   return 'Localiza el argumento que recibe la función y sigue las instrucciones de su cuerpo hasta llegar a return.';
 }
 if(topic.includes('lista')){
   return 'Recuerda que en Python las posiciones de una lista comienzan en 0. Cuenta los elementos usando índices 0, 1, 2, ...';
 }
 if(topic.includes('depur')){
   return 'Revisa el código línea por línea: tipos de datos, operadores, paréntesis, indentación y conversiones. Busca qué instrucción no puede ejecutarse como está escrita.';
 }
 if(topic.includes('pensamiento lógico')){
   return 'Busca el patrón entre un elemento y el siguiente. Comprueba si se repite una suma, resta, multiplicación o cambio constante.';
 }
 if(topic.includes('entrada, proceso')||topic.includes('salida')){
   return 'Separa el problema en tres partes: datos que recibes, operación que realizas y resultado que debes mostrar.';
 }
 if(topic.includes('algoritmo')||topic.includes('pseudocódigo')){
   return 'Ordena mentalmente las acciones: primero comprende los datos, luego define los pasos y finalmente verifica el resultado.';
 }
 if(topic.includes('proposicional')){
   return 'Construye una pequeña tabla con los valores de P y Q y aplica únicamente el operador lógico indicado.';
 }
 if(topic.includes('decisiones')){
   return 'Sustituye la variable por el valor dado y evalúa literalmente la comparación antes de decidir el resultado.';
 }
 if(topic.includes('acumulador')){
   return 'Simula las primeras iteraciones en papel y observa cómo cambia el contador o acumulador en cada vuelta.';
 }
 return 'Lee nuevamente el enunciado, identifica los datos conocidos y resuelve una sola operación o decisión a la vez.';
}

async function answerExercise(ex,val){
 const correct=val===ex.answer,xp=correct?10:2;
 document.querySelectorAll('[data-answer]').forEach(x=>{
   x.disabled=true;
   const v=decodeURIComponent(x.dataset.answer);
   if(v===ex.answer)x.classList.add('correct');
   else if(v===val)x.classList.add('incorrect');
 });
 if(app.mode==='demo'){const d=demoState();if(!d.answers[ex.id]){d.answers[ex.id]={correct,value:val};d.xp=(d.xp||0)+xp;saveDemo(d)}}
 else{
   const {error}=await sb.rpc('record_attempt',{p_exercise_id:ex.id,p_subject_id:ex.subject,p_topic:ex.topic,p_answer:val,p_correct:correct,p_xp:xp});
   if(error)console.error(error);await refreshCloud();
 }
 const f=document.getElementById('feed');
 const help=exerciseHint(ex);
 f.innerHTML=`<div class="feedback ${correct?'good':'bad'}">
   <b>${correct?'¡Correcto!':'Aún no es correcto'}</b>
   <div>${correct?'Buen trabajo. Continúa con el siguiente ejercicio.':`<b>Pista:</b> ${esc(help)}`}</div>
 </div>
 <button class="btn" id="nextEx" style="margin-top:10px">${correct?'Continuar':'Intentar otro ejercicio'}</button>`;
 document.getElementById('nextEx').onclick=()=>{app.session.index++;renderExercise()};
}
function gradesPage(){
 return `<h2>Calificaciones y desempeño</h2><div class="grid">${Object.entries(D.subjects).map(([id,s])=>{
   let done=0,c=0;if(app.mode==='demo'){const d=demoState(),ids=exBySubject(id).map(x=>x.id);done=ids.filter(x=>d.answers[x]).length;c=ids.filter(x=>d.answers[x]?.correct).length}else{const p=app.progress.find(x=>x.subject_id===id);done=p?.exercises_done||0;c=p?.correct_answers||0}
   return `<div class="c s6"><h3>${s.name}</h3><div class="metric">${done?pct(c,done):'—'}</div><div class="muted">porcentaje de aciertos · ${done} intentos registrados</div></div>`}).join('')}</div>`;
}
function achievementsPage(){
 const ctx=badgeContext();
 const totalXp=app.mode==='demo'?(demoState().xp||0):app.progress.reduce((a,p)=>a+p.xp,0);
 const lvl=levelFor(totalXp);
 const streakCur=app.mode==='demo'?null:(app.profile?.streak_current||0);
 const streakBest=app.mode==='demo'?null:(app.profile?.streak_best||0);
 const earned=BADGES.filter(b=>b.test(ctx)),locked=BADGES.filter(b=>!b.test(ctx));
 const lb=app.mode==='demo'?[]:app.leaderboard,meId=app.mode==='demo'?null:app.profile.id;
 return `<h2>Logros</h2>
 <div class="grid">
   <div class="c s6">
     <div class="row"><span class="muted">Nivel ${lvl.number}</span><b>${esc(lvl.name)}</b></div>
     <div class="progress" style="margin:8px 0"><span style="width:${lvl.progress}%"></span></div>
     <div class="muted small">${lvl.next?`${lvl.xp-lvl.min} / ${lvl.next.min-lvl.min} XP hacia ${esc(lvl.next.name)}`:'Nivel máximo alcanzado'}</div>
   </div>
   <div class="c s6">
     <div class="row"><span class="muted">Racha actual</span><b>${streakCur===null?'—':streakCur+' día'+(streakCur===1?'':'s')}</b></div>
     <div class="row"><span class="muted">Mejor racha</span><b>${streakBest===null?'—':streakBest+' día'+(streakBest===1?'':'s')}</b></div>
     ${streakCur===null?'<div class="muted small">Disponible al conectar Supabase.</div>':''}
   </div>
 </div>

 <h3 style="margin-top:22px">Insignias <span class="muted">(${earned.length}/${BADGES.length})</span></h3>
 <div class="grid">
   ${earned.map(b=>`<div class="c s4"><span class="badge green">Obtenida</span><h3 style="margin-top:8px">${esc(b.name)}</h3><p class="muted">${esc(b.desc)}</p></div>`).join('')}
   ${locked.map(b=>`<div class="c s4" style="opacity:.55"><span class="badge">Bloqueada</span><h3 style="margin-top:8px">${esc(b.name)}</h3><p class="muted">${esc(b.desc)}</p></div>`).join('')}
 </div>

 <h3 style="margin-top:22px">Tabla de posiciones${app.groups[0]?` · ${esc(app.groups[0].name)}`:''}</h3>
 ${app.mode==='demo'?`<div class="c">Disponible al conectar Supabase y unirte a un grupo.</div>`
   :!app.groups[0]?`<div class="c">Únete a un grupo para ver la tabla de posiciones.</div>`
   :`<div class="c"><table class="table"><thead><tr><th>#</th><th>Alumno</th><th>XP</th></tr></thead><tbody>${lb.map((r,i)=>`<tr${r.student_id===meId?' style="font-weight:800"':''}><td>${i+1}</td><td>${esc(r.full_name)}${r.student_id===meId?' (tú)':''}</td><td>${r.xp}</td></tr>`).join('')||'<tr><td colspan="3" class="muted">Aún no hay datos.</td></tr>'}</tbody></table></div>`}`;
}
function groupPage(){
 const g=app.groups[0];
 return `<h2>Mi grupo</h2>${g?`<div class="c"><span class="badge">Inscrito</span><h3>${esc(g.name)}</h3><div class="row"><span>Código</span><b>${esc(g.code)}</b></div><div class="row"><span>Ciclo</span><b>${esc(g.school_year||'—')}</b></div></div>`:`<div class="c"><h3>Aún no estás en un grupo</h3><p class="muted">Escribe el código que te proporcionó tu docente.</p><form id="joinForm"><div class="field"><input name="code" required placeholder="Ej. PB3102"></div><button class="btn">Unirme al grupo</button></form></div>`}`;
}
function roleLabel(r){return r==='admin'?'Administrador':r==='teacher'?'Docente':'Alumno'}
function profilePage(){return `<h2>Mi perfil</h2><div class="c s6"><div class="field"><label>Nombre</label><input value="${esc(app.profile.full_name||'')}" disabled></div><div class="field"><label>Usuario</label><input value="${esc(app.profile.username||'')}" disabled></div><div class="field"><label>Rol</label><input value="${roleLabel(app.profile.role)}" disabled></div></div>`}
function demoStudents(){return[
 {id:'s1',full_name:'Sofía Martínez',progress:[{subject_id:'python',exercises_done:96,correct_answers:86,xp:910,last_activity:new Date().toISOString()},{subject_id:'logic',exercises_done:90,correct_answers:82,xp:850}]},
 {id:'s2',full_name:'Diego Hernández',progress:[{subject_id:'python',exercises_done:77,correct_answers:60,xp:680},{subject_id:'logic',exercises_done:80,correct_answers:65,xp:710}]},
 {id:'s3',full_name:'Valeria Reyes',progress:[{subject_id:'python',exercises_done:38,correct_answers:20,xp:330},{subject_id:'logic',exercises_done:45,correct_answers:27,xp:390}]},
 {id:'s4',full_name:'Ángel Torres',progress:[{subject_id:'python',exercises_done:24,correct_answers:11,xp:210},{subject_id:'logic',exercises_done:31,correct_answers:15,xp:260}]}
]}
function teacherHome(){
 const sts=app.mode==='demo'?demoStudents():app.students;let attention=sts.filter(s=>studentAvg(s)<60).length;
 return `<section class="hero"><h1>Panel docente</h1><p>Consulta grupos, estudiantes, actividad y avance académico desde un solo lugar.</p></section><div class="grid"><div class="c s3"><div class="muted">Grupos</div><div class="metric">${app.mode==='demo'?1:app.groups.length}</div></div><div class="c s3"><div class="muted">Alumnos</div><div class="metric">${sts.length}</div></div><div class="c s3"><div class="muted">Promedio de avance</div><div class="metric">${sts.length?Math.round(sts.reduce((a,s)=>a+studentCompletion(s),0)/sts.length):0}%</div></div><div class="c s3"><div class="muted">Requieren atención</div><div class="metric">${attention}</div></div><div class="c s12"><h3>Actividad reciente</h3>${sts.slice(0,5).map(s=>`<div class="row"><b>${esc(s.full_name)}</b><span class="badge ${studentAvg(s)<60?'redb':'green'}">${studentAvg(s)}% aciertos</span></div>`).join('')||'<div class="muted">Aún no hay alumnos inscritos.</div>'}</div></div>`;
}
function studentAvg(s){let done=(s.progress||[]).reduce((a,p)=>a+(p.exercises_done||0),0),c=(s.progress||[]).reduce((a,p)=>a+(p.correct_answers||0),0);return pct(c,done)}
function studentCompletion(s){let done=(s.progress||[]).reduce((a,p)=>a+(p.exercises_done||0),0);return Math.min(100,pct(done,260))}
function groupsPage(){
 const gs=app.mode==='demo'?[{id:'g1',name:'Programación 3102',code:'PB3102',school_year:'2026-2027'}]:app.groups;
 const countOf=gid=>app.mode==='demo'?demoStudents().length:app.students.filter(s=>s.group_id===gid).length;
 return `<div class="row"><div><h2>Mis grupos</h2><div class="muted">Crea un grupo y comparte su código con los alumnos.</div></div><button class="btn" id="newGroup">+ Crear grupo</button></div><div class="grid">${gs.map(g=>`<div class="c s6"><span class="badge">${esc(g.code)}</span><h3>${esc(g.name)}</h3><div class="row"><span>Ciclo escolar</span><b>${esc(g.school_year||'—')}</b></div><div class="row"><span>Alumnos inscritos</span><b>${countOf(g.id)}</b></div><button class="btn ghost block" style="margin-top:10px" data-view-group="${g.id}" data-view-group-name="${esc(g.name)}">Ver lista de alumnos</button></div>`).join('')||'<div class="c s12">Aún no has creado grupos.</div>'}</div>`;
}
function showGroupStudentsModal(gid,name){
 const sts=app.mode==='demo'?demoStudents():app.students.filter(s=>s.group_id===gid);
 el.insertAdjacentHTML('beforeend',`<div class="modal" id="modal"><div class="modal-card">
   <div class="row"><h3>${esc(name)}</h3><button class="btn ghost" id="closeModal" type="button">Cerrar</button></div>
   <p class="muted">${sts.length} alumno${sts.length===1?'':'s'} inscrito${sts.length===1?'':'s'}.</p>
   ${sts.map(s=>`<div class="row"><div><b>${esc(s.full_name)}</b></div><span class="badge ${studentAvg(s)<60?'redb':studentAvg(s)<75?'amber':'green'}">${studentCompletion(s)}% avance · ${studentAvg(s)}% aciertos</span></div>`).join('')||'<div class="muted">Aún no hay alumnos en este grupo.</div>'}
 </div></div>`);
 document.getElementById('closeModal').onclick=()=>document.getElementById('modal').remove();
}
function studentsByGroup(sts){
 const map={};
 sts.forEach(s=>{const gid=s.group_id||'none';(map[gid]=map[gid]||[]).push(s)});
 return map;
}
function teacherGroupLabel(gid){
 if(gid==='none')return 'Sin grupo asignado';
 const g=app.groups.find(x=>x.id===gid);
 return g?`${g.name} · ${g.code}`:'Grupo';
}
function studentsPage(){
 const sts=app.mode==='demo'?demoStudents():app.students;
 if(app.mode==='demo')return `<h2>Alumnos</h2><h3>Programación 3102 <span class="muted">(${sts.length})</span></h3><div class="c"><table class="table"><thead><tr><th>Alumno</th><th>Avance</th><th>Aciertos</th><th>Estado</th><th></th></tr></thead><tbody>${sts.map(s=>`<tr><td>${esc(s.full_name)}</td><td>${studentCompletion(s)}%</td><td>${studentAvg(s)}%</td><td><span class="badge ${studentAvg(s)<60?'redb':studentAvg(s)<75?'amber':'green'}">${studentAvg(s)<60?'Atención':studentAvg(s)<75?'En proceso':'Buen avance'}</span></td><td><button class="btn ghost" data-student="${s.id}">Ver</button></td></tr>`).join('')}</tbody></table></div>`;
 const byGroup=studentsByGroup(sts);
 const gids=Object.keys(byGroup);
 return `<h2>Alumnos</h2><p class="muted">${sts.length} alumno${sts.length===1?'':'s'} en ${app.groups.length} grupo${app.groups.length===1?'':'s'}.</p>
 ${gids.map(gid=>{
   const list=byGroup[gid];
   return `<h3 style="margin-top:22px">${esc(teacherGroupLabel(gid))} <span class="muted">(${list.length})</span></h3>
   <div class="c"><table class="table"><thead><tr><th>Alumno</th><th>Avance</th><th>Aciertos</th><th>Estado</th><th></th></tr></thead><tbody>${list.map(s=>`<tr><td>${esc(s.full_name)}</td><td>${studentCompletion(s)}%</td><td>${studentAvg(s)}%</td><td><span class="badge ${studentAvg(s)<60?'redb':studentAvg(s)<75?'amber':'green'}">${studentAvg(s)<60?'Atención':studentAvg(s)<75?'En proceso':'Buen avance'}</span></td><td><button class="btn ghost" data-student="${s.id}">Ver</button></td></tr>`).join('')}</tbody></table></div>`;
 }).join('')||'<div class="c">Aún no tienes alumnos inscritos en ningún grupo.</div>'}`;
}
function trackingPage(){
 const sts=app.mode==='demo'?demoStudents():app.students;
 const card=s=>`<div class="c s6"><div class="row"><b>${esc(s.full_name)}</b><b>${studentCompletion(s)}%</b></div>${Object.entries(D.subjects).map(([id,sub])=>{const p=(s.progress||[]).find(x=>x.subject_id===id)||{};return `<div class="row"><span>${sub.short}</span><span>${p.exercises_done||0} ejercicios · ${pct(p.correct_answers||0,p.exercises_done||0)}% aciertos</span></div>`}).join('')}</div>`;
 if(app.mode==='demo')return `<h2>Seguimiento académico</h2><div class="grid">${sts.map(card).join('')}</div>`;
 const byGroup=studentsByGroup(sts);
 const gids=Object.keys(byGroup);
 return `<h2>Seguimiento académico</h2>
 ${gids.map(gid=>`<h3 style="margin-top:22px">${esc(teacherGroupLabel(gid))} <span class="muted">(${byGroup[gid].length})</span></h3><div class="grid">${byGroup[gid].map(card).join('')}</div>`).join('')||'<div class="c">No hay datos de seguimiento todavía.</div>'}`;
}
function teacherSubjectsPage(){return `<h2>Materias</h2><div class="grid">${Object.entries(D.subjects).map(([id,s])=>`<div class="c s6"><span class="badge">${s.short}</span><h3>${s.name}</h3><p class="muted">${s.description}</p><div class="row"><span>Ejercicios</span><b>${exBySubject(id).length}</b></div><div class="row"><span>Unidades</span><b>${s.units.length}</b></div></div>`).join('')}</div>`}

function adminHome(){
 const P=app.admin.profiles,G=app.admin.groups,PR=app.admin.progress;
 const teachers=P.filter(p=>p.role==='teacher').length,students=P.filter(p=>p.role==='student').length,admins=P.filter(p=>p.role==='admin').length;
 const done=PR.reduce((a,p)=>a+(p.exercises_done||0),0),correct=PR.reduce((a,p)=>a+(p.correct_answers||0),0);
 return `<section class="hero"><h1>Panel administrador</h1><p>Visibilidad completa de docentes, alumnos, grupos y avance en todo CodeFun.</p></section>
 <div class="grid">
   <div class="c s3"><div class="muted">Docentes</div><div class="metric">${teachers}</div></div>
   <div class="c s3"><div class="muted">Alumnos</div><div class="metric">${students}</div></div>
   <div class="c s3"><div class="muted">Grupos</div><div class="metric">${G.length}</div></div>
   <div class="c s3"><div class="muted">Admins</div><div class="metric">${admins}</div></div>
   <div class="c s6"><div class="muted">Ejercicios respondidos (sistema)</div><div class="metric">${done}</div></div>
   <div class="c s6"><div class="muted">Precisión global</div><div class="metric">${pct(correct,done)}%</div></div>
 </div>`;
}
function groupNameFor(gid){return app.admin.groups.find(g=>g.id===gid)?.name||''}
function studentGroupOf(uid){const m=app.admin.members.find(x=>x.student_id===uid);return m?app.admin.groups.find(g=>g.id===m.group_id):null}
function adminUsersPage(){
 const roles=[['admin','Administradores'],['teacher','Docentes'],['student','Alumnos']];
 return `<h2>Cuentas</h2><p class="muted">Cambia el rol de cualquier cuenta. Los cambios se aplican de inmediato.</p>
 ${roles.map(([r,label])=>{
   const rows=app.admin.profiles.filter(p=>p.role===r);
   return `<h3 style="margin-top:22px">${label} <span class="muted">(${rows.length})</span></h3>
   <div class="c"><table class="table"><thead><tr><th>Nombre</th><th>Usuario</th>${r==='student'?'<th>Grupo</th>':''}<th>Rol</th><th></th></tr></thead><tbody>
   ${rows.map(p=>`<tr>
     <td>${esc(p.full_name||'—')}</td>
     <td>${esc(p.username||'—')}</td>
     ${r==='student'?`<td>${esc(studentGroupOf(p.id)?.name||'Sin grupo')}</td>`:''}
     <td><select data-role-user="${p.id}">
       <option value="student" ${p.role==='student'?'selected':''}>Alumno</option>
       <option value="teacher" ${p.role==='teacher'?'selected':''}>Docente</option>
       <option value="admin" ${p.role==='admin'?'selected':''}>Admin</option>
     </select></td>
     <td><button class="btn ghost" data-reset-pass="${p.id}" data-reset-name="${esc(p.full_name||p.username||'')}">Contraseña</button></td>
   </tr>`).join('')||`<tr><td colspan="5" class="muted">Sin cuentas.</td></tr>`}
   </tbody></table></div>`;
 }).join('')}`;
}
function adminGroupsPage(){
 const G=app.admin.groups;
 return `<h2>Grupos</h2><p class="muted">Todos los grupos creados por cualquier docente.</p>
 <div class="c"><table class="table"><thead><tr><th>Grupo</th><th>Código</th><th>Docente</th><th>Ciclo</th><th>Alumnos</th><th></th></tr></thead><tbody>
 ${G.map(g=>{
   const teacher=app.admin.profiles.find(p=>p.id===g.teacher_id);
   const count=app.admin.members.filter(m=>m.group_id===g.id).length;
   return `<tr><td>${esc(g.name)}</td><td>${esc(g.code)}</td><td>${esc(teacher?.full_name||'—')}</td><td>${esc(g.school_year||'—')}</td><td>${count}</td><td><button class="btn ghost" data-delete-group="${g.id}">Eliminar</button></td></tr>`;
 }).join('')||`<tr><td colspan="6" class="muted">Aún no hay grupos.</td></tr>`}
 </tbody></table></div>`;
}
async function changeUserRole(id,role){
 if(!confirm('¿Cambiar el rol de esta cuenta a "'+roleLabel(role)+'"?'))return render();
 const {error}=await sb.from('profiles').update({role}).eq('id',id);
 if(error){alert(error.message);return render()}
 await loadAdminData();render();
}
async function deleteGroup(id){
 if(!confirm('¿Eliminar este grupo? Los alumnos inscritos perderán su vínculo con él.'))return;
 const {error}=await sb.from('school_groups').delete().eq('id',id);
 if(error)return alert(error.message);
 await loadAdminData();render();
}
function showResetPasswordModal(userId,name){
 el.insertAdjacentHTML('beforeend',`<div class="modal" id="modal"><div class="modal-card">
   <div class="row"><h3>Nueva contraseña</h3><button class="btn ghost" id="closeModal" type="button">Cerrar</button></div>
   <p class="muted">Cuenta: <b>${esc(name)}</b>. Comparte la nueva contraseña con la persona por un medio seguro.</p>
   <form id="resetPassForm">
     <div class="field"><label>Contraseña nueva</label><input name="new_password" type="text" required minlength="6" placeholder="Mínimo 6 caracteres"></div>
     <button class="btn block" style="margin-top:8px">Guardar contraseña</button>
   </form>
   <div id="resetPassMsg"></div>
 </div></div>`);
 document.getElementById('closeModal').onclick=()=>document.getElementById('modal').remove();
 document.getElementById('resetPassForm').onsubmit=async(e)=>{
   e.preventDefault();
   const new_password=new FormData(e.target).get('new_password');
   const btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Guardando...';
   const {data,error}=await sb.functions.invoke('admin-reset-password',{body:{user_id:userId,new_password}});
   if(error||data?.error){
     document.getElementById('resetPassMsg').innerHTML=`<div class="notice error">${esc(data?.error||error.message)}</div>`;
     btn.disabled=false;btn.textContent='Guardar contraseña';return;
   }
   document.getElementById('resetPassMsg').innerHTML=`<div class="notice">Contraseña actualizada.</div>`;
   setTimeout(()=>document.getElementById('modal')?.remove(),1200);
 };
}
function studentDetail(id){
 const s=(app.mode==='demo'?demoStudents():app.students).find(x=>x.id===id);if(!s)return;
 el.insertAdjacentHTML('beforeend',`<div class="modal" id="modal"><div class="modal-card"><div class="row"><h3>${esc(s.full_name)}</h3><button class="btn ghost" id="closeModal">Cerrar</button></div><div class="row"><span>Avance total</span><b>${studentCompletion(s)}%</b></div><div class="row"><span>Precisión general</span><b>${studentAvg(s)}%</b></div>${Object.entries(D.subjects).map(([sid,sub])=>{const p=(s.progress||[]).find(x=>x.subject_id===sid)||{};return `<div class="c" style="margin-top:10px"><b>${sub.name}</b><div class="row"><span>Ejercicios</span><b>${p.exercises_done||0}</b></div><div class="row"><span>Aciertos</span><b>${pct(p.correct_answers||0,p.exercises_done||0)}%</b></div><div class="row"><span>XP</span><b>${p.xp||0}</b></div></div>`}).join('')}</div></div>`);
 document.getElementById('closeModal').onclick=()=>document.getElementById('modal').remove();
}
function randomGroupCode(){
 const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 let s='';for(let i=0;i<6;i++)s+=chars[Math.floor(Math.random()*chars.length)];
 return s;
}
function showCreateGroupModal(){
 if(app.mode==='demo')return alert('En modo demo el grupo PB3102 ya está creado. Con Supabase podrás crear grupos reales.');
 el.insertAdjacentHTML('beforeend',`<div class="modal" id="modal"><div class="modal-card">
   <div class="row"><h3>Crear grupo</h3><button class="btn ghost" id="closeModal" type="button">Cerrar</button></div>
   <form id="createGroupForm">
     <div class="field"><label>Nombre del grupo</label><input name="name" required placeholder="Ej. Programación 3102"></div>
     <div class="field"><label>Ciclo escolar</label><input name="school_year" placeholder="Ej. 2026-2027"></div>
     <div class="field">
       <div class="login-label-row"><label>Código de acceso</label><button type="button" class="forgot-link" id="genCode">Generar</button></div>
       <input name="code" required maxlength="12" placeholder="Ej. PB3102" value="${randomGroupCode()}">
     </div>
     <button class="btn block" style="margin-top:8px">Crear grupo</button>
   </form>
 </div></div>`);
 document.getElementById('closeModal').onclick=()=>document.getElementById('modal').remove();
 document.getElementById('genCode').onclick=()=>{document.querySelector('#createGroupForm input[name="code"]').value=randomGroupCode()};
 document.getElementById('createGroupForm').onsubmit=async(e)=>{
   e.preventDefault();const f=new FormData(e.target);
   const name=f.get('name'),year=f.get('school_year')||'',code=String(f.get('code')||'').trim().toUpperCase();
   if(!code)return;
   const {error}=await sb.from('school_groups').insert({name,code,school_year:year,teacher_id:app.profile.id});
   if(error)return alert(error.message);
   document.getElementById('modal')?.remove();
   await refreshCloud();render();
 };
}
async function joinGroup(e){
 e.preventDefault();const code=new FormData(e.target).get('code');
 if(app.mode==='demo'){app.groups=[{name:'Programación 3102',code,school_year:'2026-2027'}];render();return}
 const {error}=await sb.rpc('join_group_by_code',{p_code:code});if(error)return alert(error.message);await refreshCloud();render();
}
function wire(){
 document.querySelectorAll('[data-sub]').forEach(x=>x.onclick=()=>{app.subject=x.dataset.sub;app.view='practice';render()});
 const sw=document.getElementById('switchSub');if(sw)sw.onclick=()=>{app.subject=app.subject==='python'?'logic':'python';render()};
 document.querySelectorAll('[data-topic]').forEach(x=>x.onclick=()=>openTopic(x.dataset.topic));
 const jf=document.getElementById('joinForm');if(jf)jf.onsubmit=joinGroup;
 const ng=document.getElementById('newGroup');if(ng)ng.onclick=showCreateGroupModal;
 document.querySelectorAll('[data-student]').forEach(x=>x.onclick=()=>studentDetail(x.dataset.student));
 document.querySelectorAll('[data-view-group]').forEach(x=>x.onclick=()=>showGroupStudentsModal(x.dataset.viewGroup,x.dataset.viewGroupName));
 document.querySelectorAll('[data-role-user]').forEach(x=>x.onchange=()=>changeUserRole(x.dataset.roleUser,x.value));
 document.querySelectorAll('[data-delete-group]').forEach(x=>x.onclick=()=>deleteGroup(x.dataset.deleteGroup));
 document.querySelectorAll('[data-reset-pass]').forEach(x=>x.onclick=()=>showResetPasswordModal(x.dataset.resetPass,x.dataset.resetName));
}
function render(){
 if(!app.profile)return renderAuth('login');
 if(app.session)return renderExercise();
 let c='';
 if(app.profile.role==='admin'){
   if(app.view==='admin')c=adminHome();else if(app.view==='adminUsers')c=adminUsersPage();else if(app.view==='adminGroups')c=adminGroupsPage();else c=teacherSubjectsPage();
 }else if(app.profile.role==='teacher'){
   if(app.view==='teacher')c=teacherHome();else if(app.view==='groups')c=groupsPage();else if(app.view==='students')c=studentsPage();else if(app.view==='tracking')c=trackingPage();else c=teacherSubjectsPage();
 }else{
   if(app.lesson)return lessonPage();
   if(app.view==='home')c=studentHome();else if(app.view==='subjects')c=subjectsPage();else if(app.view==='practice')c=practicePage();else if(app.view==='achievements')c=achievementsPage();else if(app.view==='grades')c=gradesPage();else if(app.view==='group')c=groupPage();else c=profilePage();
 }
 layout(c);wire();
}
async function init(){
 if(app.mode==='cloud'){
   const {data:{session}}=await sb.auth.getSession();
   if(session)await loadCloudSession(session);
   sb.auth.onAuthStateChange((_event,session)=>{if(!session){app.user=null;app.profile=null;renderAuth('login')}});
 }else{
   const d=demoState();if(d.role){app.user={id:'demo',username:d.username||(d.role==='teacher'?'docente':'alumno')};app.profile={id:'demo',full_name:d.name||'Usuario Demo',username:d.username,role:d.role};app.view=d.role==='teacher'?'teacher':'home';if(d.role==='teacher')app.students=demoStudents()}
 }
 render();
}
if('serviceWorker' in navigator && location.protocol.startsWith('http'))navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
init();
