const $=id=>document.getElementById(id), seats=['J1','J2','J3','J4'];
let pub=null, view=null, actions=[], waitingFor=null, selected=null, covered=false, toastTimer;
const team=j=>j==='J1'||j==='J3'?'A':'B';
const suitColor=s=>s==='♦'||s==='♥'?'red':'';
async function request(url,options={}){
  const r=await fetch(url,{headers:{'content-type':'application/json'},...options});
  const d=await r.json();if(!r.ok)throw new Error(d.erro||'Não foi possível concluir a ação.');return d;
}
function showError(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}
function cardHTML(card,back=false){return back||!card?'<div class="playing-card back"><span>♣</span></div>':`<div class="playing-card ${suitColor(card.naipe)}"><b>${card.valor}</b><span>${card.naipe}</span><small>${card.valor}${card.naipe}</small></div>`;}
function setPublic(next){pub=next;$('score-a').textContent=next.placar.A;$('score-b').textContent=next.placar.B;$('dealer-label').textContent=`Carteador: ${next.carteador||'—'}`;
  const m=next.mao;$('hand-status').textContent=next.estado==='PARTIDA_ENCERRADA'?'FIM DE JOGO':next.estado==='MAO_ENCERRADA'?'MÃO ENCERRADA':m?`MÃO ${m.tipo.toUpperCase()}`:'NOVA PARTIDA';
  const vira=$('vira-card');if(m?.vira){vira.className=`playing-card small ${suitColor(m.vira.naipe)}`;vira.innerHTML=`<b>${m.vira.valor}</b><span>${m.vira.naipe}</span><small>${m.vira.valor}${m.vira.naipe}</small>`;}else{vira.className='playing-card small back';vira.textContent='♣';}
  $('manilha-label').textContent=m?`Manilha: ${m.manilha} · ordem ♦ ♠ ♥ ♣`:'Manilha: —';$('value-label').textContent=m?`Mão valendo ${m.valor} ${m.valor===1?'ponto':'pontos'}`:'Mão valendo 1 ponto';
  renderRounds(m);renderHeader();}
function renderRounds(m){const box=$('rounds');if(!m||!m.rodadas.length){box.innerHTML='<div class="empty-table">A mesa está pronta para a primeira carta.</div>';return;}
  box.innerHTML=m.rodadas.map((r,i)=>`<section class="round ${r.resultado?'complete':''}"><div class="round-title"><span>RODADA ${i+1}</span><small>${r.resultado?`Resultado: ${r.resultado==='E'?'EMPATE':'DUPLA '+r.resultado}`:`Abriu ${r.abriu}`}</small></div><div class="trick-cards">${r.jogadas.map(g=>`<div class="played ${g.jogador===view?.jogador?'mine':''}"><span class="seat-label">${g.jogador}</span>${cardHTML(g.carta,g.coberta)}<small>${g.coberta?'coberta':team(g.jogador)==='A'?'Dupla A':'Dupla B'}</small></div>`).join('')}${Array.from({length:4-r.jogadas.length},()=>'<div class="played pending"><span class="seat-label">·</span><div class="empty-card">—</div><small>aguardando</small></div>').join('')}</div></section>`).join('');}
function renderHeader(){if(!pub)return;const e=pub.estado,m=pub.mao;const actor=waitingFor||view?.jogador||m?.vez;
  $('phase').textContent=e==='PARTIDA_ENCERRADA'?'PARTIDA ENCERRADA':e==='MAO_ENCERRADA'?'MÃO FINALIZADA':m?.tipo==='ferro'?'MÃO DE FERRO':m?.tipo==='onze'?'MÃO DE ONZE':'PARTIDA LOCAL · QUATRO JOGADORES';
  $('headline').textContent=e==='PARTIDA_ENCERRADA'?`Dupla ${pub.vencedora} venceu!`:e==='MAO_ENCERRADA'?`Dupla ${m?.resultado==='NINGUEM'?'ninguém':m?.resultado} levou a mão.`:m?.pedidoPendente?`${m.pedidoPendente.valorProposto===3?'Truco':m.pedidoPendente.valorProposto===6?'Seis':m.pedidoPendente.valorProposto===9?'Nove':'Doze'} pedido!`:e==='AGUARDANDO_DECISAO_ONZE'?'Mão de onze.':'Truco Paulista.';
  $('subhead').textContent=e==='PARTIDA_ENCERRADA'?'Partida encerrada aos 12 pontos.':e==='MAO_ENCERRADA'?'Confira o placar e distribua a próxima mão.':m?.pedidoPendente?`Dupla ${team(m.pedidoPendente.jogador)} pediu ${m.pedidoPendente.valorProposto} pontos.`:'Duas duplas, três cartas por jogador e uma vira para definir as manilhas.';
  $('status-title').textContent=actor?`Vez de ${actor} · Dupla ${team(actor)}`:'Partida pronta';
  $('status-icon').textContent=actor||'♠';$('status-message').textContent=e==='AGUARDANDO_RESPOSTA'?'A dupla adversária deve aceitar, correr ou aumentar.':e==='AGUARDANDO_DECISAO_ONZE'?'A dupla com onze decide se joga ou corre.':e==='MAO_ENCERRADA'?'A mão terminou.':e==='PARTIDA_ENCERRADA'?'Jogue uma nova partida quando quiser.':actor?'Jogue uma carta ou peça truco.':'Inicie uma nova partida.';
  $('turn-badge').textContent=actor?`DUPLA ${team(actor)}`:'4 JOGADORES';}
