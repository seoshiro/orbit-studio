import {launchBrowser} from './browser.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base=process.env.ORBIT_URL||'http://127.0.0.1:5516/orbit-studio/',out=process.env.ORBIT_EVIDENCE||'evidence/model-audit';
await mkdir(out,{recursive:true});const browser=await launchBrowser(),records=[];
const state=page=>page.evaluate(()=>window.__ORBIT.state());
async function ready(page){await page.goto(base);await page.waitForFunction(()=>window.__ORBIT?.state().scene.webgl);await page.waitForFunction(()=>window.__ORBIT.state().scene.earth.loaded);await page.evaluate(()=>document.fonts.ready);}
function bounds(s,label){const b=s.bounds;assert.ok(b.left>=1&&b.right<=s.width-1&&b.top>=1&&b.bottom<=s.height-1,`${label}: clipping ${JSON.stringify(b)}`);}
async function record(page,selector){await page.evaluate(selector=>{
 const stream=document.querySelector(selector).captureStream(24),chunks=[];window.__recorded=null;window.__recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:2400000});window.__recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
 window.__recorder.onstop=async()=>{const bytes=new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer());let text='';for(const b of bytes)text+=String.fromCharCode(b);window.__recorded=btoa(text);stream.getTracks().forEach(t=>t.stop());};window.__recorder.start();
 },selector);}
