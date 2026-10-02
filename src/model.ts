// km, seconds. NASA/JPL DE440 GM; NASA volumetric mean Earth radius.
export const EARTH_RADIUS = 6371;
export const MU = 398600.435507;
export const TAU = 2 * Math.PI;
export type Locale = 'en' | 'ru' | 'kk';
export interface Mission { altitude: number; inclination: number; payload: 'optical' | 'relay'; blanket: 'gold' | 'silver'; deployed: boolean }
export interface SavedMission { name: string; mission: Mission }
export interface Archive { version: 1; current: Mission; missions: SavedMission[] }
export const DEFAULT: Mission = { altitude:550, inclination:53, payload:'optical', blanket:'gold', deployed:true };
export const PRESETS: Mission[] = [{...DEFAULT,altitude:450,inclination:0,payload:'relay'},{...DEFAULT},{...DEFAULT,altitude:800,inclination:90,blanket:'silver'}];
export const STORAGE_KEY = 'orbit-studio-v1';
export const MAX_SAVES = 8;
export function orbit(altitude: number) {
  if (!Number.isFinite(altitude) || altitude < 250 || altitude > 2000) throw new Error('Altitude out of range');
  const radius = EARTH_RADIUS + altitude;
  const speed = Math.sqrt(MU / radius);
  const period = TAU * Math.sqrt(radius ** 3 / MU);
  return { radius, speed, period, revolutions:86400/period };
}
// Right-handed Y-up view: equator XZ, inclination tilts plane about X.
// -Z maps to positive equatorial longitude, so angular momentum +Y at i=0.
export function position(altitude:number,inclination:number,phase:number) {
  if (!Number.isFinite(inclination)||inclination<0||inclination>180||!Number.isFinite(phase)) throw new Error('Invalid orbit');
  const r=orbit(altitude).radius, i=inclination*Math.PI/180;
  return {x:r*Math.cos(phase),y:r*Math.sin(phase)*Math.sin(i),z:-r*Math.sin(phase)*Math.cos(i)};
}
export function latitudeLimit(inclination:number) { return Math.min(inclination,180-inclination); }
export function wrapPhase(value:number) { return ((value % TAU)+TAU)%TAU; }
export function advance(seconds:number,delta:number,speed:number,playing:boolean) {
  if (![seconds,delta,speed].every(Number.isFinite)||seconds<0||delta<0||speed<0) throw new Error('Invalid timeline');
  // Frame delta is capped to avoid hidden-tab / context-recovery jumps.
  return seconds+(playing?Math.min(delta,.1)*speed:0);
}
export function explodeAt(progress:number) { return Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0)); }
const object=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
export function validateMission(v:unknown):Mission {
  if (!object(v)||!Number.isInteger(v.altitude)||Number(v.altitude)<250||Number(v.altitude)>2000||!Number.isInteger(v.inclination)||Number(v.inclination)<0||Number(v.inclination)>180||!['optical','relay'].includes(String(v.payload))||!['gold','silver'].includes(String(v.blanket))||typeof v.deployed!=='boolean') throw new Error('invalid');
  return {altitude:Number(v.altitude),inclination:Number(v.inclination),payload:v.payload as Mission['payload'],blanket:v.blanket as Mission['blanket'],deployed:v.deployed};
}
export function cleanName(v:unknown):string {
  if(typeof v!=='string') throw new Error('invalid');
  const name=v.trim().normalize('NFC');
  if(!name||name.length>40||[...name].some(char=>char.charCodeAt(0)<32||char.charCodeAt(0)===127))throw new Error('invalid');
  return name;
}
export function nameKey(name:string) { return name.normalize('NFC').toLocaleLowerCase('en-US'); }
export function parseArchive(raw:string):Archive {
  if (raw.length>100000)throw new Error('large');
  const v:unknown=JSON.parse(raw);
  if(!object(v)||v.version!==1||!Array.isArray(v.missions)||v.missions.length>MAX_SAVES)throw new Error('invalid');
  const names=new Set<string>();
  const missions=v.missions.map(item=>{
    if(!object(item))throw new Error('invalid');
    const name=cleanName(item.name),key=nameKey(name);
    if(names.has(key))throw new Error('duplicate'); names.add(key);
    return {name,mission:validateMission(item.mission)};
  });
  return {version:1,current:validateMission(v.current),missions};
}
export function encodeArchive(archive:Archive) { return JSON.stringify(parseArchive(JSON.stringify(archive)),null,2); }
export function mergeMissions(existing:SavedMission[],incoming:SavedMission[]) {
  // Collision aborts the whole merge; there is no silent overwrite.
  const names=new Set(existing.map(x=>nameKey(x.name)));
  if(existing.length+incoming.length>MAX_SAVES)throw new Error('full');
  for(const item of incoming) {if(names.has(nameKey(item.name)))throw new Error('duplicate');names.add(nameKey(item.name));}
  return [...existing,...incoming].map(x=>({name:x.name,mission:{...x.mission}}));
}
