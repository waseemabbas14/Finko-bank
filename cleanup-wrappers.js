const fs = require('fs');
const path = require('path');

function cleanFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const filename = path.basename(filePath);
        
        // Remove any nested commercial-page-container divs from the original content
        // This pattern removes the inner opening tags
        content = content.replace(
            /<div class="main-contents"><div class="commercial-page-container"/g,
            '<div class="main-contents">'
        );
        
        // Remove any stray style attributes and duplicate closing divs
        content = content.replace(/<div class="main-contents"> style="[^"]*">/g, '<div class="main-contents">');
        content = content.replace(/<\/div>\s*<\/div>\s*<\/body>/g, '</div>\n    </div>\n</body>');
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Cleaned: ${filename}`);
    } catch (err) {
        console.log(`✗ Error: ${filename} - ${err.message}`);
    }
}

const pagesDir = './pages';

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            walkDir(filePath);
        } else if (file.endsWith('.html') && file !== 'commercial-equipment-finance.html') {
            cleanFile(filePath);
        }
    });
}

console.log('Cleaning duplicate wrappers...\n');
walkDir(pagesDir);
console.log('\nDone!');
