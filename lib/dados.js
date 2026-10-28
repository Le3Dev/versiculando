// Carrega o gerador de planos e o índice de livros no servidor (funções da Vercel e testes locais).
import fs from 'node:fs';
import '../js/plano.js';

const P = globalThis.Plano;
if (!P.indice) P.usarIndice(JSON.parse(fs.readFileSync(new URL('../b/livros.json', import.meta.url), 'utf8')));

export const Plano = P;
export const SITE = process.env.SITE_URL || 'https://versiculando.vercel.app';

// Nome para capa/arquivo: só letras, espaço, hífen e apóstrofo; até 28 caracteres.
export function limpaNome(s, max = 28) {
  return String(s || '').normalize('NFC').replace(/[^\p{L}\p{M} '’.-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, max);
}
export function limpaTexto(s, max = 280) {
  return String(s || '').normalize('NFC').replace(/[^\p{L}\p{M}\p{N}\s.,;:!?'’"“”()–—-]/gu, '').replace(/[ \t]+/g, ' ').trim().slice(0, max);
}
export function slugArquivo(s) {
  return (s || 'plano').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'plano';
}
export function hora(h) { // "0700" ou "07:00" -> [7, 0]
  const m = /^(\d{1,2}):?(\d{2})$/.exec(String(h || '').trim());
  if (!m) return [7, 0];
  const hh = Math.min(23, +m[1]), mm = Math.min(59, +m[2]);
  return [hh, mm];
}
export function linkHoje(codigo, nome) {
  return SITE + '/hoje?p=' + encodeURIComponent(codigo) + (nome ? '&n=' + encodeURIComponent(nome) : '');
}
export function linkLer(dia, codigo) {
  return SITE + '/ler?r=' + P.refParam(dia.t) + '&p=' + encodeURIComponent(codigo) + '&d=' + dia.n;
}
