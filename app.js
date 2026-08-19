
const D=window.CODEFUN_DATA;
const CFG=window.CODEFUN_CONFIG||{};
const hasSupabase=!!(CFG.supabaseUrl&&CFG.supabaseAnonKey&&window.supabase);
const sb=hasSupabase?window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey):null;
const el=document.getElementById('app');
const DEMO_KEY='codefun-v10-demo';
let app={mode:hasSupabase?'cloud':'demo',user:null,profile:null,view:'home',subject:'python',session:null,groups:[],students:[],progress:[],attempts:[]};

function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function pct(a,b){return b?Math.round(a/b*100):0}
function demoState(){return JSON.parse(localStorage.getItem(DEMO_KEY)||'null')||{answers:{},xp:0,role:null,name:'',control:''}}
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
           <label>Correo electrónico</label>
           <input name="email" type="email" required placeholder="alumno@escuela.edu.mx">
         </div>

         <div class="field">
           <div class="login-label-row">
             <label>Contraseña</label>
             <button class="forgot-link" type="button" id="forgotPassword">¿Olvidaste tu contraseña?</button>
           </div>
           <input name="password" type="password" required minlength="6" placeholder="••••••••">
         </div>

         <button class="btn block login-main-btn">Iniciar sesión</button>
       </form>

       ${!hasSupabase?`<div class="notice demo-login">
         <b>Modo demo:</b><br>
         Docente: <b>docente@demo.com</b><br>
         Alumno: cualquier otro correo<br>
         Contraseña: mínimo 6 caracteres
       </div>`:''}
       `:`
       <form id="signupForm">
         <div class="field"><label>Nombre completo</label><input name="full_name" required placeholder="Nombre y apellidos"></div>
         <div class="field"><label>Número de control</label><input name="control_number" required placeholder="Ej. 232500183"></div>
         <div class="field"><label>Correo electrónico</label><input name="email" type="email" required placeholder="alumno@escuela.edu.mx"></div>
         <div class="field"><label>Contraseña</label><input name="password" type="password" required minlength="6" placeholder="Mínimo 6 caracteres"></div>
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
   if(forgot) forgot.onclick=async()=>{
     const email=document.querySelector('input[name="email"]').value.trim();
     if(!email) return alert('Escribe primero tu correo electrónico.');
     if(app.mode==='demo') return alert('La recuperación de contraseña estará disponible al conectar Supabase.');
     const {error}=await sb.auth.resetPasswordForEmail(email);
     alert(error ? error.message : 'Te enviamos un enlace para restablecer tu contraseña.');
   };
 } else {
   document.getElementById('signupForm').onsubmit=signup;
 }
}
async function login(e){
 e.preventDefault();const f=new FormData(e.target),email=f.get('email'),password=f.get('password');
 if(app.mode==='demo'){
   const role=email.toLowerCase()==='docente@demo.com'?'teacher':'student';
   const d=demoState();d.role=role;d.name=role==='teacher'?'Docente Demo':'Alumno Demo';saveDemo(d);
   app.user={id:'demo',email};app.profile={id:'demo',full_name:d.name,control_number:d.control||'232500001',role};app.view=role==='teacher'?'teacher':'home';return render();
 }
 const {data,error}=await sb.auth.signInWithPassword({email,password});
 if(error)return renderAuth('login','Error: '+error.message);
 await loadCloudSession(data.session);render();
}
async function signup(e){
 e.preventDefault();const f=new FormData(e.target);
 if(app.mode==='demo'){
   const d=demoState();d.role='student';d.name=f.get('full_name');d.control=f.get('control_number');saveDemo(d);
   app.user={id:'demo',email:f.get('email')};app.profile={id:'demo',full_name:d.name,control_number:d.control,role:'student'};app.view='home';render();return;
 }
 const email=f.get('email'),password=f.get('password');
 const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name:f.get('full_name'),control_number:f.get('control_number')}}});
 if(error)return renderAuth('signup','Error: '+error.message);
 if(!data.session)return renderAuth('login','Cuenta creada. Revisa tu correo si la confirmación de email está activada.');
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
 app.profile=data;app.view=data.role==='teacher'?'teacher':'home';await refreshCloud();
}
async function refreshCloud(){
 if(app.mode!=='cloud'||!app.profile)return;
 if(app.profile.role==='student'){
   let {data:p}=await sb.from('student_progress').select('*').eq('student_id',app.profile.id);app.progress=p||[];
   let {data:g}=await sb.from('group_members').select('group_id,school_groups(id,name,code,school_year)').eq('student_id',app.profile.id);app.groups=(g||[]).map(x=>x.school_groups).filter(Boolean);
 }else{
   let {data:g}=await sb.from('school_groups').select('*').eq('teacher_id',app.profile.id).order('created_at');app.groups=g||[];
   await loadTeacherStudents();
 }
}
async function loadTeacherStudents(){
 if(app.mode!=='cloud'){app.students=demoStudents();return}
 if(!app.groups.length){app.students=[];return}
 const gids=app.groups.map(g=>g.id);
 const {data:m,error}=await sb.from('group_members').select('group_id,student_id,profiles!group_members_student_id_fkey(id,full_name,control_number)').in('group_id',gids);
 if(error){console.error(error);app.students=[];return}
 const ids=[...new Set((m||[]).map(x=>x.student_id))];
 let prog=[];if(ids.length){const r=await sb.from('student_progress').select('*').in('student_id',ids);prog=r.data||[]}
 app.students=(m||[]).map(x=>({group_id:x.group_id,...(x.profiles||{}),progress:prog.filter(p=>p.student_id===x.student_id)}));
}
function nav(){
 const student=[['home','Inicio'],['subjects','Materias'],['practice','Práctica'],['grades','Calificaciones'],['group','Mi grupo'],['profile','Mi perfil']];
 const teacher=[['teacher','Resumen'],['groups','Mis grupos'],['students','Alumnos'],['tracking','Seguimiento'],['teacherSubjects','Materias']];
 return app.profile?.role==='teacher'?teacher:student;
}
function layout(content){
 const n=nav();
 const isTeacher=app.profile?.role==='teacher';
 const mobileNav=n.slice(0,4);

 el.innerHTML=`<div class="app-shell">
   <header class="mobile-topbar">
     <button class="icon-btn" id="mobileMenuBtn" aria-label="Abrir menú">☰</button>
     <div class="mobile-brand">Code<span>Fun</span></div>
     <div class="mobile-avatar">${esc((app.profile?.full_name||'U').charAt(0).toUpperCase())}</div>
   </header>

   <div class="mobile-overlay" id="mobileOverlay"></div>

   <aside class="side" id="sideNav">
     <div class="side-head">
       <div class="logo">Code<span>Fun</span></div>
       <button class="icon-btn side-close" id="sideClose" aria-label="Cerrar menú">✕</button>
     </div>
     <div class="meta">${isTeacher?'Panel docente':'Espacio del alumno'} · ${app.mode==='cloud'?'En línea':'Demo local'}</div>

     <div class="profile-card-mini">
       <div class="avatar">${esc((app.profile?.full_name||'U').charAt(0).toUpperCase())}</div>
       <div><b>${esc(app.profile?.full_name||'Usuario')}</b><div class="muted">${isTeacher?'Docente':'Alumno'}</div></div>
     </div>

     <div class="nav">${n.map(([v,l])=>`<button data-nav="${v}" class="${app.view===v?'active':''}"><span>${navIcon(v)}</span>${l}</button>`).join('')}</div>
     <div class="side-bottom"><button class="btn ghost block" id="logout">Cerrar sesión</button></div>
   </aside>

   <main class="main">
     <div class="desktop-top">
       <div><div class="page-eyebrow">${isTeacher?'Panel docente':'Panel del alumno'}</div><b>CodeFun Académico</b></div>
       <div class="profile-chip">${isTeacher?'Docente':'Alumno'} · ${esc(app.user?.email||'')}</div>
     </div>
     ${modeNotice()}
     ${content}
   </main>

   <nav class="mobile-bottom-nav">
     ${mobileNav.map(([v,l])=>`<button data-nav="${v}" class="${app.view===v?'active':''}"><span>${navIcon(v)}</span><small>${l}</small></button>`).join('')}
     <button id="mobileMore"><span>•••</span><small>Más</small></button>
   </nav>
 </div>`;

 const side=document.getElementById('sideNav');
 const overlay=document.getElementById('mobileOverlay');
 const open=()=>{side?.classList.add('open');overlay?.classList.add('show');document.body.classList.add('menu-open')};
 const close=()=>{side?.classList.remove('open');overlay?.classList.remove('show');document.body.classList.remove('menu-open')};

 document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{app.view=b.dataset.nav;app.session=null;close();render()});
 document.getElementById('logout').onclick=logout;
 document.getElementById('mobileMenuBtn')?.addEventListener('click',open);
 document.getElementById('mobileMore')?.addEventListener('click',open);
 document.getElementById('sideClose')?.addEventListener('click',close);
 overlay?.addEventListener('click',close);
}

