 const fs = require('fs');
const path = require('path');

const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{{TITLE}}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
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
</head>
<body>
<div class="commercial-page-container" style="padding:12px 30px;">
        <div class="top-image-wrapper">
            <img src="/assests/t-removebg-preview.png" alt="Logo">
        </div>
        <div class="main-contents">
{{CONTENT}}
        </div>
    </div>
</body>
</html>`;

function repairFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const filename = path.basename(filePath);
        
        // Check if file has DOCTYPE
        if (content.includes('<!DOCTYPE')) {
            console.log(`✓ OK: ${filename}`);
            return;
        }
        
        // Extract title from first h1 if possible
        const titleMatch = content.match(/<h1[^>]*>([^<]+)<\/h1>/);
        const title = titleMatch ? titleMatch[1] : filename.replace('.html', '');
        
        // Remove the broken wrapper div if present
        content = content.replace(/<div class="commercial-page-container"[^>]*>/, '');
        
        // Create proper HTML
        const fullHtml = HTML_TEMPLATE
            .replace('{{TITLE}}', title)
            .replace('{{CONTENT}}', content.trim());
        
        fs.writeFileSync(filePath, fullHtml, 'utf8');
        console.log(`✓ Fixed: ${filename}`);
    } catch (err) {
        console.log(`✗ Error: ${path.basename(filePath)} - ${err.message}`);
    }
}

// Check commercial pages
const commercialDir = './pages/commercial-pages';
const files = fs.readdirSync(commercialDir);
files.forEach(file => {
    if (file.endsWith('.html')) {
        repairFile(path.join(commercialDir, file));
    }
});

console.log('Done!');