async function finish(page,name){await page.evaluate(()=>window.__recorder.stop());await page.waitForFunction(()=>window.__recorded);await writeFile(`${out}/${name}.webm`,Buffer.from(await page.evaluate(()=>window.__recorded),'base64'));}
try{
 for(const [name,width,height] of [['desktop',1440,1000],['small-mobile',320,568]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],hashes=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);
  for(const payload of ['optical','relay'])for(const blanket of ['gold','silver'])for(const deployed of [true,false]){
   await page.locator(`[data-payload="${payload}"]`).click();await page.locator(`[data-blanket="${blanket}"]`).click();if((await state(page)).archive.current.deployed!==deployed)await page.locator('#deploy').click();
   await page.locator('#scene').scrollIntoViewIfNeeded();await page.waitForFunction(target=>window.__ORBIT.state().scene.deployment===target,deployed?1:0);await page.waitForTimeout(60);const s=await state(page);bounds(s.scene,name);
   assert.equal(s.scene.shadows,width>=600);assert.ok(s.scene.calls<=(width>=600?125:65));assert.ok(s.scene.triangles<=(width>=600?44000:22000));
   const label=`${name}-${payload}-${blanket}-${deployed?'deployed':'folded'}`,shot=await page.locator('#scene').screenshot({path:`${out}/${label}.png`});hashes.push(createHash('sha256').update(shot).digest('hex'));records.push({name:label,scene:s.scene});
   await page.locator('#assembly').fill('100');await page.locator('#assembly-scene').scrollIntoViewIfNeeded();await page.waitForTimeout(80);bounds((await state(page)).assembly,`${label} exploded`);
  }
  assert.equal(new Set(hashes).size,8,'configuration changes must produce different actual renders');
  await page.locator('#orbit-tab').click();await page.locator('#scene').scrollIntoViewIfNeeded();await page.locator('#scene').focus();const before=await page.locator('#scene').screenshot();for(let j=0;j<12;j++)await page.keyboard.press('ArrowRight');await page.waitForTimeout(80);const after=await page.locator('#scene').screenshot({path:`${out}/${name}-earth-rotated.png`});assert.notEqual(createHash('sha256').update(before).digest('hex'),createHash('sha256').update(after).digest('hex'));bounds((await state(page)).scene,`${name} rotated Earth`);
  await page.locator('#scene').focus();await page.keyboard.press('Home');await page.waitForTimeout(80);await page.locator('#scene').screenshot({path:`${out}/${name}-earth.png`});
  if(width<600){await page.setViewportSize({width:568,height:320});await page.locator('#scene').scrollIntoViewIfNeeded();await page.waitForTimeout(120);bounds((await state(page)).scene,'landscape Earth');assert.equal((await state(page)).scene.shadows,false);await page.screenshot({path:`${out}/mobile-landscape.png`});}
  assert.deepEqual(errors,[]);await context.close();console.log(`${name}: 8 spacecraft combinations, assembly, budgets and Earth rotation passed`);
 }
 // Real continuous scroll forward/reverse, recorded while every animation frame is checked.
 const context=await browser.newContext({viewport:{width:1440,height:1080}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);
 await page.locator('#assembly').fill('0');await page.locator('#follow').click();await page.evaluate(()=>{const s=window.__ORBIT.state();scrollTo({top:s.scroll.start,behavior:'instant'});});await page.waitForTimeout(100);await record(page,'#assembly-scene canvas');
 const samples=await page.evaluate(async()=>{
  const initial=window.__ORBIT.state(),samples=[];
  for(const [from,to] of [[0,1],[1,0]]){const start=performance.now();await new Promise(resolve=>{function frame(now){const fraction=Math.min(1,(now-start)/3000),ease=fraction*fraction*(3-2*fraction);scrollTo({top:initial.scroll.start+initial.scroll.range*(from+(to-from)*ease),behavior:'instant'});const s=window.__ORBIT.state();samples.push({from,to,progress:s.progress,explosion:s.assembly.explosion,scene:s.assembly});if(fraction<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});}
  return samples;
 });await finish(page,'assembly-forward-and-reverse');assert.ok(samples.length>30);samples.forEach((s,i)=>{assert.ok(s.progress>=0&&s.progress<=1);assert.ok(s.explosion>=0&&s.explosion<=1);bounds(s.scene,`motion frame ${i}`);});await page.waitForTimeout(100);assert.ok((await state(page)).assembly.explosion<.01);records.push({name:'continuous-scroll-forward-reverse',frames:samples.length});
 await page.locator('#scene').scrollIntoViewIfNeeded();await page.locator('#deploy').click();await page.waitForFunction(()=>window.__ORBIT.state().scene.deployment<.001);await page.locator('#deploy').click();await page.waitForFunction(()=>window.__ORBIT.state().scene.deployment===1);
 await record(page,'#scene canvas');const deployment=[];
 for(const target of [0,1]){await page.locator('#deploy').click();for(let j=0;j<18;j++){await page.waitForTimeout(90);const s=await state(page);bounds(s.scene,'wing animation');deployment.push(s.scene.deployment);}await page.waitForFunction(target=>Math.abs(window.__ORBIT.state().scene.deployment-target)<.001,target);}
 await finish(page,'solar-wing-deployment');assert.ok(deployment.some(d=>d>.1&&d<.9));records.push({name:'continuous-fold-and-deploy',samples:deployment});
 await page.locator('#orbit-tab').click();await page.locator('#speed').selectOption('300');await record(page,'#scene canvas');const r=await page.locator('#scene').boundingBox();await page.mouse.move(r.x+r.width*.22,r.y+r.height*.6);await page.mouse.down();for(let j=1;j<=48;j++){await page.mouse.move(r.x+r.width*(.22+.55*j/48),r.y+r.height*.6);await page.waitForTimeout(35);bounds((await state(page)).scene,'rotating Earth');}await page.mouse.up();await page.waitForTimeout(1500);await finish(page,'rotating-earth');await page.locator('#scene').focus();await page.keyboard.press('Home');
 // Textures and shadows must survive repeated loss/restoration of both independent contexts.
 for(const which of ['scene','assembly']){
  const selector=which==='scene'?'#scene':'#assembly-scene';await page.locator(selector).scrollIntoViewIfNeeded();await page.waitForTimeout(100);
  for(let j=0;j<2;j++){await page.evaluate(selector=>{window.__loss=document.querySelector(`${selector} canvas`).getContext('webgl2').getExtension('WEBGL_lose_context');window.__loss.loseContext();},selector);await page.waitForFunction(which=>window.__ORBIT.state()[which].lost,which);await page.waitForTimeout(180);await page.evaluate(()=>window.__loss.restoreContext());await page.waitForFunction(which=>window.__ORBIT.state()[which].webgl,which);await page.waitForTimeout(120);bounds((await state(page))[which],`${which} restored`);}
  await page.locator(selector).screenshot({path:`${out}/${which}-restored.png`});records.push({name:`${which}-repeated-context-recovery`,passed:true});
 }
 assert.deepEqual(errors,[]);await context.close();
 // A missing image retains a usable blue globe and working controls.
 const missing=await browser.newPage();await missing.route('**/textures/earth-blue-marble.jpg',route=>route.fulfill({status:404,body:'missing'}));await missing.goto(base);await missing.waitForFunction(()=>window.__ORBIT?.state().scene.earth.failed);await missing.locator('#orbit-tab').click();await missing.locator('#scene').scrollIntoViewIfNeeded();await missing.waitForTimeout(100);assert.equal((await state(missing)).scene.webgl,true);await missing.locator('#scene').screenshot({path:`${out}/earth-image-unavailable.png`});await missing.close();records.push({name:'earth-image-unavailable',passed:true});
 await writeFile(`${out}/report.json`,JSON.stringify({base,browser:'Installed Chrome on Windows; emulated device bounds, not physical phone timing',records},null,2));console.log('PASS: model visual and animation regressions');
}catch(error){await writeFile(`${out}/failure.txt`,String(error.stack));throw error;}finally{await browser.close();}
