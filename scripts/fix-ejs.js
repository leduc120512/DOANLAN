const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, '../views');

function fixEJSFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix pattern: <%- include('./layout', { body: `...` }) %>
  content = content.replace(/<%- include\(['"](.+?)['"],\s*\{\s*body:\s*`\n?/, '');
  content = content.replace(/\n?\s*\}\s*\)\s*%>$/, '');
  
  // Also remove trailing backtick and closing braces
  content = content.replace(/\`\s*\}\s*\)\s*%>$/, '');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed: ${filePath}`);
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.ejs')) {
      fixEJSFile(filePath);
    }
  });
}

walkDir(viewsDir);
