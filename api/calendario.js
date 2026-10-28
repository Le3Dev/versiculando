// GET /api/calendario?p=...&n=Ana&h=0700            -> .ics com todas as leituras (iPhone, Outlook, computador)
// GET /api/calendario?p=...&n=Ana&h=0700&tipo=google -> abre o Google Agenda com um lembrete diário (Android)
import { gerarIcs, linkGoogle } from '../lib/ics.js';
import { Plano, limpaNome, slugArquivo, hora } from '../lib/dados.js';

export default function handler(req, res) {
  const q = new URL(req.url, 'http://x').searchParams;
  const o = Plano.lerCodigo(q.get('p'));
  if (!o) { res.statusCode = 400; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.end('Plano inválido.'); }
  const nome = limpaNome(q.get('n')); const [h, m] = hora(q.get('h'));
  res.setHeader('X-Robots-Tag', 'noindex');
  if (q.get('tipo') === 'google') {
    res.statusCode = 302; res.setHeader('Location', linkGoogle({ o, nome, h, m })); res.setHeader('Cache-Control', 'no-store'); return res.end();
  }
  const ics = gerarIcs({ o, nome, h, m });
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `${q.get('dl') ? 'attachment' : 'inline'}; filename="leitura-biblia-${slugArquivo(nome)}.ics"`);
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=604800');
  res.end(ics);
}
