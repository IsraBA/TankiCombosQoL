# build/make-zip.ps1
#
# בונה את קובץ ה-ZIP להעלאה לחנות של כרום.
# מיישם את docs/PACKAGING.md — כל שינוי במה שנכנס/לא נכנס צריך לקרות בשני המקומות.
#
# הרצה מתיקיית השורש של הפרויקט:
#   powershell -ExecutionPolicy Bypass -File build/make-zip.ps1

$ErrorActionPreference = 'Stop'

# שורש הפרויקט = תיקיית האם של build/
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$manifestPath = Join-Path $root 'manifest.json'
if (-not (Test-Path $manifestPath)) {
    throw "manifest.json not found at $manifestPath - run this from the project, not elsewhere."
}
$manifest = Get-Content $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$version = $manifest.version
if (-not $version) { throw 'Could not read "version" from manifest.json.' }

# --- מה נכנס לחבילה (ראה docs/PACKAGING.md) ---
$includeFiles = @(
    'manifest.json',
    'background.js',
    # ה-GPL מחייב למסור עותק של הרישיון יחד עם התוכנה
    'LICENSE',
    'assets/icons/icon16.png',
    'assets/icons/icon48.png',
    'assets/icons/icon128.png'
)
$includeDirs = @(
    'shared',
    'features'
)

# --- מה אסור שייכנס, גם בטעות. נבדק על החבילה המוכנה. ---
$denyPatterns = @(
    'CLAUDE.md', 'README.md', 'docs/', 'build/', 'HTML-examples/',
    '.git', '.gitignore', '.vscode', 'translate-icon.svg',
    'icons/icon.png', 'source-icon.png'
)

$staging = Join-Path $env:TEMP ("tanki_qol_pkg_" + [System.Guid]::NewGuid().ToString('N'))
$distDir = Join-Path $root 'build/dist'
$zipPath = Join-Path $distDir ("tanki-combos-qol-v{0}.zip" -f $version)
# תיקייה מחולצת לטעינה כ-unpacked, נבנית מחדש בכל הרצה
$unpackedDir = Join-Path $distDir ("tanki-combos-qol-v{0}" -f $version)

New-Item -ItemType Directory -Path $staging -Force | Out-Null
New-Item -ItemType Directory -Path $distDir -Force | Out-Null

try {
    # העתקת הקבצים הבודדים, תוך שמירת מבנה התיקיות
    foreach ($rel in $includeFiles) {
        $src = Join-Path $root $rel
        if (-not (Test-Path $src)) { throw "Missing file listed in includeFiles: $rel" }
        $dest = Join-Path $staging $rel
        New-Item -ItemType Directory -Path (Split-Path -Parent $dest) -Force | Out-Null
        Copy-Item $src $dest
    }

    # העתקת התיקיות במלואן
    foreach ($rel in $includeDirs) {
        $src = Join-Path $root $rel
        if (-not (Test-Path $src)) { throw "Missing directory listed in includeDirs: $rel" }
        Copy-Item $src (Join-Path $staging $rel) -Recurse
    }

    # רשימת מה שנארז, לצורך בדיקה בעיניים
    $packed = Get-ChildItem $staging -Recurse -File | ForEach-Object {
        $_.FullName.Substring($staging.Length + 1).Replace('\', '/')
    } | Sort-Object

    Write-Host ""
    Write-Host ("Packing {0} files:" -f $packed.Count)
    foreach ($p in $packed) { Write-Host ("  " + $p) }

    # אימות: שאף קובץ מרשימת האסורים לא הסתנן
    $violations = @()
    foreach ($p in $packed) {
        foreach ($bad in $denyPatterns) {
            if ($p -like ("*" + $bad + "*")) { $violations += ("{0}  (matched deny pattern '{1}')" -f $p, $bad) }
        }
    }
    if ($violations.Count -gt 0) {
        Write-Host ""
        Write-Host "REFUSING TO BUILD - excluded content found in the package:" -ForegroundColor Red
        foreach ($v in $violations) { Write-Host ("  " + $v) -ForegroundColor Red }
        throw 'Package would have shipped internal files. See docs/PACKAGING.md.'
    }

    # אימות: שכל קובץ שה-manifest מפנה אליו באמת נמצא בחבילה
    $referenced = @()
    foreach ($block in $manifest.content_scripts) {
        if ($block.js)  { $referenced += $block.js }
        if ($block.css) { $referenced += $block.css }
    }
    $referenced += $manifest.background.service_worker
    $missing = $referenced | Where-Object { $packed -notcontains $_ }
    if ($missing) {
        Write-Host ""
        Write-Host "REFUSING TO BUILD - manifest references files that are not in the package:" -ForegroundColor Red
        foreach ($m in $missing) { Write-Host ("  " + $m) -ForegroundColor Red }
        throw 'Incomplete package.'
    }

    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zipPath

    $sizeKb = [math]::Round((Get-Item $zipPath).Length / 1KB, 1)
    Write-Host ""
    Write-Host ("OK  version {0}  ->  {1}  ({2} KB)" -f $version, $zipPath, $sizeKb) -ForegroundColor Green

    # חילוץ ה-ZIP לתיקייה נקייה, כדי לטעון unpacked בלי צעדים ביד
    if (Test-Path $unpackedDir) { Remove-Item $unpackedDir -Recurse -Force }
    New-Item -ItemType Directory -Path $unpackedDir -Force | Out-Null
    Expand-Archive -Path $zipPath -DestinationPath $unpackedDir -Force

    Write-Host ("Extracted  ->  {0}" -f $unpackedDir) -ForegroundColor Green
    Write-Host "Next: docs/PACKAGING.md -> 'Before uploading' checklist."
}
finally {
    if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
}
