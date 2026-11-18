param([string]$Pdf, [string]$Out, [string]$Sep = ' | ')
# Minimal PDF table extractor for DevExpress-style PDFs (Identity-H fonts with ToUnicode CMaps).
# Inflates FlateDecode streams, builds a glyph->unicode map from all ToUnicode CMaps,
# tracks Td/Tm positions and writes one line per visual row (cells separated by $Sep).
Add-Type -AssemblyName System.IO.Compression
$bytes = [IO.File]::ReadAllBytes($Pdf)
$latin = [Text.Encoding]::GetEncoding(28591)
$raw = $latin.GetString($bytes)
$streams = New-Object System.Collections.Generic.List[string]
$byObject = @{}
foreach ($m in [regex]::Matches($raw, '(?<!end)stream(\r\n|\n|\r)')) {
  $start = $m.Index + $m.Length
  $end = $raw.IndexOf('endstream', $start)
  if ($end -lt 0) { continue }
  $dictStart = $raw.LastIndexOf('<<', $m.Index)
  $dict = $raw.Substring($dictStart, $m.Index - $dictStart)
  if ($dict -notmatch 'FlateDecode' -or $dict -match '/Length1|/Subtype\s*/Image') { continue }
  $objStart = $raw.LastIndexOf(' 0 obj', $dictStart)
  $objNum = if ($objStart -gt 0 -and $raw.Substring([math]::Max(0, $objStart - 8), [math]::Min(8, $objStart)) -match '(\d+)$') { [int]$Matches[1] } else { -1 }
  try {
    $ds = [IO.Compression.DeflateStream]::new([IO.MemoryStream]::new($bytes, ($start + 2), ($end - $start - 2)), [IO.Compression.CompressionMode]::Decompress)
    $text = (New-Object IO.StreamReader($ds, $latin)).ReadToEnd()
    $streams.Add($text); if ($objNum -ge 0) { $byObject[$objNum] = $text }
  } catch { }
}
# Orden de lectura: árbol /Pages -> /Kids -> /Contents de cada página.
function ObjBody([int]$n) { $mm = [regex]::Match($raw, "(?<![0-9])$n 0 obj(.*?)endobj", 'Singleline'); if ($mm.Success) { $mm.Groups[1].Value } else { '' } }
function PageList([int]$n) {
  $body = ObjBody $n
  if ($body -match '/Type\s*/Pages') {
    $kids = [regex]::Match($body, '/Kids\s*\[([^\]]*)\]').Groups[1].Value
    foreach ($k in [regex]::Matches($kids, '(\d+)\s+0\s+R')) { PageList ([int]$k.Groups[1].Value) }
  } elseif ($body -match '/Type\s*/Page\b') { $n }
}
$rootPages = [regex]::Match($raw, '/Type\s*/Catalog.*?/Pages\s+(\d+)\s+0\s+R', 'Singleline')
if (-not $rootPages.Success) { $rootPages = [regex]::Match($raw, '/Pages\s+(\d+)\s+0\s+R') }
if ($rootPages.Success) {
  $ordered = New-Object System.Collections.Generic.List[string]
  foreach ($pg in @(PageList ([int]$rootPages.Groups[1].Value))) {
    $c = [regex]::Match((ObjBody $pg), '/Contents\s*(\[[^\]]*\]|\d+\s+0\s+R)').Groups[1].Value
    $parts = foreach ($r in [regex]::Matches($c, '(\d+)\s+0\s+R')) { $byObject[[int]$r.Groups[1].Value] }
    $ordered.Add(($parts -join "`n"))
  }
  if ($ordered.Count) { $cmaps = $streams | Where-Object { $_ -match 'begincmap' }; $streams = New-Object System.Collections.Generic.List[string]; foreach ($x in $cmaps) { $streams.Add($x) }; foreach ($x in $ordered) { $streams.Add($x) } }
}
# Glyph map from ToUnicode CMaps
$map = @{}
foreach ($s in $streams) {
  if ($s -notmatch 'begincmap') { continue }
  foreach ($blk in [regex]::Matches($s, 'beginbfchar(.*?)endbfchar', 'Singleline')) {
    foreach ($p in [regex]::Matches($blk.Groups[1].Value, '<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>')) {
      $map[[Convert]::ToInt32($p.Groups[1].Value, 16)] = [string][char][Convert]::ToInt32($p.Groups[2].Value.Substring(0, 4), 16)
    }
  }
  foreach ($blk in [regex]::Matches($s, 'beginbfrange(.*?)endbfrange', 'Singleline')) {
    foreach ($p in [regex]::Matches($blk.Groups[1].Value, '<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>')) {
      $a = [Convert]::ToInt32($p.Groups[1].Value, 16); $z = [Convert]::ToInt32($p.Groups[2].Value, 16); $u = [Convert]::ToInt32($p.Groups[3].Value.Substring(0, 4), 16)
      for ($g = $a; $g -le $z; $g++) { $map[$g] = [string][char]($u + $g - $a) }
    }
  }
}
function Hex([string]$h) {
  $o = New-Object Text.StringBuilder
  for ($i = 0; $i + 3 -lt $h.Length; $i += 4) {
    $g = [Convert]::ToInt32($h.Substring($i, 4), 16)
    if ($map.ContainsKey($g)) { [void]$o.Append($map[$g]) } else { [void]$o.Append([char]($g + 29)) }
  }
  $o.ToString()
}
function Lit([string]$s) {
  $o = New-Object Text.StringBuilder
  for ($i = 0; $i -lt $s.Length; $i++) {
    $c = $s[$i]
    if ($c -ne '\') { [void]$o.Append($c); continue }
    $i++; if ($i -ge $s.Length) { break }
    $n = $s[$i]
    if ($n -match '[0-7]') { $oct = "$n"; while ($oct.Length -lt 3 -and ($i + 1) -lt $s.Length -and $s[$i + 1] -match '[0-7]') { $i++; $oct += $s[$i] }; [void]$o.Append([char][Convert]::ToInt32($oct, 8)) }
    elseif ($n -ceq 'n' -or $n -ceq 'r') { [void]$o.Append(' ') } elseif ($n -ceq 't') { [void]$o.Append(' ') } else { [void]$o.Append($n) }
  }
  $o.ToString()
}
function Parts([string]$arr) {
  $o = New-Object Text.StringBuilder
  foreach ($p in [regex]::Matches($arr, '\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f]*>|-?\d+\.?\d*')) {
    $v = $p.Value
    if ($v.StartsWith('(')) { [void]$o.Append((Lit $v.Substring(1, $v.Length - 2))) }
    elseif ($v.StartsWith('<')) { [void]$o.Append((Hex $v.Substring(1, $v.Length - 2))) }
    elseif ([double]$v -lt -200) { [void]$o.Append(' ') }
  }
  $o.ToString()
}
$sb = New-Object Text.StringBuilder
$page = 0
foreach ($s in $streams) {
  if ($s -notmatch 'BT') { continue }
  $page++
  $items = New-Object System.Collections.Generic.List[object]
  foreach ($bt in [regex]::Matches($s, 'BT(.*?)ET', 'Singleline')) {
    $x = 0.0; $y = 0.0; $lx = 0.0; $ly = 0.0
    foreach ($t in [regex]::Matches($bt.Groups[1].Value, '(-?[\d.]+)\s+(-?[\d.]+)\s+Td|(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+Tm|<([0-9A-Fa-f]*)>\s*Tj|\[(.*?)\]\s*TJ|\(((?:\\.|[^\\)])*)\)\s*Tj')) {
      if ($t.Groups[1].Success) { $lx += [double]$t.Groups[1].Value; $ly += [double]$t.Groups[2].Value; $x = $lx; $y = $ly }
      elseif ($t.Groups[3].Success) { $lx = [double]$t.Groups[7].Value; $ly = [double]$t.Groups[8].Value; $x = $lx; $y = $ly }
      elseif ($t.Groups[9].Success) { $items.Add([pscustomobject]@{x = $x; y = $y; t = (Hex $t.Groups[9].Value)}) }
      elseif ($t.Groups[10].Success) { $items.Add([pscustomobject]@{x = $x; y = $y; t = (Parts $t.Groups[10].Value)}) }
      else { $items.Add([pscustomobject]@{x = $x; y = $y; t = (Lit $t.Groups[11].Value)}) }
    }
  }
  [void]$sb.AppendLine("=====PAGINA $page")
  $rows = $items | Group-Object { [math]::Round($_.y / 2.5) } | Sort-Object { -[double]$_.Name }
  foreach ($r in $rows) {
    $cells = $r.Group | Sort-Object x | ForEach-Object { $_.t.Trim() } | Where-Object { $_ }
    if ($cells) { [void]$sb.AppendLine(($cells -join $Sep)) }
  }
}
[IO.File]::WriteAllText($Out, $sb.ToString(), [Text.Encoding]::UTF8)
"paginas: $page; glifos mapeados: $($map.Count); caracteres: $($sb.Length)"
