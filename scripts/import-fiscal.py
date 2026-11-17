"""Importa las nuevas series; las fuentes originales quedan fuera del repositorio."""
from collections import defaultdict
from decimal import Decimal
from pathlib import Path
import csv
import json
import re
import sys
import unicodedata

from lxml.html import fromstring
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
INPUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / 'outputs' / 'pba-2027'
DATA = ROOT / 'data'
M = 1_000_000


def read(name):
    return json.loads((DATA / (name + '.json')).read_text(encoding='utf-8'))


def write(name, obj):
    (DATA / (name + '.json')).write_text(json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')


def csv_rows(name, delim=','):
    with (INPUT / name).open(encoding='utf-8-sig', newline='') as f:
        yield from csv.DictReader(f, delimiter=delim)


def key(label):
    label = unicodedata.normalize('NFKD', label).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', label).strip('-').replace('comir-ec', 'comirec')


def round_pesos(value):
    return round(float(value) * M)


law = fromstring((INPUT / 'ley-15557.html').read_text(encoding='utf-8'))
prior = {}
for row in law.xpath('//table[1]//tr'):
    cells = [' '.join(' '.join(td.itertext()).split()) for td in row.xpath('./td')]
    if len(cells) != 2 or not re.fullmatch(r'[0-9.]+', cells[1]) or cells[0].startswith('-'):
        continue
    ident = key(cells[0])
    if ident not in {'total','administracion-central','organismos-descentralizados','instituciones-de-prevision-social'}:
        prior[ident] = int(cells[1].replace('.', ''))
assert len(prior) == 48
assert sum(prior.values()) == read('project')['prior']['spending']
ids = {r['id'] for r in read('areas')}
assert set(prior) == ids, (set(prior)-ids, ids-set(prior))
write('prior-areas', prior)

ff = list(load_workbook(INPUT/'finalidad-dnap.xlsx', read_only=True, data_only=True)['Bs Aires'].values)
aif = list(load_workbook(INPUT/'aif.xlsx', read_only=True, data_only=True)['Buenos Aires'].values)
base_history = read('history')
assert [r['year'] for r in base_history] == list(ff[8][1:22]) == list(aif[8][1:22])
ff_rows = dict(administration=10, security=11, social=12, health=13, education=16, economic=22, debt=23, total=24)
aif_rows = dict(staff=27, goods=26, benefits=31, transfers=32, investment=43, capitalTransfers=44)
by_year = {}
for c, rec in enumerate(base_history, 1):
    lines = {k:round_pesos(ff[n-1][c]) for k,n in ff_rows.items()}
    # DNAP tables can differ by rounding/adjustments; each composition has its own denominator.
    assert abs(sum(lines[k] for k in ('administration','security','social','economic','debt')) - lines['total']) <= 1_100_000
    parts = {k:round_pesos(aif[n-1][c]) for k,n in aif_rows.items()}
    parts['goods'] -= parts['staff']  # Gasto de consumo incluye personal.
    assert parts['goods']>=0
    by_year[rec['year']] = {'purpose':lines,'economic':parts}

def tax_period(sheet, stop):
    # The publisher's workbooks label their units and include control totals.
    rows = list(sheet.values)
    units = next(r[1] for r in rows[:5] if isinstance(r[1],str) and 'DE PESOS' in r[1])
    assert 'MILLONES' in units or 'MILES' in units
    multiplier = M if 'MILLONES' in units else 1000
    header = next(r for r in rows[:6] if r[3]=='INGRESOS BRUTOS')
    subheader = rows[rows.index(header)+1]
    property_col = subheader.index('TOTAL')
    vehicle_cols = [i for i,h in enumerate(header) if h and 'AUTOM.' in h]
    total_col = header.index('RECAUDACIÓN PROVINCIAL')
    monthly = rows[rows.index(header)+2:][:stop]
    assert [r[2] for r in monthly] == list(range(1,stop+1))
    cols = lambda selected: round(sum(Decimal(str(r[i] or 0)) for r in monthly for i in selected)*multiplier)
    total, gross, property_tax, vehicles, stamp = [
        cols(indices) for indices in ([total_col],[3],[property_col],vehicle_cols,[header.index('SELLOS')])
    ]
    assert total > gross > 0
    return [total,gross,property_tax,vehicles,stamp,total-gross-property_tax-vehicles-stamp]


tax_history = load_workbook(INPUT/'recaudacion-anual-oficial.xlsx', read_only=True, data_only=True)
tax_2026 = load_workbook(INPUT/'recaudacion-2026-oficial.xlsx', read_only=True, data_only=True)['2026']
tax_annual = {y:tax_period(tax_history[str(y)],12) for y in range(1999,2026)}
assert 12e12 < tax_annual[2025][0] < 15e12


geo_ids = {r['id'] for r in read('municipios')['districts']}
muni = defaultdict(dict)
duplicates = set()
for r in csv_rows('transferencias-cat.csv'):
    if r['concepto'] != 'Coparticipación Bruta':
        continue
    id_, y, m = r['municipio_id'], int(r['anio']), int(r['mes'])
    if not id_ in geo_ids: continue
    if (y,m) in muni[id_]:
        duplicates.add((id_,y,m))
    muni[id_][y,m] = Decimal(r['monto'])
assert duplicates == {('06007',2021,4)}, duplicates
for id_,y,m in duplicates:
    # The two values are different and neither is labelled as a correction.
    del muni[id_][y,m]
assert set(muni)==geo_ids
copar = {}
for id_, months in muni.items():
    annual = {}
    for y in range(2010,2026):
        if all((y,m) in months for m in range(1,13)):
            annual[y] = round(sum(months[y,m] for m in range(1,13)))
    copar[id_] = annual


schools = defaultdict(dict)
for r in csv_rows('consejos-cat.csv'):
    id_, y, m = r['municipio_id'], int(r['anio']),int(r['mes'])
    assert id_ in geo_ids and (y,m) not in schools[id_]
    if r['monto'].strip():
        schools[id_][y,m]=Decimal(r['monto'])
assert set(schools)==geo_ids
school_amounts={}
school_months = max(m for months in schools.values() for y,m in months if y==2026)
for id_, months in schools.items():
    periods = {}
    for y in (2025,2026):
        values=[months[y,m] for m in range(1,school_months+1) if (y,m) in months]
        if len(values)==school_months:
            periods[y]=round(sum(values))
    school_amounts[id_]=periods

pbg_rows=defaultdict(Decimal)
for r in csv_rows('pbg-cat.csv'):
    pbg_rows[int(r['anio'].strip().rstrip('*').strip())] += Decimal(r['valor_precios_corrientes'])
assert set(pbg_rows)==set(range(2004,2025))

write('fiscal-series', {
    'execution':by_year,
    'taxes':{'annual':tax_annual,'recent':{'months':9,'2025':tax_period(tax_history['2025'],9),'2026':tax_period(tax_2026,9)}},
    'coparticipation':copar,
    'schools':school_amounts,
    'schoolMonths':school_months,
    'pbg':{y:round(v*M) for y,v in pbg_rows.items()}
})