function renderHand(){const box=$('hand');
  if(!view){$('player-title').textContent='Aguardando turno';$('card-count').textContent='—';box.innerHTML='<div class="empty-hand">Suas cartas aparecem quando chegar sua vez.</div>';renderActions();return;}
  $('player-title').textContent=`${view.jogador} · Dupla ${team(view.jogador)}`;$('card-count').textContent=`${view.minhasCartas.length} cartas`;
  $('partner-note').classList.toggle('hidden',!view.cartasDoParceiro);
  if(view.cartasDoParceiro)$('partner-note').textContent=`Mão de onze: você também pode ver as ${view.cartasDoParceiro.length} cartas do parceiro.`;
  const canPlay=actions.some(a=>a.tipo==='JOGAR'), canCover=actions.some(a=>a.tipo==='JOGAR_COBERTA');covered=covered&&canCover;
  box.innerHTML=view.minhasCartas.map((c,i)=>`<button type="button" class="hand-card ${selected===i?'selected':''}" data-card="${i}" aria-label="${c?`${c.valor} ${c.naipe}`:'carta oculta'} ${i+1}" ${!canPlay?'disabled':''}>${cardHTML(c,view.tipo==='ferro')}</button>`).join('')||'<div class="empty-hand">Você não tem cartas nesta mão.</div>';
  box.querySelectorAll('[data-card]').forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.card);if(covered){sendAction({action:'play',player:view.jogador,index:i,coberta:true});}else{selected=i;renderHand();}}));
  renderActions();}
function renderActions(){const box=$('actions');if(!pub)return;const e=pub.estado;
  if(e==='MAO_ENCERRADA'){box.innerHTML='<button class="primary-button" id="next-hand">Distribuir próxima mão <span>→</span></button>';box.querySelector('#next-hand').addEventListener('click',nextHand);return;}
  if(e==='PARTIDA_ENCERRADA'){box.innerHTML='<button class="primary-button" id="new-inline">Nova partida <span>↻</span></button>';box.querySelector('#new-inline').addEventListener('click',newGame);return;}
  if(!view){box.innerHTML='';return;}
  let html='';
  if(actions.some(a=>a.tipo==='JOGAR_COBERTA'))html+='<button class="secondary-button" id="cover-toggle">Carta coberta</button>';
  const raise=actions.find(a=>a.tipo==='PEDIR_AUMENTO');if(raise)html+=`<button class="raise-button" id="raise">Pedir ${raise.rotulo}</button>`;
  if(e==='AGUARDANDO_RESPOSTA') for(const a of actions) html+=`<button class="${a.tipo==='CORRER'?'secondary-button':a.tipo==='AUMENTAR'?'raise-button':'primary-button'}" data-answer="${a.tipo}">${a.tipo==='ACEITAR'?'Aceitar':a.tipo==='CORRER'?'Correr':`Aumentar para ${a.rotulo}`}</button>`;
  if(e==='AGUARDANDO_DECISAO_ONZE')html+='<button class="primary-button" data-eleven="JOGAR">Jogar mão de onze</button><button class="secondary-button" data-eleven="CORRER">Correr</button>';
  if(e==='AGUARDANDO_JOGADA'&&selected!==null)html+='<button class="primary-button" id="play-selected">Jogar carta <span>→</span></button>';
  box.innerHTML=html;
  const coverBtn=box.querySelector('#cover-toggle');if(coverBtn)coverBtn.addEventListener('click',()=>{covered=!covered;coverBtn.classList.toggle('active',covered);coverBtn.textContent=covered?'Coberta ativada · escolha carta':'Carta coberta';});
  box.querySelector('#raise')?.addEventListener('click',()=>sendAction({action:'raise',player:view.jogador}));
  box.querySelectorAll('[data-answer]').forEach(b=>b.addEventListener('click',()=>sendAction({action:'answer',player:view.jogador,answer:b.dataset.answer})));
  box.querySelectorAll('[data-eleven]').forEach(b=>b.addEventListener('click',()=>sendAction({action:'eleven',player:view.jogador,decision:b.dataset.eleven})));
  box.querySelector('#play-selected')?.addEventListener('click',()=>sendAction({action:'play',player:view.jogador,index:selected,coberta:false}));}
function showHandoff(player){waitingFor=player;view=null;actions=[];selected=null;$('handoff-title').textContent=`Passe para ${player}.`;$('handoff-copy').textContent=`Jogador ${player.slice(1)} da Dupla ${team(player)}, pegue o dispositivo sem olhar as cartas anteriores.`;$('handoff').classList.remove('hidden');renderHand();renderHeader();}
async function sendAction(data){try{const result=await request('/api/action',{method:'POST',body:JSON.stringify(data)});selected=null;covered=false;setPublic(result.public);view=null;actions=[];if(result.public.proximo)showHandoff(result.public.proximo);else renderHand();}catch(e){showError(e.message);}}
async function ready(){try{const data=await request('/api/ready',{method:'POST',body:JSON.stringify({player:waitingFor})});view=data.view;actions=data.actions;waitingFor=null;$('handoff').classList.add('hidden');renderHeader();renderHand();}catch(e){showError(e.message);}}
async function newGame(){try{const result=await request('/api/new',{method:'POST',body:JSON.stringify({})});view=null;actions=[];setPublic(result.public);showHandoff(result.public.proximo);}catch(e){showError(e.message);}}
async function nextHand(){try{const result=await request('/api/next',{method:'POST',body:'{}'});view=null;actions=[];setPublic(result.public);showHandoff(result.public.proximo);}catch(e){showError(e.message);}}
async function init(){try{const status=await request('/api/status');if(status.estado==='SEM_PARTIDA'){setPublic({estado:'SEM_PARTIDA',placar:{A:0,B:0},carteador:null,vencedora:null,mao:null});view=null;renderHand();return;}setPublic(status);if(status.proximo)showHandoff(status.proximo);}catch(e){showError(e.message);}}
$('new-button').addEventListener('click',newGame);$('ready-button').addEventListener('click',ready);init();
