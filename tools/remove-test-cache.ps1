param([Parameter(Mandatory=$true)][string]$PlanFile)
$ErrorActionPreference = 'Stop'
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
  $active = @($processes | Where-Object { ($_.ExecutablePath -and $_.ExecutablePath.StartsWith($target + '\', [StringComparison]::OrdinalIgnoreCase)) -or ($_.CommandLine -and $_.CommandLine.IndexOf($target,[StringComparison]::OrdinalIgnoreCase) -ge 0) }).Count -gt 0
  if ($active) { $skipped += $rel; continue }
  try { Remove-Item -LiteralPath $target -Recurse -Force; $deleted += $entry } catch { $failures += @{path=$rel;error=$_.Exception.Message} }
}
$result = @{date=[DateTime]::UtcNow.ToString('o');deleted=$deleted.Count;bytes=($deleted | Measure-Object -Property bytes -Sum).Sum;files=($deleted | Measure-Object -Property files -Sum).Sum;freeBefore=$freeBefore;freeAfter=(Get-PSDrive -Name C).Free;skipped=$skipped;failures=$failures;receipt=(Split-Path -Parent $resolvedPlan)}
$result | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path (Split-Path -Parent $resolvedPlan) 'result.json') -Encoding UTF8
if ($failures.Count -gt 0) { throw '일부 검사 캐시 정리에 실패했어요. result.json을 확인하세요.' }
