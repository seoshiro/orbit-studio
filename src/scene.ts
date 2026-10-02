import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EARTH_RADIUS,position,TAU,explodeAt,type Mission} from './model.ts';
type Part = {group:THREE.Group; origin:THREE.Vector3; direction:THREE.Vector3};
const silver=new THREE.MeshStandardMaterial({color:0xc6cdd7,metalness:.8,roughness:.32});
const dark=new THREE.MeshStandardMaterial({color:0x242934,metalness:.5,roughness:.4});
const cell=new THREE.MeshStandardMaterial({color:0x646bb3,metalness:.7,roughness:.3});
const pcb=new THREE.MeshStandardMaterial({color:0x276857,metalness:.25,roughness:.6});
const glass=new THREE.MeshStandardMaterial({color:0x293c64,metalness:.9,roughness:.12});
function box(parent:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,material:THREE.Material) {
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);parent.add(m);return m;
}
function cylinder(parent:THREE.Object3D,r:number,h:number,x:number,y:number,z:number,material:THREE.Material) {
 const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,28),material);m.position.set(x,y,z);parent.add(m);return m;
}
export class Satellite {
 root=new THREE.Group(); parts:Part[]=[]; wings:THREE.Group[]=[]; foil:THREE.MeshStandardMaterial;
 optical=new THREE.Group();relay=new THREE.Group();
 constructor() {
  this.foil=new THREE.MeshStandardMaterial({color:0xc8a366,metalness:.78,roughness:.42,flatShading:true});
  const part=(x:number,y:number,z:number,dx:number,dy:number,dz:number)=>{const group=new THREE.Group();group.position.set(x,y,z);this.root.add(group);this.parts.push({group,origin:group.position.clone(),direction:new THREE.Vector3(dx,dy,dz)});return group;};
  const chassis=part(0,0,0,0,-.1,0);
  box(chassis,1.35,.12,1.15,0,-.67,0,silver);box(chassis,1.35,.1,1.15,0,.64,0,silver);
  for(const x of [-.62,.62])for(const z of [-.52,.52])box(chassis,.08,1.35,.08,x,0,z,silver);
  // Real component roles; geometry is an original conceptual arrangement.
  const electronics=part(0,.12,0,0,1.05,0);
  box(electronics,1,.08,.85,0,0,0,pcb);box(electronics,.32,.13,.3,-.22,.1,0,dark);box(electronics,.24,.1,.24,.25,.1,.15,silver);
  for(let j=0;j<7;j++)box(electronics,.03,.04,.16,-.39+j*.13,.08,-.25,silver);
  const battery=part(0,-.36,0,0,-1.25,0);
  for(let j=0;j<5;j++) {const m=cylinder(battery,.08,.67,-.36+j*.18,0,0,silver);m.rotation.x=Math.PI/2;}
  box(battery,1,.08,.85,0,-.15,0,dark);
  const wheels=part(0,.35,0,0,1.8,0);
  for(const [x,z] of [[-.27,-.2],[.27,-.2],[0,.25]]) {cylinder(wheels,.17,.13,x,0,z,dark);cylinder(wheels,.08,.14,x,.01,z,silver);}
  const instrument=part(0,.9,0,0,2.4,0);
  instrument.add(this.optical,this.relay);
  cylinder(this.optical,.3,.5,0,0,0,silver);cylinder(this.optical,.23,.015,0,.26,0,dark);cylinder(this.optical,.18,.02,0,.28,0,glass);
  const dish=new THREE.Mesh(new THREE.SphereGeometry(.45,32,14,0,TAU,0,.64),silver);dish.rotation.z=Math.PI;dish.scale.y=.5;dish.position.y=.15;this.relay.add(dish);
  cylinder(this.relay,.035,.45,0,.25,0,dark);box(this.relay,.55,.15,.4,0,-.2,0,dark);
  for(const side of [-1,1]) {
   const shell=part(side*.68,0,0,side*1.45,0,0);box(shell,.04,1.18,1.04,0,0,0,this.foil);
   // Raised foil facets catch light without an expensive texture or shader.
   for(let j=0;j<10;j++){const ridge=box(shell,.014,.012,1,side*.025,-.53+j*.115,0,this.foil);ridge.rotation.x=.06*(j%2?1:-1);}
   const wing=part(side*.74,.12,0,side*1.45,0,0);this.wings.push(wing);
   box(wing,.27,.06,.08,side*.1,0,0,silver);box(wing,1.72,.065,1.04,side*1.09,0,0,dark);
   const geom=new THREE.BoxGeometry(.183,.015,.235),cells=new THREE.InstancedMesh(geom,cell,32),matrix=new THREE.Matrix4();let k=0;
   for(let row=0;row<4;row++)for(let col=0;col<8;col++){matrix.makeTranslation(side*(.34+col*.214),.043,-.382+row*.255);cells.setMatrixAt(k++,matrix);}wing.add(cells);
   for(const at of [.25,1.08,1.94])box(wing,.03,.025,1.05,side*at,.05,0,silver);
  }
  for(const side of [-1,1]) {
   const skin=part(0,0,side*.56,0,0,side*1.15);box(skin,1.24,1.2,.025,0,0,0,this.foil);
   if(side===1){box(skin,.64,.58,.035,0,.08,.025,silver);for(let j=0;j<8;j++)box(skin,.61,.015,.009,0,-.17+j*.07,.048,dark);}
  }
  const antenna=part(.4,.91,-.3,.85,1.45,-.6);cylinder(antenna,.022,.65,0,0,0,silver);cylinder(antenna,.09,.018,0,-.32,0,dark);
 }
 update(mission:Mission,explosion:number,deployment:number) {
  this.foil.color.setHex(mission.blanket==='gold'?0xc8a366:0xb5bbc9);this.optical.visible=mission.payload==='optical';this.relay.visible=mission.payload==='relay';
  const e=explodeAt(explosion);
  for(const part of this.parts)part.group.position.copy(part.origin).addScaledVector(part.direction,e);
  this.wings.forEach((wing,index)=>{wing.rotation.z=(index===0?1:-1)*(1-deployment)*Math.PI/2;});
 }
}
function line(points:THREE.Vector3[],color:number,opacity=1) {return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));}
// Hand-drawn coarse outlines: schematic geography, not a source of geospatial data.
const land:number[][][]=[
 [[-167,65],[-135,70],[-105,75],[-80,57],[-58,48],[-76,28],[-90,16],[-108,23],[-125,48]],
 [[-81,12],[-58,8],[-35,-7],[-48,-24],[-67,-56],[-77,-29]],
 [[-18,36],[11,37],[36,31],[51,11],[40,-14],[18,-35],[3,-20],[-16,9]],
 [[-10,36],[-9,56],[21,71],[55,70],[90,77],[141,61],[177,54],[145,40],[120,20],[106,0],[84,7],[74,25],[52,11],[33,31]],
 [[113,-22],[132,-10],[153,-24],[144,-39],[118,-34]], [[-53,60],[-25,74],[-41,84],[-60,79]], [[47,-13],[50,-25],[44,-24]],
 ];