function navIcon(v){
 const icons={home:'⌂',subjects:'▦',practice:'⌘',grades:'★',group:'👥',profile:'●',teacher:'⌂',groups:'▦',students:'👥',tracking:'↗',teacherSubjects:'⌘'};
 return icons[v]||'•';
}
function studentHome(){
 let total=0,done=0,correct=0,xp=0;
 if(app.mode==='demo'){const d=demoState();total=260;done=Object.keys(d.answers).length;correct=Object.values(d.answers).filter(a=>a.correct).length;xp=d.xp||0}
 else {total=260;done=app.progress.reduce((a,p)=>a+p.exercises_done,0);correct=app.progress.reduce((a,p)=>a+p.correct_answers,0);xp=app.progress.reduce((a,p)=>a+p.xp,0)}
 return `<section class="hero"><h1>Hola, ${esc((app.profile.full_name||'Alumno').split(' ')[0])} 👋</h1><p>Revisa tus materias, continúa practicando y consulta tu avance académico.</p></section>
 <div class="grid"><div class="c s3"><div class="muted">Ejercicios realizados</div><div class="metric">${done}</div></div><div class="c s3"><div class="muted">Precisión</div><div class="metric">${pct(correct,done)}%</div></div><div class="c s3"><div class="muted">XP</div><div class="metric">${xp}</div></div><div class="c s3"><div class="muted">Grupo</div><div class="metric" style="font-size:19px">${esc(app.groups[0]?.name||'Sin grupo')}</div></div>${subjectsCards()}</div>`;
}
function subjectsPage(){return `<h2>Mis materias</h2><p class="muted">Elige una materia para consultar sus unidades y practicar.</p><div class="grid">${subjectsCards()}</div>`}
function practicePage(){
 const s=D.subjects[app.subject];
 return `<div class="row"><div><h2>${s.name}</h2><div class="muted">${exBySubject(app.subject).length} ejercicios</div></div><button class="btn soft" id="switchSub">Cambiar a ${app.subject==='python'?'Lógica':'Python'}</button></div>
 <div class="grid">${s.units.map(u=>`<div class="c s6"><span class="badge">${u.id}</span><h3>${u.title}</h3><p class="muted">${u.topics.join(' · ')}</p>${u.topics.map(t=>`<button class="btn ghost" data-topic="${esc(t)}" style="margin:4px">${esc(t)}</button>`).join('')}</div>`).join('')}</div>`;
}
function startTopic(topic){const ids=D.exercises.filter(e=>e.subject===app.subject&&e.topic===topic).map(e=>e.id);app.session={ids,index:0,topic};renderExercise()}
function renderExercise(){
 const ss=app.session,ex=D.exercises.find(e=>e.id===ss.ids[ss.index]);
 if(!ex){app.session=null;app.view='practice';return render()}
 const prog=pct(ss.index,ss.ids.length);
 layout(`<div class="exercise">
   <div class="exercise-top">
     <button class="icon-btn" id="exitEx" aria-label="Salir">✕</button>
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
     <div class="opts">${ex.options.map((o,i)=>`<button class="opt" data-answer="${encodeURIComponent(o)}"><span class="option-key">${String.fromCharCode(65+i)}</span><span>${esc(o)}</span></button>`).join('')}</div>
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
 document.querySelectorAll('[data-answer]').forEach(x=>x.disabled=true);
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
function groupPage(){
 const g=app.groups[0];
 return `<h2>Mi grupo</h2>${g?`<div class="c"><span class="badge">Inscrito</span><h3>${esc(g.name)}</h3><div class="row"><span>Código</span><b>${esc(g.code)}</b></div><div class="row"><span>Ciclo</span><b>${esc(g.school_year||'—')}</b></div></div>`:`<div class="c"><h3>Aún no estás en un grupo</h3><p class="muted">Escribe el código que te proporcionó tu docente.</p><form id="joinForm"><div class="field"><input name="code" required placeholder="Ej. PB3102"></div><button class="btn">Unirme al grupo</button></form></div>`}`;
}
function profilePage(){return `<h2>Mi perfil</h2><div class="c s6"><div class="field"><label>Nombre</label><input value="${esc(app.profile.full_name||'')}" disabled></div><div class="field"><label>Número de control</label><input value="${esc(app.profile.control_number||'')}" disabled></div><div class="field"><label>Correo</label><input value="${esc(app.user.email||'')}" disabled></div><div class="field"><label>Rol</label><input value="${app.profile.role==='teacher'?'Docente':'Alumno'}" disabled></div></div>`}
function demoStudents(){return[
 {id:'s1',full_name:'Sofía Martínez',control_number:'232500101',progress:[{subject_id:'python',exercises_done:96,correct_answers:86,xp:910,last_activity:new Date().toISOString()},{subject_id:'logic',exercises_done:90,correct_answers:82,xp:850}]},
 {id:'s2',full_name:'Diego Hernández',control_number:'232500102',progress:[{subject_id:'python',exercises_done:77,correct_answers:60,xp:680},{subject_id:'logic',exercises_done:80,correct_answers:65,xp:710}]},
 {id:'s3',full_name:'Valeria Reyes',control_number:'232500103',progress:[{subject_id:'python',exercises_done:38,correct_answers:20,xp:330},{subject_id:'logic',exercises_done:45,correct_answers:27,xp:390}]},
 {id:'s4',full_name:'Ángel Torres',control_number:'232500104',progress:[{subject_id:'python',exercises_done:24,correct_answers:11,xp:210},{subject_id:'logic',exercises_done:31,correct_answers:15,xp:260}]}
]}
function teacherHome(){
 const sts=app.mode==='demo'?demoStudents():app.students;let attention=sts.filter(s=>studentAvg(s)<60).length;
 return `<section class="hero"><h1>Panel docente</h1><p>Consulta grupos, estudiantes, actividad y avance académico desde un solo lugar.</p></section><div class="grid"><div class="c s3"><div class="muted">Grupos</div><div class="metric">${app.mode==='demo'?1:app.groups.length}</div></div><div class="c s3"><div class="muted">Alumnos</div><div class="metric">${sts.length}</div></div><div class="c s3"><div class="muted">Promedio de avance</div><div class="metric">${sts.length?Math.round(sts.reduce((a,s)=>a+studentCompletion(s),0)/sts.length):0}%</div></div><div class="c s3"><div class="muted">Requieren atención</div><div class="metric">${attention}</div></div><div class="c s12"><h3>Actividad reciente</h3>${sts.slice(0,5).map(s=>`<div class="row"><div><b>${esc(s.full_name)}</b><div class="muted">${esc(s.control_number||'')}</div></div><span class="badge ${studentAvg(s)<60?'redb':'green'}">${studentAvg(s)}% aciertos</span></div>`).join('')||'<div class="muted">Aún no hay alumnos inscritos.</div>'}</div></div>`;
}
function studentAvg(s){let done=(s.progress||[]).reduce((a,p)=>a+(p.exercises_done||0),0),c=(s.progress||[]).reduce((a,p)=>a+(p.correct_answers||0),0);return pct(c,done)}
function studentCompletion(s){let done=(s.progress||[]).reduce((a,p)=>a+(p.exercises_done||0),0);return Math.min(100,pct(done,260))}
function groupsPage(){
 const gs=app.mode==='demo'?[{id:'g1',name:'Programación 3102',code:'PB3102',school_year:'2026-2027'}]:app.groups;
 return `<div class="row"><div><h2>Mis grupos</h2><div class="muted">Crea un grupo y comparte su código con los alumnos.</div></div><button class="btn" id="newGroup">+ Crear grupo</button></div><div class="grid">${gs.map(g=>`<div class="c s6"><span class="badge">${esc(g.code)}</span><h3>${esc(g.name)}</h3><div class="row"><span>Ciclo escolar</span><b>${esc(g.school_year||'—')}</b></div><div class="muted">Los alumnos se unen usando este código.</div></div>`).join('')||'<div class="c s12">Aún no has creado grupos.</div>'}</div>`;
}
function studentsPage(){
 const sts=app.mode==='demo'?demoStudents():app.students;
 return `<h2>Alumnos</h2><div class="c"><table class="table"><thead><tr><th>Alumno</th><th>Control</th><th>Avance</th><th>Aciertos</th><th>Estado</th><th></th></tr></thead><tbody>${sts.map(s=>`<tr><td>${esc(s.full_name)}</td><td>${esc(s.control_number||'—')}</td><td>${studentCompletion(s)}%</td><td>${studentAvg(s)}%</td><td><span class="badge ${studentAvg(s)<60?'redb':studentAvg(s)<75?'amber':'green'}">${studentAvg(s)<60?'Atención':studentAvg(s)<75?'En proceso':'Buen avance'}</span></td><td><button class="btn ghost" data-student="${s.id}">Ver</button></td></tr>`).join('')}</tbody></table></div>`;
}
function trackingPage(){
 const sts=app.mode==='demo'?demoStudents():app.students;
 return `<h2>Seguimiento académico</h2><div class="grid">${sts.map(s=>`<div class="c s6"><div class="row"><div><b>${esc(s.full_name)}</b><div class="muted">${esc(s.control_number||'')}</div></div><b>${studentCompletion(s)}%</b></div>${Object.entries(D.subjects).map(([id,sub])=>{const p=(s.progress||[]).find(x=>x.subject_id===id)||{};return `<div class="row"><span>${sub.short}</span><span>${p.exercises_done||0} ejercicios · ${pct(p.correct_answers||0,p.exercises_done||0)}% aciertos</span></div>`}).join('')}</div>`).join('')||'<div class="c s12">No hay datos de seguimiento todavía.</div>'}</div>`;
}
function teacherSubjectsPage(){return `<h2>Materias</h2><div class="grid">${Object.entries(D.subjects).map(([id,s])=>`<div class="c s6"><span class="badge">${s.short}</span><h3>${s.name}</h3><p class="muted">${s.description}</p><div class="row"><span>Ejercicios</span><b>${exBySubject(id).length}</b></div><div class="row"><span>Unidades</span><b>${s.units.length}</b></div></div>`).join('')}</div>`}
function studentDetail(id){
 const s=(app.mode==='demo'?demoStudents():app.students).find(x=>x.id===id);if(!s)return;
 el.insertAdjacentHTML('beforeend',`<div class="modal" id="modal"><div class="modal-card"><div class="row"><h3>${esc(s.full_name)}</h3><button class="btn ghost" id="closeModal">Cerrar</button></div><div class="muted">${esc(s.control_number||'')}</div><div class="row"><span>Avance total</span><b>${studentCompletion(s)}%</b></div><div class="row"><span>Precisión general</span><b>${studentAvg(s)}%</b></div>${Object.entries(D.subjects).map(([sid,sub])=>{const p=(s.progress||[]).find(x=>x.subject_id===sid)||{};return `<div class="c" style="margin-top:10px"><b>${sub.name}</b><div class="row"><span>Ejercicios</span><b>${p.exercises_done||0}</b></div><div class="row"><span>Aciertos</span><b>${pct(p.correct_answers||0,p.exercises_done||0)}%</b></div><div class="row"><span>XP</span><b>${p.xp||0}</b></div></div>`}).join('')}</div></div>`);
 document.getElementById('closeModal').onclick=()=>document.getElementById('modal').remove();
}
async function createGroup(){
 if(app.mode==='demo')return alert('En modo demo el grupo PB3102 ya está creado. Con Supabase podrás crear grupos reales.');
 const name=prompt('Nombre del grupo (ej. Programación 3102):');if(!name)return;
 const year=prompt('Ciclo escolar (ej. 2026-2027):')||'';
 const code=(prompt('Código de acceso (ej. PB3102):')||'').trim().toUpperCase();if(!code)return;
 const {error}=await sb.from('school_groups').insert({name,code,school_year:year,teacher_id:app.profile.id});
 if(error)return alert(error.message);await refreshCloud();render();
}
async function joinGroup(e){
 e.preventDefault();const code=new FormData(e.target).get('code');
 if(app.mode==='demo'){app.groups=[{name:'Programación 3102',code,school_year:'2026-2027'}];render();return}
 const {error}=await sb.rpc('join_group_by_code',{p_code:code});if(error)return alert(error.message);await refreshCloud();render();
}
function wire(){
 document.querySelectorAll('[data-sub]').forEach(x=>x.onclick=()=>{app.subject=x.dataset.sub;app.view='practice';render()});
 const sw=document.getElementById('switchSub');if(sw)sw.onclick=()=>{app.subject=app.subject==='python'?'logic':'python';render()};
 document.querySelectorAll('[data-topic]').forEach(x=>x.onclick=()=>startTopic(x.dataset.topic));
 const jf=document.getElementById('joinForm');if(jf)jf.onsubmit=joinGroup;
 const ng=document.getElementById('newGroup');if(ng)ng.onclick=createGroup;
 document.querySelectorAll('[data-student]').forEach(x=>x.onclick=()=>studentDetail(x.dataset.student));
}
function render(){
 if(!app.profile)return renderAuth('login');
 if(app.session)return renderExercise();
 let c='';
 if(app.profile.role==='teacher'){
   if(app.view==='teacher')c=teacherHome();else if(app.view==='groups')c=groupsPage();else if(app.view==='students')c=studentsPage();else if(app.view==='tracking')c=trackingPage();else c=teacherSubjectsPage();
 }else{
   if(app.view==='home')c=studentHome();else if(app.view==='subjects')c=subjectsPage();else if(app.view==='practice')c=practicePage();else if(app.view==='grades')c=gradesPage();else if(app.view==='group')c=groupPage();else c=profilePage();
 }
 layout(c);wire();
}
async function init(){
 if(app.mode==='cloud'){
   const {data:{session}}=await sb.auth.getSession();
   if(session)await loadCloudSession(session);
   sb.auth.onAuthStateChange((_event,session)=>{if(!session){app.user=null;app.profile=null;renderAuth('login')}});
 }else{
   const d=demoState();if(d.role){app.user={id:'demo',email:d.role==='teacher'?'docente@demo.com':'alumno@demo.com'};app.profile={id:'demo',full_name:d.name||'Usuario Demo',control_number:d.control||'232500001',role:d.role};app.view=d.role==='teacher'?'teacher':'home';if(d.role==='teacher')app.students=demoStudents()}
 }
 render();
}
if('serviceWorker' in navigator && location.protocol.startsWith('http'))navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
init();
