# Importa del Presupuesto General 2026 (Ley 15.557):
#  - Planilla A: finalidad-función × objeto del gasto, consolidado  -> data/budget-2026.json
#  - Planilla H: proyectos por partido                               -> data/works-2026.json
# Entrada: textos extraídos con scripts/pdf-text.ps1 de «04 - Consolidadas.pdf» y «05 - Proyectos por Partidos.pdf».
# Uso: powershell -File scripts/import-planillas-2026.ps1 -Consolidadas ruta.txt -Partidos ruta.txt
param([Parameter(Mandatory)][string]$Consolidadas, [Parameter(Mandatory)][string]$Partidos)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
function Num([string]$s) { [double]($s.Trim() -replace '\.', '') }
function Pages([string]$file) {
  $pages = New-Object System.Collections.Generic.List[object]; $cur = $null
  foreach ($l in [IO.File]::ReadAllLines($file, [Text.Encoding]::UTF8)) {
    if ($l -match '^=====PAGINA') { if ($cur) { $pages.Add($cur) }; $cur = New-Object System.Collections.Generic.List[string] } else { $cur.Add($l) }
  }
  if ($cur) { $pages.Add($cur) }
  $pages
}
function Save($name, $obj) {
  $json = $obj | ConvertTo-Json -Depth 8 -Compress
  [IO.File]::WriteAllText((Join-Path $root "data\$name.json"), $json, (New-Object Text.UTF8Encoding $false))
  "data/$name.json: {0:N0} bytes" -f $json.Length
}

# --- Planilla A ---
$objects1 = @('total', 'staff', 'consumption', 'services', 'capitalGoods')
$objects2 = @('transfers', 'financialAssets', 'debtService', 'other')
$rows = [ordered]@{}
foreach ($page in Pages $Consolidadas) {
  if (-not ($page | Where-Object { $_ -match '^PLANILLA A ' })) { continue }
  if (-not ($page | Where-Object { $_ -match 'ADMINISTRACION CENTRAL, ORGANISMOS' })) { continue }
  $cols = if ($page | Where-Object { $_ -match '^FINALIDAD Y FUNCION \| GASTOS EN PERSONAL' }) { $objects1 } else { $objects2 }
  $pending = $null
  foreach ($l in $page) {
    if ($l -match '^[\d.]+( \| [\d.]+)+$') { $pending = @($l -split ' \| ' | ForEach-Object { Num $_ }); continue }
    if ($l -match '^TOTAL EROGACIONES CORRIENTES Y DE CAPITAL \| (.+)$') { $pending = @($Matches[1] -split ' \| ' | ForEach-Object { Num $_ }); $code = 'total'; $label = 'Total' }
    elseif ($l -match '^(\d\.\d\.\d) - (.+)$' -and $pending) { $code = $Matches[1]; $label = $Matches[2].Trim() }
    else { continue }
    if ($pending.Count -ne $cols.Count) { throw "Fila $code con $($pending.Count) columnas" }
    if (-not $rows.Contains($code)) { $rows[$code] = [ordered]@{ code = $code; label = $label } }
    for ($i = 0; $i -lt $cols.Count; $i++) { $rows[$code][$cols[$i]] = $pending[$i] }
    $pending = $null
  }
}
foreach ($r in $rows.Values) {
  $parts = ($objects1[1..4] + $objects2 | ForEach-Object { $r[$_] } | Measure-Object -Sum).Sum
  if ($null -eq $r.total -or [math]::Abs($parts - $r.total) -gt 2) { throw "Planilla A no cierra en $($r.code): $parts vs $($r.total)" }
}
if ($rows['total'].total -ne 43021244867935) { throw 'El total de la Planilla A no coincide con el votado 2026' }
Save 'budget-2026' ([ordered]@{
  source = 'Presupuesto General Ejercicio 2026, Planilla A: clasificación por finalidad, función y objeto del gasto. Administración Central, organismos descentralizados e instituciones de previsión social.'
  unit = 'pesos'
  objects = [ordered]@{ staff = 'Gastos en personal'; consumption = 'Bienes de consumo'; services = 'Servicios no personales'; capitalGoods = 'Bienes de uso'; transfers = 'Transferencias'; financialAssets = 'Activos financieros'; debtService = 'Servicio de la deuda'; other = 'Otros gastos' }
  rows = @($rows.Values)
})

