/* Versiculando: página da leitura de hoje (/hoje) e leitor de capítulos (/ler). */
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
  const app = $('#app');
  const UA = navigator.userAgent;
  const IOS = /iPhone|iPad|iPod/.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1);
  const ANDROID = /Android/.test(UA);
  const limpa = (s, n = 28) => String(s || '').replace(/[<>]/g, '').trim().slice(0, n);
  const qs = (obj) => Object.entries(obj).filter(([, v]) => v).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');

  P.usarIndice(await fetch('/b/livros.json').then((r) => r.json()));
  const hoje = P.hojeIso();

  /* ---------- tamanho da letra ---------- */
  let tam = store.get('vers_tam', 19);
  const aplicaTam = () => document.documentElement.style.setProperty('--tam', tam + 'px');
  aplicaTam();
  $('#btnMenor').onclick = () => { tam = Math.max(15, tam - 1); aplicaTam(); store.set('vers_tam', tam); };
  $('#btnMaior').onclick = () => { tam = Math.min(28, tam + 1); aplicaTam(); store.set('vers_tam', tam); };

  /* ---------- progresso ---------- */
  const feitos = (cod) => new Set(store.get('vers_feitos', {})[cod] || []);
  function marcar(cod, n, on) {
    const all = store.get('vers_feitos', {}); const s = new Set(all[cod] || []);
    if (on) s.add(n); else s.delete(n);
    all[cod] = [...s].sort((a, b) => a - b); store.set('vers_feitos', all);
  }
  function sequencia(plano, f) { // leituras seguidas concluídas até hoje (folgas não quebram)
    const ate = plano.dias.filter((d) => d.data <= hoje); let i = ate.length - 1;
    if (i >= 0 && ate[i].data === hoje && !f.has(ate[i].n)) i--;
    let n = 0; for (; i >= 0 && f.has(ate[i].n); i--) n++;
    return n;
  }

  /* ---------- livros ---------- */
  const cacheLivro = {};
  function livroJson(cod) { if (!cacheLivro[cod]) cacheLivro[cod] = fetch('/b/' + cod + '.json').then((r) => { if (!r.ok) throw new Error('livro'); return r.json(); }); return cacheLivro[cod]; }

  /* ---------- plano salvo ---------- */
  const q = new URLSearchParams(location.search);
  let salvo = store.get('vers_plano', null);
  const ehLer = /^\/ler/.test(location.pathname);
  const pUrl = P.lerCodigo(q.get('p'));
  if (pUrl && !ehLer) {
    const novo = { p: q.get('p'), n: limpa(q.get('n')), h: (q.get('h') || '').replace(/[^\d:]/g, '').slice(0, 5), de: limpa(q.get('de')), msg: limpa(q.get('msg'), 400), g: q.get('g') === '1' };
    if (!salvo || salvo.p !== novo.p || salvo.n !== novo.n || novo.g) { salvo = Object.assign({}, salvo && salvo.p === novo.p ? salvo : {}, novo); store.set('vers_plano', salvo); }
  }

  /* ================= LEITURA DE HOJE ================= */
  function saudacao() { const h = new Date().getHours(); return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }
  function linkLer(dia, codigo) { return '/ler?' + qs({ r: P.refParam(dia.t), p: codigo, d: dia.n }); }

  function viewHoje() {
    document.title = 'Leitura de hoje · Versiculando';
    if (!salvo || !P.lerCodigo(salvo.p)) {
      app.innerHTML = `<section class="vazio"><h1>Você ainda não tem um plano neste aparelho</h1><p>Monte o seu em um minuto: escolha o que ler, em quanto tempo e quando começa.</p><a class="btn" href="/">Montar meu plano</a><p class="ou">Ou <button class="link" type="button" data-livros>abra a Bíblia</button> e leia do jeito que quiser.</p></section>`;
      return;
    }
    const o = P.lerCodigo(salvo.p); const plano = P.gerar(o); const G = P.OBJETIVOS[o.g]; const f = feitos(plano.codigo);
    const total = plano.dias.length, lidas = plano.dias.filter((d) => f.has(d.n)).length;
    const pct = Math.round((lidas / total) * 100);
    const diaHoje = plano.dias.find((d) => d.data === hoje);
    const atrasadas = plano.dias.filter((d) => d.data < hoje && !f.has(d.n));
    const proximas = plano.dias.filter((d) => d.data > hoje).slice(0, 3);
    const seq = sequencia(plano, f);
    const nome = salvo.n;
    let h = '';

    // presente
    if (salvo.g && salvo.de && !store.get('vers_presente_visto_' + plano.codigo, false)) {
      h += `<section class="presente-card"><p class="pc-de">Um presente de ${esc(salvo.de)}</p>${salvo.msg ? `<p class="pc-msg">${esc(salvo.msg)}</p>` : ''}<p class="pc-txt">${esc(nome || 'Você')} ganhou um plano para ler ${esc(G.curto)} em ${P.DURACAO[o.d]}. Baixe o planner com o seu nome e coloque as leituras no seu calendário.</p><div class="acoes col">${botoesArquivos(plano)}</div><button class="link pc-ok" type="button" data-visto>Já peguei, esconder</button></section>`;
    }

    h += `<section class="hoje"><p class="ola">${saudacao()}${nome ? ', ' + esc(nome) : ''}.</p>`;
    if (hoje < o.s) {
      const falta = P.difDias(hoje, o.s);
      h += `<h1 class="h-tit">Seu plano começa ${falta === 1 ? 'amanhã' : 'em ' + falta + ' dias'}</h1><p class="h-sub">${G.nome} em ${P.DURACAO[o.d]}, a partir de ${P.dataLonga(o.s)}.</p>`;
      h += cartaoDia(plano.dias[0], f, plano, 'Primeira leitura');
      h += `<p class="dica">Quer ir aquecendo? <a href="/ler?r=PSA.1">Leia o Salmo 1</a>, é curtinho.</p>`;
    } else if (lidas === total) {
      h += `<h1 class="h-tit">Você terminou o plano</h1><p class="h-sub">${total} leituras de ${esc(G.curto)}. Que jornada. Abra o certificado no fim do seu planner e escreva a data de hoje.</p>`;
    } else if (diaHoje) {
      h += `<h1 class="h-tit sr">Leitura de hoje</h1>` + cartaoDia(diaHoje, f, plano, `Dia ${diaHoje.n} de ${total}`);
    } else if (hoje > plano.fim) {
      h += `<h1 class="h-tit">O prazo do plano acabou</h1><p class="h-sub">Faltam ${total - lidas} leituras. Siga no seu ritmo: elas estão logo abaixo.</p>`;
    } else {
      const prox = proximas[0];
      h += `<h1 class="h-tit">Hoje é folga</h1><p class="h-sub">${atrasadas.length ? `Bom dia para pôr em dia ${atrasadas.length === 1 ? 'a leitura que ficou' : 'as ' + atrasadas.length + ' leituras que ficaram'} para trás.` : 'Você está em dia. Descanse ou adiante a próxima.'}</p>`;
      if (prox && !atrasadas.length) h += cartaoDia(prox, f, plano, 'Próxima leitura, ' + P.semana(prox.data));
    }
    h += `</section>`;

    h += `<section class="nums" aria-label="Seu progresso"><div><b>${seq}</b><span>${seq === 1 ? 'leitura seguida' : 'leituras seguidas'}</span></div><div><b>${pct}%</b><span>do plano</span></div><div><b>${lidas}</b><span>de ${total} leituras</span></div></section>`;
    h += `<div class="barra-prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Progresso do plano"><i style="width:${pct}%"></i></div>`;

    if (atrasadas.length) {
      const mostrar = atrasadas.slice(0, 6);
      h += `<section class="lista"><h2>Ficou para trás</h2><ul>${mostrar.map((d) => linhaDia(d, f, plano)).join('')}</ul>${atrasadas.length > mostrar.length ? `<p class="mais">E mais ${atrasadas.length - mostrar.length}. Veja no plano completo abaixo.</p>` : ''}</section>`;
    }
    if (proximas.length && hoje >= o.s) h += `<section class="lista"><h2>Próximos dias</h2><ul>${proximas.map((d) => linhaDia(d, f, plano)).join('')}</ul></section>`;

    h += `<details class="todo" id="todo"><summary>Ver o plano completo</summary><div id="todoCorpo"></div></details>`;

    const comprou = store.get('vers_compras', []).some((c) => c.p === plano.codigo) || salvo.g;
    h += `<section class="extras"><h2>Atalhos</h2>`;
    h += `<div class="passo"><h3>Abra como um app</h3><p>${IOS ? 'No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.' : ANDROID ? 'No Chrome, toque nos três pontinhos e depois em “Adicionar à tela inicial”.' : 'Salve esta página nos favoritos para voltar todo dia.'}</p><button class="btn claro" type="button" id="btnInstalar" hidden>Adicionar à tela inicial</button></div>`;
    if (comprou) h += `<div class="passo"><h3>Seu planner e o calendário</h3><div class="acoes col">${botoesArquivos(plano)}</div></div>`;
    h += `<div class="passo"><h3>Chame alguém pra ler junto</h3><p>A pessoa abre com o plano igual ao seu e coloca o nome dela.</p><div class="acoes col"><a class="btn claro" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`Bora ler ${G.curto} comigo? Estou seguindo este plano no Versiculando. Abre e coloca o seu nome:\n${location.origin}/?${qs({ junto: plano.codigo, de: nome })}`)}">Convidar pelo WhatsApp</a></div></div>`;
    h += `</section>`;
    app.innerHTML = h;
    instalar();
  }
  function botoesArquivos(plano) {
    const h = (salvo.h || '07:00').replace(':', '');
    const base = qs({ p: plano.codigo, n: salvo.n, h });
    const pdf = '/api/planner?' + qs({ p: plano.codigo, n: salvo.n, de: salvo.de, msg: salvo.msg, h });
    const cal = IOS ? `<a class="btn claro" href="/api/calendario?${base}">Pôr no Calendário do iPhone</a>`
      : `<a class="btn claro" href="/api/calendario?${base}&tipo=google" target="_blank" rel="noopener">Pôr no Google Agenda</a>${ANDROID ? '' : `<a class="btn claro" href="/api/calendario?${base}&dl=1">Arquivo .ics</a>`}`;
    return `<a class="btn" href="${pdf}&dl=1">Baixar o planner (PDF)</a>${cal}`;
  }
  function cartaoDia(d, f, plano, titulo) {
    const ok = f.has(d.n);
    return `<article class="dia ${ok ? 'ok' : ''}"><p class="dia-t">${titulo}</p><p class="dia-l">${esc(P.rotulo(d.t, true))}</p><p class="dia-m">${P.semana(d.data)}, ${P.dataCurta(d.data)}. Cerca de ${d.min} minutos.</p>
      <div class="acoes"><a class="btn" href="${linkLer(d, plano.codigo)}">${ok ? 'Ler de novo' : 'Ler agora'}</a><button class="btn ${ok ? 'linha' : 'claro'}" type="button" data-marcar="${d.n}" aria-pressed="${ok}">${ok ? 'Lida' : 'Marcar como lida'}</button></div></article>`;
  }
  function linhaDia(d, f, plano) {
    const ok = f.has(d.n);
    return `<li class="${ok ? 'ok' : ''}"><label class="chk"><input type="checkbox" data-chk="${d.n}" ${ok ? 'checked' : ''}><span class="sr">Marcar dia ${d.n} como lido</span></label><a href="${linkLer(d, plano.codigo)}"><span class="ld">${P.dataCurta(d.data)} <small>${P.semana(d.data).slice(0, 3)}</small></span><span class="ll">${esc(P.rotulo(d.t, true))}</span></a></li>`;
  }
  function todoCorpo() {
    const o = P.lerCodigo(salvo.p); const plano = P.gerar(o); const f = feitos(plano.codigo);
    const meses = new Map(); for (const d of plano.dias) { const k = d.data.slice(0, 7); if (!meses.has(k)) meses.set(k, []); meses.get(k).push(d); }
    $('#todoCorpo').innerHTML = [...meses].map(([k, ds]) => `<h3>${P.MESES[+k.slice(5) - 1]} ${k.slice(0, 4)}</h3><ul>${ds.map((d) => linhaDia(d, f, plano)).join('')}</ul>`).join('');
  }

  /* ---------- instalar (Android) ---------- */
  let promptInstalar = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); promptInstalar = e; instalar(); });
  function instalar() {
    const b = $('#btnInstalar'); if (!b) return; b.hidden = !promptInstalar;
    b.onclick = async () => { if (!promptInstalar) return; promptInstalar.prompt(); await promptInstalar.userChoice; promptInstalar = null; b.hidden = true; };
  }

  /* ================= LEITOR ================= */
  function refDoCaminho() {
    const m = /^\/ler\/([a-z0-9-]+)\/(\d{1,3})\/?$/.exec(location.pathname);
    if (m) { const L = P.indice.find((l) => l[3] === m[1]); if (L && +m[2] >= 1 && +m[2] <= L[4].length) return [[L[0], +m[2], +m[2]]]; }
    return P.lerRef(q.get('r'));
  }
  async function viewLer() {
    let t = refDoCaminho();
    const codigo = P.lerCodigo(q.get('p')) ? q.get('p') : null; const n = +q.get('d') || 0;
    if (!t.length) t = [['JHN', 1, 1]];
    const titulo = P.rotulo(t, true);
    document.title = titulo + ' · Bíblia Livre · Versiculando';
    let h = `<div class="ler-topo">${codigo ? `<a class="voltar" href="/hoje">← Leitura de hoje</a>` : ''}<h1 class="ler-tit">${esc(titulo)}</h1>${codigo && n ? `<p class="ler-sub">Dia ${n} do seu plano</p>` : ''}</div><div class="texto" id="texto">`;
    try {
      for (const [cod, a, b] of t) {
        const L = await livroJson(cod);
        for (let c = a; c <= b; c++) {
          const unico = t.length === 1 && a === b;
          h += `<section class="cap" id="${cod}-${c}">${unico ? '' : `<h2>${esc(L.n)} ${c}</h2>`}`;
          if (L.t && L.t[c]) h += `<p class="sobrescrito">${esc(L.t[c])}</p>`;
          const heads = (L.h && L.h[c]) || {};
          h += '<p class="vv">';
          L.ch[c - 1].forEach((v, i) => {
            if (!v) return;
            if (heads[i + 1]) h += `</p><h3 class="estrofe">${esc(heads[i + 1])}</h3><p class="vv">`;
            h += `<span class="v" id="v${cod}-${c}-${i + 1}"><sup>${i + 1}</sup>${esc(v)} </span>`;
          });
          h += '</p></section>';
        }
      }
    } catch (e) { h += `<p class="erro">Não deu para carregar o texto. Confira a internet e tente de novo.</p>`; }
    h += `</div>`;
    if (codigo && n) {
      const f = feitos(codigo); const ok = f.has(n);
      h += `<div class="fim" id="fim"><button class="btn bloco ${ok ? 'linha' : 'fita'}" type="button" id="btnConcluir" data-n="${n}">${ok ? 'Leitura do dia ' + n + ' concluída' : 'Concluí a leitura do dia ' + n}</button><div id="fimMsg"></div></div>`;
    } else {
      const [cod, , b] = t[t.length - 1]; const idx = P.indice.findIndex((l) => l[0] === cod); const L = P.indice[idx];
      const prox = b < L[4].length ? [cod, b + 1] : idx < 65 ? [P.indice[idx + 1][0], 1] : null;
      const [cod0, a0] = t[0]; const i0 = P.indice.findIndex((l) => l[0] === cod0);
      const ant = a0 > 1 ? [cod0, a0 - 1] : i0 > 0 ? [P.indice[i0 - 1][0], P.indice[i0 - 1][4].length] : null;
      const url = (x) => '/ler/' + P.livro(x[0])[3] + '/' + x[1];
      h += `<nav class="navcap" aria-label="Capítulos">${ant ? `<a class="btn claro" href="${url(ant)}">← ${esc(P.livro(ant[0])[2])} ${ant[1]}</a>` : '<span></span>'}${prox ? `<a class="btn claro" href="${url(prox)}">${esc(P.livro(prox[0])[2])} ${prox[1]} →</a>` : ''}</nav>`;
      if (!salvo) h += `<aside class="cta"><p>Quer ler a Bíblia inteira em 2027? Monte um plano com lembrete no calendário do celular.</p><a class="btn" href="/">Montar meu plano</a></aside>`;
    }
    app.innerHTML = h;
    if (location.hash) { const el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView(); }
  }
  function concluir(btn) {
    const codigo = q.get('p'); const n = +btn.dataset.n; const f = feitos(codigo); const ja = f.has(n);
    marcar(codigo, n, !ja);
    if (ja) { btn.className = 'btn bloco fita'; btn.textContent = 'Concluí a leitura do dia ' + n; $('#fimMsg').innerHTML = ''; return; }
    btn.className = 'btn bloco linha'; btn.textContent = 'Leitura do dia ' + n + ' concluída';
    const plano = P.gerar(P.lerCodigo(codigo)); const f2 = feitos(codigo); const seq = sequencia(plano, f2);
    const lidas = plano.dias.filter((d) => f2.has(d.n)).length;
    const prox = plano.dias.find((d) => d.n > n && !f2.has(d.n));
    $('#fimMsg').innerHTML = `<div class="feito"><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="var(--marca)"/><path d="M14 25l7 7 13-15" fill="none" stroke="#1F2A44" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <p><b>${seq > 1 ? seq + ' leituras seguidas.' : 'Leitura concluída.'}</b> ${lidas} de ${plano.dias.length} no total.</p>
      ${prox ? `<p class="prox">Próxima: ${esc(P.rotulo(prox.t, true))}, ${P.semana(prox.data)}, ${P.dataCurta(prox.data)}.</p>` : ''}<a class="btn claro bloco" href="/hoje">Voltar para hoje</a></div>`;
    if (navigator.vibrate) navigator.vibrate(18);
  }

  /* ---------- escolher livro ---------- */
  function abrirLivros(cod) {
    const corpo = $('#livrosCorpo');
    if (cod) {
      const L = P.livro(cod);
      $('#tLivros').textContent = L[1];
      corpo.innerHTML = `<button class="link" type="button" data-volta>← Todos os livros</button><div class="caps">${L[4].map((_, i) => `<a href="/ler/${L[3]}/${i + 1}">${i + 1}</a>`).join('')}</div>`;
    } else {
      $('#tLivros').textContent = 'Livros';
      const g = (a, b, t) => `<h3>${t}</h3><div class="lvs">${P.indice.slice(a, b).map((l) => `<button type="button" data-livro="${l[0]}">${esc(l[1])}</button>`).join('')}</div>`;
      corpo.innerHTML = g(0, 39, 'Antigo Testamento') + g(39, 66, 'Novo Testamento');
    }
    $('#livros').hidden = false; document.body.style.overflow = 'hidden';
  }
  const fecharLivros = () => { $('#livros').hidden = true; document.body.style.overflow = ''; };
  $('#btnLivros').onclick = () => abrirLivros();

  /* ---------- eventos ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-fechar]')) return fecharLivros();
    if (t.closest('[data-livros]')) return abrirLivros();
    if (t.closest('[data-volta]')) return abrirLivros();
    const lv = t.closest('[data-livro]'); if (lv) return abrirLivros(lv.dataset.livro);
    const mk = t.closest('[data-marcar]');
    if (mk) { const n = +mk.dataset.marcar; const f = feitos(salvo.p); marcar(salvo.p, n, !f.has(n)); if (!f.has(n)) toast('Boa! Leitura marcada.'); return viewHoje(); }
    if (t.closest('[data-visto]')) { store.set('vers_presente_visto_' + salvo.p, true); return viewHoje(); }
    const bc = t.closest('#btnConcluir'); if (bc) return concluir(bc);
  });
  document.addEventListener('change', (e) => {
    const c = e.target.closest('[data-chk]'); if (!c) return;
    marcar(salvo.p, +c.dataset.chk, c.checked); c.closest('li').classList.toggle('ok', c.checked);
    if (c.checked) toast('Leitura marcada.');
  });
  document.addEventListener('toggle', (e) => { if (e.target.id === 'todo' && e.target.open) todoCorpo(); }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharLivros(); });
  window.addEventListener('pageshow', (e) => { if (e.persisted && !ehLer) viewHoje(); });

  if (ehLer) await viewLer(); else viewHoje();
})();
