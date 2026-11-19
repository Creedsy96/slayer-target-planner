/* UI state and browser persistence; all probability calculations live in engine.js. */
(function(){
  'use strict';
  const data=SLAYER_DATA, $=id=>document.getElementById(id), storageKey='slayer-target-planner-v1';
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pct=value=>(value*100).toFixed(2)+'%';
  const decimal=value=>value===null?'—':value.toFixed(2);
  const duration=hours=>{if(hours===null)return 'Unavailable';const minutes=Math.round(hours*60);return minutes<60?minutes+' min':Math.floor(minutes/60)+'h '+minutes%60+'m';};
  let settings={...data.defaults}, overrides={}, selectedMaster='', results=[], canSave=true;
  try{
    const saved=JSON.parse(localStorage.getItem(storageKey)||'null');
    if(saved){settings=SlayerPreferences.sanitise(data,saved.settings);overrides=SlayerPreferences.sanitiseOverrides(data,saved.overrides);}
  }catch(error){canSave=false;}
  const creature=()=>({...data.creatures.find(c=>c.id===settings.target),...overrides[settings.target]});
  const hours=result=>settings.sustainable?result.sustainableHours:result.hours;

  function save(){
    try{localStorage.setItem(storageKey,JSON.stringify({settings,overrides}));canSave=true;}
    catch(error){canSave=false;}
    $('save-status').textContent=canSave?'Saved locally':'Session only';
  }
  function syncSettings(){
    const form=$('settings-form');
    for(const [key,value] of Object.entries(settings)){
      const input=form.elements.namedItem(key);if(!input)continue;
      if(input.type==='checkbox')input.checked=value;
      else input.value=key==='modifierChance'?value*100:value;
    }
    $('target').value=settings.target;
  }
  function recalculate(){
    results=data.masters.filter(m=>!m.scenario||settings.threeChoices)
      .map(m=>SlayerEngine.calculate(data,m,settings,overrides))
      .sort((a,b)=>(hours(a)??Infinity)-(hours(b)??Infinity)||a.master.name.localeCompare(b.master.name));
    if(!results.some(r=>r.master.id===selectedMaster&&r.available))selectedMaster=results.find(r=>r.available)?.master.id||'';
    renderOverview();save();
  }
  function renderOverview(){
    const target=creature(), best=results.find(r=>r.available);
    $('target-description').innerHTML=`<strong>Slayer ${target.level} required</strong>${escape(target.representative)} · ${target.hp} HP`;
    $('sustainable').setAttribute('aria-pressed',String(settings.sustainable));
    $('no-skips').setAttribute('aria-pressed',String(!settings.sustainable));
    const warning=target.level>settings.level?`Your Slayer level is ${settings.level}. ${target.name} requires level ${target.level}.`
      :target.excluded?`${target.name} is currently excluded in your shared task inputs.`:'';
    $('target-warning').hidden=!warning;
    $('target-warning').textContent=warning;
    if(warning&&target.excluded){const button=document.createElement('button');button.textContent='Allow this task';button.className='text-button';button.onclick=()=>{overrides[target.id]={...overrides[target.id],excluded:false};recalculate();};$('target-warning').append(button);}
    $('comparison-note').textContent=`Sorted by expected waiting time · ${settings.sustainable?'point-balanced skips':'complete every non-target task'}`;
    $('recommendation').innerHTML=best?recommendation(best):'<div><div class="eyebrow">NO ELIGIBLE MASTER</div><h2>Check your target requirements</h2><p>Adjust your Slayer level or allow this creature in Task inputs.</p></div>';
    renderMasters(best);renderPlan();
  }
  function recommendation(best){
    const saved=best.hours-best.sustainableHours;
    return `<div><div class="eyebrow">LOWEST EXPECTED WAIT</div><h2>${escape(best.master.name)}</h2><p>${settings.sustainable?'With sustainable skips':'Without skipping'}${best.master.scenario?' · unlock scenario':''}</p></div>
      <div class="metric"><span class="metric-label">Expected time to ${escape(creature().name)}</span><span class="metric-value">${duration(hours(best))}</span><small>${settings.sustainable?`${saved.toFixed(2)} hours saved vs no skips`:'Until the target is offered'}</small></div>
      <div class="metric"><span class="metric-label">Target chance per offer</span><span class="metric-value">${pct(best.chance)}</span><small>${best.master.choices>1?best.master.choices+' distinct choices per offer':'After recommended blocks'}</small></div>
      <div class="metric"><span class="metric-label">Expected offers</span><span class="metric-value">${best.offers.toFixed(1)}</span><small>Includes the successful offer</small></div>`;
  }
  function renderMasters(best){
    const visible=results.filter(r=>r.available||$('show-unavailable').checked);
    const max=Math.max(...results.filter(r=>r.available).map(hours),1);
    $('master-rows').innerHTML=visible.map(result=>{
      const m=result.master, fastest=best===result, time=hours(result);
      return `<tr class="${!result.available?'unavailable-row':fastest?'best-row':''}"><td><button class="master-button" data-master="${m.id}" aria-pressed="${m.id===selectedMaster}" ${!result.available?'disabled':''}>${escape(m.name)}</button>${fastest?'<span class="best-tag">FASTEST</span>':''}
        <span class="master-meta">${escape(result.reason||(m.scenario?'Requires 3-choice unlock':m.choices>1?'Two-choice offers':'Single-task offers'))}</span></td>
        <td><span class="wait-value">${result.available?duration(time):'—'}</span>${result.available?`<div class="wait-bar"><span style="width:${Math.max(2,time/max*100)}%"></span></div>`:''}</td>
        <td>${pct(result.chance)}</td><td>${decimal(result.offers)}</td><td>${decimal(settings.sustainable?result.afterSkips:result.average)} min</td><td>${result.blocks.length}</td></tr>`;
    }).join('')||'<tr><td colspan="6" class="empty">No masters can assign your target with these requirements.</td></tr>';
    $('master-rows').querySelectorAll('[data-master]').forEach(button=>button.onclick=()=>{selectedMaster=button.dataset.master;renderMasters(best);renderPlan();});
  }
  function action(row){
    if(row.reason)return [row.reason,''];
    if(row.blocked)return ['Block','block'];
    if(row.id===settings.target)return ['Target · keep','target'];
    if(!settings.sustainable||row.skip<1e-9)return ['Keep',''];
    return [row.skip>=1-1e-9?'Skip':`Skip ${(row.skip*100).toFixed(1)}%`,'skip'];
  }
  function renderPlan(){
    const result=results.find(r=>r.master.id===selectedMaster);
    $('plan').hidden=!result;if(!result)return;
    const skipped=result.rows.filter(r=>r.skip>1e-9&&!r.blocked&&!r.reason);
    const rows=[...result.rows].sort((a,b)=>(a.id===settings.target?-1:b.id===settings.target?1:0)||Number(!!a.reason)-Number(!!b.reason)||b.probability-a.probability||a.name.localeCompare(b.name));
    $('plan').innerHTML=`<div class="section-heading"><div><div class="eyebrow">YOUR MASTER PLAN</div><h2>${escape(result.master.name)}</h2><p>Suggested actions for ${escape(creature().name)}</p></div></div>
      <div class="plan-summary"><article class="plan-card"><h3>Recommended blocks <span class="muted">(${result.blocks.length})</span></h3><div class="chips">${result.blocks.map(r=>`<span class="chip">${escape(r.name)}</span>`).join('')||'<span class="muted">No block slots used</span>'}</div><p>Highest eligible weights first. These blocks are specific to this master.</p></article>
      <article class="plan-card"><h3>${settings.sustainable?'Sustainable skip budget':'Complete all non-target tasks'}</h3><div class="points">${(settings.sustainable?result.pointsEarned:pointsWithoutSkips(result)).toFixed(2)} <small>points earned / hour</small></div><p>${settings.sustainable?`${result.pointsSpent.toFixed(2)} spent / hour · ${(result.skippedPercent*100).toFixed(1)}% of offers skipped. ${skipped.length?`${result.fullSkips} full-skip task types${result.boundaryName?`; skip ${escape(result.boundaryName)} ${(result.boundary*100).toFixed(1)}% of the time`:''}.`:'No points-funded skips. Complete every offered non-target task.'}`:'No skips applied to this plan.'}</p></article></div>
      <div class="table-card"><div class="plan-task-list"><table><thead><tr><th scope="col">Task</th><th scope="col">Action</th><th scope="col">Chosen / offer</th><th scope="col">Estimated time</th></tr></thead><tbody>${rows.map(row=>{const [text,kind]=action(row);return `<tr><td>${escape(row.name)}</td><td><span class="status ${kind}">${escape(text)}</span></td><td>${pct(row.probability)}</td><td>${row.minutes.toFixed(1)} min</td></tr>`;}).join('')}</tbody></table></div></div>`;
  }
  function pointsWithoutSkips(result){
    const earned=result.rows.reduce((s,r)=>s+r.probability*r.reward,0);
    return result.average?earned*60/result.average:0;
  }
  function renderInputs(){
    const query=$('task-search').value.toLowerCase();
    const rows=data.creatures.map(c=>({...c,...overrides[c.id]})).filter(c=>(c.name+' '+c.representative).toLowerCase().includes(query));
    $('task-count').textContent=`${rows.length} task types`;
    $('input-rows').innerHTML=rows.map(c=>`<tr data-creature="${escape(c.id)}"><td><a href="${escape(c.source)}" target="_blank" rel="noopener">${escape(c.name)}</a><small>${escape(c.representative)}${c.level>settings.level?' · above your Slayer level':''}</small></td>
      <td><input type="checkbox" data-field="excluded" aria-label="Allow ${escape(c.name)}" ${!c.excluded?'checked':''}></td>
      <td><input type="number" data-field="level" aria-label="Minimum Slayer for ${escape(c.name)}" min="0" max="99" step="1" value="${c.level}" required></td>
      <td><input type="number" data-field="hp" aria-label="HP for ${escape(c.name)}" min="1" max="100000" step="1" value="${c.hp}" required></td>
      <td><input type="number" data-field="multiplier" aria-label="DPS multiplier for ${escape(c.name)}" min="0.01" max="100" step="0.01" value="${c.multiplier}" required></td></tr>`).join('')||'<tr><td colspan="5" class="empty">No matching creatures.</td></tr>';
  }
  function showView(view){
    for(const name of ['overview','inputs','method'])$(name+'-view').hidden=name!==view;
    document.querySelectorAll('[data-view]').forEach(button=>{button.classList.toggle('active',button.dataset.view===view);if(button.dataset.view===view)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
    if(view==='inputs')renderInputs();
  }
  function exportCsv(){
    const header=['Target','Slayer level','Master','Target chance','Wait hours no skips','Wait hours sustainable','Expected offers','Blocks','Full skip types','Boundary task','Boundary skip frequency','Points gained per hour','Points spent per hour'];
    const rows=results.map(r=>[creature().name,settings.level,r.master.name,r.chance,r.hours,r.sustainableHours,r.offers,r.blocks.map(b=>b.name).join('; '),r.fullSkips,r.boundaryName,r.boundary,r.pointsEarned,r.pointsSpent]);
    const csv=[header,...rows].map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}));
    const link=document.createElement('a');link.href=url;link.download='slayer-comparison-'+settings.target.replace(/[^a-z0-9]+/g,'-')+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  $('target').innerHTML=data.creatures.map(c=>`<option value="${escape(c.id)}">${escape(c.name)}</option>`).join('');
  $('source-link').href=data.source;$('method-source').href=data.source;
  $('setup-disclosure').open=!window.matchMedia('(max-width: 680px)').matches;
  syncSettings();recalculate();
  $('settings-form').addEventListener('submit',event=>event.preventDefault());
  $('settings-form').addEventListener('change',event=>{
    const input=event.target;if(!input.name||!$('settings-form').reportValidity())return;
    settings[input.name]=input.type==='checkbox'?input.checked:Number(input.value)/(input.name==='modifierChance'?100:1);
    recalculate();
  });
  $('target').onchange=()=>{settings.target=$('target').value;recalculate();};
  $('show-unavailable').onchange=()=>renderMasters(results.find(r=>r.available));
  $('sustainable').onclick=()=>{settings.sustainable=true;recalculate();};
  $('no-skips').onclick=()=>{settings.sustainable=false;recalculate();};
  document.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>showView(button.dataset.view));
  $('task-search').oninput=renderInputs;
  $('input-rows').addEventListener('change',event=>{
    const input=event.target;if(!input.dataset.field||!input.reportValidity())return;
    const id=input.closest('tr').dataset.creature, field=input.dataset.field;
    overrides[id]={...overrides[id],[field]:field==='excluded'?!input.checked:Number(input.value)};
    recalculate();
  });
  $('reset').onclick=()=>{settings={...data.defaults};overrides={};selectedMaster='';syncSettings();recalculate();if(!$('inputs-view').hidden)renderInputs();};
  $('export').onclick=exportCsv;
})();
