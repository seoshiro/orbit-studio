import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EARTH_RADIUS,position,TAU,type Mission} from './model.ts';
import {Satellite,box,silver,cell} from './satellite.ts';
import {earthSurface,atmosphere,earthState} from './earth.ts';
function line(points:THREE.Vector3[],color:number,opacity=1) {return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));}
export class Scene {
 renderer:THREE.WebGLRenderer|null=null;scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-4,4,3,-3,.1,100);
 satellite=new Satellite();earth=new THREE.Group();orbitGroup=new THREE.Group();marker=new THREE.Group();plane:THREE.Mesh;path:THREE.Line;
 mode:'satellite'|'orbit'='satellite'; yaw=.2; pitch=.25; explosion=0;deployment=1;renderCount=0;width=0;height=0;visible=false;lost=false;dirty=true;
 private observer:ResizeObserver;private intersection:IntersectionObserver;private pointer:{x:number;y:number;yaw:number;pitch:number;id:number}|null=null;private key:THREE.DirectionalLight;
 constructor(public host:HTMLElement,public anatomy=false,public changed:()=>void=()=>{}) {
  this.camera.position.set(5,3.2,6);this.camera.lookAt(0,0,0);
  this.scene.add(new THREE.HemisphereLight(0xe8f0ff,0x292a35,1.1));this.key=new THREE.DirectionalLight(0xfff3df,2.6);this.key.position.set(3,5,4);this.key.castShadow=true;this.key.shadow.mapSize.set(512,512);this.key.shadow.camera.left=this.key.shadow.camera.bottom=-5;this.key.shadow.camera.right=this.key.shadow.camera.top=5;this.key.shadow.camera.near=.1;this.key.shadow.camera.far=20;this.key.shadow.normalBias=.025;this.key.shadow.bias=-.0003;this.scene.add(this.key);const rim=new THREE.DirectionalLight(0xc4d8ff,1.3);rim.position.set(-4,2,-3);this.scene.add(rim);
  this.scene.add(this.satellite.root,this.earth,this.orbitGroup,this.marker);
  const globe=new THREE.Mesh(new THREE.SphereGeometry(1,64,40),earthSurface(()=>this.invalidate()));this.earth.add(globe);this.earth.add(new THREE.Mesh(new THREE.SphereGeometry(1.018,48,32),atmosphere()));
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
  try {this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;this.renderer.shadowMap.enabled=innerWidth>=600;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.setClearColor(0x000000,0);this.host.append(this.renderer.domElement);
   this.environment();
   this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.host.classList.add('no-webgl');this.changed();});
   this.renderer.domElement.addEventListener('webglcontextrestored',()=>{this.lost=false;this.environment();this.host.classList.remove('no-webgl');this.size();this.invalidate();this.changed();});
   this.host.classList.remove('no-webgl');this.size();this.invalidate();
  } catch {this.renderer=null;this.host.classList.add('no-webgl');this.changed();}
 }
 environment(){if(!this.renderer)return;const generator=new THREE.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.scene.environment?.dispose();this.scene.environment=generator.fromScene(room,.04).texture;this.scene.environmentIntensity=.55;room.dispose();generator.dispose();}
 retry(){if(this.renderer){this.renderer.dispose();this.renderer.domElement.remove();}this.renderer=null;this.lost=false;this.init();this.changed();}
 invalidate(){this.dirty=true;}
 size(){this.width=this.host.clientWidth;this.height=this.host.clientHeight;this.renderer?.setSize(this.width,this.height,false);if(this.renderer)this.renderer.shadowMap.enabled=innerWidth>=600;}
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
  this.key.castShadow=this.mode==='satellite';this.renderer.render(this.scene,this.camera);this.renderCount++;this.dirty=false;
 }
 state(){let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
  if(this.mode==='orbit'){
   // A conservative bounding sphere encloses the orbital path, enlarged marker and polar axis.
   const radius=Math.max(this.plane.scale.x+.09,1.16),x=radius/(this.camera.right-this.camera.left)*this.width,y=radius/(this.camera.top-this.camera.bottom)*this.height;
   left=this.width/2-x;right=this.width/2+x;top=this.height/2-y;bottom=this.height/2+y;
  }else{const bounds=new THREE.Box3().setFromObject(this.satellite.root);for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new THREE.Vector3(x,y,z).project(this.camera);left=Math.min(left,(p.x+1)*this.width/2);right=Math.max(right,(p.x+1)*this.width/2);top=Math.min(top,(1-p.y)*this.height/2);bottom=Math.max(bottom,(1-p.y)*this.height/2);}}
  return {webgl:!!this.renderer&&!this.lost,lost:this.lost,visible:this.visible,renders:this.renderCount,width:this.width,height:this.height,explosion:this.explosion,deployment:this.deployment,mode:this.mode,earth:earthState(),shadows:!!this.renderer?.shadowMap.enabled&&this.key.castShadow,textures:this.renderer?.info.memory.textures,geometries:this.renderer?.info.memory.geometries,bounds:{left,right,top,bottom},calls:this.renderer?.info.render.calls,triangles:this.renderer?.info.render.triangles};}
}