# --- Planilla H ---
$geo = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'data\municipios.json') | ConvertFrom-Json
function Key([string]$s) { ($s.Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', '' -replace '[^A-Za-z0-9 ]', ' ' -replace '\s+', ' ').Trim().ToLower() }
$byName = @{}; foreach ($d in $geo.districts) { $byName[(Key $d.name)] = $d.id }
$aliases = @{ 'coronel de marina leonardo rosales' = 'coronel rosales'; 'general juan madariaga' = 'general madariaga'; 'general pueyrredon' = 'general pueyrredon' }
$works = New-Object System.Collections.Generic.List[object]
$district = $null; $organism = $null; $buffer = New-Object System.Collections.Generic.List[string]
$headerDone = $false
$lines = New-Object System.Collections.Generic.List[string]
foreach ($page in Pages $Partidos) {
  $skip = $true
  foreach ($l in $page) {
    if ($skip) { if ($l -match '^2026 \| 2027 \| 2028 \| RESTO') { $skip = $false }; continue }
    $lines.Add($l)
  }
  $lines.Add('<<PAGINA>>')
}
$obraRx = '^(\d{1,6}) \| (\d) \| (\d{3}) \| (\d{2}) \| (?:(.+?) \| )?([\d.]+) \| ([\d.]+) \| ([\d.]+) \| ([\d.]+)$'
$amountsRx = '^[\d.]+ \| [\d.]+ \| [\d.]+ \| [\d.]+$'
for ($i = 0; $i -lt $lines.Count; $i++) {
  $l = $lines[$i]
  if ($l -eq '<<PAGINA>>') { continue }
  if ($l -match '(?:^|\| )(\d{3}) - ([^|]+?)(?: \||$)' -and $l -notmatch '^\d\.\d') {
    $k = Key $Matches[2]; if ($aliases[$k]) { $k = $aliases[$k] }
    $district = $byName[$k]; $buffer.Clear(); continue
  }
  if ($l -match '^TOTAL \|' -or $l -match $amountsRx) { $buffer.Clear(); continue }
  if ($l -match '^\d\.\d\.\d\.\d+\.\d+\.\d+ - (.+)$') { $organism = $Matches[1].Trim(); $buffer.Clear(); continue }
  if ($l -match $obraRx) {
    $m = $Matches
    $name = ((@($buffer) + @($m[5])) -join ' ').Trim(); $buffer.Clear()
    # Segunda línea del nombre: texto inmediatamente después, seguido de otro texto.
    $next = if ($i + 1 -lt $lines.Count) { $lines[$i + 1] } else { '' }
    $after = if ($i + 2 -lt $lines.Count) { $lines[$i + 2] } else { '' }
    $isText = { param($s) $s -and $s -ne '<<PAGINA>>' -and $s -notmatch $obraRx -and $s -notmatch $amountsRx -and $s -notmatch '^TOTAL' -and $s -notmatch '^\d\.\d' -and $s -notmatch '(?:^|\| )\d{3} - ' }
    if ((& $isText $next) -and (& $isText $after)) { $name = "$name $next"; $i++ }
    if ($district) {
      $works.Add([ordered]@{ district = $district; name = $name; organism = $organism; project = $m[1]; function = $m[3]; source = $m[4]; a2026 = Num $m[6]; a2027 = Num $m[7]; a2028 = Num $m[8]; rest = Num $m[9] })
    }
    continue
  }
  $buffer.Add($l)
}
$covered = @($works | ForEach-Object { $_['district'] } | Sort-Object -Unique)
Save 'works-2026' ([ordered]@{
  source = 'Presupuesto General Ejercicio 2026, Planilla H: proyectos por partido (copia parcial: ' + $covered.Count + ' partidos).'
  unit = 'pesos'
  districts = $covered
  works = $works.ToArray()
})
