const $=s=>document.querySelector(s),KEY='fitpulse',MEALS=['Breakfast','Lunch','Dinner','Snacks'];
const day=d=>(d||new Date()).toLocaleDateString('en-CA'),today=()=>day(),uid=()=>Date.now()+Math.random();
const DEF={profile:{age:'',height:'',weight:'',gender:'Male',fitness:'Build muscle',notif:false},goals:{workout:4,weight:75,water:2500,protein:150,calories:2500,carbs:250,fat:70},workouts:[],templates:[],weights:[],measures:[],foods:[],water:{},logins:[],dark:true,session:null};
let S=Object.assign({},DEF,JSON.parse(localStorage.getItem(KEY)||'{}')),charts=[],page='dashboard';
const save=()=>localStorage.setItem(KEY,JSON.stringify(S));
if(!S.logins.includes(today()))S.logins.push(today());save();
const num=v=>+v||0,sum=(a,f)=>a.reduce((t,x)=>t+num(f(x)),0),fmt=n=>Math.round(n*10)/10;
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}

/* ---------- calculations ---------- */
const wk=w=>{const e=w.exercises||[];return{sets:sum(e,x=>x.sets),reps:sum(e,x=>num(x.sets)*num(x.reps)),vol:sum(e,x=>num(x.sets)*num(x.reps)*num(x.weight))}};
const streak=ds=>{const s=new Set(ds);let n=0,d=new Date();if(!s.has(day(d)))d.setDate(d.getDate()-1);while(s.has(day(d))){n++;d.setDate(d.getDate()-1)}return n};
const longest=ds=>{const a=[...new Set(ds)].sort();let b=0,c=0,p=null;a.forEach(x=>{c=p&&(new Date(x)-new Date(p))/864e5===1?c+1:1;b=Math.max(b,c);p=x});return b};
const waterDays=()=>Object.keys(S.water).filter(d=>S.water[d]>=S.goals.water);
const nutDays=()=>[...new Set(S.foods.map(f=>f.date))];
const wDays=()=>S.workouts.map(w=>w.date);
const tot=()=>S.workouts.reduce((t,w)=>{const k=wk(w);t.sets+=k.sets;t.reps+=k.reps;t.vol+=k.vol;t.min+=num(w.dur);return t},{sets:0,reps:0,vol:0,min:0});
const sorted=a=>[...a].sort((x,y)=>x.date<y.date?-1:1);
const curW=()=>{const w=sorted(S.weights);return w.length?num(w[w.length-1].kg):num(S.profile.weight)};
const wProg=()=>{const w=sorted(S.weights);if(!w.length)return 0;const a=num(w[0].kg),c=num(w[w.length-1].kg),g=num(S.goals.weight);return a===g?100:Math.max(0,Math.min(100,(a-c)/(a-g)*100))};
const dayFoods=()=>S.foods.filter(f=>f.date===today()),dt=k=>sum(dayFoods(),f=>f[k]);
const ACH=[['First Workout',()=>S.workouts.length>=1],['7 Day Workout Streak',()=>longest(wDays())>=7],['30 Day Workout Streak',()=>longest(wDays())>=30],['Lifted 10,000kg Total',()=>tot().vol>=1e4],['Lost 5kg',()=>{const w=sorted(S.weights);return w.length>1&&num(w[0].kg)-num(w[w.length-1].kg)>=5}],['Daily Water Goal for 30 Days',()=>waterDays().length>=30]];
const bar=(v,m,l)=>{const p=m?Math.min(100,v/m*100):0;return`<div class="mut">${l||''} ${fmt(v)} / ${fmt(m)}</div><div class="bar ${p>=100?'ok':''}"><i style="width:${p}%"></i></div>`};
const stat=(l,v)=>`<div class="card"><div class="mut">${l}</div><div class="big">${v}</div></div>`;

/* ---------- charts ---------- */
function chart(id,type,labels,sets){const c=$('#'+id);if(!c||!window.Chart)return;const cols=['#ff5d73','#4cc9f0','#5ee6a8','#ffd166','#b79cff','#ff9f6e'];
charts.push(new Chart(c,{type,data:{labels,datasets:sets.map((s,i)=>({label:s[0],data:s[1],borderColor:cols[i],backgroundColor:type==='bar'?cols[i]:cols[i]+'33',tension:.3,fill:type==='line'&&sets.length===1}))},options:{responsive:true,plugins:{legend:{display:sets.length>1}},scales:{x:{ticks:{color:'#8b93a7'}},y:{ticks:{color:'#8b93a7'},beginAtZero:type==='bar'}}}}))}

