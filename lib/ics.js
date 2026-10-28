// Arquivo de calendário (.ics): uma leitura por evento, no horário escolhido, com alarme.
import { Plano as P, linkLer, linkHoje } from './dados.js';

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
function dobra(linha) { // linhas de no máximo 75 bytes
  const enc = new TextEncoder(); const out = []; let cur = ''; let n = 0;
  for (const ch of linha) {
    const b = enc.encode(ch).length;
    if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; n = 0; }
    cur += ch; n += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}
const dt = (iso, h, m) => iso.replace(/-/g, '') + 'T' + String(h).padStart(2, '0') + String(m).padStart(2, '0') + '00';

export function gerarIcs({ o, nome, h = 7, m = 0 }) {
  const plano = P.gerar(o); const total = plano.dias.length;
  const agora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Versiculando//Plano de leitura//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:' + esc('Leitura da Bíblia' + (nome ? ' de ' + nome : '')),
    'X-WR-CALDESC:' + esc(P.descricao(o) + ' (Versiculando)')];
  for (const d of plano.dias) {
    const fimMin = m + Math.max(10, Math.min(60, d.min));
    const hf = h + Math.floor(fimMin / 60), mf = fimMin % 60;
    const link = linkLer(d, plano.codigo);
    L.push('BEGIN:VEVENT',
      'UID:' + plano.codigo + '-' + d.n + '@versiculando',
      'DTSTAMP:' + agora,
      'DTSTART:' + dt(d.data, h, m),
      'DTEND:' + dt(d.data, Math.min(23, hf), hf > 23 ? 59 : mf),
      'SUMMARY:' + esc('📖 ' + P.rotulo(d.t)),
      'DESCRIPTION:' + esc(`Dia ${d.n} de ${total}: ${P.rotulo(d.t, true)} (cerca de ${d.min} min).\nLer agora: ${link}\n\nSeu plano: ${linkHoje(plano.codigo, nome)}`),
      'URL:' + link,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc('Hora da leitura: ' + P.rotulo(d.t)), 'TRIGGER:PT0M', 'END:VALARM',
      'END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.map(dobra).join('\r\n') + '\r\n';
}

// Evento repetido para o Google Agenda (Android não importa .ics pelo celular).
export function linkGoogle({ o, nome, h = 7, m = 0 }) {
  const plano = P.gerar(o);
  const ini = dt(plano.dias[0].data, h, m); const fimMin = m + 15;
  const fim = dt(plano.dias[0].data, h + Math.floor(fimMin / 60), fimMin % 60);
  const byday = o.w === 7 ? '' : ';BYDAY=' + (o.w === 6 ? 'MO,TU,WE,TH,FR,SA' : 'MO,TU,WE,TH,FR');
  const until = plano.fim.replace(/-/g, '') + 'T235959Z';
  const q = new URLSearchParams({
    action: 'TEMPLATE', text: '📖 Leitura da Bíblia', dates: ini + '/' + fim, ctz: 'America/Sao_Paulo',
    recur: 'RRULE:FREQ=DAILY' + byday + ';UNTIL=' + until,
    details: 'Abra a leitura de hoje: ' + linkHoje(plano.codigo, nome),
  });
  return 'https://calendar.google.com/calendar/render?' + q.toString();
}
