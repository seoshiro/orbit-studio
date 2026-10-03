import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Satellite,cell} from '../src/satellite.ts';
import {DEFAULT} from '../src/model.ts';

test('component assembly reverses exactly and wings retain their independent hinge pivots',()=>{
 const satellite=new Satellite(),initial=satellite.parts.map(p=>p.group.position.clone()),pivot=satellite.wings.map(w=>w.position.clone());
 for(const progress of [0,.17,.53,1,.53,.17,0]){
  satellite.update(DEFAULT,progress,1);
  satellite.parts.forEach((p,i)=>assert.ok(p.group.position.distanceTo(initial[i].clone().addScaledVector(p.direction,progress))<1e-12));
 }
 satellite.parts.forEach((p,i)=>assert.ok(p.group.position.equals(initial[i])));
 for(const deployment of [1,.73,.24,0,.24,.73,1]){
  satellite.update({...DEFAULT,deployed:deployment===1},0,deployment);
  satellite.wings.forEach((wing,i)=>{assert.ok(wing.position.equals(pivot[i]));assert.ok(Math.abs(wing.rotation.z-(i===0?1:-1)*(1-deployment)*Math.PI/2)<1e-12);});
 }
});
test('configuration changes stay isolated between the editable and anatomy models',()=>{
 const a=new Satellite(),b=new Satellite();a.update({...DEFAULT,payload:'relay',blanket:'silver'},.5,0);b.update(DEFAULT,0,1);
 assert.equal(a.optical.visible,false);assert.equal(a.relay.visible,true);assert.equal(b.optical.visible,true);assert.equal(b.relay.visible,false);
 assert.notEqual(a.foil.color.getHex(),b.foil.color.getHex());assert.equal(a.foil.normalMap,b.foil.normalMap);assert.equal(a.foil.roughnessMap,b.foil.roughnessMap);
 assert.notEqual(a.wings[0].rotation.z,b.wings[0].rotation.z);assert.equal(a.parts.length,b.parts.length);
 const geometry=(s:Satellite)=>{const set=new Set<THREE.BufferGeometry>();s.root.traverse(node=>{if(node instanceof THREE.Mesh)set.add(node.geometry);});return set;};
 const ga=geometry(a),gb=geometry(b);assert.deepEqual(ga,gb,'both models share immutable geometry');
});
test('detail geometry stays finite and batched, with dielectric instanced solar cover glass',()=>{
 const satellite=new Satellite();let meshes=0,solarInstances=0;const unique=new Set<THREE.BufferGeometry>();
 satellite.root.traverse(node=>{
  if(!(node instanceof THREE.Mesh))return;meshes++;unique.add(node.geometry);
  if(node instanceof THREE.InstancedMesh&&node.material===cell)solarInstances+=node.count;
 });
 assert.ok(meshes<=70,`${meshes} meshes exceeds detail budget`);assert.equal(solarInstances,64);assert.equal(cell.metalness,0);assert.ok(cell.clearcoat>0);
 for(const g of unique){for(const attr of ['position','normal','uv'])assert.ok(Array.from(g.getAttribute(attr).array).every(Number.isFinite),`${attr} contains invalid values`);g.computeBoundingBox();assert.ok(g.boundingBox&&!g.boundingBox.isEmpty());}
});