/* ---------- modal form ---------- */
function openForm(title,fields,vals,cb){const f=$('#f');f.innerHTML=`<h3>${title}</h3>`+fields.map(x=>`<label>${x.l}</label>`+(x.o?`<select name="${x.k}">${x.o.map(o=>`<option ${o==vals[x.k]?'selected':''}>${o}</option>`).join('')}</select>`:`<input name="${x.k}" type="${x.t||'text'}" step="any" value="${vals[x.k]??''}" ${x.r?'required':''}>`)).join('')+`<p><button class="b">Save</button><button class="s" type="button" onclick="dlg.close()">Cancel</button></p>`;
f.onsubmit=e=>{e.preventDefault();cb(Object.fromEntries(new FormData(f)));save();dlg.close();render()};dlg.showModal()}
const del=(k,id)=>{if(confirm('Delete this entry?')){S[k]=S[k].filter(x=>x.id!==id);save();render()}};
const find=(k,id)=>S[k].find(x=>x.id===id);

/* ---------- workouts ---------- */
const exRow=x=>`<div class="ex"><div class="row"><input data-k="name" placeholder="Exercise name" value="${x.name||''}"></div><div class="row">${[['sets','Sets'],['reps','Reps'],['weight','Weight kg'],['duration','Min'],['rest','Rest s'],['dist','Dist km']].map(([k,l])=>`<div><label>${l}</label><input data-k="${k}" type="number" step="any" value="${x[k]??''}"></div>`).join('')}</div></div>`;
function wForm(w){w=w||{name:'',date:today(),notes:'',dur:'',exercises:[{}]};const f=$('#f');
f.innerHTML=`<h3>${w.id?'Edit':'New'} workout</h3><div class="row"><div><label>Name</label><input id="wn" value="${w.name}" required></div><div><label>Date</label><input id="wd" type="date" value="${w.date}"></div><div><label>Duration (min)</label><input id="wm" type="number" value="${w.dur}"></div></div><div id="exs">${w.exercises.map(exRow).join('')}</div><button type="button" class="s" onclick="exs.insertAdjacentHTML('beforeend',exRow({}))">+ Exercise</button><label>Notes</label><textarea id="wnt">${w.notes||''}</textarea><p><button class="b">Save workout</button><button class="s" type="button" onclick="dlg.close()">Cancel</button></p>`;
f.onsubmit=e=>{e.preventDefault();const ex=[...f.querySelectorAll('.ex')].map(r=>Object.fromEntries([...r.querySelectorAll('input')].map(i=>[i.dataset.k,i.dataset.k==='name'?i.value:num(i.value)]))).filter(x=>x.name);
const o={id:w.id||uid(),name:$('#wn').value,date:$('#wd').value,dur:num($('#wm').value),notes:$('#wnt').value,exercises:ex};
w.id?S.workouts[S.workouts.findIndex(x=>x.id===w.id)]=o:S.workouts.push(o);S.session=null;save();dlg.close();render()};dlg.showModal()}
const editW=id=>wForm(find('workouts',id));
const dupW=id=>{const w=JSON.parse(JSON.stringify(find('workouts',id)));w.id=uid();w.date=today();S.workouts.push(w);save();render();toast('Workout duplicated')};
const tplW=id=>{const w=JSON.parse(JSON.stringify(find('workouts',id)));w.id=uid();S.templates.push(w);save();render();toast('Template saved')};
const useT=id=>{const w=JSON.parse(JSON.stringify(find('templates',id)));delete w.id;w.date=today();wForm(w)};
const startS=()=>{S.session=Date.now();save();render()};
const endS=()=>{const m=Math.max(1,Math.round((Date.now()-S.session)/6e4));wForm({name:'',date:today(),notes:'',dur:m,exercises:[{}]})};

