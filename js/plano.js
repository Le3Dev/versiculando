/* Versiculando: gera planos de leitura a partir do índice de livros (b/livros.json).
   Usado pela página de montagem, pela página de hoje, pelo PDF e pelo calendário. */
(function (root) {
  const CPM = 900; // caracteres lidos por minuto (leitura atenta)
  const OT_END = 39; // índices 0..38 = Antigo Testamento

  const OBJETIVOS = {
    B: { nome: 'Bíblia inteira', curto: 'a Bíblia inteira', de: 0, ate: 66, ordens: ['m', 'c'], duracoes: [90, 182, 365, 730], padrao: 365 },
    N: { nome: 'Novo Testamento', curto: 'o Novo Testamento', de: 39, ate: 66, ordens: ['c'], duracoes: [30, 90, 182], padrao: 90 },
    E: { nome: 'Evangelhos e Atos', curto: 'os Evangelhos e Atos', de: 39, ate: 44, ordens: ['c'], duracoes: [30, 60, 90], padrao: 60 },
    S: { nome: 'Salmos e Provérbios', curto: 'Salmos e Provérbios', livros: ['PSA', 'PRO'], ordens: ['m', 'c'], duracoes: [30, 60, 90], padrao: 60 },
  };
  const ORDENS = { m: 'Antigo e Novo juntos', c: 'Na ordem dos livros' };
  const ORDENS_S = { m: 'Um salmo e um provérbio', c: 'Salmos, depois Provérbios' };
  const SEMANA = { 7: 'Todos os dias', 6: 'De segunda a sábado', 5: 'De segunda a sexta' };
  const DURACAO = { 30: '30 dias', 60: '60 dias', 90: '90 dias', 182: '6 meses', 365: '1 ano', 730: '2 anos' };

  let IDX = null; // [cod, nome, abrev, slug, versos[], chars[]]
  function usarIndice(idx) { IDX = idx; return IDX; }
  function livro(cod) { return IDX.find((l) => l[0] === cod); }

  /* ---- datas locais (sem fuso) ---- */
  const pad = (n) => String(n).padStart(2, '0');
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function deIso(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); }
  function hojeIso() { return iso(new Date()); }
  function somaDias(s, n) { const d = deIso(s); d.setDate(d.getDate() + n); return iso(d); }
  function difDias(a, b) { return Math.round((deIso(b) - deIso(a)) / 864e5); }

  /* ---- código do plano: B.m.365.7.20270101 ---- */
  function codigo(o) { return [o.g, o.o, o.d, o.w, o.s.replace(/-/g, '')].join('.'); }
  function lerCodigo(c) {
    const m = /^([BNES])\.([mc])\.(\d{2,3})\.([567])\.(\d{8})$/.exec(String(c || '').trim());
    if (!m) return null;
    const g = OBJETIVOS[m[1]]; const d = +m[3];
    if (!g.duracoes.includes(d) || !g.ordens.includes(m[2])) return null;
    const s = m[5].slice(0, 4) + '-' + m[5].slice(4, 6) + '-' + m[5].slice(6);
    if (isNaN(deIso(s))) return null;
    return { g: m[1], o: m[2], d, w: +m[4], s };
  }

  function fluxos(o) {
    const G = OBJETIVOS[o.g];
    let livros = G.livros ? G.livros.map(livro) : IDX.slice(G.de, G.ate);
    const caps = (ls) => ls.flatMap((l) => l[5].map((w, i) => [l[0], i + 1, w]));
    if (o.o === 'm' && o.g === 'B') return [caps(IDX.slice(0, OT_END)), caps(IDX.slice(OT_END))];
    if (o.o === 'm' && o.g === 'S') return livros.map((l) => caps([l]));
    return [caps(livros)];
  }

  function diasDeLeitura(o) {
    const out = [];
    for (let i = 0; i < o.d; i++) {
      const s = somaDias(o.s, i); const wd = deIso(s).getDay();
      if (o.w === 7 || (o.w === 6 && wd !== 0) || (o.w === 5 && wd !== 0 && wd !== 6)) out.push(s);
    }
    return out;
  }

  // divide capítulos em k dias seguidos, equilibrando pelo tamanho do texto
  function dividir(caps, k) {
    const W = caps.reduce((a, c) => a + c[2], 0); const dias = Array.from({ length: k }, () => []);
    let acc = 0;
    for (const c of caps) { const i = Math.min(k - 1, Math.floor((k * (acc + c[2] / 2)) / W)); dias[i].push(c); acc += c[2]; }
    // nenhum dia vazio: puxa um capítulo do vizinho que tiver mais de um
    for (let guard = 0; guard < 4 * k; guard++) {
      const i = dias.findIndex((d) => !d.length); if (i < 0) break;
      const ant = i > 0 && dias[i - 1].length > 1 ? dias[i - 1] : null;
      const prox = i < k - 1 && dias[i + 1].length > 1 ? dias[i + 1] : null;
      if (ant && (!prox || ant.length >= prox.length)) dias[i].push(ant.pop());
      else if (prox) dias[i].push(prox.shift());
      else { // empurra o vazio para longe até achar sobra
        let j = i + 1; while (j < k && dias[j].length <= 1) j++;
        if (j >= k) { j = i - 1; while (j >= 0 && dias[j].length <= 1) j--; if (j < 0) break; for (let m = j; m < i; m++) dias[m + 1].unshift(dias[m].pop()); }
        else for (let m = j; m > i; m--) dias[m - 1].push(dias[m].shift());
      }
    }
    return dias;
  }
  // vários fluxos (ex.: AT e NT) avançam juntos: intercala pela posição relativa de cada capítulo
  function intercalar(fs) {
    const all = [];
    for (const f of fs) {
      const W = f.reduce((a, c) => a + c[2], 0); let acc = 0;
      for (const c of f) { all.push([(acc + c[2] / 2) / W, c]); acc += c[2]; }
    }
    return all.sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  }
  function trechos(caps) { // [[cod,c1,c2],...]
    const out = [];
    for (const [cod, ch] of caps) {
      const u = out[out.length - 1];
      if (u && u[0] === cod && u[2] === ch - 1) u[2] = ch; else out.push([cod, ch, ch]);
    }
    return out;
  }

  const cache = new Map();
  function gerar(o) {
    const key = codigo(o); if (cache.has(key)) return cache.get(key);
    const datas = diasDeLeitura(o); const k = datas.length;
    const fs = fluxos(o); const partes = dividir(fs.length > 1 ? intercalar(fs) : fs[0], k);
    const ordem = new Map(fs.flatMap((f, fi) => f.map((c, ci) => [c, fi * 1e4 + ci])));
    const dias = datas.map((data, i) => {
      const caps = partes[i].slice().sort((a, b) => ordem.get(a) - ordem.get(b));
      const chars = caps.reduce((a, c) => a + c[2], 0);
      return { n: i + 1, data, t: trechos(caps), caps: caps.length, min: Math.max(1, Math.round(chars / CPM)) };
    });
    const total = dias.reduce((a, d) => a + d.caps, 0);
    const plano = { o, codigo: key, dias, total, fim: somaDias(o.s, o.d - 1), minMedio: Math.round(dias.reduce((a, d) => a + d.min, 0) / dias.length) };
    cache.set(key, plano); return plano;
  }

  /* ---- rótulos ---- */
  const DASH = '–';
  function rotulo(t, longo) {
    return t.map(([cod, a, b]) => {
      const L = livro(cod); const nome = longo ? L[1] : L[2];
      return nome + ' ' + (a === b ? a : a + DASH + b);
    }).join(', ');
  }
  // link para ler: GEN.1-3_MAT.1 (sem vírgula, para o link não quebrar em calendários)
  function refParam(t) { return t.map(([cod, a, b]) => cod + '.' + (a === b ? a : a + '-' + b)).join('_'); }
  function lerRef(s) {
    const out = [];
    for (const p of String(s || '').split(/[,_ ]/)) {
      const m = /^([1-3A-Z]{3})\.(\d{1,3})(?:-(\d{1,3}))?$/.exec(p.trim()); if (!m) continue;
      const L = livro(m[1]); if (!L) continue;
      const a = +m[2], b = m[3] ? +m[3] : a; const n = L[4].length;
      if (a < 1 || a > n || b < a || b > n) continue; out.push([m[1], a, b]);
    }
    return out;
  }

  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const MES3 = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const SEM = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  function dataLonga(s) { const d = deIso(s); return (d.getDate() === 1 ? '1º' : d.getDate()) + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear(); }
  function dataCurta(s) { const d = deIso(s); return d.getDate() + ' ' + MES3[d.getMonth()]; }
  function semana(s) { return SEM[deIso(s).getDay()]; }

  function descricao(o) {
    const G = OBJETIVOS[o.g];
    return G.nome + ' em ' + DURACAO[o.d];
  }

  const API = { CPM, OBJETIVOS, ORDENS, ORDENS_S, SEMANA, DURACAO, MESES, MES3, usarIndice, livro, iso, deIso, hojeIso, somaDias, difDias,
    codigo, lerCodigo, gerar, rotulo, refParam, lerRef, dataLonga, dataCurta, semana, descricao, get indice() { return IDX; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.Plano = API;
})(typeof window !== 'undefined' ? window : globalThis);
