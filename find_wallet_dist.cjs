const fs=require('fs'); 
const files=fs.readdirSync('dist/assets').filter(f=>f.endsWith('.js')); 
files.forEach(file => { 
  const content=fs.readFileSync('dist/assets/'+file, 'utf8'); 
  const regex = /.{0,50}[^\w]Wallet[^\w].{0,50}/g; 
  let m; 
  while ((m = regex.exec(content)) !== null) { 
    if (!m[0].includes('"Wallet') && !m[0].includes('Wallet"') && !m[0].includes('\'Wallet') && !m[0].includes('Wallet\'') && !m[0].includes('`Wallet') && !m[0].includes('Wallet`') && !m[0].includes('Wallet Not') && !m[0].includes('Wallet method') && !m[0].includes('Wallet balance')) { 
      console.log(file, '=>', m[0]); 
    } 
  } 
});
