# Apply commercial-equipment-finance.html styling to all pages

$pagesDir = 'c:\Users\taham\OneDrive\Desktop\calculator-with modules\pages'

# Full CSS to apply
$newCSS = @'
<style>
.commercial-page-container {
  color: #0b1b33;
  font-family: Rajdhani, system-ui, sans-serif;
  max-width: 900px;
  margin: auto;
  padding: 0px !important;
  background-color: antiquewhite;
  overflow: hidden;
  border-radius: 15px;
}

/* ===== TOP IMAGE ===== */
.top-image-wrapper {
  width: 100%;
  height: 250px;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  text-align: center;
  padding-top: 50px !important;
  background-color: #0b1b33;
}

.top-image-wrapper img {
  width: 60px;
  object-fit: cover;
}

/* ===== CONTENT ===== */
.commercial-page-container h1 {
  color: #ff8a00;
  margin-bottom: 12px;
  text-align: center;
}

.commercial-page-container h2 {
  margin-top: 22px;
}

.commercial-page-container p {
  font-size: 15px;
  line-height: 1.6;
  margin-bottom: 12px;
}

.commercial-page-container ul {
  padding-left: 18px;
  font-size: 15px;
}

.divider {
  height: 1px;
  background: #eee;
  margin: 18px 0;
}

/* ===== FAQ ===== */
.faq {
  border: none;
  padding: 6px 0;
}

.faq-question {
  font-weight: 600;
  cursor: pointer;
  position: relative;
  padding-right: 36px;
  font-size: 15px;
  border-bottom: 1px solid #eee;
}

.faq-question::before {
  content: '+';
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
  width: 34px;
  text-align: center;
}

.faq.open .faq-question::before {
  content: '-';
}

.main-contents {
  width: 90%;
  margin: -60px auto 30px auto !important;
  padding: 60px;
  background-color: white;
}

.faq-answer {
  font-size: 14px;
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  padding-top: 0;
  transition: max-height 240ms cubic-bezier(.2, .9, .2, 1),
              opacity 240ms,
              padding-top 240ms;
}
</style>
'@

# Get all HTML files
$files = Get-ChildItem -Path $pagesDir -Filter "*.html" -Recurse | Where-Object { $_.Name -ne 'commercial-equipment-finance.html' }

foreach ($file in $files) {
    Write-Host "Processing: $($file.Name)"
    $content = Get-Content -Path $file.FullName -Raw
    
    # Skip if already has new styling
    if ($content -match 'main-contents') {
        Write-Host "  Skipping - already updated"
        continue
    }
    
    # Replace old CSS with new CSS
    $content = $content -replace '<style>.*?</style>', $newCSS
    
    # Wrap content with top-image-wrapper and main-contents
    $content = $content -replace '(style="padding:[^"]*">', 'style="padding:0px;">' + "`n  " + '<div class="top-image-wrapper">' + "`n    " + '<img src="/assests/logo.png" alt="Page Image">' + "`n  " + '</div>' + "`n  " + '<div class="main-contents">'
    
    # Close main-contents before closing body
    $content = $content -replace '(</div>)\s*</body>', '  </div>' + "`n" + '</div>' + "`n" + '</body>'
    
    Set-Content -Path $file.FullName -Value $content
    Write-Host "  Updated successfully"
}

Write-Host "Done!"
