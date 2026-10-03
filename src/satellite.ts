import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {explodeAt,type Mission} from './model.ts';

type Part={group:THREE.Group;origin:THREE.Vector3;direction:THREE.Vector3};
const geometryCache=new Map<string,THREE.BufferGeometry>();
function geometry(key:string,create:()=>THREE.BufferGeometry){let g=geometryCache.get(key);if(!g){g=create();geometryCache.set(key,g);}return g;}
export const silver=new THREE.MeshStandardMaterial({color:0xb5beca,metalness:.86,roughness:.31});
const dark=new THREE.MeshStandardMaterial({color:0x18222c,metalness:.45,roughness:.44});
const black=new THREE.MeshStandardMaterial({color:0x080f19,metalness:0,roughness:.72});
const backing=new THREE.MeshStandardMaterial({color:0x737d88,metalness:.65,roughness:.48});
const pcb=new THREE.MeshStandardMaterial({color:0x175846,metalness:0,roughness:.68});
const copper=new THREE.MeshStandardMaterial({color:0xb99a57,metalness:.7,roughness:.35});
const glass=new THREE.MeshPhysicalMaterial({color:0x0b293d,metalness:0,roughness:.12,ior:1.46,clearcoat:1,clearcoatRoughness:.08});

// Original deterministic textures: wrinkles are irregular overlapping folds, not parallel ribs.
const n=256,normalBytes=new Uint8Array(n*n*4),roughBytes=new Uint8Array(n*n*4),height=new Float32Array(n*n);
for(let y=0;y<n;y++)for(let x=0;x<n;x++){
 const u=x/n,v=y/n;
 height[y*n+x]=.45*Math.sin(31*u+10*Math.sin(v*13))+.3*Math.sin(49*v+5*Math.cos(u*19))+.18*Math.sin(107*(u+v)+3*Math.sin(v*29))+.07*Math.sin(213*u-151*v);
}
for(let y=0;y<n;y++)for(let x=0;x<n;x++){
 const i=(y*n+x)*4,dx=height[y*n+(x+1)%n]-height[y*n+(x+n-1)%n],dy=height[((y+1)%n)*n+x]-height[((y+n-1)%n)*n+x];
 const normal=new THREE.Vector3(-dx*2,-dy*2,1).normalize();normalBytes.set([(normal.x*.5+.5)*255,(normal.y*.5+.5)*255,(normal.z*.5+.5)*255,255],i);
 const r=180+height[y*n+x]*28;roughBytes.set([r,r,r,255],i);
}
function dataTexture(bytes:Uint8Array,w:number,h:number){const t=new THREE.DataTexture(bytes,w,h);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;}
const foilNormal=dataTexture(normalBytes,n,n),foilRoughness=dataTexture(roughBytes,n,n);
const cellBytes=new Uint8Array(128*128*4);
for(let y=0;y<128;y++)for(let x=0;x<128;x++){
 const bus=[23,64,105].some(at=>Math.abs(x-at)<1.2),finger=y%8===0,shade=1+.08*Math.sin(x*.13+y*.02);
 cellBytes.set(bus?[146,160,176,255]:finger?[42,65,94,255]:[14*shade,35*shade,70*shade,255],(y*128+x)*4);
}
const cellMap=dataTexture(cellBytes,128,128);cellMap.colorSpace=THREE.SRGBColorSpace;
export const cell=new THREE.MeshPhysicalMaterial({color:0xffffff,map:cellMap,metalness:0,roughness:.38,ior:1.48,specularIntensity:.6,clearcoat:.25,clearcoatRoughness:.3,envMapIntensity:.12});
export function box(parent:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,material:THREE.Material,bevel=0){
 const g=geometry(`b/${w}/${h}/${d}/${bevel}`,()=>bevel?new RoundedBoxGeometry(w,h,d,1,bevel):new THREE.BoxGeometry(w,h,d));
 const mesh=new THREE.Mesh(g,material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function cylinder(parent:THREE.Object3D,r:number,h:number,x:number,y:number,z:number,material:THREE.Material,segments=24){
 const mesh=new THREE.Mesh(geometry(`c/${r}/${h}/${segments}`,()=>new THREE.CylinderGeometry(r,r,h,segments)),material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function ring(parent:THREE.Object3D,r:number,tube:number,y:number,material:THREE.Material){
 const mesh=new THREE.Mesh(geometry(`r/${r}/${tube}`,()=>new THREE.TorusGeometry(r,tube,6,40)),material);mesh.rotation.x=Math.PI/2;mesh.position.y=y;mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function instances(parent:THREE.Object3D,g:THREE.BufferGeometry,material:THREE.Material,points:number[][],rotation=new THREE.Euler()){
 const mesh=new THREE.InstancedMesh(g,material,points.length),matrix=new THREE.Matrix4(),q=new THREE.Quaternion().setFromEuler(rotation);
 points.forEach(([x,y,z],i)=>{matrix.compose(new THREE.Vector3(x,y,z),q,new THREE.Vector3(1,1,1));mesh.setMatrixAt(i,matrix);});mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
const boltGeometry=geometry('bolt',()=>{
 const washer=new THREE.CylinderGeometry(.029,.029,.01,12),head=new THREE.CylinderGeometry(.018,.018,.014,6);head.translate(0,.011,0);
 const merged=mergeGeometries([washer,head])!;washer.dispose();head.dispose();return merged;
});
function bolts(parent:THREE.Object3D,points:number[][],rotation=new THREE.Euler()){instances(parent,boltGeometry,silver,points,rotation);}
function cable(parent:THREE.Object3D,points:number[][],radius=.018){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p as [number,number,number])));
 const mesh=new THREE.Mesh(geometry(`cable/${radius}/${JSON.stringify(points)}`,()=>new THREE.TubeGeometry(curve,16,radius,6,false)),black);parent.add(mesh);return mesh;
}
function blanket(parent:THREE.Object3D,w:number,h:number,position:THREE.Vector3,rotation:THREE.Euler,material:THREE.Material){
 const g=geometry(`foil/${w}/${h}`,()=>{
  const plane=new THREE.PlaneGeometry(w,h,18,18),p=plane.attributes.position;
  for(let i=0;i<p.count;i++){const u=p.getX(i)/w+.5,v=p.getY(i)/h+.5,edge=Math.sin(Math.PI*u)*Math.sin(Math.PI*v);p.setZ(i,edge*(.008*Math.sin(28*u+8*Math.sin(11*v))+.006*Math.sin(9*u+15*v)));}
  plane.computeVertexNormals();return plane;
 });
 const mesh=new THREE.Mesh(g,material);mesh.position.copy(position);mesh.rotation.copy(rotation);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
 const seamMaterial=black;
 for(const x of [-w/2,w/2]){const seam=new THREE.Mesh(geometry(`seamV/${h}`,()=>new THREE.BoxGeometry(.017,h,.007)),seamMaterial);seam.position.set(x,0,.001);mesh.add(seam);}
 for(const y of [-h/2,h/2]){const seam=new THREE.Mesh(geometry(`seamH/${w}`,()=>new THREE.BoxGeometry(w,.017,.007)),seamMaterial);seam.position.set(0,y,.001);mesh.add(seam);}
 return mesh;
}
// Bake fixed details per component/material. Dynamic part transforms and instances stay intact.
function batchDetails(parent:THREE.Group,key:string){
 parent.updateWorldMatrix(true,true);const inverse=parent.matrixWorld.clone().invert(),buckets=new Map<THREE.Material,THREE.Mesh[]>();
 parent.traverse(node=>{if(node instanceof THREE.Mesh&&!(node instanceof THREE.InstancedMesh)&&!Array.isArray(node.material)){const list=buckets.get(node.material)||[];list.push(node);buckets.set(node.material,list);}});
 let index=0;
 for(const [material,meshes] of buckets){
  if(meshes.length<2)continue;
  const merged=geometry(`batch/${key}/${index++}`,()=>{
   const pieces=meshes.map(mesh=>{const transformed=mesh.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));if(!transformed.index)return transformed;const nonIndexed=transformed.toNonIndexed();transformed.dispose();return nonIndexed;});
   const result=mergeGeometries(pieces)!;pieces.forEach(p=>p.dispose());return result;
  });
  const mesh=new THREE.Mesh(merged,material);mesh.castShadow=mesh.receiveShadow=true;meshes.forEach(m=>m.removeFromParent());parent.add(mesh);
 }
}

export class Satellite{
 root=new THREE.Group();parts:Part[]=[];wings:THREE.Group[]=[];foil:THREE.MeshStandardMaterial;
 optical=new THREE.Group();relay=new THREE.Group();
 constructor(){
  this.foil=new THREE.MeshStandardMaterial({color:0xd7aa4e,metalness:.83,roughness:.55,normalMap:foilNormal,normalScale:new THREE.Vector2(.45,.45),roughnessMap:foilRoughness,side:THREE.DoubleSide});
  const part=(x:number,y:number,z:number,dx:number,dy:number,dz:number)=>{const group=new THREE.Group();group.position.set(x,y,z);this.root.add(group);this.parts.push({group,origin:group.position.clone(),direction:new THREE.Vector3(dx,dy,dz)});return group;};
  // All component origins, explosion vectors and wing pivots match the published model.
  const chassis=part(0,0,0,0,-.1,0);
  box(chassis,1.35,.12,1.15,0,-.67,0,silver,.024);box(chassis,1.35,.1,1.15,0,.64,0,silver,.022);
  box(chassis,1.21,.016,1.01,0,.698,0,dark,.006);
  for(const x of [-.62,.62])for(const z of [-.52,.52])box(chassis,.08,1.35,.08,x,0,z,silver,.012);
  for(const y of [-.61,.59]){for(const z of [-.52,.52])box(chassis,1.24,.035,.035,0,y,z,dark,.006);}
  bolts(chassis,[-.57,.57].flatMap(x=>[-.46,.46].map(z=>[x,.714,z])));
  bolts(chassis,[-.55,.55].flatMap(x=>[-.45,.45].map(z=>[x,-.735,z])),new THREE.Euler(Math.PI,0,0));
  const electronics=part(0,.12,0,0,1.05,0);
  box(electronics,1,.055,.85,0,0,0,pcb,.009);box(electronics,.32,.1,.3,-.22,.085,0,black,.016);box(electronics,.24,.1,.24,.25,.085,.15,silver,.013);
  const pins=Array.from({length:7},(_,j)=>[-.39+j*.13,.07,-.25]);instances(electronics,geometry('pins',()=>new THREE.BoxGeometry(.035,.035,.15)),copper,pins);
  const chips=[[-.2,.047,.27],[.1,.047,-.05],[.34,.047,-.23]];instances(electronics,geometry('chips',()=>new RoundedBoxGeometry(.12,.032,.085,1,.005)),dark,chips);
  const traces=[];for(let j=0;j<6;j++)traces.push([-.39+j*.14,.031,.12]);instances(electronics,geometry('traces',()=>new THREE.BoxGeometry(.009,.002,.3)),copper,traces);
  bolts(electronics,[-.44,.44].flatMap(x=>[-.36,.36].map(z=>[x,.035,z])));
  cable(electronics,[[.38,.07,.32],[.47,.16,.15],[.45,.17,-.11],[.35,.08,-.25]],.014);
  const battery=part(0,-.36,0,0,-1.25,0);
  box(battery,1,.065,.85,0,-.15,0,dark,.016);
  for(let j=0;j<5;j++){
   const x=-.36+j*.18,m=cylinder(battery,.08,.67,x,0,0,silver);m.rotation.x=Math.PI/2;
   for(const z of [-.27,.27]){const collar=cylinder(battery,.082,.024,x,0,z,black);collar.rotation.x=Math.PI/2;}
  }
  for(const z of [-.25,.25])box(battery,.94,.018,.032,0,.078,z,dark,.006);
  cable(battery,[[.43,-.1,.32],[.5,.07,.3],[.46,.13,-.18],[.31,.05,-.31]],.014);
  const wheels=part(0,.35,0,0,1.8,0);
  for(const [x,z] of [[-.27,-.2],[.27,-.2],[0,.25]]){
   cylinder(wheels,.18,.03,x,-.065,z,silver);cylinder(wheels,.16,.11,x,.005,z,dark);cylinder(wheels,.085,.014,x,.068,z,silver);
   bolts(wheels,Array.from({length:3},(_,j)=>[x+.12*Math.cos(j*Math.PI*2/3),.066,z+.12*Math.sin(j*Math.PI*2/3)]));
  }
  const instrument=part(0,.9,0,0,2.4,0);instrument.add(this.optical,this.relay);
  box(this.optical,.64,.07,.57,0,-.245,0,dark,.014);bolts(this.optical,[-.26,.26].flatMap(x=>[-.22,.22].map(z=>[x,-.199,z])));
  cylinder(this.optical,.275,.36,0,-.025,0,silver);cylinder(this.optical,.29,.08,0,.17,0,dark);ring(this.optical,.273,.012,.135,silver);ring(this.optical,.265,.012,.208,silver);
  // Open tapered barrel and inset dielectric lens make the aperture read as depth.
  const barrel=new THREE.Mesh(geometry('barrel',()=>new THREE.CylinderGeometry(.26,.235,.08,40,1,true)),dark);barrel.position.y=.25;barrel.material=new THREE.MeshStandardMaterial({color:0x111923,metalness:.35,roughness:.36,side:THREE.DoubleSide});this.optical.add(barrel);
  const rim=new THREE.Mesh(geometry('aperture',()=>new THREE.RingGeometry(.217,.26,40)),silver);rim.rotation.x=-Math.PI/2;rim.position.y=.29;this.optical.add(rim);
  cylinder(this.optical,.216,.012,0,.207,0,black,40);const lens=new THREE.Mesh(geometry('lens',()=>new THREE.SphereGeometry(.189,32,12,0,Math.PI*2,0,Math.PI/2)),glass);lens.position.y=.22;lens.scale.y=.07;this.optical.add(lens);
  ring(this.optical,.203,.007,.224,dark);
  const dishProfile=Array.from({length:10},(_,j)=>{const r=j/9*.43;return new THREE.Vector2(r,-.03+1.05*r*r);});
  const dish=new THREE.Mesh(geometry('dish',()=>new THREE.LatheGeometry(dishProfile,40)),new THREE.MeshStandardMaterial({color:0xc7ced6,metalness:.8,roughness:.34,side:THREE.DoubleSide}));dish.position.y=.035;dish.castShadow=dish.receiveShadow=true;this.relay.add(dish);ring(this.relay,.43,.012,.2,silver);
  cylinder(this.relay,.027,.25,0,.19,0,dark);cylinder(this.relay,.058,.048,0,.33,0,copper);cylinder(this.relay,.14,.17,0,-.135,0,silver);box(this.relay,.55,.09,.4,0,-.24,0,dark,.018);
  const struts=Array.from({length:3},(_,j)=>{const a=j*Math.PI*2/3;return [[Math.sin(a)*.34,.15,Math.cos(a)*.34],[0,.315,0]];});
  for(const p of struts)cable(this.relay,p,.012);
  for(const side of [-1,1]){
   const shell=part(side*.68,0,0,side*1.45,0,0);box(shell,.025,1.18,1.04,0,0,0,backing,.006);
   blanket(shell,1.01,1.14,new THREE.Vector3(side*.031,0,0),new THREE.Euler(0,side*Math.PI/2,0),this.foil);
   const wing=part(side*.74,.12,0,side*1.45,0,0);this.wings.push(wing);
   box(wing,.27,.06,.08,side*.1,0,0,silver,.009);box(wing,1.72,.065,1.04,side*1.09,0,0,dark,.012);
   for(const z of [-.39,.39]){box(wing,.2,.045,.08,side*.11,0,z,silver,.008);const hinge=cylinder(wing,.055,.12,side*.06,0,z,dark,16);hinge.rotation.x=Math.PI/2;const pin=cylinder(wing,.02,.145,side*.06,0,z,silver,12);pin.rotation.x=Math.PI/2;}
   for(const z of [-.515,.515])box(wing,1.74,.022,.025,side*1.09,.039,z,silver,.005);
   const cellGeometry=geometry('solarCell',()=>{
    const w=.183,h=.235,c=.015,s=new THREE.Shape();s.moveTo(-w/2+c,-h/2);s.lineTo(w/2-c,-h/2);s.lineTo(w/2,-h/2+c);s.lineTo(w/2,h/2-c);s.lineTo(w/2-c,h/2);s.lineTo(-w/2+c,h/2);s.lineTo(-w/2,h/2-c);s.lineTo(-w/2,-h/2+c);s.closePath();
    const g=new THREE.ShapeGeometry(s);g.rotateX(-Math.PI/2);const uv=g.attributes.uv,p=g.attributes.position;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/w+.5,p.getZ(i)/h+.5);return g;
   });
   const cells=instances(wing,cellGeometry,cell,Array.from({length:32},(_,j)=>[side*(.34+j%8*.214),.043,-.382+Math.floor(j/8)*.255]));
   for(let j=0;j<32;j++){const tint=1-(j%5)*.025;cells.setColorAt(j,new THREE.Color(tint,tint,tint));}
   for(const at of [.25,1.08,1.94])box(wing,.025,.019,1.05,side*at,.05,0,silver,.005);
   bolts(wing,[.27,1.94].flatMap(x=>[-.47,.47].map(z=>[side*x,.06,z])));
   cable(wing,[[side*.12,-.044,.15],[side*.26,-.06,.18],[side*.35,-.04,.12]],.012);
  }
  for(const side of [-1,1]){
   const skin=part(0,0,side*.56,0,0,side*1.15);box(skin,1.24,1.2,.022,0,0,0,backing,.005);
   blanket(skin,1.2,1.16,new THREE.Vector3(0,0,side*.032),new THREE.Euler(0,side===1?0:Math.PI,0),this.foil);
   bolts(skin,[-.55,.55].flatMap(x=>[-.52,.52].map(y=>[x,y,side*.025])),new THREE.Euler(side*Math.PI/2,0,0));
   if(side===1){
    box(skin,.64,.58,.038,0,.08,.04,silver,.014);box(skin,.58,.51,.012,0,.08,.065,dark,.008);
    instances(skin,geometry('radiator',()=>new THREE.BoxGeometry(.54,.038,.017)),silver,Array.from({length:7},(_,j)=>[0,-.14+j*.071,.079]));
    bolts(skin,[-.28,.28].flatMap(x=>[-.17,.33].map(y=>[x,y,.071])),new THREE.Euler(Math.PI/2,0,0));
   }else{box(skin,.24,.1,.025,.28,-.34,-.035,dark,.007);cylinder(skin,.033,.065,.23,-.32,-.05,copper,12).rotation.x=Math.PI/2;}
  }
  const antenna=part(.4,.91,-.3,.85,1.45,-.6);cylinder(antenna,.014,.65,0,0,0,silver,12);cylinder(antenna,.026,.15,0,-.27,0,dark,16);cylinder(antenna,.09,.018,0,-.32,0,silver);ring(antenna,.065,.007,-.301,dark);
  this.parts.forEach((p,index)=>{if(p.group!==instrument)batchDetails(p.group,`part-${index}`);});batchDetails(this.optical,'optical');batchDetails(this.relay,'relay');
 }
 update(mission:Mission,explosion:number,deployment:number){
  this.foil.color.setHex(mission.blanket==='gold'?0xd7aa4e:0xbfc6d0);this.optical.visible=mission.payload==='optical';this.relay.visible=mission.payload==='relay';
  const e=explodeAt(explosion);for(const part of this.parts)part.group.position.copy(part.origin).addScaledVector(part.direction,e);
  this.wings.forEach((wing,index)=>{wing.rotation.z=(index===0?1:-1)*(1-deployment)*Math.PI/2;});
 }
}
