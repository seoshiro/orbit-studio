import {launchBrowser} from './browser.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.ORBIT_URL||'http://127.0.0.1:5517/',out=process.env.ORBIT_EVIDENCE||'evidence/model-before';
await mkdir(out,{recursive:true});const browser=await launchBrowser(),records=[];
try{
 for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>console.log('PAGE ERROR',e.message));await page.goto(base);await page.waitForFunction(()=>window.__ORBIT?.state().scene.webgl);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(500);
  await page.screenshot({path:`${out}/${name}-page.png`});await page.locator('#scene').screenshot({path:`${out}/${name}-satellite.png`});records.push({name,...await page.evaluate(()=>window.__ORBIT.state().scene)});
  await page.locator('#deploy').click();await page.waitForFunction(()=>window.__ORBIT.state().scene.deployment<.001);await page.locator('#scene').screenshot({path:`${out}/${name}-folded.png`});await page.locator('#deploy').click();await page.waitForFunction(()=>window.__ORBIT.state().scene.deployment===1);
  await page.locator('[data-preset="0"]').click();await page.locator('#scene').screenshot({path:`${out}/${name}-relay.png`});await page.locator('[data-preset="2"]').click();await page.locator('#scene').screenshot({path:`${out}/${name}-silver.png`});
  await page.locator('#orbit-tab').click();await page.waitForTimeout(800);await page.locator('#scene').screenshot({path:`${out}/${name}-earth.png`});
  await page.locator('#assembly').fill('100');await page.locator('#assembly-scene').scrollIntoViewIfNeeded();await page.waitForTimeout(150);await page.locator('#assembly-scene').screenshot({path:`${out}/${name}-exploded.png`});await page.close();
 }
 await writeFile(`${out}/report.json`,JSON.stringify(records,null,2));console.log(records);
}finally{await browser.close();}
