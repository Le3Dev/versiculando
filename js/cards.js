/* Imagens geradas no aparelho: card para Stories (1080x1920) e papel de parede (1080x2340). */
(function () {
  const P = window.Plano;
  const TINTA = '#1F2A44', TINTA2 = '#5B6378', LINHA = '#D9D5CC', FITA = '#B3122E', FITA_E = '#8E0E25';
  const MARCA = { B: '#FFE45E', N: '#BEE1FF', E: '#FFC4DE', S: '#B9F2A1' };
  const SITE = 'versiculando.vercel.app';
  const ARTIGO = { B: 'a Bíblia inteira', N: 'o Novo Testamento', E: 'os Evangelhos e Atos', S: 'Salmos e Provérbios' };

  async function fontes() {
    try {
      await Promise.all(['700 60px Literata', '600 60px Literata', '400 60px Literata', 'italic 400 60px Literata', '700 60px Caveat'].map((f) => document.fonts.load(f)));
    } catch (e) { /* segue com a fonte reserva */ }
  }
  function tela(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
  function fita(x, y, w, h, ctx) {
    ctx.fillStyle = FITA; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w / 2, y + h - w * 0.55); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = FITA_E; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(x + w * 0.78, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w * 0.78, y + h - w * 0.12); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  }
  function marca(ctx, x, y, w, h, cor) { // traço de marca-texto atrás do texto (y = topo do traço)
    ctx.fillStyle = cor; ctx.beginPath();
    ctx.moveTo(x, y + h * 0.18); ctx.quadraticCurveTo(x + w * 0.3, y - h * 0.06, x + w * 0.62, y + h * 0.08); ctx.quadraticCurveTo(x + w * 0.85, y + h * 0.16, x + w, y + h * 0.1);
    ctx.lineTo(x + w - 3, y + h * 0.88); ctx.quadraticCurveTo(x + w * 0.55, y + h * 1.06, x + w * 0.2, y + h * 0.92); ctx.quadraticCurveTo(x + w * 0.08, y + h * 0.88, x + 3, y + h * 0.9);
    ctx.closePath(); ctx.fill();
  }
  function linhas(ctx, s, w) {
    const out = []; let cur = '';
    for (const p of String(s).split(/\s+/)) { const t = cur ? cur + ' ' + p : p; if (ctx.measureText(t).width > w && cur) { out.push(cur); cur = p; } else cur = t; }
    if (cur) out.push(cur); return out;
  }
  function texto(ctx, s, x, y, font, cor, w, lh = 0) { ctx.font = font; ctx.fillStyle = cor; const ls = w ? linhas(ctx, s, w) : [s]; ls.forEach((l, i) => ctx.fillText(l, x, y + i * lh)); return y + (ls.length - 1) * lh; }
  function pontos(ctx, n, x, y, larg, alt, cor) {
    let passo = 40, cols = Math.floor(larg / passo);
    while (passo > 10 && Math.ceil(n / cols) * passo > alt) { passo -= 1; cols = Math.floor(larg / passo); }
    const r = passo * 0.31;
    for (let i = 0; i < n; i++) {
      const cx = x + r + (i % cols) * passo, cy = y + r + Math.floor(i / cols) * passo;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      if (!i) { ctx.fillStyle = cor; ctx.fill(); } else { ctx.strokeStyle = '#9AA0AE'; ctx.lineWidth = Math.max(1.5, passo * 0.05); ctx.stroke(); }
    }
    return y + Math.ceil(n / cols) * passo;
  }
  const abertura = (o, plano) => {
    const a = o.s.slice(0, 4), b = plano.fim.slice(0, 4);
    if (o.s <= P.hojeIso()) return 'A partir de hoje eu vou ler';
    if (o.s.slice(5) === '01-01' && a === b) return 'Em ' + a + ' eu vou ler';
    return 'A partir de ' + P.dataCurta(o.s) + ' eu vou ler';
  };

  async function story({ o, nome }) {
    await fontes();
    const plano = P.gerar(o); const cor = MARCA[o.g];
    const [c, ctx] = tela(1080, 1920);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1080, 1920);
    fita(846, 0, 90, 560, ctx);
    texto(ctx, 'Versiculando', 90, 150, '600 38px Literata', TINTA2);
    let y = 650;
    y = texto(ctx, abertura(o, plano), 90, y, '600 62px Literata', TINTA, 900, 76) + 140;
    y = texto(ctx, ARTIGO[o.g], 90, y, '700 128px Literata', TINTA, 920, 138) + 90;
    const min = plano.minMedio;
    y = texto(ctx, 'em ' + P.DURACAO[o.d] + ', uns ' + min + ' minutos por dia.', 90, y, '400 52px Literata', TINTA2, 900, 66) + 70;
    y = pontos(ctx, plano.dias.length, 90, y, 900, 1460 - y, cor) + 40;
    if (nome) {
      ctx.font = '700 132px Caveat'; const w = ctx.measureText(nome).width;
      marca(ctx, 70, y + 52, Math.min(940, w + 44), 86, cor);
      ctx.fillStyle = TINTA; ctx.fillText(nome, 90, y + 128);
    }
    ctx.fillStyle = LINHA; ctx.fillRect(90, 1690, 900, 3);
    texto(ctx, 'Bora junto? Monte o seu em', 90, 1770, '400 46px Literata', TINTA2);
    texto(ctx, SITE, 90, 1836, '700 52px Literata', TINTA);
    return c;
  }

  // resumo do que se lê em cada mês (ou semana, em planos curtos)
  function mapa(o, plano) {
    const porMes = plano.dias.length > 120 || o.d >= 182;
    const grupos = [];
    for (const d of plano.dias) {
      const k = porMes ? d.data.slice(0, 7) : 'S' + Math.floor((d.n - 1) / 7);
      let g = grupos[grupos.length - 1]; if (!g || g.k !== k) { g = { k, dias: [] }; grupos.push(g); }
      g.dias.push(d);
    }
    const nt = (cod) => P.indice.findIndex((l) => l[0] === cod) >= 39;
    return grupos.map((g, i) => {
      const caps = g.dias.flatMap((d) => d.t.flatMap(([cod, a, b]) => Array.from({ length: b - a + 1 }, (_, j) => [cod, a + j])));
      const fl = o.o === 'm' ? (o.g === 'B' ? [caps.filter((x) => !nt(x[0])), caps.filter((x) => nt(x[0]))] : [caps.filter((x) => x[0] === 'PSA'), caps.filter((x) => x[0] === 'PRO')]) : [caps];
      const partes = fl.filter((f) => f.length).map((f) => {
        const a = f[0], b = f[f.length - 1]; const A = P.livro(a[0])[2], B = P.livro(b[0])[2];
        return a[0] === b[0] ? (a[1] === b[1] ? A + ' ' + a[1] : A + ' ' + a[1] + ' a ' + b[1]) : A + ' ' + a[1] + ' a ' + B + ' ' + b[1];
      });
      const rot = porMes ? P.MES3[+g.k.slice(5) - 1] + (plano.o.d > 365 || g.k.slice(0, 4) !== plano.o.s.slice(0, 4) ? ' ' + g.k.slice(2, 4) : '') : 'sem ' + (i + 1);
      return [rot, partes.join(' e ')];
    });
  }

  async function wallpaper({ o, nome }) {
    await fontes();
    const plano = P.gerar(o); const cor = MARCA[o.g]; const G = P.OBJETIVOS[o.g];
    const [c, ctx] = tela(1080, 2340);
    ctx.fillStyle = '#FBFAF7'; ctx.fillRect(0, 0, 1080, 2340);
    fita(900, 0, 70, 430, ctx);
    let y = 830;
    texto(ctx, 'Plano de leitura de', 96, y, '600 40px Literata', TINTA2);
    if (nome) {
      ctx.font = '700 118px Caveat'; const w = ctx.measureText(nome).width;
      marca(ctx, 78, y + 48, Math.min(900, w + 40), 74, cor); ctx.fillStyle = TINTA; ctx.fillText(nome, 96, y + 112);
      y += 205;
    } else y += 70;
    y = texto(ctx, G.nome + ' em ' + P.DURACAO[o.d], 96, y, '700 58px Literata', TINTA, 880, 68) + 52;
    texto(ctx, P.dataCurta(o.s) + ' ' + o.s.slice(0, 4) + ' a ' + P.dataCurta(plano.fim) + ' ' + plano.fim.slice(0, 4), 96, y, '400 36px Literata', TINTA2);
    y += 70; ctx.fillStyle = LINHA; ctx.fillRect(96, y, 888, 3); y += 30;
    let rows = mapa(o, plano);
    const maxRows = 14; if (rows.length > maxRows) rows = rows.slice(0, maxRows - 1).concat([['...', 'e o restante do plano']]);
    const lh = Math.min(64, Math.floor((2060 - y) / rows.length));
    const fz = Math.min(34, Math.floor(lh * 0.56));
    for (const [rot, txt] of rows) {
      y += lh;
      ctx.font = `600 ${fz}px Literata`; ctx.fillStyle = TINTA2; ctx.fillText(rot, 96, y);
      ctx.font = `400 ${fz}px Literata`; ctx.fillStyle = TINTA;
      let t = txt; while (ctx.measureText(t).width > 760 && t.length > 4) t = t.slice(0, -2);
      if (t !== txt) t = t.replace(/\s*\S*$/, '') + '…';
      ctx.fillText(t, 224, y);
    }
    texto(ctx, 'Tua palavra é lâmpada para os meus pés e luz para o meu caminho.', 96, 2130, 'italic 400 34px Literata', TINTA2, 880, 46);
    return c;
  }

  function blob(c) { return new Promise((r) => c.toBlob(r, 'image/png')); }
  async function compartilhar(c, nomeArq, texto) {
    const b = await blob(c); const f = new File([b], nomeArq, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      try { await navigator.share({ files: [f], text: texto }); return 'ok'; } catch (e) { if (e && e.name === 'AbortError') return 'cancelado'; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nomeArq; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000); return 'baixado';
  }

  window.Cards = { story, wallpaper, blob, compartilhar, MARCA };
})();
