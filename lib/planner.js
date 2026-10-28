// Planner em PDF (A4) personalizado: capa, compromisso, ano num olhar, meses, quadro dos livros, diário, certificado.
import fs from 'node:fs';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import qrcode from 'qrcode-generator';
import { Plano as P, linkHoje } from './dados.js';

const W = 595.28, H = 841.89, M = 48;
const hex = (h) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const C = {
  tinta: hex('#1F2A44'), tinta2: hex('#5B6378'), linha: hex('#D6D2C8'), fraco: hex('#EEEBE4'), fita: hex('#B3122E'), fitaEsc: hex('#8E0E25'), branco: rgb(1, 1, 1),
};
export const MARCA = { B: '#FFE45E', N: '#BEE1FF', E: '#FFC4DE', S: '#B9F2A1' };
const MARCA_FORTE = { B: '#E8B800', N: '#3F8FD6', E: '#D9578E', S: '#4CAF50' };

const fonte = (f) => fs.readFileSync(new URL('../fonts/pdf/' + f.replace('.woff2', '.ttf'), import.meta.url));
let FONTES = null;
function bytesFontes() {
  if (!FONTES) FONTES = {
    r: fonte('literata-latin-400-normal.woff2'), i: fonte('literata-latin-400-italic.woff2'), sb: fonte('literata-latin-600-normal.woff2'),
    b: fonte('literata-latin-700-normal.woff2'), m: fonte('caveat-latin-700-normal.woff2'),
  };
  return FONTES;
}
export async function gerarPlanner({ o, nome = '', de = '', msg = '', h = 7, m = 0 }) {
  const plano = P.gerar(o); const G = P.OBJETIVOS[o.g];
  const cor = hex(MARCA[o.g]); const corForte = hex(MARCA_FORTE[o.g]);
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
  const B = bytesFontes(); const F = {};
  for (const k of Object.keys(B)) F[k] = await doc.embedFont(B[k], { subset: true });
    doc.setTitle('Plano de leitura' + (nome ? ' de ' + nome : '') + ': ' + P.descricao(o));
  doc.setAuthor('Versiculando'); doc.setCreator('versiculando.vercel.app'); doc.setProducer('Versiculando'); doc.setLanguage('pt-BR');
  doc.setSubject(P.descricao(o) + ', de ' + P.dataLonga(o.s) + ' a ' + P.dataLonga(plano.fim));

  /* ---------- utilitários de desenho (y medido a partir do topo) ---------- */
  const T = (pg, s, x, top, size, font, color = C.tinta, opt = {}) => {
    let xx = x; const w = font.widthOfTextAtSize(s, size);
    if (opt.align === 'right') xx = x - w; else if (opt.align === 'center') xx = x - w / 2;
    pg.drawText(s, { x: xx, y: H - top - size * 0.8, size, font, color, opacity: opt.opacity ?? 1 }); return w;
  };
  const wrap = (s, font, size, width) => {
    const out = []; let cur = '';
    for (const w of String(s).split(/\s+/)) {
      const t = cur ? cur + ' ' + w : w;
      if (font.widthOfTextAtSize(t, size) > width && cur) { out.push(cur); cur = w; } else cur = t;
    }
    if (cur) out.push(cur); return out;
  };
  const para = (pg, s, x, top, size, font, width, lh = 1.45, color = C.tinta) => {
    const ls = wrap(s, font, size, width); ls.forEach((l, i) => T(pg, l, x, top + i * size * lh, size, font, color)); return top + ls.length * size * lh;
  };
  const hline = (pg, x1, x2, top, color = C.linha, th = 0.7, dash) => pg.drawLine({ start: { x: x1, y: H - top }, end: { x: x2, y: H - top }, thickness: th, color, dashArray: dash });
  const rect = (pg, x, top, w, h, opt) => pg.drawRectangle({ x, y: H - top - h, width: w, height: h, ...opt });
  const svg = (pg, path, x, top, opt) => pg.drawSvgPath(path, { x, y: H - top, ...opt });
  const caixinha = (pg, x, top, s = 9.5) => svg(pg, `M2 0 H${s - 2} Q${s} 0 ${s} 2 V${s - 2} Q${s} ${s} ${s - 2} ${s} H2 Q0 ${s} 0 ${s - 2} V2 Q0 0 2 0 Z`, x, top, { borderColor: C.tinta2, borderWidth: 0.8 });
  const marca = (pg, x, top, w, h, color = cor, op = 1) => // traço de marca-texto, levemente irregular
    svg(pg, `M0 ${h * 0.18} Q${w * 0.3} ${-h * 0.06} ${w * 0.62} ${h * 0.08} T${w} ${h * 0.12} L${w - 1.5} ${h * 0.86} Q${w * 0.55} ${h * 1.06} ${w * 0.2} ${h * 0.92} T1.5 ${h * 0.9} Z`, x, top, { color, opacity: op });
  const fita = (pg, x, top, w, h) => {
    svg(pg, `M0 0 H${w} V${h} L${w / 2} ${h - w * 0.55} L0 ${h} Z`, x, top, { color: C.fita });
    svg(pg, `M${w * 0.78} 0 H${w} V${h} L${w * 0.78} ${h - w * 0.12} Z`, x, top, { color: C.fitaEsc, opacity: 0.35 });
  };
  const ajusta = (s, font, size, width, min = 7) => { let z = size; while (z > min && font.widthOfTextAtSize(s, z) > width) z -= 0.25; return z; };
  let nPag = 0;
  const pagina = (rodape = true) => {
    const pg = doc.addPage([W, H]); nPag++;
    if (rodape) {
      T(pg, 'Plano de leitura' + (nome ? ' de ' + nome : ''), M, H - 34, 7.5, F.r, C.tinta2);
      T(pg, String(nPag), W - M, H - 34, 7.5, F.r, C.tinta2, { align: 'right' });
    }
    return pg;
  };
  const titulo = (pg, s, sub) => {
    T(pg, s, M, 52, 26, F.b);
    if (sub) T(pg, sub, M, 88, 10.5, F.r, C.tinta2);
  };
  const linhas = (pg, top, n, gap = 22, x1 = M, x2 = W - M) => { for (let i = 1; i <= n; i++) hline(pg, x1, x2, top + i * gap); return top + n * gap; };

  const periodo = P.dataLonga(o.s) + ' a ' + P.dataLonga(plano.fim);
  const ritmo = (P.SEMANA[o.w] + ', às ' + String(h).padStart(2, '0') + 'h' + (m ? String(m).padStart(2, '0') : '')).replace('Todos os dias', 'Todos os dias');
  const nLeituras = plano.dias.length;

  /* ---------- 1. capa ---------- */
  {
    const pg = pagina(false); nPag = 0;
    fita(pg, W - 118, 0, 44, 392);
    T(pg, 'Versiculando', M, 54, 11, F.sb, C.tinta2);
    T(pg, o.s.slice(0, 4) === plano.fim.slice(0, 4) ? o.s.slice(0, 4) : o.s.slice(0, 4) + '–' + plano.fim.slice(0, 4), M - 4, 150, 120, F.b, C.fraco);
    if (de) T(pg, 'Um presente de ' + de, M, 74, 24, F.m, C.fita);
    T(pg, 'Plano de leitura de', M, 272, 18, F.sb, C.tinta2);
    const zNome = nome ? ajusta(nome, F.m, 74, W - 2 * M - 40, 36) : 74;
    if (nome) {
      const wNome = F.m.widthOfTextAtSize(nome, zNome);
      marca(pg, M - 10, 302 + zNome * 0.32, wNome + 24, zNome * 0.62, cor, 0.95);
      T(pg, nome, M, 294, zNome, F.m);
    } else { marca(pg, M - 10, 302 + zNome * 0.32, 300, zNome * 0.62, cor, 0.55); hline(pg, M, M + 280, 302 + zNome * 0.86, C.tinta2, 0.8); }
    let y = 302 + zNome * 1.05;
    T(pg, G.nome, M, y, 30, F.b); y += 42;
    T(pg, 'em ' + P.DURACAO[o.d] + (o.o === 'm' && o.g === 'B' ? ', Antigo e Novo Testamento juntos' : ''), M, y, 15, F.r, C.tinta2); y += 24;
    T(pg, periodo, M, y, 12, F.r, C.tinta2); y += 18;
    T(pg, `${nLeituras} leituras de cerca de ${plano.minMedio} minutos`, M, y, 12, F.r, C.tinta2);
    // um círculo por dia de leitura, para pintar
    {
      const larg = W - 2 * M, topo = y + 40, base = H - 186;
      let passo = 24; let cols = Math.floor(larg / passo);
      while (passo > 6 && Math.ceil(nLeituras / cols) * passo > base - topo) { passo -= 0.5; cols = Math.floor(larg / passo); }
      const r = passo * 0.3;
      for (let i = 0; i < nLeituras; i++) {
        const cx = M + r + (i % cols) * passo, cy = topo + r + Math.floor(i / cols) * passo;
        pg.drawCircle({ x: cx, y: H - cy, size: r, borderColor: C.tinta2, borderWidth: 0.55, ...(i ? {} : { color: cor }) });
      }
      T(pg, 'Cada círculo é um dia de leitura. Pinte um por dia.', M, topo + Math.ceil(nLeituras / cols) * passo + 6, 8.5, F.i, C.tinta2);
    }
    hline(pg, M, W - M, H - 150, C.linha, 0.7);
    para(pg, 'Tua palavra é lâmpada para os meus pés e luz para o meu caminho.', M, H - 132, 15, F.i, W - 2 * M - 40, 1.45);
    T(pg, 'Salmos 119.105', M, H - 82, 10, F.sb, C.tinta2);
  }

  /* ---------- 2. dedicatória (presente) ---------- */
  if (de) {
    const pg = pagina();
    T(pg, nome ? 'Para ' + nome + ',' : 'Para você,', M, 96, 40, F.m);
    let y = 160;
    if (msg) { for (const par of msg.split(/\n+/)) { y = para(pg, par, M, y, 22, F.m, W - 2 * M, 1.3) + 10; } }
    else y = para(pg, 'Este plano é pra você caminhar com Deus um dia de cada vez. Que cada página te aproxime mais dele.', M, y, 22, F.m, W - 2 * M, 1.3) + 10;
    T(pg, 'Com carinho,', M, y + 24, 20, F.m, C.tinta2);
    T(pg, de, M, y + 52, 32, F.m, C.fita);
    const bt = Math.max(y + 140, 520);
    hline(pg, M, W - M, bt, C.linha);
    para(pg, '“O SENHOR te abençoe, e te guarde: faça resplandecer o SENHOR seu rosto sobre ti, e tenha de ti misericórdia: o SENHOR levante a ti seu rosto, e ponha em ti paz.”', M, bt + 22, 13, F.i, W - 2 * M, 1.5);
    T(pg, 'Números 6.24–26', M, bt + 112, 9.5, F.sb, C.tinta2);
    fita(pg, W - 92, 0, 26, 150);
  }

  /* ---------- 3. antes de começar ---------- */
  {
    const pg = pagina();
    titulo(pg, 'Antes de começar', 'Escreva à mão. Daqui a alguns meses vai ser bom reler.');
    let y = 128;
    T(pg, 'Eu,', M, y, 13, F.r); T(pg, nome || '', M + 22, y - 9, 24, F.m); hline(pg, M + 20, M + 240, y + 16);
    T(pg, ', quero ler ' + G.curto + ' em ' + P.DURACAO[o.d] + '.', M + 244, y, 13, F.r);
    y += 46; T(pg, 'Por que eu quero fazer isso', M, y, 11.5, F.sb); y = linhas(pg, y + 6, 3);
    y += 26; T(pg, 'Quando e onde vou ler', M, y, 11.5, F.sb);
    T(pg, ritmo + ', em', M, y + 24, 12, F.r, C.tinta2); hline(pg, M + 4 + F.r.widthOfTextAtSize(ritmo + ', em', 12) + 6, W - M, y + 38);
    y += 66; T(pg, 'Quem vai ler junto comigo', M, y, 11.5, F.sb); y = linhas(pg, y + 6, 1);
    y += 26; T(pg, 'Minha oração para esta jornada', M, y, 11.5, F.sb); y = linhas(pg, y + 6, 4);
    y += 34; hline(pg, M, M + 220, y); hline(pg, W - M - 150, W - M, y);
    T(pg, 'Assinatura', M, y + 6, 8.5, F.r, C.tinta2); T(pg, 'Data', W - M - 150, y + 6, 8.5, F.r, C.tinta2);
    // como usar
    y += 40; rect(pg, M, y, W - 2 * M, H - y - 64, { color: C.fraco });
    T(pg, 'Como usar este plano', M + 18, y + 18, 13, F.b);
    const dicas = [
      'Cada linha dos meses é um dia. Leu, marque o quadradinho.',
      'A leitura do dia também está no calendário do seu celular, com o link do texto.',
      'Atrasou? Sem culpa. Use um dia de folga para alcançar ou siga do dia de hoje.',
      'Leia com duas perguntas: o que este texto mostra sobre Deus? E o que muda em mim?',
      'No fim do planner, pinte cada capítulo lido no quadro dos livros.',
    ];
    let yy = y + 44;
    for (const d of dicas) { svg(pg, 'M0 3 L3 6 L8 0', M + 18, yy + 2, { borderColor: C.fita, borderWidth: 1.4 }); yy = para(pg, d, M + 34, yy, 10.5, F.r, W - 2 * M - 52, 1.4) + 6; }
  }

  /* ---------- 4. o plano num olhar (minicalendários) ---------- */
  {
    const porData = new Map(plano.dias.map((d) => [d.data, d]));
    const meses = []; { let d = P.deIso(o.s); d.setDate(1); const fim = P.deIso(plano.fim); while (d <= fim) { meses.push([d.getFullYear(), d.getMonth()]); d = new Date(d.getFullYear(), d.getMonth() + 1, 1, 12); } }
    const cols = 3, bw = (W - 2 * M - 2 * 22) / cols, cell = bw / 7, bh = 18 + 6 * cell + 12;
    for (let p0 = 0; p0 < meses.length; p0 += 12) {
      const pg = pagina();
      titulo(pg, 'O plano num olhar', `${nLeituras} leituras, de ${periodo}. Os dias com círculo têm leitura.`);
      meses.slice(p0, p0 + 12).forEach(([ano, mes], i) => {
        const x = M + (i % cols) * (bw + 22), top = 124 + Math.floor(i / cols) * (bh + 16);
        T(pg, P.MESES[mes][0].toUpperCase() + P.MESES[mes].slice(1) + (meses.length > 12 || p0 ? ' ' + ano : ''), x, top, 11.5, F.b);
        ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach((l, k) => T(pg, l, x + k * cell + cell / 2, top + 18, 6.5, F.sb, C.tinta2, { align: 'center' }));
        const first = new Date(ano, mes, 1, 12).getDay(); const nd = new Date(ano, mes + 1, 0).getDate();
        for (let dd = 1; dd <= nd; dd++) {
          const k = first + dd - 1, cx = x + (k % 7) * cell + cell / 2, cy = top + 30 + Math.floor(k / 7) * cell + cell / 2;
          const iso = ano + '-' + String(mes + 1).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
          const dia = porData.get(iso); const dentro = iso >= o.s && iso <= plano.fim;
          if (dia) pg.drawCircle({ x: cx, y: H - cy, size: cell * 0.4, borderColor: C.tinta2, borderWidth: 0.7 });
          T(pg, String(dd), cx, cy - 3.2, 6.8, dia ? F.sb : F.r, dia ? C.tinta : dentro ? C.tinta2 : C.linha, { align: 'center' });
        }
      });
    }
  }

  /* ---------- 5. meses ---------- */
  {
    const porMes = new Map();
    for (let i = 0; i < o.d; i++) { const s = P.somaDias(o.s, i); const k = s.slice(0, 7); if (!porMes.has(k)) porMes.set(k, []); porMes.get(k).push(s); }
    const porData = new Map(plano.dias.map((d) => [d.data, d]));
    const xC = M, xD = M + 20, xL = M + 70, xMin = W - M, wL = W - M - 44 - xL;
    for (const [k, datas] of porMes) {
      const pg = pagina(); const [ano, mm] = k.split('-').map(Number);
      const ds = datas.map((s) => porData.get(s)).filter(Boolean);
      T(pg, P.MESES[mm - 1][0].toUpperCase() + P.MESES[mm - 1].slice(1), M, 46, 30, F.b);
      T(pg, String(ano), M + F.b.widthOfTextAtSize(P.MESES[mm - 1], 30) + 12, 58, 16, F.r, C.tinta2);
      if (ds.length) T(pg, `Leituras ${ds[0].n} a ${ds[ds.length - 1].n} de ${nLeituras}`, W - M, 52, 9.5, F.r, C.tinta2, { align: 'right' });
      // barra do progresso do plano
      const a = ds.length ? (ds[0].n - 1) / nLeituras : 0, b = ds.length ? ds[ds.length - 1].n / nLeituras : 0, bw = 150;
      rect(pg, W - M - bw, 70, bw, 5, { color: C.fraco }); rect(pg, W - M - bw, 70, bw * b, 5, { color: cor }); rect(pg, W - M - bw, 70, bw * a, 5, { color: corForte, opacity: 0.55 });
      const rowH = Math.min(22, (H - 112 - 56) / Math.max(datas.length, 1));
      let y = 100; hline(pg, M, W - M, y, C.tinta2, 0.8);
      for (const s of datas) {
        const d = porData.get(s); const fs1 = Math.min(10.5, rowH * 0.5);
        const ty = y + (rowH - fs1) / 2 + 0.6;
        const dnum = P.deIso(s).getDate();
        T(pg, String(dnum), xD, ty, fs1, F.sb, d ? C.tinta : C.tinta2);
        T(pg, P.semana(s).slice(0, 3), xD + 18, ty + 0.8, fs1 * 0.8, F.r, C.tinta2);
        if (d) {
          caixinha(pg, xC, y + (rowH - 9.5) / 2, 9.5);
          let rot = P.rotulo(d.t, true); let z = fs1;
          if (F.r.widthOfTextAtSize(rot, z) > wL) { rot = P.rotulo(d.t); z = ajusta(rot, F.r, fs1, wL, 6.5); }
          T(pg, rot, xL, ty, z, F.r);
          T(pg, d.min + ' min', xMin, ty + 0.8, fs1 * 0.8, F.r, C.tinta2, { align: 'right' });
        } else T(pg, 'folga: dia bom pra pôr a leitura em dia', xL, ty + 0.5, fs1 * 0.85, F.i, C.tinta2);
        y += rowH; hline(pg, M, W - M, y, C.linha, 0.5);
      }
    }
  }

  /* ---------- 6. quadro dos livros ---------- */
  {
    const livros = (G.livros ? G.livros.map(P.livro) : P.indice.slice(G.de, G.ate));
    const grupos = o.g === 'B' ? [['Antigo Testamento', livros.slice(0, 39)], ['Novo Testamento', livros.slice(39)]] : [[G.nome, livros]];
    const s = 9, gap = 2.6, xN = M, xB = M + 96, porLinha = Math.floor((W - M - xB + gap) / (s + gap));
    for (const [nomeG, ls] of grupos) {
      let pg = pagina(); titulo(pg, 'Quadro dos livros', nomeG + '. Pinte cada capítulo que ler.');
      let y = 120;
      for (const L of ls) {
        const n = L[4].length; const rows = Math.ceil(n / porLinha); const hh = rows * (s + gap) + 6;
        if (y + hh > H - 60) { pg = pagina(); titulo(pg, 'Quadro dos livros', nomeG + ', continuação.'); y = 120; }
        T(pg, L[1], xN, y + 0.5, 9.5, F.sb);
        for (let c = 0; c < n; c++) {
          const x = xB + (c % porLinha) * (s + gap), t = y + Math.floor(c / porLinha) * (s + gap);
          rect(pg, x, t, s, s, { borderColor: C.linha, borderWidth: 0.7 });
          T(pg, String(c + 1), x + s / 2, t + 2.6, c + 1 >= 100 ? 3.6 : 4.4, F.r, C.tinta2, { align: 'center' });
        }
        y += hh;
      }
    }
  }

  /* ---------- 7. diário de leitura ---------- */
  {
    const pg = pagina(); titulo(pg, 'Diário de leitura', 'Imprima quantas vezes quiser. Um bloco por leitura que marcou você.');
    let y = 120;
    for (let k = 0; k < 2; k++) {
      T(pg, 'Data', M, y, 9, F.sb, C.tinta2); hline(pg, M + 28, M + 130, y + 11);
      T(pg, 'Texto', M + 150, y, 9, F.sb, C.tinta2); hline(pg, M + 182, W - M, y + 11);
      y += 30;
      for (const [rot, n] of [['O que este texto mostra sobre Deus', 2], ['O que me chamou atenção', 2], ['O que vou praticar', 2], ['Minha oração', 2]]) {
        T(pg, rot, M, y, 10.5, F.sb); y = linhas(pg, y + 2, n, 21) + 14;
      }
      if (!k) { hline(pg, M, W - M, y + 4, C.tinta2, 0.8, [2, 3]); y += 26; }
    }
  }

  /* ---------- 8. certificado ---------- */
  {
    const pg = pagina();
    rect(pg, M - 10, 70, W - 2 * M + 20, H - 160, { borderColor: C.tinta, borderWidth: 1.2 });
    rect(pg, M - 4, 76, W - 2 * M + 8, H - 172, { borderColor: C.linha, borderWidth: 0.7 });
    fita(pg, W / 2 - 18, 70, 36, 120);
    T(pg, 'Jornada concluída', W / 2, 230, 34, F.b, C.tinta, { align: 'center' });
    T(pg, 'Eu,', W / 2, 300, 14, F.r, C.tinta2, { align: 'center' });
    if (nome) T(pg, nome, W / 2, 318, 40, F.m, C.tinta, { align: 'center' }); else hline(pg, W / 2 - 140, W / 2 + 140, 362);
    T(pg, 'terminei de ler ' + G.curto + '.', W / 2, 382, 16, F.r, C.tinta, { align: 'center' });
    T(pg, 'Comecei em ' + P.dataLonga(o.s) + '. Terminei em', W / 2 - 60, 432, 12, F.r, C.tinta2, { align: 'center' });
    hline(pg, W / 2 + 84, W / 2 + 190, 446);
    para(pg, '“Lutei a boa luta, terminei a carreira, guardei a fé.”', M + 40, 520, 15, F.i, W - 2 * M - 80, 1.4);
    T(pg, '2 Timóteo 4.7', M + 40, 548, 9.5, F.sb, C.tinta2);
    hline(pg, W / 2 - 110, W / 2 + 110, 660); T(pg, 'Assinatura', W / 2, 668, 8.5, F.r, C.tinta2, { align: 'center' });
  }

  /* ---------- 9. créditos + QR da leitura de hoje ---------- */
  {
    const pg = pagina(); titulo(pg, 'A leitura de hoje no celular');
    const url = linkHoje(plano.codigo, nome);
    const qr = qrcode(0, 'M'); qr.addData(url); qr.make(); const n = qr.getModuleCount(); const sz = 150, cs = sz / n, x0 = M, y0 = 110;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) rect(pg, x0 + c * cs, y0 + r * cs, cs + 0.05, cs + 0.05, { color: C.tinta });
    let y = para(pg, 'Aponte a câmera do celular para abrir a leitura do dia, com o texto bíblico e o seu progresso.', M + sz + 24, 118, 12, F.r, W - 2 * M - sz - 24, 1.45);
    para(pg, url.replace(/^https:\/\//, ''), M + sz + 24, y + 8, 8.5, F.r, W - 2 * M - sz - 24, 1.4, C.tinta2);
    let yc = 330; hline(pg, M, W - M, yc - 14);
    T(pg, 'Sobre o texto bíblico', M, yc, 11.5, F.sb); yc += 22;
    yc = para(pg, 'As citações bíblicas deste planner são da Bíblia Livre (BLIVRE), Copyright © Diego Santos, Mario Sérgio e Marco Teles, fevereiro de 2018, sob a licença Creative Commons Atribuição 3.0 Brasil (creativecommons.org/licenses/by/3.0/br). Reprodução permitida desde que mencionados fonte e autores. Você pode seguir este plano com qualquer tradução da sua preferência.', M, yc, 9.5, F.r, W - 2 * M, 1.5, C.tinta2);
    yc += 16; T(pg, 'Feito no Versiculando', M, yc, 11.5, F.sb); yc += 22;
    para(pg, 'versiculando.vercel.app. Monte um plano para alguém que você ama e dê de presente.', M, yc, 9.5, F.r, W - 2 * M, 1.5, C.tinta2);
  }

  return await doc.save({ useObjectStreams: true });
}
