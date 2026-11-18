# Equivalente de scripts/pack-data.cjs para equipos sin Node: arma assets/data.js desde data/.
# El build de GitHub Actions vuelve a generarlo con Node antes de publicar.
$root = Split-Path -Parent $PSScriptRoot
$keys = [regex]::Match([IO.File]::ReadAllText((Join-Path $root 'scripts\pack-data.cjs')), "const keys = \[([^\]]+)\]").Groups[1].Value -split ',' | ForEach-Object { $_.Trim().Trim("'") }
$parts = foreach ($k in $keys) { '"' + $k + '":' + [IO.File]::ReadAllText((Join-Path $root "data\$k.json"), [Text.Encoding]::UTF8).Trim() }
$js = "/* Generado desde data/ por npm run build. */`nconst PBA_DATA = {" + ($parts -join ',') + "};`n"
[IO.File]::WriteAllText((Join-Path $root 'assets\data.js'), $js, (New-Object Text.UTF8Encoding $false))
"assets/data.js: {0:N0} bytes, {1} conjuntos" -f $js.Length, $keys.Count
