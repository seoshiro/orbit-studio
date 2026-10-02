import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
let commit=process.env.GITHUB_SHA||'local';
if(commit==='local')try{commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{/* local pre-repository build */}
mkdirSync('public',{recursive:true});writeFileSync('public/version.json',JSON.stringify({project:'ORBIT',commit}));
