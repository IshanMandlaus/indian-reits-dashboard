// Shared NSE-style security modal (used by invits.html and global.html).
// openSecModal({ title, codes, ccy, series:{'YYYY-MM-DD':close}, livePrice, liveTag,
//                mkt:[[label,value],...], profile:[[label,value],...], profileTitle })
(function(){
const CSS=`
#secmodal{display:none;position:fixed;inset:0;background:rgba(9,13,20,.75);z-index:60;padding:4vh 6vw}
#secmodal.open{display:block}
#secmodal .box{background:var(--panel);border:1px solid var(--line);border-radius:12px;max-width:1150px;margin:0 auto;max-height:92vh;overflow:auto;padding:18px 22px}
#secmodal .mhead{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:4px}
#secmodal .mhead .t{font-size:18px;font-weight:700}
#secmodal .mhead .codes{color:var(--mut);font-size:12px}
#secmodal .closebtn{background:var(--panel2);color:var(--txt);border:1px solid var(--line);border-radius:6px;padding:4px 12px;cursor:pointer;font-size:13px}
#secmodal .pxbig{font-size:24px;font-weight:700;margin:2px 0}
#secmodal .pxbig .chg{font-size:14px;margin-left:8px}
#secmodal .ranges{display:flex;gap:5px;margin:8px 0}
#secmodal .ranges button{padding:5px 12px;border:1px solid var(--line);border-radius:6px;background:var(--panel);cursor:pointer;font-size:12px;color:var(--mut)}
#secmodal .ranges button.active{background:var(--acc);color:#0d1520;border-color:var(--acc)}
#secmodal .mch{position:relative;height:380px;margin-bottom:14px}
#secmodal .statgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:9px;margin-bottom:12px}
#secmodal .stat{background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:8px 11px}
#secmodal .stat .dl{font-size:10.5px;color:var(--mut);text-transform:uppercase;letter-spacing:.04em}
#secmodal .stat .dv{font-size:14.5px;font-weight:650;margin-top:1px}
#secmodal .sechead{font-size:12px;font-weight:700;color:var(--acc);text-transform:uppercase;letter-spacing:.06em;margin:10px 0 7px}
#secmodal .nochart{color:var(--mut);font-size:13px;padding:30px 0;text-align:center}`;
const HTML=`
<div class="box">
  <div class="mhead"><div><span class="t" id="secm_t"></span> <span class="codes" id="secm_codes"></span></div>
    <button class="closebtn" onclick="document.getElementById('secmodal').classList.remove('open')">✕ close</button></div>
  <div class="pxbig" id="secm_px"></div>
  <div class="ranges" id="secm_ranges"></div>
  <div class="mch" id="secm_wrap"><canvas id="secm_chart"></canvas></div>
  <div class="sechead">Market metrics</div>
  <div class="statgrid" id="secm_mkt"></div>
  <div class="sechead" id="secm_ptitle">Profile</div>
  <div class="statgrid" id="secm_profile"></div>
</div>`;
function ensureDom(){
  if(document.getElementById('secmodal'))return;
  const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
  const dv=document.createElement('div');dv.id='secmodal';dv.innerHTML=HTML;document.body.appendChild(dv);
  dv.addEventListener('click',e=>{if(e.target.id==='secmodal')dv.classList.remove('open');});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')dv.classList.remove('open');});
}
let chart=null,cur=null;
const sym=c=>({USD:'$',INR:'₹',JPY:'¥',HKD:'HK$',CNY:'¥',SGD:'S$',AUD:'A$'})[c]||((c||'')+' ');
const fmt=(v,d=2)=>v==null?'–':Number(v).toLocaleString('en-US',{maximumFractionDigits:d});
function draw(daysBack){
  const {series,livePrice,ccy}=cur;
  const dates=Object.keys(series).sort();
  const wrap=document.getElementById('secm_wrap');
  if(dates.length<2){wrap.innerHTML='<div class="nochart">No price history yet — run ⟳ Refresh (with serve.py) to pull it.</div>';return;}
  if(!document.getElementById('secm_chart'))wrap.innerHTML='<canvas id="secm_chart"></canvas>';
  const cut=new Date(dates[dates.length-1]);cut.setDate(cut.getDate()-daysBack);
  const cutS=cut.toISOString().slice(0,10);
  const dd=dates.filter(d=>d>=cutS), vals=dd.map(d=>series[d]);
  if(livePrice){dd.push('live');vals.push(livePrice);}
  const up=vals[vals.length-1]>=vals[0], col=up?'#4fd1a5':'#f07d7d';
  if(chart)chart.destroy();
  const zoomOpt=(window.Chart&&Chart.registry&&Chart.registry.plugins.get('zoom'))?
    {zoom:{wheel:{enabled:true},pinch:{enabled:true},mode:'x'},pan:{enabled:true,mode:'x',modifierKey:'shift'}}:false;
  chart=new Chart(document.getElementById('secm_chart'),{type:'line',
    data:{labels:dd,datasets:[{data:vals,borderColor:col,borderWidth:1.8,pointRadius:0,fill:true,
      backgroundColor:c=>{const g=c.chart.ctx.createLinearGradient(0,0,0,c.chart.height);g.addColorStop(0,col+'33');g.addColorStop(1,col+'00');return g;}}]},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      plugins:{legend:{display:false},zoom:zoomOpt},
      scales:{x:{ticks:{maxTicksLimit:12}},y:{title:{display:true,text:sym(ccy).trim()+' / unit'}}}}});
  document.getElementById('secm_chart').ondblclick=()=>chart.resetZoom();
}
window.openSecModal=function(cfg){
  ensureDom();cur=cfg;
  const {series={},livePrice,ccy}=cfg;
  const dates=Object.keys(series).sort();
  const lastHist=dates.length?series[dates[dates.length-1]]:null;
  const lastP=livePrice??lastHist;
  const prevP=dates.length>1?series[dates[dates.length-(livePrice?1:2)]]:null;
  const chg=prevP&&lastP?(lastP/prevP-1)*100:null;
  document.getElementById('secm_t').textContent=cfg.title;
  document.getElementById('secm_codes').textContent=cfg.codes||'';
  document.getElementById('secm_px').innerHTML=(lastP!=null?sym(ccy)+fmt(lastP):'–')+
    (cfg.liveTag?' <span style="font-size:11px;color:var(--mut);font-weight:400">'+cfg.liveTag+'</span>':'')+
    (chg!=null?`<span class="chg" style="color:${chg>=0?'var(--grn)':'var(--red)'}">${chg>=0?'▲':'▼'} ${Math.abs(chg).toFixed(2)}%</span>`:'');
  const grid=(id,pairs)=>document.getElementById(id).innerHTML=
    (pairs||[]).filter(p=>p[1]!=null&&p[1]!=='').map(([l,v])=>`<div class="stat"><div class="dl">${l}</div><div class="dv">${v}</div></div>`).join('');
  grid('secm_mkt',cfg.mkt);grid('secm_profile',cfg.profile);
  document.getElementById('secm_ptitle').textContent=cfg.profileTitle||'Profile';
  const R=[['1M',31],['3M',92],['6M',184],['1Y',366],['3Y',1097],['5Y',1828],['Max',99999]];
  document.getElementById('secm_ranges').innerHTML=R.map(([l,d])=>
    `<button class="${l==='1Y'?'active':''}" onclick="this.parentNode.querySelectorAll('button').forEach(x=>x.classList.remove('active'));this.classList.add('active');window._secDraw(${d})">${l}</button>`).join('');
  window._secDraw=draw;
  document.getElementById('secmodal').classList.add('open');
  draw(366);
};
})();
