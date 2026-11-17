"""Importa fuentes públicas sin alterar los originales. Requiere openpyxl, pypdf y xlrd."""
import csv
import json
import math
import re
import sys
import unicodedata
from pathlib import Path
from statistics import mean

from openpyxl import load_workbook
from pypdf import PdfReader
import xlrd

ROOT = Path(__file__).resolve().parents[1]
INPUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / 'outputs' / 'pba-2027'
OUTPUT = ROOT / 'data'


def write(name, data):
    (OUTPUT / name).write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')


def key(label):
    return ' '.join(re.sub(r'[^a-z0-9]+', ' ', unicodedata.normalize('NFKD', label).encode('ascii', 'ignore').decode().lower()).split())


def workbook(name, tab):
    return list(load_workbook(INPUT / name, read_only=True, data_only=True)[tab].values)


def transfers(rows):
    table = {key(row[0]): [round(row[col]) if row[col] is not None else 0 for col in (13, 1, 9)] for row in rows[7:142]}
    assert len(table) == 135 and all(row[0] >= row[1] + row[2] > 0 for row in table.values())
    assert abs(sum(r[0] for r in table.values()) - rows[142][13]) <= 70
    return table


current = transfers(workbook('muni.xlsx', 'Acumulado'))
previous = transfers(workbook('muni25.xlsx', 'Acumulado'))
geom = json.loads((INPUT / 'departamentos.geojson').read_bytes())
aliases = {'coronel de marina leonardo rosales': 'coronel rosales', 'general juan madariaga': 'general madariaga', '9 de julio': 'nueve de julio', '25 de mayo': 'veinticinco de mayo'}
names = {'coronel rosales': 'Coronel Rosales', 'general madariaga': 'General Madariaga'}
features = [f for f in geom['features'] if str(f['properties']['id']).startswith('06')]
assert len(features) == 135


def rings(geometry):
    polygons = geometry['coordinates'] if geometry['type'] == 'MultiPolygon' else [geometry['coordinates']]
    return [ring for polygon in polygons for ring in polygon]


# Equirectangular approximation for this regional map, normalized into an SVG viewport.
allpoints = [point for f in features for ring in rings(f['geometry']) for point in ring]
minx = min(p[0] for p in allpoints)
maxy = max(p[1] for p in allpoints)
scale = 570 / (max(p[0] for p in allpoints) - minx)


def point(xy):
    return [round((xy[0] - minx) * scale + 10, 1), round((maxy - xy[1]) * scale / math.cos(math.radians(37)) + 10, 1)]


districts = []
for f in features:
    props = f['properties']
    name = props['nombre']
    k = aliases.get(key(name), key(name))
    path = ''.join('M' + 'L'.join(','.join(map(str, point(p))) for p in ring[:-1]) + 'Z' for ring in rings(f['geometry']))
    districts.append(dict(id=props['id'], name=names.get(k, name), path=path, current=current[k], previous=previous[k]))
assert len({x['id'] for x in districts}) == len(districts)
write('municipios.json', dict(viewBox=f'0 0 590 {int(max(point(p)[1] for p in allpoints) + 11)}', districts=sorted(districts, key=lambda x: key(x['name']))))


def ipc_annual():
    series = {}
    with (INPUT / 'ipc.csv').open(encoding='latin-1') as file:
        for r in csv.DictReader(file, delimiter=';'):
            if r['Codigo'] == '0' and r['Region'] == 'Pampeana':
                year, month = int(r['Periodo'][:4]), int(r['Periodo'][4:])
                series.setdefault(year, {})[month] = float(r['Indice_IPC'].replace(',', '.'))
    return {yr: mean(months.values()) for yr, months in series.items() if len(months) == 12}


ipc = ipc_annual()
rows = workbook('aif.xlsx', 'Buenos Aires')
series = []
for c, year in enumerate(rows[8][1:], 1):
    assert year == 2004 + c
    rec = dict(year=year)
    for name, rownum in dict(income=49, spending=50, balance=51, primary=52, current=25, capital=42, interest=30).items():
        rec[name] = round(rows[rownum - 1][c] * 1_000_000)
    assert abs(rec['balance'] - (rec['income'] - rec['spending'])) <= 1
    if year in ipc and 2017 <= year <= 2025:
        rec['ipc'] = ipc[year]
    series.append(rec)
write('history.json', series)

advance = xlrd.open_workbook(str(INPUT / '2026.xls')).sheet_by_name('II TRIM PARA PUBLICAR')
assert advance.cell_value(8, 2) == 'Buenos Aires'
assert 'II Trimestre 2026' in advance.cell_value(5, 0)
h1 = {}
for name, ix in dict(income=50, spending=51, balance=53, primary=55).items():
    h1[name] = round(advance.cell_value(ix-1,2) * 1_000_000)
assert abs(h1['income']-h1['spending']-h1['balance']) <= 1
write('advance.json', h1)


groups = {'ADMINISTRACIÓN CENTRAL': 'central', 'ORGANISMOS DESCENTRALIZADOS': 'organismos', 'INSTITUCIONES DE PREVISIÓN SOCIAL': 'prevision'}
areas = []
group = None
label = []
for page_no, page in enumerate(PdfReader(INPUT / 'PBA-2027-Cuadro-Organismos.pdf').pages, 1):
    for line in (x.strip() for x in page.extract_text().splitlines()):
        if line in groups:
            group = groups[line]
            label = []
        elif re.fullmatch(r'\$[\d.]+', line) and group and label:
            amount = int(line[1:].replace('.', ''))
            name = ' '.join(label)
            id_ = key(name).replace(' ', '-')
            areas.append(dict(id=id_, name=name, amount=amount, group=group, page=page_no))
            label = []
        elif group and line and not re.match(r'^(%|\d|Página|Presupuesto provincial|ORGANISMO$|PRESUPUESTO ASIGNADO|Fuente:|aunque |6°\.)', line):
            label.append(line)
assert len(areas) == 48, len(areas)
assert sum(x['amount'] for x in areas) == 58_654_709_589_891, sum(x['amount'] for x in areas)
assert sum(x['amount'] for x in areas if x['group'] == 'central') == 31_658_461_480_891
write('areas.json', areas)
