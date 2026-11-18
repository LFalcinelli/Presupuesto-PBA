# Importa series públicas adicionales y genera data/deflator.json, data/employment.json,
# data/tax-history.json y data/municipal-plus.json.
# Uso: powershell -File scripts/import-series.ps1 -Raw C:\ruta\a\las\fuentes
# Fuentes (ver FUENTES.md): serie_top_1984_2025.csv, planta_ocupada.xlsx, gsmm.xlsx, cargos_1000hab.xlsx,
# transferencias-mensual.csv, tributos-desc-mensual.csv, poblacion.csv e inflation-long.json (empalme del sitio CABA).
param([Parameter(Mandatory)][string]$Raw)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$inv = [Globalization.CultureInfo]::InvariantCulture
function Save($name, $obj) {
  $json = $obj | ConvertTo-Json -Depth 8 -Compress
  [IO.File]::WriteAllText((Join-Path $root "data\$name.json"), $json, (New-Object Text.UTF8Encoding $false))
  "data/$name.json: {0:N0} bytes" -f $json.Length
}

# --- Deflactor empalmado: IPC 9 provincias (2005–2016) enlazado al IPC Pampeana en 2017 ---
$hist = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'data\history.json') | ConvertFrom-Json
$long = Get-Content -Raw -Encoding UTF8 (Join-Path $Raw 'inflation-long.json') | ConvertFrom-Json
$p2017 = ($hist | Where-Object year -eq 2017).ipc
$i2017 = [double]$long.annualAverage.'2017'
$index = [ordered]@{}
foreach ($y in 2005..2016) { $index["$y"] = [math]::Round([double]$long.annualAverage."$y" * $p2017 / $i2017, 6) }
foreach ($r in $hist | Where-Object { $_.ipc }) { $index["$($r.year)"] = $r.ipc }
Save 'deflator' ([ordered]@{
  base = 'Promedio 2025'
  method = 'Desde 2017: IPC de la región Pampeana (INDEC), promedio anual. 2005–2016: IPC 9 provincias empalmado, enlazado en 2017 por el cociente de promedios anuales.'
  index = $index
})

# --- Empleo público y salario medio (Dirección de Coordinación Fiscal con las Provincias) ---
$xl = New-Object -ComObject Excel.Application; $xl.Visible = $false; $xl.DisplayAlerts = $false
$employment = [ordered]@{ years = @(1987..2025) }
try {
  foreach ($pair in @(@('planta_ocupada.xlsx','staff'), @('cargos_1000hab.xlsx','per1000'), @('gsmm.xlsx','salary'))) {
    $wb = $xl.Workbooks.Open((Join-Path $Raw $pair[0]), 0, $true)
    $v = $wb.Worksheets.Item(1).UsedRange.Value2
    $rows = $v.GetLength(0)
    $provinces = [ordered]@{}
    for ($r = 5; $r -le $rows; $r++) {
      $name = "$($v[$r,1])".Trim()
      if (-not $name -or $name -match '^(TOTAL|\(|Fuente|Nota)') { continue }
      if ($v[$r,40] -isnot [double]) { continue }
      $values = New-Object System.Collections.Generic.List[double]
      for ($c = 2; $c -le 40; $c++) { $cell = $v[$r, $c]; $values.Add([math]::Round([double]$cell, 2)) }
      $provinces[$name] = $values.ToArray()
    }
    $wb.Close($false)
    $employment[$pair[1]] = $provinces['BUENOS AIRES']
    $employment[$pair[1] + 'Provinces2025'] = [ordered]@{}
    foreach ($k in $provinces.Keys) { $employment[$pair[1] + 'Provinces2025'][$k] = $provinces[$k][-1] }
  }
} finally { $xl.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($xl) }
Save 'employment' $employment

