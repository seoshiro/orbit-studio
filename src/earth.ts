import * as THREE from 'three';

// NASA Blue Marble 2002; historical surface composite, never live weather or telemetry.
const roughness=new THREE.DataTexture(new Uint8Array([220,220,220,255]),1,1);
roughness.needsUpdate=true;roughness.magFilter=THREE.LinearFilter;roughness.minFilter=THREE.LinearMipmapLinearFilter;roughness.generateMipmaps=true;
let surface:THREE.Texture|undefined,loaded=false,failed=false,width=0,height=0;
const listeners=new Set<()=>void>();
const materials=new Set<THREE.MeshStandardMaterial>();
export function earthState(){return {loaded,failed,width,height};}
export function earthSurface(changed:()=>void){
 listeners.add(changed);
 if(!surface){surface=new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}textures/earth-blue-marble.jpg`,texture=>{
  const image=texture.image as HTMLImageElement;width=image.width;height=image.height;
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0,1024,512);const pixels=ctx.getImageData(0,0,1024,512).data;
  // Ocean is a smoother dielectric than land, without another downloaded texture.
  for(let i=0;i<pixels.length;i+=4){const ocean=pixels[i+2]>pixels[i]*1.35&&pixels[i+2]>pixels[i+1]*1.05;const r=ocean?138:235;pixels[i]=pixels[i+1]=pixels[i+2]=r;pixels[i+3]=255;}
  roughness.image={data:new Uint8Array(pixels),width:1024,height:512};roughness.needsUpdate=true;loaded=true;
  materials.forEach(m=>{m.map=texture;m.roughnessMap=roughness;m.color.setHex(0xffffff);m.needsUpdate=true;});listeners.forEach(fn=>fn());
 },undefined,()=>{failed=true;listeners.forEach(fn=>fn());});surface.colorSpace=THREE.SRGBColorSpace;surface.anisotropy=4;}
 const material=new THREE.MeshStandardMaterial({color:loaded?0xffffff:0x174875,map:loaded?surface:null,roughness:1,roughnessMap:loaded?roughness:null,metalness:0,envMapIntensity:.12});materials.add(material);return material;
}
export function atmosphere(){
 // View-space Fresnel limb: a restrained illustrative haze, not a physical atmosphere model.
 return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.FrontSide,blending:THREE.NormalBlending,
  vertexShader:'varying vec3 vNormal; varying vec3 vView; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vView=-p.xyz;gl_Position=projectionMatrix*p;}',
  fragmentShader:'varying vec3 vNormal; varying vec3 vView; void main(){float f=pow(1.0-max(dot(normalize(vNormal),normalize(vView)),0.0),4.0);gl_FragColor=vec4(0.21,0.52,0.85,f*0.23);}'
 });
}
