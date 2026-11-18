"""Normaliza dos series oficiales y los niveles observados del IPC para el sitio."""
import csv
import json
import sys
from collections import defaultdict
from decimal import Decimal
from pathlib import Path


root = Path(__file__).resolve().parents[1]
inputs = Path(sys.argv[1])
target = root / 'data' / 'additional-fiscal.json'


def rows(name, encoding='utf-8-sig'):
    with (inputs / name).open(encoding=encoding, newline='') as stream:
        yield from csv.DictReader(stream, delimiter=';')


def decimal(value):
    return Decimal(value.replace(',', '.'))


def read_latin(name):
    try:
        return list(rows(name))
    except UnicodeDecodeError:
        return list(rows(name, 'cp1252'))


ioma = defaultdict(dict)
for row in read_latin('ioma-gasto.csv'):
    year, category, value = int(row['anio']), row['tipo_erogacion'], row['cantidad']
    assert category not in ioma[year], (year, category)
    ioma[year][category] = int(value)
assert set(ioma) == set(range(2019, 2025))

ron = defaultdict(Decimal)
for row in read_latin('ron-2003-2025.csv'):
    if row['provincia'] == 'buenos aires':
        ron[int(row['ano'])] += decimal(row['monto'])
assert set(ron) == set(range(2003, 2026))

ipc = {}
for row in rows('ipc-actualizado.csv', 'cp1252'):
    period = row['Periodo']
    if row['Codigo'] == '0' and row['Region'] == 'Pampeana' and period.startswith('2026'):
        ipc[int(period[-2:])] = float(decimal(row['Indice_IPC']))
assert set(ipc) == set(range(1, 11))

# Valores publicados en millones de pesos, octubre 2026, páginas 2 y 3.
recent = {
    'month': 10,
    '2025': {'totalMillions': 11238191, 'cfiMillions': 9472761},
    '2026': {'totalMillions': 14915314, 'cfiMillions': 12476770},
}
data = {
    'ipc2026': [ipc[m] for m in sorted(ipc)],
    'closing2026': {'spendingMillions': 46521737, 'incomeMillions': 44174242, 'balanceMillions': -2347495},
    'ioma': dict(sorted(ioma.items())),
    'ronAnnual': {year: round(amount * 1_000_000) for year, amount in sorted(ron.items())},
    'ronRecent': recent,
}
target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
