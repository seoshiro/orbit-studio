import test from 'node:test';
import assert from 'node:assert/strict';
import {orbit,position,EARTH_RADIUS,MU,TAU,DEFAULT,parseArchive,encodeArchive,mergeMissions,cleanName,advance,explodeAt,wrapPhase,latitudeLimit,type Archive} from '../src/model.ts';
const near=(a:number,b:number,epsilon=1e-8)=>assert.ok(Math.abs(a-b)<epsilon,`${a} ≠ ${b}`);
test('independently calculated 400 km reference and circular invariants',()=>{
 const o=orbit(400);near(o.radius,6771);near(o.speed,7.672598587819,1e-10);near(o.period,5544.85513975,1e-6);
 for(const h of [250,550,800,2000]){const m=orbit(h);near(m.speed*m.period,TAU*m.radius);near(m.speed*m.speed/m.radius,MU/m.radius**2);}
 assert.ok(orbit(2000).period>orbit(250).period);assert.ok(orbit(2000).speed<orbit(250).speed);
});
test('inclination rotates the plane without changing radius or period; retrograde direction',()=>{
 for(const i of [0,53,90,120,180])for(const p of [0,.5,Math.PI/2,Math.PI,TAU]){const v=position(550,i,p);near(Math.hypot(v.x,v.y,v.z),EARTH_RADIUS+550,1e-7);}
 near(position(550,0,Math.PI/2).y,0);near(position(550,90,Math.PI/2).y,EARTH_RADIUS+550);
 assert.ok(position(550,120,.3).z>0);near(latitudeLimit(120),60);near(latitudeLimit(90),90);near(latitudeLimit(180),0);
 assert.throws(()=>orbit(NaN));assert.throws(()=>position(550,181,0));
});
test('timeline pause, frame cap, restart, wrapping and reverse assembly scroll',()=>{
 near(advance(100,.016,60,true),100.96);near(advance(100,100,60,true),106);near(advance(100,.1,300,false),100);near(advance(0,.1,1,true),.1);
 assert.throws(()=>advance(0,-1,1,true));assert.throws(()=>advance(Infinity,1,1,true));near(wrapPhase(-.5),TAU-.5);near(wrapPhase(TAU*2),0);
 for(const p of [0,.2,.7,1,.7,.2,0])near(explodeAt(p),p);near(explodeAt(NaN),0);near(explodeAt(2),1);near(explodeAt(-1),0);
});
test('archive round trip creates independent canonical values',()=>{
 const a:Archive={version:1,current:{...DEFAULT},missions:[{name:'North',mission:{...DEFAULT,altitude:800}}]};
 const b=parseArchive(encodeArchive(a));assert.deepEqual(a,b);b.current.altitude=1200;assert.equal(a.current.altitude,550);
 const extra=parseArchive(JSON.stringify({...a,unknown:'ignored',current:{...a.current,__proto__:{malicious:true},unknown:'ignored'}}));assert.equal(Object.hasOwn(extra.current,'unknown'),false);
});
test('malformed or unsafe imports are rejected as a whole',()=>{
 const valid={version:1,current:DEFAULT,missions:[]};for(const raw of ['{','[]','null',JSON.stringify({...valid,version:2}),JSON.stringify({...valid,current:{...DEFAULT,altitude:250.5}}),JSON.stringify({...valid,current:{...DEFAULT,deployed:'true'}}),JSON.stringify({...valid,missions:[{name:'A',mission:DEFAULT},{name:'a',mission:DEFAULT}]}),JSON.stringify({...valid,missions:Array.from({length:9},(_,i)=>({name:String(i),mission:DEFAULT}))}),JSON.stringify({...valid,missions:[{name:'',mission:DEFAULT}]})])assert.throws(()=>parseArchive(raw));
 assert.throws(()=>parseArchive(' '.repeat(100001)));assert.throws(()=>cleanName('bad\u0000name'));assert.throws(()=>cleanName('a'.repeat(41)));assert.equal(cleanName('  northern light  '),'northern light');
});
test('merge is atomic on conflicts and capacity; case and Unicode normalization',()=>{
 const a=[{name:'Étoile',mission:DEFAULT}],b=[{name:'Other',mission:{...DEFAULT,altitude:800}}];assert.equal(mergeMissions(a,b).length,2);assert.throws(()=>mergeMissions(a,[{name:'E\u0301TOILE',mission:DEFAULT}]));assert.equal(a.length,1);
 const full=Array.from({length:8},(_,i)=>({name:String(i),mission:DEFAULT}));assert.throws(()=>mergeMissions(full,b));
});
