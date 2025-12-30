# Script to properly update all pages with header/footer containers

$mainPagesPath = 'e:\calculator-with modules\main-pages'
$pagesToUpdate = @(
    'About-us.html',
    'Blog.html',
    'commercial-loan.html',
    'FAQS.html',
    'Home-Loan.html',
    'smsf-loan.html'
)

foreach ($pageName in $pagesToUpdate) {
    $filePath = Join-Path $mainPagesPath $pageName
    if (-not (Test-Path $filePath)) { continue }
    
    Write-Host "Processing: $pageName"
    
    $content = Get-Content -Path $filePath -Raw
    
    # Check if already has the new structure
    if ($content -match 'id="header-container"') {
        Write-Host "  Already updated"
        continue
    }
    
    # 1. Replace old header with container
    $content = $content -replace '(?s)<body>\s*<!-- header -->.*?<!-- main code -->', '<body>' + "`n" + '<div id="header-container"></div>' + "`n`n" + '<!-- main code -->'
    
    # 2. Remove footer if exists and add footer container  
    $content = $content -replace '(?s)<!-- anu footer.*?</footer>.*?<!-- anu footer', '<div id="footer-container"></div>'
    
    # 3. Add load-components.js script if not present
    if ($content -notmatch 'load-components\.js') {
        $content = $content -replace '</body>', '<script src="../js/load-components.js"></script>' + "`n" + '</body>'
    }
    
    Set-Content -Path $filePath -Value $content
    Write-Host "  Updated"
}

Write-Host "Done!"
