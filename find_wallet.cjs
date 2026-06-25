const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src').filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (/\bWallet\b/.test(content)) {
    // extract lucide-react import
    const match = content.match(/import\s+{([^}]*)}\s+from\s+['"]lucide-react['"]/);
    if (match) {
      const imports = match[1];
      if (!imports.includes('Wallet')) {
        console.log('MISSING Wallet import in', f);
      }
    } else {
      console.log('NO lucide import but uses Wallet in', f);
    }
  }
});
