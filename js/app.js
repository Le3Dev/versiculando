/* Versiculando: montagem do plano, prévia, Pix e entrega. */
(async function () {
  const P = window.Plano;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* modo privado */ } },
  };
  const toastEl = $('#toast'); let toastT;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2600); }

  const PIX = { chave: '6126c5e7-2db6-4e46-87b0-12794d60b4d6', nome: 'VERSICULANDO', cidade: 'BRASIL', valor: '9.90' };
  const COR = { B: ['--amarelo', '--amarelo-f'], N: ['--azul', '--azul-f'], E: ['--rosa', '--rosa-f'], S: ['--verde', '--verde-f'] };
  const CAPS = { B: '1.189 capítulos', N: '260 capítulos', E: '117 capítulos', S: '181 capítulos' };
  const UA = navigator.userAgent;
  const IOS = /iPhone|iPad|iPod/.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1);
  const ANDROID = /Android/.test(UA);
  const INAPP = /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Bytedance|BytedanceWebview|Line\/|Snapchat|Pinterest/i.test(UA);

  P.usarIndice(await fetch('/b/livros.json').then((r) => r.json()));

  const hoje = P.hojeIso();
  const ANO_NOVO = hoje < '2027-01-01' ? '2027-01-01' : null;
  const SEGUNDA = (() => { const wd = P.deIso(hoje).getDay(); return P.somaDias(hoje, ((8 - wd) % 7) || 7); })();

  /* ---------- estado ---------- */
  const st = Object.assign({ nome: '', presente: false, de: '', msg: '', g: 'B', o: 'm', d: 365, w: 7, ini: ANO_NOVO ? 'ano' : 'hoje', outra: '', h: '07:00' }, store.get('vers_rascunho', {}));
  if (st.ini === 'ano' && !ANO_NOVO) st.ini = 'hoje';
  const q = new URLSearchParams(location.search);
  const convite = P.lerCodigo(q.get('junto'));
  if (convite) {
    Object.assign(st, { g: convite.g, o: convite.o, d: convite.d, w: convite.w, presente: false });
    if (convite.s === ANO_NOVO) st.ini = 'ano'; else if (convite.s === hoje) st.ini = 'hoje'; else { st.ini = 'outra'; st.outra = convite.s < hoje ? hoje : convite.s; }
    const quem = (q.get('de') || '').replace(/[<>]/g, '').slice(0, 28).trim();
    if (quem) { $('#junto').hidden = false; $('#junto p').innerHTML = `<b>${esc(quem)}</b> te chamou pra ler junto. As opções já estão iguais às do plano que ${esc(quem)} montou. É só pôr o seu nome.`; }
  }
  function inicio() { return st.ini === 'ano' ? ANO_NOVO : st.ini === 'seg' ? SEGUNDA : st.ini === 'outra' && st.outra >= hoje ? st.outra : hoje; }
  function opcoes() {
    const G = P.OBJETIVOS[st.g];
    if (!G.duracoes.includes(st.d)) st.d = G.padrao;
    if (!G.ordens.includes(st.o)) st.o = G.ordens[0];
    return { g: st.g, o: st.o, d: st.d, w: st.w, s: inicio() };
  }
  const salvar = () => store.set('vers_rascunho', st);

  /* ---------- opções ---------- */
  function radio(nome, valor, marcado, rotulo, sub, extra = '') {
    return `<label class="chip"><input type="radio" name="${nome}" value="${valor}" ${marcado ? 'checked' : ''} ${extra}><span>${rotulo}${sub ? `<small>${sub}</small>` : ''}</span></label>`;
  }
  function montarObjs() {
    $('#objs').innerHTML = Object.entries(P.OBJETIVOS).map(([k, G]) =>
      `<label class="obj"><input type="radio" name="g" value="${k}" ${st.g === k ? 'checked' : ''}><span class="cx"><i style="--c:var(${COR[k][0]})"></i><span class="t"><b>${G.nome}</b><small>${CAPS[k]}</small></span></span></label>`).join('');
  }
  function montarOpcoes() {
    const o = opcoes(); const G = P.OBJETIVOS[st.g];
    $('#durs').innerHTML = G.duracoes.map((d) => {
      const pl = P.gerar({ ...o, d }); return radio('d', d, d === st.d, P.DURACAO[d], `${pl.minMedio} min por dia`);
    }).join('');
    $('#ordemCampo').hidden = G.ordens.length < 2;
    const ORD = st.g === 'S' ? P.ORDENS_S : P.ORDENS;
    $('#ordens').innerHTML = G.ordens.map((k) => radio('o', k, k === st.o, ORD[k])).join('');
    $('#semanas').innerHTML = [7, 6, 5].map((w) => radio('w', w, w === st.w, P.SEMANA[w])).join('');
    const ini = [];
    if (ANO_NOVO) ini.push(['ano', '1º de janeiro']);
    ini.push(['hoje', 'Hoje'], ['seg', 'Segunda, ' + P.dataCurta(SEGUNDA)], ['outra', st.ini === 'outra' && st.outra ? P.dataCurta(st.outra) : 'Outra data']);
    $('#inicios').innerHTML = ini.map(([k, r]) => radio('ini', k, k === st.ini, r)).join('');
    const di = $('#dataOutra'); di.hidden = st.ini !== 'outra'; di.min = hoje; di.max = '2028-12-31'; if (st.outra) di.value = st.outra;
  }

  /* ---------- capa ---------- */
  function capa(o, plano) {
    const G = P.OBJETIVOS[o.g];
    document.documentElement.style.setProperty('--marca', `var(${COR[o.g][0]})`);
    document.documentElement.style.setProperty('--marca-f', `var(${COR[o.g][1]})`);
    const nm = st.nome.trim(); $('#cNome').innerHTML = nm ? esc(nm) : '<span class="vazio">seu nome</span>';
    $('#cNome').parentElement.style.fontSize = Math.max(6.5, Math.min(13, 13 * 10 / Math.max(10, nm.length))) + 'cqw';
    const pr = $('#cPresente'); pr.hidden = !(st.presente && st.de.trim()); pr.querySelector('span').textContent = st.de.trim();
    const a = o.s.slice(0, 4), b = plano.fim.slice(0, 4); $('#cAno').textContent = a === b ? a : a + '–' + b.slice(2);
    $('#cObj').textContent = G.nome;
    $('#cDur').textContent = 'em ' + P.DURACAO[o.d] + (o.g === 'B' && o.o === 'm' ? ', Antigo e Novo juntos' : '');
    const n = plano.dias.length; const cols = n > 300 ? 37 : n > 160 ? 30 : n > 70 ? 20 : 14;
    const box = $('#cPontos'); box.style.setProperty('--cols', cols);
    if (box.childElementCount !== n) box.innerHTML = '<i></i>'.repeat(n);
  }

  /* ---------- prévia ---------- */
  let planoAtual = null;
  function previa(o, plano) {
    planoAtual = plano;
    const nm = st.nome.trim();
    $('#tPrevia').textContent = nm ? (st.presente ? 'O plano de ' + nm : 'O seu plano, ' + nm) : 'O seu plano';
    const folga = { 7: '', 6: ' Domingo é folga.', 5: ' Sábado e domingo são folga.' }[o.w];
    $('#resumo').innerHTML = `<b>${plano.dias.length} leituras</b>, de ${P.dataLonga(o.s)} a ${P.dataLonga(plano.fim)}. Cerca de <b>${plano.minMedio} minutos</b> por dia.${folga}`;
    // calendário
    const porData = new Map(plano.dias.map((d) => [d.data, d]));
    let html = ''; let d = P.deIso(o.s); d.setDate(1); const fim = P.deIso(plano.fim); let anoAnt = null;
    const variosAnos = o.s.slice(0, 4) !== plano.fim.slice(0, 4);
    while (d <= fim) {
      const y = d.getFullYear(), m = d.getMonth(); const nd = new Date(y, m + 1, 0).getDate();
      if (variosAnos && y !== anoAnt) { html += `<span class="m ano-n">${y}</span>`; anoAnt = y; }
      html += `<span class="m">${P.MES3[m]}</span>`;
      for (let k = 1; k <= 31; k++) {
        if (k > nd) { html += '<span></span>'; continue; }
        const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(k).padStart(2, '0')}`;
        const dia = porData.get(iso); const dentro = iso >= o.s && iso <= plano.fim;
        const cls = dia ? (dia.n === 1 ? 'l ini' : 'l') : dentro ? 'f' : 'x';
        const lab = dia ? `${k} de ${P.MESES[m]}: ${P.rotulo(dia.t, true)}` : dentro ? `${k} de ${P.MESES[m]}: folga` : `${k} de ${P.MESES[m]}`;
        html += `<button type="button" class="${cls}" data-d="${iso}" aria-label="${lab}" ${cls === 'x' ? 'tabindex="-1"' : ''}></button>`;
      }
      d = new Date(y, m + 1, 1, 12);
    }
    $('#ano').innerHTML = html;
    mostrarDia(plano.dias[0].data);
    $('#semana').innerHTML = plano.dias.slice(0, 7).map((x) =>
      `<li><span class="d">${P.dataCurta(x.data)}<small>${P.semana(x.data)}</small></span><span>${esc(P.rotulo(x.t, true))}</span><span class="min">${x.min} min</span></li>`).join('');
    $('#lerDia1').href = '/ler?r=' + P.refParam(plano.dias[0].t);
  }
  function mostrarDia(iso) {
    const plano = planoAtual; if (!plano) return;
    $('#ano').querySelectorAll('.sel').forEach((b) => b.classList.remove('sel'));
    const b = $(`#ano [data-d="${iso}"]`); if (b) b.classList.add('sel');
    const dia = plano.dias.find((x) => x.data === iso);
    const quando = `${P.semana(iso)}, ${P.dataLonga(iso)}`;
    $('#diaInfo').innerHTML = dia
      ? `<b>Dia ${dia.n}</b>, ${quando}<br>${esc(P.rotulo(dia.t, true))} <span style="color:var(--tinta-2)">(${dia.min} min)</span>`
      : iso >= plano.o.s && iso <= plano.fim ? `<b>Folga</b>, ${quando}<br><span style="color:var(--tinta-2)">Dia bom pra pôr a leitura em dia.</span>` : '';
  }
  $('#ano').addEventListener('click', (e) => { const b = e.target.closest('button[data-d]'); if (b && !b.classList.contains('x')) mostrarDia(b.dataset.d); });

  /* ---------- compra e entrega ---------- */
  const chaveCompra = (o) => P.codigo(o) + '|' + st.nome.trim() + '|' + (st.presente ? st.de.trim() : '');
  function compraAtual(o) { return store.get('vers_compras', []).find((c) => c.k === chaveCompra(o)); }

  function tudo(reconstruir) {
    const o = opcoes();
    if (reconstruir) montarOpcoes();
    else { // só atualiza os minutos por dia das durações
      $('#durs').querySelectorAll('input').forEach((i) => { const pl = P.gerar({ ...o, d: +i.value }); i.nextElementSibling.querySelector('small').textContent = pl.minMedio + ' min por dia'; });
    }
    const plano = P.gerar(o);
    capa(o, plano); previa(o, plano); resumoMais(o);
    const c = compraAtual(o);
    $('#oferta').hidden = !!c; $('#entrega').hidden = !c;
    if (c) entregar(c, false);
    salvar();
  }

  function resumoMais(o) {
    const ORD = st.g === 'S' ? P.ORDENS_S : P.ORDENS;
    const ordem = P.OBJETIVOS[st.g].ordens.length > 1 ? ORD[o.o] + '. ' : '';
    const quando = o.s === hoje ? 'começando hoje' : 'começando em ' + P.dataLonga(o.s);
    const hh = (st.h || '07:00').replace(/^0/, '').replace(':00', 'h').replace(':', 'h');
    $('#maisResumo').textContent = `${ordem}${P.SEMANA[o.w]}, ${quando}. Lembrete às ${hh}.`;
  }
  $('#btnVer').addEventListener('click', () => { $('#previa').scrollIntoView({ behavior: 'smooth', block: 'start' }); });

  /* ---------- eventos do formulário ---------- */
  $('#nome').value = st.nome; $('#presente').checked = st.presente; $('#de').value = st.de; $('#msg').value = st.msg; $('#hora').value = st.h;
  $('#presenteBox').hidden = !st.presente;
  $('#nome').addEventListener('input', (e) => { st.nome = e.target.value.replace(/[<>]/g, ''); $('#notaNome').hidden = true; tudo(false); });
  $('#presente').addEventListener('change', (e) => { st.presente = e.target.checked; $('#presenteBox').hidden = !st.presente; $('#nome').placeholder = st.presente ? 'Nome de quem vai ganhar' : 'Nome que vai na capa'; tudo(false); });
  $('#de').addEventListener('input', (e) => { st.de = e.target.value.replace(/[<>]/g, ''); tudo(false); });
  $('#msg').addEventListener('input', (e) => { st.msg = e.target.value; salvar(); });
  $('#hora').addEventListener('change', (e) => { st.h = e.target.value || '07:00'; resumoMais(opcoes()); salvar(); });
  $('#montar').addEventListener('change', (e) => {
    const t = e.target; if (t.type !== 'radio' && t.id !== 'dataOutra') return;
    if (t.name === 'g') { st.g = t.value; tudo(true); return; }
    if (t.name === 'd') st.d = +t.value;
    if (t.name === 'o') st.o = t.value;
    if (t.name === 'w') st.w = +t.value;
    if (t.name === 'ini') { st.ini = t.value; if (st.ini === 'outra') { $('#dataOutra').hidden = false; if (!st.outra) { st.outra = SEGUNDA; } setTimeout(() => $('#dataOutra').focus(), 50); } tudo(true); return; }
    if (t.id === 'dataOutra') { if (t.value && t.value >= hoje) st.outra = t.value; tudo(true); return; }
    tudo(false);
  });
  $('#nome').placeholder = st.presente ? 'Nome de quem vai ganhar' : 'Nome que vai na capa';
  montarObjs();
  tudo(true);

  /* ---------- Stories ---------- */
  let storyCanvas = null;
  $('#btnStory').addEventListener('click', async () => {
    const o = opcoes(); $('#story').hidden = false;
    storyCanvas = await window.Cards.story({ o, nome: st.presente ? '' : st.nome.trim() });
    const b = await window.Cards.blob(storyCanvas); $('#storyImg').src = URL.createObjectURL(b);
  });
  $('#storyCompartilhar').addEventListener('click', async () => { if (storyCanvas) { const r = await window.Cards.compartilhar(storyCanvas, 'meu-plano-biblia.png', 'Vou ler a Bíblia com um plano em 2027. Bora junto? Monte o seu em versiculando.vercel.app'); if (r === 'baixado') toast('Imagem salva'); } });
  document.addEventListener('click', (e) => { if (e.target.closest('[data-fechar-story]')) $('#story').hidden = true; });

  /* ---------- Pix ---------- */
  const emv = (id, v) => id + String(v.length).padStart(2, '0') + v;
  function crc16(s) { let c = 0xFFFF; for (let i = 0; i < s.length; i++) { c ^= s.charCodeAt(i) << 8; for (let j = 0; j < 8; j++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF; } return c.toString(16).toUpperCase().padStart(4, '0'); }
  function brCode(txid) {
    const p = emv('00', '01') + emv('26', emv('00', 'br.gov.bcb.pix') + emv('01', PIX.chave)) + emv('52', '0000') + emv('53', '986') + emv('54', PIX.valor) + emv('58', 'BR') + emv('59', PIX.nome) + emv('60', PIX.cidade) + emv('62', emv('05', txid)) + '6304';
    return p + crc16(p);
  }
  function novoTxid() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const r = crypto.getRandomValues(new Uint8Array(12)); let s = 'VRS'; for (const b of r) s += a[b % a.length]; return s; }
  let txid = null, pagoT = null, pagoLongo = null;
  function agendarPago(ms) { clearTimeout(pagoT); pagoT = setTimeout(() => { $('#pagoBox').hidden = false; }, ms); }
  function abrirPix() {
    const nm = st.nome.trim();
    if (!nm || (st.presente && !st.de.trim())) {
      const n = $('#notaNome'); n.hidden = false; n.classList.add('erro');
      n.textContent = !nm ? (st.presente ? 'Escreva o nome de quem vai ganhar o presente.' : 'Escreva o nome que vai na capa antes de pagar.') : 'Escreva o seu nome, de quem está dando o presente.';
      const alvo = !nm ? $('#nome') : $('#de'); alvo.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => alvo.focus({ preventScroll: true }), 350); return;
    }
    txid = novoTxid(); const code = brCode(txid);
    $('#pixCodigo').textContent = code;
    if (typeof qrcode === 'function') { const qr = qrcode(0, 'M'); qr.addData(code); qr.make(); $('#pixQr').src = qr.createDataURL(6, 2); }
    $('#pagoBox').hidden = true; $('#folha').hidden = false; document.body.style.overflow = 'hidden';
    clearTimeout(pagoLongo); pagoLongo = setTimeout(() => { $('#pagoBox').hidden = false; }, 30000);
    setTimeout(() => $('#pixCopiar').focus(), 60);
  }
  function fecharPix() { $('#folha').hidden = true; document.body.style.overflow = ''; clearTimeout(pagoT); clearTimeout(pagoLongo); }
  $('#btnComprar').addEventListener('click', abrirPix);
  $('#folha').addEventListener('click', (e) => { if (e.target.closest('[data-fechar]')) fecharPix(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!$('#folha').hidden) fecharPix(); $('#story').hidden = true; } });
  $('#pixCopiar').addEventListener('click', async () => {
    const code = $('#pixCodigo').textContent;
    try { await navigator.clipboard.writeText(code); } catch (e) {
      const r = document.createRange(); r.selectNodeContents($('#pixCodigo')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); try { document.execCommand('copy'); } catch (e2) { /* nada */ }
    }
    $('#pixCopiar').textContent = 'Código copiado'; setTimeout(() => { $('#pixCopiar').textContent = 'Copiar código Pix'; }, 2500);
    toast('Código copiado. Agora cole no app do banco.'); agendarPago(10000);
  });
  $('.pix-qr').addEventListener('toggle', (e) => { if (e.target.open) agendarPago(10000); });
  $('#btnPago').addEventListener('click', () => {
    const o = opcoes();
    const c = { k: chaveCompra(o), p: P.codigo(o), n: st.nome.trim(), de: st.presente ? st.de.trim() : '', msg: st.presente ? st.msg.trim() : '', h: st.h, tx: txid, t: Date.now() };
    const lista = store.get('vers_compras', []).filter((x) => x.k !== c.k); lista.unshift(c); store.set('vers_compras', lista.slice(0, 20));
    if (!c.de) store.set('vers_plano', { p: c.p, n: c.n, h: c.h });
    fecharPix(); $('#oferta').hidden = true; $('#entrega').hidden = false; entregar(c, true);
  });

  /* ---------- entrega ---------- */
  function qs(obj) { return Object.entries(obj).filter(([, v]) => v).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&'); }
  let wallCanvas = null;
  async function entregar(c, rolar) {
    const o = P.lerCodigo(c.p); const plano = P.gerar(o); const G = P.OBJETIVOS[o.g];
    const h = (c.h || '07:00').replace(':', '');
    $('#tEntrega').textContent = c.de ? 'Presente pronto!' : 'Tudo pronto, ' + c.n + '!';
    $('#entregaResumo').innerHTML = `${c.de ? 'O plano de ' + esc(c.n) : 'Seu plano'}: <b>${G.nome} em ${P.DURACAO[o.d]}</b>, de ${P.dataLonga(o.s)} a ${P.dataLonga(plano.fim)}.`;
    $('#inapp').hidden = !INAPP;
    const base = qs({ p: c.p, n: c.n, h });
    const ics = '/api/calendario?' + base, google = ics + '&tipo=google', icsDl = ics + '&dl=1';
    const hh = c.h || '07:00';
    let btns = '', txt = '';
    if (IOS) { txt = `Toque em “Adicionar todos”. Entram ${plano.dias.length} lembretes no Calendário, um por leitura, às ${hh}, cada um com o link do texto.`; btns = `<a class="btn" href="${ics}">Adicionar ao Calendário</a><a class="btn claro" href="${google}" target="_blank" rel="noopener">Usar Google Agenda</a>`; }
    else if (ANDROID) { txt = `Vai abrir o Google Agenda com um lembrete diário às ${hh}. Toque em Salvar. O lembrete traz o link da leitura do dia.`; btns = `<a class="btn" href="${google}" target="_blank" rel="noopener">Adicionar ao Google Agenda</a><a class="btn claro" href="${icsDl}">Baixar arquivo .ics</a>`; }
    else { txt = `No iPhone, Mac ou Outlook, use o arquivo: entram ${plano.dias.length} lembretes, um por leitura, às ${hh}. No Google Agenda, entra um lembrete diário com o link da leitura do dia.`; btns = `<a class="btn" href="${icsDl}">Baixar arquivo .ics</a><a class="btn claro" href="${google}" target="_blank" rel="noopener">Adicionar ao Google Agenda</a>`; }
    if (c.de) { txt = 'Se quiser, coloque no seu calendário também. A pessoa que ganhou o presente faz isso pelo link do presente.'; }
    $('#calTexto').textContent = txt; $('#calBtns').innerHTML = btns;
    const pdfQ = qs({ p: c.p, n: c.n, de: c.de, msg: c.msg, h });
    $('#pdfBaixar').href = '/api/planner?' + pdfQ + '&dl=1'; $('#pdfAbrir').href = '/api/planner?' + pdfQ;
    const meses = new Set(plano.dias.map((d) => d.data.slice(0, 7))).size;
    $('#pdfTexto').textContent = `PDF em A4 com ${meses} ${meses > 1 ? 'meses' : 'mês'} de leituras, quadro dos livros, diário e certificado. Dá pra imprimir em casa ou numa copiadora.`;
    const hojeQ = qs({ p: c.p, n: c.n, h });
    $('#hojeLink').href = '/hoje?' + hojeQ;
    const presente = location.origin + '/hoje?' + qs({ p: c.p, n: c.n, h, de: c.de, msg: c.msg }) + '&g=1';
    $('#passoPresente').hidden = !c.de;
    if (c.de) {
      $('#presenteZap').href = 'https://wa.me/?text=' + encodeURIComponent(`${c.n}, preparei um presente pra você: um plano de leitura da Bíblia com o seu nome. Abre aqui:\n${presente}`);
      $('#presenteCopiar').onclick = async () => { try { await navigator.clipboard.writeText(presente); toast('Link do presente copiado'); } catch (e) { prompt('Copie o link:', presente); } };
    }
    const convite = location.origin + '/?' + qs({ junto: c.p, de: c.de ? '' : c.n });
    $('#juntoZap').href = 'https://wa.me/?text=' + encodeURIComponent(`Bora ler ${G.curto} comigo? Montei meu plano no Versiculando. Abre e coloca o seu nome:\n${convite}`);
    // papel de parede
    wallCanvas = await window.Cards.wallpaper({ o, nome: c.n });
    const b = await window.Cards.blob(wallCanvas); $('#wallImg').src = URL.createObjectURL(b);
    const abs = (u) => location.origin + u;
    const linhas = [`Meu plano de leitura da Bíblia${c.de ? ' (presente para ' + c.n + ')' : ''}: ${G.nome} em ${P.DURACAO[o.d]}`, '',
      'Planner para imprimir:', abs('/api/planner?' + pdfQ), '', 'Leitura de hoje:', abs('/hoje?' + hojeQ), '', 'Pôr no calendário:', abs(IOS ? ics : google)];
    if (c.de) linhas.push('', 'Link do presente:', presente);
    $('#guardarZap').href = 'https://wa.me/?text=' + encodeURIComponent(linhas.join('\n'));
    $('#navHoje').hidden = false; $('#navHoje').href = '/hoje?' + hojeQ;
    if (rolar) { $('#entrega').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('#entrega').focus({ preventScroll: true }); toast('Pagamento confirmado. Seu plano está pronto.'); }
  }
  $('#wallSalvar').addEventListener('click', async () => { if (wallCanvas) { const r = await window.Cards.compartilhar(wallCanvas, 'papel-de-parede-versiculando.png', ''); if (r === 'baixado') toast('Imagem salva'); } });

  // atalho para a leitura de hoje de quem já comprou
  const ult = store.get('vers_plano', null);
  if (ult && ult.p) { $('#navHoje').hidden = false; $('#navHoje').href = '/hoje?' + qs({ p: ult.p, n: ult.n, h: (ult.h || '').replace(':', '') }); }
})();
