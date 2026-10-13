param([Parameter(Mandatory=$true)][string]$PlanFile)
$ErrorActionPreference = 'Stop'
$plan = Get-Content -LiteralPath $PlanFile -Raw -Encoding UTF8 | ConvertFrom-Json
$root = [IO.Path]::GetFullPath($plan.root).TrimEnd('\')
$versions = [IO.Path]::GetFullPath($plan.versions).TrimEnd('\')
$current = [IO.Path]::GetFullPath($plan.current).TrimEnd('\')
if ($versions -ne (Join-Path $root 'Versions') -or (Split-Path -Parent $current) -ne $versions -or (Split-Path -Leaf $current) -notmatch '^[a-f0-9]{16}$') { throw '설치 경로 범위 오류' }
if ((Split-Path -Parent ([IO.Path]::GetFullPath($PlanFile))) -ne (Join-Path $root 'Maintenance')) { throw '설치 정리 계획 경로 오류' }
function Check-NoLinks([string]$path) {
  $ancestor = $path
  while ($ancestor) { if ((Test-Path -LiteralPath $ancestor) -and ((Get-Item -LiteralPath $ancestor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw '링크 경로 정리 금지' }; $ancestor = Split-Path -Parent $ancestor }
}
function File-Digest([string]$file) { $stream=[IO.File]::OpenRead($file); $hash=[Security.Cryptography.SHA256]::Create(); try { return [BitConverter]::ToString($hash.ComputeHash($stream)).Replace("-", "").ToLowerInvariant() } finally { $stream.Dispose(); $hash.Dispose() } }
Check-NoLinks $versions
$protected = @($current)
$link = Join-Path $root 'HBEngine.lnk'
if (Test-Path -LiteralPath $link) { $shell = New-Object -ComObject WScript.Shell; $target = $shell.CreateShortcut($link).TargetPath; if ($target) { $protected += Split-Path -Parent $target } }
$removedBytes = 0L; $removed = @(); $preserved = @(); $skipped = @($plan.skipped); $failures = @()
function Is-Active([string]$directory) { return @(Get-CimInstance Win32_Process | Where-Object { ($_.ExecutablePath -and $_.ExecutablePath.StartsWith($directory + '\',[StringComparison]::OrdinalIgnoreCase)) -or ($_.CommandLine -and $_.CommandLine.IndexOf($directory,[StringComparison]::OrdinalIgnoreCase) -ge 0) }).Count -gt 0 }
foreach ($entry in $plan.entries) {
  $directory = [IO.Path]::GetFullPath($entry.directory).TrimEnd('\')
  if ((Split-Path -Parent $directory) -ne $versions -or (Split-Path -Leaf $directory) -notmatch '^[a-f0-9]{16}$') { throw '버전 삭제 대상 범위 오류' }
  if ($protected -contains $directory -or (Is-Active $directory)) { $skipped += @{directory=$directory;reason='현재 설치 또는 실행 중'}; continue }
  try {
    Check-NoLinks $directory
    if (@(Get-ChildItem -LiteralPath $directory -Recurse -Force -Attributes ReparsePoint).Count -gt 0) { throw '설치 내부 링크 보존' }
    $marker = Join-Path $directory 'HBEngine.install.json'
    if ((File-Digest $marker) -ne $entry.manifestSHA256) { throw '정리 중 설치 명세 변경' }
    $manifest = Get-Content -LiteralPath $marker -Raw -Encoding UTF8 | ConvertFrom-Json
    $known = @{}; foreach ($file in $manifest.files) { $known[$file.path] = $file }
    $files = @(Get-ChildItem -LiteralPath $directory -File -Recurse -Force)
    if (@($files | Where-Object { $_.Extension -eq '.hbproject' -and $_.FullName -notlike ($directory + '\native\build\plugins\*') }).Count -gt 0) { $skipped += @{directory=$directory;reason='사용자 프로젝트 보존'}; continue }
    $bytes = 0L; $backups = @()
    foreach ($file in $files) {
      $bytes += $file.Length
      $relative = $file.FullName.Substring($directory.Length + 1).Replace('\','/')
      if ($relative -eq 'HBEngine.install.json' -or $relative -match '^native/build/plugins/[a-f0-9]{20}/') { continue }
      $digest = (File-Digest $file.FullName)
      if (-not $known.ContainsKey($relative) -or $known[$relative].sha256 -ne $digest) {
        $backup = Join-Path (Join-Path (Join-Path $root 'PreservedChanges') (Split-Path -Leaf $directory)) $relative
        if (-not $backup.StartsWith($root + '\PreservedChanges\',[StringComparison]::OrdinalIgnoreCase)) { throw '수정 파일 보존 범위 오류' }
        Check-NoLinks (Split-Path -Parent $backup)
        if (Test-Path -LiteralPath $backup) { if ((File-Digest $backup) -ne $digest) { throw '기존 보존 파일 충돌' } } else { New-Item -ItemType Directory -Path (Split-Path -Parent $backup) -Force | Out-Null; Copy-Item -LiteralPath $file.FullName -Destination $backup }
        if ((File-Digest $backup) -ne $digest) { throw '수정 파일 보존 검증 실패' }
        $backups += @{original=$file.FullName;backup=$backup;sha256=$digest;bytes=$file.Length}
      }
    }
    if (Is-Active $directory) { $skipped += @{directory=$directory;reason='정리 중 실행 시작'}; continue }
    Remove-Item -LiteralPath $directory -Recurse -Force
    $removedBytes += $bytes; $removed += @{directory=$directory;bytes=$bytes;files=$files.Count;manifestSHA256=$entry.manifestSHA256}; $preserved += $backups
  } catch { $failures += @{directory=$directory;reason=$_.Exception.Message} }
}
$result = @{date=[DateTime]::UtcNow.ToString('o');removed=$removed;preserved=$preserved;skipped=$skipped;failures=$failures;bytes=$removedBytes;remaining=@(Get-ChildItem -LiteralPath $versions -Directory | Select-Object -ExpandProperty Name)}
$result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $root 'Maintenance/latest-cleanup.json') -Encoding UTF8
if ($failures.Count -gt 0) { throw '일부 설치 버전 정리 실패. Maintenance/latest-cleanup.json 확인' }
