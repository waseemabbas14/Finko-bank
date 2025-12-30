const fs = require('fs');
const path = require('path');

// CSS to apply to all pages
const newCSS = `            .commercial-page-container {
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
            }`;

function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const filename = path.basename(filePath);
        
        // Skip if already properly formatted (has main-contents)
        if (content.includes('main-contents')) {
            console.log(`✓ Already updated: ${filename}`);
            return;
        }

        // Remove the old wrapper if it exists (from previous failed run)
        content = content.replace(/<div class="commercial-page-container"[\s\S]*?<div class="main-contents">/g, 
                                 '<div class="commercial-page-container" style="padding:12px 30px;">\n        <div class="top-image-wrapper">\n            <img src="/assests/t-removebg-preview.png" alt="Logo">\n        </div>\n        <div class="main-contents">');

        // Replace any existing style tag 
        content = content.replace(/<style>[\s\S]*?<\/style>/g, `<style>\n${newCSS}\n        </style>`);

        // Wrap body content in divs if not already done
        if (!content.includes('<div class="commercial-page-container"')) {
            // Find body tag
            const bodyMatch = content.match(/<body[^>]*>/i);
            if (bodyMatch) {
                const bodyTagIndex = content.indexOf(bodyMatch[0]);
                const afterBodyTag = bodyTagIndex + bodyMatch[0].length;
                
                // Insert the wrapper opening after body tag
                content = content.slice(0, afterBodyTag) + 
                    '\n<div class="commercial-page-container" style="padding:12px 30px;">\n        <div class="top-image-wrapper">\n            <img src="/assests/t-removebg-preview.png" alt="Logo">\n        </div>\n        <div class="main-contents">' +
                    content.slice(afterBodyTag);
                
                // Add closing divs before </body>
                content = content.replace(/<\/body>/i, '\n        </div>\n    </div>\n</body>');
            }
        }

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Updated: ${filename}`);
    } catch (err) {
        console.log(`✗ Error: ${path.basename(filePath)} - ${err.message}`);
    }
}

// Process all HTML files
const pagesDir = './pages';

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            walkDir(filePath);
        } else if (file.endsWith('.html')) {
            processFile(filePath);
        }
    });
}

console.log('Cleaning and reapplying styles...\n');
walkDir(pagesDir);
console.log('\nDone!');