/* ---------- pages ---------- */
const P={};
P.dashboard=()=>{const g=S.goals,t=tot(),a=ACH.filter(x=>x[1]()).length,rw=sorted(S.workouts).reverse().slice(0,4);
return`<h2>Dashboard</h2><div class="grid">${stat('Workout streak',streak(wDays())+' days')}${stat('Water streak',streak(waterDays())+' days')}${stat('Nutrition streak',streak(nutDays())+' days')}${stat('Login streak',streak(S.logins)+' days')}</div>
<div class="grid"><div class="card"><h3>Today</h3>${bar(dt('calories'),g.calories,'Calories')}${bar(dt('protein'),g.protein,'Protein g')}${bar(S.water[today()]||0,g.water,'Water ml')}</div>
<div class="card"><h3>Weight</h3><div class="big">${curW()||'–'} kg</div><div class="mut">Goal ${g.weight} kg</div><div class="bar"><i style="width:${wProg()}%"></i></div></div>
<div class="card"><h3>Quick stats</h3>${t.vol?'':'<p class="mut">Log a workout to see stats.</p>'}<div>${S.workouts.length} workouts</div><div>${fmt(t.min/60)} hours trained</div><div>${fmt(t.vol)} kg lifted</div></div>
<div class="card"><h3>Achievements</h3>${bar(a,ACH.length,'Unlocked')}${ACH.map(x=>`<span class="badge ${x[1]()?'got':''}">${x[0]}</span>`).join('')}</div></div>
<div class="grid"><div class="card"><h3>Recent workouts</h3>${rw.map(w=>`<div>${w.date} – <b>${w.name}</b> <span class="mut">${wk(w).vol} kg</span></div>`).join('')||'<p class="mut">No workouts yet.</p>'}</div><div class="card"><h3>Weight trend</h3><canvas id="c1"></canvas></div></div>`};
P.dashboardAfter=()=>{const w=sorted(S.weights);chart('c1','line',w.map(x=>x.date),[['kg',w.map(x=>x.kg)]])};

P.workouts=()=>{const ws=sorted(S.workouts).reverse();
return`<h2>Workouts</h2><div class="card"><button class="b" onclick="wForm()">+ New workout</button>${S.session?`<button class="s" onclick="endS()">End session (started ${new Date(S.session).toLocaleTimeString()})</button>`:`<button class="s" onclick="startS()">Start session</button>`}</div><br>
${S.templates.length?`<div class="card"><h3>Templates</h3>${S.templates.map(t=>`<span class="badge">${t.name} <a href="#" onclick="useT(${t.id});return false">use</a> · <a href="#" onclick="del('templates',${t.id});return false">x</a></span>`).join('')}</div><br>`:''}
<h3>History</h3>${ws.map(w=>{const k=wk(w);return`<div class="card"><b>${w.name}</b> <span class="mut">${w.date} · ${w.dur} min · ${k.sets} sets · ${k.reps} reps · ${k.vol} kg volume</span><div class="mut">${(w.exercises||[]).map(x=>`${x.name} ${x.sets}×${x.reps}@${x.weight}kg`).join(', ')}</div>${w.notes?`<p>${w.notes}</p>`:''}<button class="s" onclick="editW(${w.id})">Edit</button><button class="s" onclick="dupW(${w.id})">Duplicate</button><button class="s" onclick="tplW(${w.id})">Save template</button><button class="s" onclick="del('workouts',${w.id})">Delete</button></div><br>`}).join('')||'<p class="mut">No workouts yet. Start a session or add one.</p>'}`};

P.records=()=>{let mw={v:0},mr={v:0},ln={v:0},fc={v:0};S.workouts.forEach(w=>{if(num(w.dur)>ln.v)ln={v:w.dur,n:w.name,d:w.date};(w.exercises||[]).forEach(x=>{if(num(x.weight)>mw.v)mw={v:x.weight,n:x.name,d:w.date};if(num(x.reps)>mr.v)mr={v:x.reps,n:x.name,d:w.date};if(num(x.dist)>0&&num(x.duration)>0){const p=x.duration/x.dist;if(!fc.v||p<fc.v)fc={v:fmt(p),n:x.name,d:w.date}}})});
const c=(l,r,u)=>`<div class="card"><div class="mut">${l}</div><div class="big">${r.v?r.v+u:'–'}</div><div class="mut">${r.n?r.n+' · '+r.d:'No record yet'}</div></div>`;
return`<h2>Personal records</h2><div class="grid">${c('Highest weight',mw,' kg')}${c('Most reps in a set',mr,'')}${c('Longest workout',ln,' min')}${c('Fastest cardio pace',fc,' min/km')}</div>`};

P.weight=()=>{const w=sorted(S.weights),c=curW(),g=S.goals.weight;
return`<h2>Weight</h2><div class="grid">${stat('Current',c+' kg')}${stat('Goal',g+' kg')}${stat('Remaining',fmt(Math.abs(c-g))+' kg')}${stat('Progress',fmt(wProg())+'%')}</div><div class="card"><canvas id="c1"></canvas></div><br><div class="card"><button class="b" onclick="addW()">+ Log weight</button><table>${w.reverse().map(x=>`<tr><td>${x.date}</td><td>${x.kg} kg</td><td><button class="s" onclick="addW(${x.id})">Edit</button><button class="s" onclick="del('weights',${x.id})">Delete</button></td></tr>`).join('')}</table></div>`};
P.weightAfter=()=>{const w=sorted(S.weights);chart('c1','line',w.map(x=>x.date),[['kg',w.map(x=>x.kg)]])};
const addW=id=>{const e=id?find('weights',id):{date:today()};openForm('Weight entry',[{k:'date',l:'Date',t:'date',r:1},{k:'kg',l:'Weight (kg)',t:'number',r:1}],e,d=>{d.id=e.id||uid();id?S.weights[S.weights.indexOf(e)]=d:S.weights.push(d)})};

