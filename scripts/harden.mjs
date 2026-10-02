import {readFile,writeFile,stat} from 'node:fs/promises';
const file='dist/index.html';let html=await readFile(file,'utf8');
const policy="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'";
html=html.replace('<meta charset="UTF-8">',`<meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><link rel="canonical" href="https://seoshiro.github.io/orbit-studio/">`);await writeFile(file,html);
for(const link of [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]).filter(x=>!x.startsWith('https:'))){const url=new URL(link,'https://example.test/orbit-studio/');if(!url.pathname.startsWith('/orbit-studio/'))throw new Error('Asset path escapes project');await stat(`dist/${url.pathname.slice('/orbit-studio/'.length)}`);}
await stat('dist/version.json');console.log('Verified relative assets, version marker and static CSP.');
