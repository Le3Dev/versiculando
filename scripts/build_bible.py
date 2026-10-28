"""Converte os fontes da Bíblia Livre (BLIVRE, CC BY 3.0 BR) em JSON por livro.
Uso: python3 scripts/build_bible.py <pasta textos/f4/tr do repo blivre/BibliaLivre>
Gera b/<COD>.json e b/livros.json."""
import json, re, sys, pathlib, unicodedata
SRC = pathlib.Path(sys.argv[1]); OUT = pathlib.Path(__file__).resolve().parent.parent / 'b'; OUT.mkdir(exist_ok=True)
ORDEM = 'GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'.split()
ABR = {'GEN':'Gn','EXO':'Êx','LEV':'Lv','NUM':'Nm','DEU':'Dt','JOS':'Js','JDG':'Jz','RUT':'Rt','1SA':'1Sm','2SA':'2Sm','1KI':'1Rs','2KI':'2Rs','1CH':'1Cr','2CH':'2Cr','EZR':'Ed','NEH':'Ne','EST':'Et','JOB':'Jó','PSA':'Sl','PRO':'Pv','ECC':'Ec','SNG':'Ct','ISA':'Is','JER':'Jr','LAM':'Lm','EZK':'Ez','DAN':'Dn','HOS':'Os','JOL':'Jl','AMO':'Am','OBA':'Ob','JON':'Jn','MIC':'Mq','NAM':'Na','HAB':'Hc','ZEP':'Sf','HAG':'Ag','ZEC':'Zc','MAL':'Ml','MAT':'Mt','MRK':'Mc','LUK':'Lc','JHN':'Jo','ACT':'At','ROM':'Rm','1CO':'1Co','2CO':'2Co','GAL':'Gl','EPH':'Ef','PHP':'Fp','COL':'Cl','1TH':'1Ts','2TH':'2Ts','1TI':'1Tm','2TI':'2Tm','TIT':'Tt','PHM':'Fm','HEB':'Hb','JAS':'Tg','1PE':'1Pe','2PE':'2Pe','1JN':'1Jo','2JN':'2Jo','3JN':'3Jo','JUD':'Jd','REV':'Ap'}
def slug(s):
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')
def tag(txt, name):
    m = re.search(r'\\' + name + r'\n(.*?)\n\\\*' + name, txt, re.S); return m.group(1).strip() if m else None
livros = {}
for f in sorted(SRC.glob('*.txt')):
    txt = f.read_text(encoding='utf-8-sig').replace('\r', '')
    cod = tag(txt, 'ubs-code'); nome = tag(txt, 'name-short'); longo = tag(txt, 'name-long')
    # leitura linha a linha: notas (\\fn) e referências (\\ref) são descartadas;
    # algumas notas no fonte fecham com outro \\fn em vez de \\*fn, então tratamos os dois.
    caps = {}; titulos = {}
    cur = None; buf = []; nota = False; ref = False; titulo = None; tbuf = None; pend_title = None
    inicio = txt.index('\\*ubs-code') + len('\\*ubs-code')
    def junta(linhas):
        out = []; prev_marker = True
        for ln in linhas:
            if ln is None: prev_marker = True; continue
            if not prev_marker and out: out.append(' ')
            out.append(ln); prev_marker = False
        x = re.sub(r'\s+', ' ', ''.join(out)).strip()
        x = re.sub(r'\s+([,.;:!?”’)])', r'\1', x)
        return re.sub(r'([“‘(])\s+', r'\1', x)
    def fecha():
        if cur:
            b, c, v = cur
            caps.setdefault(c, {})[v] = junta(buf)
    for ln in txt[inicio:].split('\n'):
        m = re.match(r'^\\v (\S+)$', ln)
        if m:
            fecha(); nota = ref = False
            b, c, v = m.group(1).rsplit('.', 2); cur = (b, int(c), int(v)); buf = []
            if pend_title and cur[2] == 1: titulos[cur[1]] = pend_title
            pend_title = None
            continue
        if nota:
            if ln in ('\\*fn', '\\fn'): nota = False; buf.append(None)
            continue
        if ref:
            if ln == '\\*ref': ref = False; buf.append(None)
            continue
        if tbuf is not None:
            if ln == '\\*psalm-title': pend_title = ' '.join(' '.join(tbuf).split()); tbuf = None
            else: tbuf.append(ln)
            continue
        if ln == '\\fn': nota = True; continue
        if ln == '\\ref': ref = True; continue
        if ln == '\\psalm-title': fecha(); tbuf = []; continue
        if ln.startswith('\\'): buf.append(None); continue
        if cur: buf.append(ln)
    fecha()
    if cod == 'MRK':  # no fonte o marcador do v. 19 está faltando
        a, sep, b = caps[5][18].partition(' Porém Jesus ')
        if sep: caps[5][18] = a; caps[5][19] = 'Porém Jesus ' + b
    # pronomes separados por quebra de linha no fonte ("Ensina -nos")
    for c in caps:
        for v in caps[c]:
            caps[c][v] = re.sub(r'(\w) -(lhes|lhe|los|las|lo|la|nos|no|na|os|as|o|a|me|te|se|vos)\b', r'\1-\2', caps[c][v])
    # Salmo 119: o nome da letra hebraica vem no começo da estrofe "(Álefe): ..."
    heads = {}
    if cod == 'PSA':
        for v, t in list(caps.get(119, {}).items()):
            m = re.match(r'^\(([^)]{2,12})\):\s*', t)
            if m: heads.setdefault('119', {})[str(v)] = m.group(1); caps[119][v] = t[m.end():]
    nc = max(caps)
    ch = []
    for c in range(1, nc + 1):
        vs = caps.get(c, {}); mv = max(vs) if vs else 0
        ch.append([vs.get(v, '') for v in range(1, mv + 1)])
    livros[cod] = dict(c=cod, n=nome, nl=longo, a=ABR[cod], s=slug(nome), ch=ch, t={str(k): v for k, v in titulos.items()}, h=heads)
assert set(livros) == set(ORDEM), set(ORDEM) ^ set(livros)
idx = []
for cod in ORDEM:
    L = livros[cod]
    (OUT / f'{cod}.json').write_text(json.dumps({k: L[k] for k in ('c', 'n', 'a', 'ch', 't', 'h') if L[k] or k in ('c','n','a','ch')}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    idx.append([cod, L['n'], L['a'], L['s'], [len(x) for x in L['ch']], [sum(len(v) for v in x) for x in L['ch']]])
(OUT / 'livros.json').write_text(json.dumps(idx, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
vazios = [(c, i + 1, j + 1) for c in ORDEM for i, x in enumerate(livros[c]['ch']) for j, v in enumerate(x) if not v]
print(len(idx), 'livros', sum(len(L['ch']) for L in livros.values()), 'capítulos', sum(len(x) for L in livros.values() for x in L['ch']), 'versículos; vazios:', len(vazios), vazios[:12])