# --- Recaudación tributaria propia 1984–2025 (serie TOP), millones de pesos ---
$top = Import-Csv (Join-Path $Raw 'serie_top_1984_2025.csv') -Delimiter ';' | Where-Object provincia -eq 'buenos aires'
$taxes = [ordered]@{}
foreach ($t in 'ingresos brutos','inmobiliario','automotores','sellos','otros') {
  $taxes[$t] = [ordered]@{}
  foreach ($r in $top | Where-Object impuesto -eq $t | Sort-Object { [int]$_.ano }) {
    $taxes[$t][$r.ano] = [math]::Round([double]::Parse($r.monto.Replace(',', '.'), $inv), 3)
  }
}
Save 'tax-history' ([ordered]@{ unit = 'millones de pesos'; taxes = $taxes })

# --- Municipios: población, transferencias enero–agosto 2025/2026 y tributos descentralizados ---
$geo = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'data\municipios.json') | ConvertFrom-Json
$ids = @($geo.districts | ForEach-Object id)
$pop = @{}
$provincePop = [ordered]@{}
foreach ($r in Import-Csv (Join-Path $Raw 'poblacion.csv') -Encoding UTF8) {
  if ($r.municipio_id -match '^06\d{3}$') { $pop[$r.municipio_id] = @{ y2022 = [int]$r.'2022'; y2025 = [int]$r.'2025' } }
  if ($r.municipio_id -eq '06') { foreach ($y in 2010..2025) { $provincePop["$y"] = [int]$r."$y" } }
}
$months = 8
$groups = @{ 'Coparticipación Bruta' = 'copart'; 'Fondo Financiamiento Educativo' = 'education'; 'Descentralización Tributaria' = 'decentralized' }
$acc = @{}
foreach ($id in $ids) { $acc[$id] = @{ '2025' = @{ total = 0.0; copart = 0.0; education = 0.0; decentralized = 0.0 }; '2026' = @{ total = 0.0; copart = 0.0; education = 0.0; decentralized = 0.0 } } }
$sr = [IO.StreamReader]::new((Join-Path $Raw 'transferencias-mensual.csv'), [Text.Encoding]::UTF8); [void]$sr.ReadLine()
while (-not $sr.EndOfStream) {
  $p = $sr.ReadLine().Split(',')
  if ($p.Count -lt 6 -or ($p[0] -ne '2025' -and $p[0] -ne '2026') -or [int]$p[1] -gt $months) { continue }
  $id = $p[2]; if (-not $acc.ContainsKey($id)) { continue }
  $amount = [double]::Parse($p[$p.Count - 1], $inv)
  $bucket = $acc[$id][$p[0]]; $bucket.total += $amount
  $g = $groups[$p[4]]; if ($g) { $bucket[$g] += $amount }
}
$sr.Close()
$ipcRows = @{}; foreach ($r in $long.rows) { $ipcRows[$r.date] = [double]$r.index }
$avg = { param($y) (1..$months | ForEach-Object { $ipcRows[('{0}-{1:D2}' -f $y, $_)] } | Measure-Object -Average).Average }
$priceRatio = (& $avg 2026) / (& $avg 2025)
$districts = [ordered]@{}
foreach ($id in $ids) {
  $a = $acc[$id]
  $districts[$id] = [ordered]@{
    pop2022 = $pop[$id].y2022; pop2025 = $pop[$id].y2025
    jan_aug_2025 = @([math]::Round($a['2025'].total), [math]::Round($a['2025'].copart), [math]::Round($a['2025'].education), [math]::Round($a['2025'].decentralized))
    jan_aug_2026 = @([math]::Round($a['2026'].total), [math]::Round($a['2026'].copart), [math]::Round($a['2026'].education), [math]::Round($a['2026'].decentralized))
  }
}
$missing = @($ids | Where-Object { -not $pop[$_] -or $acc[$_]['2026'].total -le 0 })
if ($missing.Count) { throw "Partidos sin población o transferencias: $($missing -join ', ')" }
Save 'municipal-plus' ([ordered]@{
  months = $months
  priceRatio = [math]::Round($priceRatio, 6)
  provincePopulation = $provincePop
  priceNote = 'Cociente del IPC nacional de INDEC, promedio enero–agosto 2026 sobre promedio enero–agosto 2025.'
  columns = @('total', 'coparticipación bruta', 'Fondo de Financiamiento Educativo', 'descentralización tributaria')
  districts = $districts
})
