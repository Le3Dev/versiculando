// GET /api/planner?p=B.m.365.7.20270101&n=Ana&h=0700[&de=Mãe&msg=...] -> PDF do planner
import { gerarPlanner } from '../lib/planner.js';
import { Plano, limpaNome, limpaTexto, slugArquivo, hora } from '../lib/dados.js';

export default async function handler(req, res) {
  const q = new URL(req.url, 'http://x').searchParams;
  const o = Plano.lerCodigo(q.get('p'));
  if (!o) { res.statusCode = 400; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.end('Plano inválido.'); }
  const nome = limpaNome(q.get('n')); const de = limpaNome(q.get('de')); const msg = limpaTexto(q.get('msg'), 400);
  const [h, m] = hora(q.get('h'));
  try {
    const pdf = await gerarPlanner({ o, nome, de, msg, h, m });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${q.get('dl') ? 'attachment' : 'inline'}; filename="planner-biblico-${slugArquivo(nome)}.pdf"`);
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=604800');
    res.setHeader('X-Robots-Tag', 'noindex');
    res.end(Buffer.from(pdf));
  } catch (e) {
    console.error('planner', e);
    res.statusCode = 500; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.end('Não deu para gerar o PDF agora. Tente de novo em instantes.');
  }
}