const MK=['chest','waist','arms','legs','hips','neck'];
P.measures=()=>{const m=sorted(S.measures);return`<h2>Body measurements (cm)</h2><div class="card"><canvas id="c1"></canvas></div><br><div class="card"><button class="b" onclick="addM()">+ Log measurements</button><table><tr><th>Date</th>${MK.map(k=>`<th>${k}</th>`).join('')}<th></th></tr>${[...m].reverse().map(x=>`<tr><td>${x.date}</td>${MK.map(k=>`<td>${x[k]||'–'}</td>`).join('')}<td><button class="s" onclick="addM(${x.id})">Edit</button><button class="s" onclick="del('measures',${x.id})">Del</button></td></tr>`).join('')}</table></div>`};
P.measuresAfter=()=>{const m=sorted(S.measures);chart('c1','line',m.map(x=>x.date),MK.map(k=>[k,m.map(x=>x[k]||null)]))};
const addM=id=>{const e=id?find('measures',id):{date:today()};openForm('Measurements',[{k:'date',l:'Date',t:'date',r:1},...MK.map(k=>({k,l:k,t:'number'}))],e,d=>{d.id=e.id||uid();id?S.measures[S.measures.indexOf(e)]=d:S.measures.push(d)})};

P.nutrition=()=>{const g=S.goals,cal=dt('calories');
return`<h2>Nutrition – today</h2><div class="grid"><div class="card">${bar(cal,g.calories,'Calories')}<b>${Math.max(0,g.calories-cal)}</b> kcal remaining</div><div class="card">${bar(dt('protein'),g.protein,'Protein g')}${bar(dt('carbs'),g.carbs,'Carbs g')}${bar(dt('fat'),g.fat,'Fat g')}</div></div>
${MEALS.map(m=>`<div class="card"><h3>${m}</h3><button class="b" onclick="addF('${m}')">+ Add food</button><table>${dayFoods().filter(f=>f.meal===m).map(f=>`<tr><td>${f.name} <span class="mut">${f.serving}</span></td><td>${f.calories} kcal</td><td class="mut">P${f.protein} C${f.carbs} F${f.fat}</td><td><button class="s" onclick="addF('${m}',${f.id})">Edit</button><button class="s" onclick="del('foods',${f.id})">Del</button></td></tr>`).join('')}</table></div><br>`).join('')}`};
const addF=(m,id)=>{const e=id?find('foods',id):{meal:m,date:today()};openForm('Food item',[{k:'meal',l:'Meal',o:MEALS},{k:'name',l:'Food name',r:1},{k:'serving',l:'Serving size'},{k:'calories',l:'Calories',t:'number'},{k:'protein',l:'Protein (g)',t:'number'},{k:'carbs',l:'Carbs (g)',t:'number'},{k:'fat',l:'Fat (g)',t:'number'}],e,d=>{['calories','protein','carbs','fat'].forEach(k=>d[k]=num(d[k]));d.id=e.id||uid();d.date=e.date;id?S.foods[S.foods.indexOf(e)]=d:S.foods.push(d)})};

const addWater=n=>{S.water[today()]=Math.max(0,(S.water[today()]||0)+n);save();render()};
P.water=()=>{const v=S.water[today()]||0,g=S.goals.water,p=Math.min(100,v/g*100);
return`<h2>Water</h2><div class="card" style="text-align:center"><div class="ring" style="background:conic-gradient(var(--acc2) ${p*3.6}deg,var(--line) 0)"><div>${Math.round(p)}%</div></div><div class="big">${v} / ${g} ml</div><p><button class="b" onclick="addWater(250)">+250</button><button class="b" onclick="addWater(500)">+500</button><button class="s" onclick="addWater(-250)">-250</button><button class="s" onclick="addWater(+prompt('ml to add (negative removes)','100')||0)">Custom</button></p><button class="s" onclick="setG('water')">Set daily goal</button></div>`};

