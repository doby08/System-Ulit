const { readFileSync, writeFileSync } = require('node:fs');
let p4 = readFileSync('_parts/api_p4.txt', 'utf8');
const leftover = '        }),\n      );\n      missing.forEach';
if (p4.includes(leftover)) {
  p4 = p4.replace(leftover, '      missing.forEach');
  writeFileSync('_parts/api_p4.txt', p4, 'utf8');
  console.log('leftover removed');
} else {
  console.log('leftover not found');
}