function earthTexture() {
 const c=document.createElement('canvas');c.width=1024;c.height=512;const ctx=c.getContext('2d')!;
 ctx.fillStyle='#252733';ctx.fillRect(0,0,1024,512);
 ctx.strokeStyle='#434553';ctx.lineWidth=1;
 for(let lon=-180;lon<180;lon+=30){const x=(lon+180)/360*1024;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,512);ctx.stroke();}
 for(let lat=-60;lat<=60;lat+=30){const y=(90-lat)/180*512;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1024,y);ctx.stroke();}
 for(const poly of land){ctx.beginPath();poly.forEach(([lon,lat],i)=>{const x=(lon+180)/360*1024,y=(90-lat)/180*512;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();ctx.fillStyle='#8e8b9e';ctx.fill();ctx.strokeStyle='#aeabc0';ctx.stroke();}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
export class Scene {
 renderer:THREE.WebGLRenderer|null=null;scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-4,4,3,-3,.1,100);
 satellite=new Satellite();earth=new THREE.Group();orbitGroup=new THREE.Group();marker=new THREE.Group();plane:THREE.Mesh;path:THREE.Line;
 mode:'satellite'|'orbit'='satellite'; yaw=.2; pitch=.25; explosion=0;deployment=1;renderCount=0;width=0;height=0;visible=false;lost=false;dirty=true;
 private observer:ResizeObserver;private intersection:IntersectionObserver;private pointer:{x:number;y:number;yaw:number;pitch:number;id:number}|null=null;private texture:THREE.Texture;
 constructor(public host:HTMLElement,public anatomy=false,public changed:()=>void=()=>{}) {
  this.camera.position.set(5,3.2,6);this.camera.lookAt(0,0,0);
  this.scene.add(new THREE.HemisphereLight(0xebedff,0x29202e,2));const key=new THREE.DirectionalLight(0xfff1d7,4);key.position.set(4,5,6);this.scene.add(key);const rim=new THREE.DirectionalLight(0x9699ff,3);rim.position.set(-5,1,-3);this.scene.add(rim);
  this.scene.add(this.satellite.root,this.earth,this.orbitGroup,this.marker);
  this.texture=earthTexture();const globe=new THREE.Mesh(new THREE.SphereGeometry(1,64,40),new THREE.MeshStandardMaterial({map:this.texture,roughness:.95,metalness:.05}));this.earth.add(globe);
  const equator=[];for(let j=0;j<=180;j++){const a=j/180*TAU;equator.push(new THREE.Vector3(Math.cos(a)*1.008,0,-Math.sin(a)*1.008));}this.earth.add(line(equator,0xbbb5d6,.6));
  this.earth.add(line([new THREE.Vector3(0,-1.16,0),new THREE.Vector3(0,1.16,0)],0x6d7081,.6));
  this.path=line([],0xc6b9ff);this.orbitGroup.add(this.path);
  this.plane=new THREE.Mesh(new THREE.CircleGeometry(1,96),new THREE.MeshBasicMaterial({color:0xa59ce5,transparent:true,opacity:.045,side:THREE.DoubleSide,depthWrite:false}));this.orbitGroup.add(this.plane);
  box(this.marker,.044,.05,.04,0,0,0,silver);box(this.marker,.14,.012,.047,0,0,0,cell);
  this.init();
  this.observer=new ResizeObserver(()=>{this.size();this.invalidate();});this.observer.observe(host);
  this.intersection=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;this.invalidate();});this.intersection.observe(host);
  host.addEventListener('pointerdown',e=>{if(e.button!==0)return;this.pointer={x:e.clientX,y:e.clientY,yaw:this.yaw,pitch:this.pitch,id:e.pointerId};if(e.pointerType==='mouse')host.setPointerCapture(e.pointerId);});
  host.addEventListener('pointermove',e=>{if(!this.pointer||this.pointer.id!==e.pointerId)return;this.yaw=this.pointer.yaw+(e.clientX-this.pointer.x)*.008;if(e.pointerType==='mouse')this.pitch=Math.max(-.6,Math.min(.9,this.pointer.pitch+(e.clientY-this.pointer.y)*.005));this.invalidate();});
  const release=()=>{this.pointer=null;};host.addEventListener('pointerup',release);host.addEventListener('pointercancel',release);host.addEventListener('lostpointercapture',release);
  host.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home')this.resetView();else{this.yaw+=e.key==='ArrowLeft'?-.15:e.key==='ArrowRight'?.15:0;this.pitch=Math.max(-.6,Math.min(.9,this.pitch+(e.key==='ArrowUp'?.1:e.key==='ArrowDown'?-.1:0)));}this.invalidate();});
 }
 init() {
  if(new URLSearchParams(location.search).get('fallback')==='1') {this.changed();return;}
  try {this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.setClearColor(0x000000,0);this.host.append(this.renderer.domElement);
   this.environment();
   this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.host.classList.add('no-webgl');this.changed();});
   this.renderer.domElement.addEventListener('webglcontextrestored',()=>{this.lost=false;this.environment();this.host.classList.remove('no-webgl');this.size();this.invalidate();this.changed();});
   this.host.classList.remove('no-webgl');this.size();this.invalidate();
  } catch {this.renderer=null;this.host.classList.add('no-webgl');this.changed();}
 }
 environment(){if(!this.renderer)return;const generator=new THREE.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.scene.environment?.dispose();this.scene.environment=generator.fromScene(room,.04).texture;this.scene.environmentIntensity=.65;room.dispose();generator.dispose();}
 retry(){if(this.renderer){this.renderer.dispose();this.renderer.domElement.remove();}this.renderer=null;this.lost=false;this.init();this.changed();}
 invalidate(){this.dirty=true;}
 size(){this.width=this.host.clientWidth;this.height=this.host.clientHeight;this.renderer?.setSize(this.width,this.height,false);}
 resetView(){this.yaw=.2;this.pitch=.25;this.invalidate();}
 set(mission:Mission,phase:number,explosion:number,dt:number,reduced:boolean) {
  const target=mission.deployed?1:0;const before=this.deployment;this.deployment=reduced?target:Math.abs(target-before)<.001?target:before+(target-before)*(1-Math.exp(-dt*7));
  this.explosion=explosion;this.satellite.update(mission,explosion,this.deployment);
  this.satellite.root.visible=this.mode==='satellite';this.earth.visible=this.orbitGroup.visible=this.marker.visible=this.mode==='orbit';
  const i=mission.inclination*Math.PI/180,r=(EARTH_RADIUS+mission.altitude)/EARTH_RADIUS;
  // Rebuild the path only when configuration changes, not every frame.
  const key=`${mission.altitude}/${mission.inclination}`;
  if(this.path.userData.key!==key){const points=[];for(let j=0;j<=180;j++){const p=position(mission.altitude,mission.inclination,j/180*TAU);points.push(new THREE.Vector3(p.x,p.y,p.z).divideScalar(EARTH_RADIUS));}this.path.geometry.dispose();this.path.geometry=new THREE.BufferGeometry().setFromPoints(points);this.path.userData.key=key;}
  this.plane.rotation.set(-Math.PI/2+i,0,0);this.plane.scale.setScalar(r);
  const p=position(mission.altitude,mission.inclination,phase);this.marker.position.set(p.x/EARTH_RADIUS,p.y/EARTH_RADIUS,p.z/EARTH_RADIUS);
  const rotation=new THREE.Euler(this.pitch,this.yaw,0);this.satellite.root.rotation.copy(rotation);
  this.earth.rotation.copy(rotation);this.orbitGroup.rotation.copy(rotation);
  this.marker.position.applyEuler(rotation);this.marker.rotation.copy(rotation);
  if(before!==this.deployment)this.invalidate();
 }
 render() {
  if(!this.renderer||this.lost||!this.visible||!this.dirty||!this.width||!this.height)return;
  const bounds=new THREE.Box3().setFromObject(this.satellite.root),center=bounds.getCenter(new THREE.Vector3());
  const aspect=this.width/this.height;
  this.camera.position.copy(this.mode==='orbit'?new THREE.Vector3(3.8,2.5,5):new THREE.Vector3(5,3.2,6).add(center));this.camera.lookAt(this.mode==='orbit'?new THREE.Vector3():center);this.camera.updateMatrixWorld();
  let vertical=2.9/Math.min(aspect,1);
  if(this.mode==='satellite'){let maxX=0,maxY=0;for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new THREE.Vector3(x,y,z).applyMatrix4(this.camera.matrixWorldInverse);maxX=Math.max(maxX,Math.abs(p.x));maxY=Math.max(maxY,Math.abs(p.y));}vertical=Math.max(2.4,2*Math.max(maxY,maxX/aspect)*1.18);}
  this.camera.left=-vertical*aspect/2;this.camera.right=vertical*aspect/2;this.camera.top=vertical/2;this.camera.bottom=-vertical/2;this.camera.updateProjectionMatrix();
  this.renderer.render(this.scene,this.camera);this.renderCount++;this.dirty=false;
 }
 state(){let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
  if(this.mode==='orbit'){
   // A conservative bounding sphere encloses the orbital path, enlarged marker and polar axis.
   const radius=Math.max(this.plane.scale.x+.09,1.16),x=radius/(this.camera.right-this.camera.left)*this.width,y=radius/(this.camera.top-this.camera.bottom)*this.height;
   left=this.width/2-x;right=this.width/2+x;top=this.height/2-y;bottom=this.height/2+y;
  }else{const bounds=new THREE.Box3().setFromObject(this.satellite.root);for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new THREE.Vector3(x,y,z).project(this.camera);left=Math.min(left,(p.x+1)*this.width/2);right=Math.max(right,(p.x+1)*this.width/2);top=Math.min(top,(1-p.y)*this.height/2);bottom=Math.max(bottom,(1-p.y)*this.height/2);}}
  return {webgl:!!this.renderer&&!this.lost,lost:this.lost,visible:this.visible,renders:this.renderCount,width:this.width,height:this.height,explosion:this.explosion,deployment:this.deployment,mode:this.mode,bounds:{left,right,top,bottom},calls:this.renderer?.info.render.calls,triangles:this.renderer?.info.render.triangles};}
}
