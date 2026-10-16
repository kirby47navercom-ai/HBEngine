param([Parameter(Mandatory=$true)][string]$PlanFile)
$ErrorActionPreference = 'Stop'
function Get-NodeSHA([string]$Path) {
  $stream = [IO.File]::OpenRead($Path); $hash = [Security.Cryptography.SHA256]::Create()
  try { return [BitConverter]::ToString($hash.ComputeHash($stream)).Replace('-','').ToLowerInvariant() }
  finally { $hash.Dispose(); $stream.Dispose() }
}
$expected = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../native/build')).TrimEnd('\')
$resolvedPlan = (Resolve-Path -LiteralPath $PlanFile).Path
if (-not $resolvedPlan.StartsWith($expected + '\', [StringComparison]::OrdinalIgnoreCase)) { throw '정리 계획 경로 오류' }
$plan = Get-Content -LiteralPath $resolvedPlan -Raw -Encoding UTF8 | ConvertFrom-Json
if ([IO.Path]::GetFullPath($plan.build).TrimEnd('\') -ne $expected) { throw '검사 빌드 경로 오류' }
$processes = @(Get-CimInstance Win32_Process)
$freeBefore = (Get-PSDrive -Name C).Free
$deleted = @(); $skipped = @(); $failures = @()
foreach ($entry in $plan.entries) {
  $target = [IO.Path]::GetFullPath($entry.path).TrimEnd('\')
  if (-not $target.StartsWith($expected + '\', [StringComparison]::OrdinalIgnoreCase)) { throw '삭제 대상 범위 오류' }
  $rel = $target.Substring($expected.Length + 1)
  $valid = switch ($entry.kind) {
    'fixture-build' { $rel -match '^[a-z0-9-]+-[A-Za-z0-9]{6}\\.+\\Builds$' -and @(Get-ChildItem -LiteralPath (Split-Path -Parent $target) -File -Filter '*.hbproject').Count -gt 0 }
    'fixture-profile' { $rel -match '^[a-z0-9-]+-[A-Za-z0-9]{6}\\.+\\WebView2$' }
    'fixture-native-cache' { $rel -match '^[a-z0-9-]+-[A-Za-z0-9]{6}\\.+\\native\\build\\plugins$' }
    'fixture-engine-node' { $rel -match '^[a-z0-9-]+-[A-Za-z0-9]{6}\\(?:.+\\)?(?:Engine|baseline-engine)\\runtime\\node\.exe$' }
    'pages-profile' { $rel -match '^auric-pages-084\\(?:perf-)?chrome-[A-Za-z0-9]{6}$' }
    'plugin-cache' { $rel -match '^plugins\\[a-f0-9]{20}$' }
    default { $false }
  }
  if (-not $valid) { throw ('삭제 대상 종류 오류: ' + $rel) }
  $ancestor = $target
  while ($ancestor.Length -ge $expected.Length) {
    if (Test-Path -LiteralPath $ancestor) { if ((Get-Item -LiteralPath $ancestor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw ('링크 경로 정리 금지: ' + $rel) } }
    $ancestor = Split-Path -Parent $ancestor
  }
  if (-not (Test-Path -LiteralPath $target)) { continue }
  $protectionRoot = $target
  if ($entry.kind -eq 'fixture-engine-node') {
    $protectionRoot = Split-Path -Parent (Split-Path -Parent $target)
    $package = Get-Content -LiteralPath (Join-Path $protectionRoot 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($package.name -ne 'hbengine-ui-prototype' -or -not (Test-Path -LiteralPath (Join-Path $protectionRoot 'HBEngine.exe') -PathType Leaf) -or -not (Test-Path -LiteralPath (Join-Path $protectionRoot 'tools/hb.mjs') -PathType Leaf) -or $entry.sha256 -notmatch '^[a-f0-9]{64}$') { throw '검사 엔진 런타임 명세 오류' }
  }
  $active = @($processes | Where-Object { ($_.ExecutablePath -and ($_.ExecutablePath.Equals($protectionRoot,[StringComparison]::OrdinalIgnoreCase) -or $_.ExecutablePath.StartsWith($protectionRoot + '\', [StringComparison]::OrdinalIgnoreCase))) -or ($_.CommandLine -and $_.CommandLine.IndexOf($protectionRoot,[StringComparison]::OrdinalIgnoreCase) -ge 0) }).Count -gt 0
  if ($active) { $skipped += $rel; continue }
  if ($entry.kind -eq 'fixture-engine-node' -and ((Get-Item -LiteralPath $target).Length -ne $entry.size -or (Get-NodeSHA $target) -ne $entry.sha256)) { $skipped += ($rel + ' (modified)'); continue }
  try { Remove-Item -LiteralPath $target -Recurse -Force; $deleted += $entry } catch { $failures += @{path=$rel;error=$_.Exception.Message} }
}
$result = @{date=[DateTime]::UtcNow.ToString('o');deleted=$deleted.Count;bytes=($deleted | Measure-Object -Property bytes -Sum).Sum;files=($deleted | Measure-Object -Property files -Sum).Sum;freeBefore=$freeBefore;freeAfter=(Get-PSDrive -Name C).Free;skipped=$skipped;failures=$failures;receipt=(Split-Path -Parent $resolvedPlan)}
$result | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path (Split-Path -Parent $resolvedPlan) 'result.json') -Encoding UTF8
if ($failures.Count -gt 0) { throw '일부 검사 캐시 정리에 실패했어요. result.json을 확인하세요.' }
