const fs = require('fs');
const key = fs.readFileSync('./assignment-11-key.json', 'utf8')
const base64 = Buffer.from(key).toString('base64')
console.log(base64)