# Versiculando

Plano de leitura da Bíblia personalizado, vendido por Pix (R$ 9,90).

A pessoa responde 4 perguntas (nome, o que ler, em quanto tempo, quando começa), vê a prévia grátis e, depois do Pix, recebe:

- **Calendário**: um `.ics` com cada leitura no horário escolhido, com alarme e link do texto (iPhone, Mac, Outlook). No Android, um lembrete diário no Google Agenda que abre a leitura do dia.
- **Planner em PDF** (A4) com o nome na capa: compromisso, o plano num olhar, uma página por mês, quadro dos livros, diário, certificado e QR code da leitura de hoje.
- **Papel de parede** com o mapa do ano.
- **Página da leitura de hoje** (`/hoje`), com o texto bíblico, marcação do que foi lido e sequência.

Também tem modo presente (recado na primeira página + link para quem ganhou), convite "ler junto" e card para Stories.

## Estrutura

| Caminho | O que é |
|---|---|
| `index.html`, `js/app.js`, `css/home.css` | Página de montagem, prévia, Pix e entrega |
| `ler.html`, `js/leitura.js`, `css/ler.css` | `/hoje` (leitura do dia) e `/ler` (leitor de capítulos) |
| `js/plano.js` | Gerador dos planos (usado no navegador e nas funções) |
| `js/cards.js` | Card de Stories e papel de parede (canvas) |
| `api/planner.js` | `GET /api/planner?p=…&n=…&h=0700[&de=…&msg=…][&dl=1]` gera o PDF |
| `api/calendario.js` | `GET /api/calendario?p=…&n=…&h=0700[&tipo=google][&dl=1]` gera o `.ics` ou abre o Google Agenda |
| `lib/` | Código das funções (PDF, ICS, dados) |
| `b/` | Texto bíblico em JSON, um arquivo por livro, e `livros.json` (índice) |
| `scripts/build_bible.py` | Converte os fontes da Bíblia Livre para `b/` |

### Código do plano

`B.m.365.7.20270101` = objetivo (`B` Bíblia, `N` Novo Testamento, `E` Evangelhos e Atos, `S` Salmos e Provérbios) . ordem (`m` juntos, `c` na ordem) . duração em dias . dias por semana (7, 6, 5) . início.

O plano é sempre o mesmo para o mesmo código, então os links (`/hoje?p=…`, `/ler?r=GEN.1-3_MAT.1`) funcionam sem servidor nem cadastro. O progresso fica no `localStorage` do aparelho.

## Pagamento

Pix direto na chave (QR estático com valor), igual ao Rebobina. O botão "Já paguei" aparece 10 segundos depois de copiar o código. Não há verificação automática do pagamento.

## Rodar local

```
npm install
npx vercel dev
```

## Texto bíblico

Bíblia Livre (BLIVRE), Copyright © Diego Santos, Mario Sérgio e Marco Teles, fevereiro de 2018, licença [Creative Commons Atribuição 3.0 Brasil](https://creativecommons.org/licenses/by/3.0/br/). O crédito aparece no rodapé do site e no planner.

Fontes: Literata e Caveat (SIL Open Font License).
