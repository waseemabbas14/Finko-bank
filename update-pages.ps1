# Script to replace header/footer in all pages with dynamic loading

$mainPagesPath = 'e:\calculator-with modules\main-pages'
$regularPagesPath = 'e:\calculator-with modules\pages'

$files = @(
    "$mainPagesPath\About-us.html",
    "$mainPagesPath\Blog.html",
    "$mainPagesPath\commercial-loan.html",
    "$mainPagesPath\Contact-us.html",
    "$mainPagesPath\FAQS.html",
    "$mainPagesPath\Home-Loan.html",
    "$mainPagesPath\smsf-loan.html"
)

# Regular pages folder
$regularFiles = Get-ChildItem -Path "$regularPagesPath\*.html" -Recurse | Where-Object { $_.Name -ne 'banks-info.html' }

foreach ($file in $regularFiles) {
    $files += $file.FullName
}

foreach ($filePath in $files) {
    if (-not (Test-Path $filePath)) { continue }
    
    Write-Host "Processing: $filePath"
    
    $content = Get-Content -Path $filePath -Raw
    
    # Determine the correct path based on location
    if ($filePath -like "*main-pages*") {
        $scriptPath = '../js/load-components.js'
    } else {
        $scriptPath = '../../js/load-components.js'
    }
    
    # Remove old header section (from <body> tag to <!-- header -->)
    $content = $content -replace '(?s)<body>\s*<!-- header -->.*?<!-- header -->\s*<!-- main code -->', '<body>' + "`n" + '<!-- header container - dynamically loaded -->' + "`n" + '<div id="header-container"></div>' + "`n" + '<!-- main code -->'
    
    # Remove old footer section (replace entire footer element)
    $content = $content -replace '(?s)\s*<!-- anu footer hn sho -->\s*<footer>.*?</footer>\s*<!-- anu footer hn sho -->', "`n" + '<!-- footer container - dynamically loaded -->' + "`n" + '<div id="footer-container"></div>'
    
    # Add script tag before </body> if not already present
    if ($content -notmatch 'load-components\.js') {
        $content = $content -replace '</body>', '<script src="' + $scriptPath + '"></script>' + "`n" + '</body>'
    }
    
    Set-Content -Path $filePath -Value $content
    Write-Host "Updated: $filePath"
}

Write-Host 'Done! All files updated.'
