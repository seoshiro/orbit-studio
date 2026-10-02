import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
await mkdir('evidence/round-1',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>console.log('ERROR',e.message));await page.goto('http://127.0.0.1:5515/');await page.waitForFunction(()=>window.__ORBIT);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1200);await page.screenshot({path:`evidence/round-1/${name}.png`});await page.locator('#orbit-tab').click();await page.waitForTimeout(600);await page.screenshot({path:`evidence/round-1/${name}-orbit.png`});await page.evaluate(()=>{const s=window.__ORBIT.state();scrollTo({top:s.scroll.start+s.scroll.range*.7,behavior:'instant'});});await page.waitForTimeout(600);await page.screenshot({path:`evidence/round-1/${name}-assembly.png`});console.log(name,await page.evaluate(()=>window.__ORBIT.state()));await page.close();
}
await browser.close();