const setG=k=>{const n=prompt('New '+k+' goal',S.goals[k]);if(n&&+n>0){S.goals[k]=+n;save();render()}};
P.goals=()=>{const g=S.goals,wkn=S.workouts.filter(w=>(Date.now()-new Date(w.date))/864e5<7).length;
const r=(k,l,v,u)=>`<div class="card">${bar(v,g[k],l)}<div class="mut">Goal: ${g[k]} ${u}</div><button class="s" onclick="setG('${k}')">Change</button></div>`;
return`<h2>Goals</h2><div class="grid">${r('workout','Workouts this week',wkn,'/ week')}<div class="card"><div class="mut">Weight goal</div>${bar(wProg(),100,'Progress %')}<div class="mut">Goal: ${g.weight} kg</div><button class="s" onclick="setG('weight')">Change</button></div>${r('water','Water today (ml)',S.water[today()]||0,'ml')}${r('protein','Protein today',dt('protein'),'g')}${r('calories','Calories today',dt('calories'),'kcal')}</div>`};

P.stats=()=>{const t=tot(),n=S.workouts.length,now=new Date(),wkn=S.workouts.filter(w=>(Date.now()-new Date(w.date))/864e5<7).length,mo=S.workouts.filter(w=>w.date.slice(0,7)===day().slice(0,7)).length;
return`<h2>Statistics</h2><div class="grid">${stat('Workouts',n)}${stat('Hours trained',fmt(t.min/60))}${stat('Total sets',t.sets)}${stat('Total reps',t.reps)}${stat('Weight lifted',fmt(t.vol)+' kg')}${stat('This week',wkn)}${stat('This month',mo)}${stat('Avg duration',n?fmt(t.min/n)+' min':'–')}</div><div class="grid"><div class="card"><h3>Volume per workout</h3><canvas id="c1"></canvas></div><div class="card"><h3>Duration (min)</h3><canvas id="c2"></canvas></div></div>`};
P.statsAfter=()=>{const w=sorted(S.workouts).slice(-12);chart('c1','bar',w.map(x=>x.date),[['kg',w.map(x=>wk(x).vol)]]);chart('c2','line',w.map(x=>x.date),[['min',w.map(x=>x.dur)]])};

P.settings=()=>{const p=S.profile;
return`<h2>Settings</h2><div class="card"><h3>Profile</h3><div class="row"><div><label>Age</label><input id="pa" type="number" value="${p.age}"></div><div><label>Height (cm)</label><input id="ph" type="number" value="${p.height}"></div><div><label>Weight (kg)</label><input id="pw" type="number" value="${p.weight}"></div></div><div class="row"><div><label>Gender</label><select id="pg">${['Male','Female','Other'].map(o=>`<option ${o==p.gender?'selected':''}>${o}</option>`).join('')}</select></div><div><label>Fitness goal</label><select id="pf">${['Lose fat','Build muscle','Maintain','Improve endurance'].map(o=>`<option ${o==p.fitness?'selected':''}>${o}</option>`).join('')}</select></div></div><p><button class="b" onclick="saveP()">Save profile</button></p></div><br>
<div class="card"><label><input type="checkbox" style="width:auto" ${S.dark?'checked':''} onchange="S.dark=this.checked;save();theme()"> Dark mode</label><label><input type="checkbox" style="width:auto" ${p.notif?'checked':''} onchange="S.profile.notif=this.checked;save();this.checked&&window.Notification&&Notification.requestPermission()"> Workout reminder notifications</label><p><button class="s" onclick="exportD()">Export data (JSON)</button><button class="s" onclick="if(confirm('Erase ALL data?')){localStorage.removeItem(KEY);location.reload()}">Reset all data</button></p></div>`};
const saveP=()=>{S.profile={...S.profile,age:$('#pa').value,height:$('#ph').value,weight:$('#pw').value,gender:$('#pg').value,fitness:$('#pf').value};save();toast('Profile saved')};
const exportD=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,2)],{type:'application/json'}));a.download='fitpulse-data.json';a.click()};

/* ---------- app shell ---------- */
const theme=()=>document.body.classList.toggle('light',!S.dark);
function render(){charts.forEach(c=>c.destroy());charts=[];$('#main').innerHTML=P[page]();P[page+'After']&&P[page+'After']();
document.querySelectorAll('#links button').forEach(b=>b.classList.toggle('on',b.dataset.p===page));
const done=ACH.filter(a=>a[1]());S.unlocked=S.unlocked||[];done.forEach(a=>{if(!S.unlocked.includes(a[0])){S.unlocked.push(a[0]);save();toast('🏆 Achievement unlocked: '+a[0])}})}
$('#links').innerHTML=Object.keys(P).filter(k=>!k.endsWith('After')).map(k=>`<button data-p="${k}">${k[0].toUpperCase()+k.slice(1)}</button>`).join('');
$('#links').onclick=e=>{if(e.target.dataset.p){page=e.target.dataset.p;render();scrollTo(0,0)}};
theme();render();
