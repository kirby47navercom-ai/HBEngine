import { validBlueprint } from './blueprint-model.js';

export const STORAGE_KEY = 'hbengine-ui-scene-v1';
export const defaultSurface = { color: '#889878', roughness: 0.72, metalness: 0.08, light: 3.2 };
export const defaultEnvironment = { preset: 'day', skyEnabled: true, sunEnabled: true, cloudsEnabled: true, fogEnabled: true, cloudDensity: 0.55, sunAzimuth: -30, sunElevation: 50, fogAmount: 0.25 };
export const defaultObjects = [
  { id: 'stone-arch', name: 'Stone arch', kind: 'arch', group: 'WORLD', position: [0, 0, -1.35], rotation: [0, 0, 0], scale: [1, 1, 1], visible: true },
  { id: 'floating-crystal', name: 'Floating crystal', kind: 'crystal', group: 'WORLD', position: [0, 1.4, -1.25], rotation: [0, 15, 0], scale: [1, 1, 1], visible: true },
  { id: 'garden-ground', name: 'Garden ground', kind: 'ground', group: 'WORLD', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], visible: true },
  { id: 'stepping-stones', name: 'Stepping stones', kind: 'path', group: 'WORLD', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], visible: true },
  { id: 'wild-grass', name: 'Wild grass', kind: 'grass', group: 'WORLD', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], visible: true },
  { id: 'garden-rocks', name: 'Garden rocks', kind: 'rocks', group: 'WORLD', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], visible: true },
  { id: 'water-pool', name: 'Water pool', kind: 'water', group: 'WORLD', position: [2.55, -0.06, 1.15], rotation: [0, 0, 0], scale: [1, 1, 1], visible: true },
  { id: 'sun-light', name: 'Sun light', kind: 'light', group: 'ENVIRONMENT', position: [-3, 7, 5], rotation: [0, 0, 0], scale: [1, 1, 1], visible: true },
  { id: 'scene-camera', name: 'Scene camera', kind: 'camera', group: 'ENVIRONMENT', position: [8.6, 7.2, 10.5], rotation: [0, 0, 0], scale: [1, 1, 1], visible: true }
];
export const clone = value => JSON.parse(JSON.stringify(value));
const kinds = new Set(['arch', 'crystal', 'ground', 'path', 'grass', 'rocks', 'water', 'light', 'camera', 'cube', 'sphere', 'cylinder', 'plane']);
export function validScene(value) {
  return value && value.version === 1 && Array.isArray(value.objects) && value.objects.length <= 500
    && new Set(value.objects.map(o => o?.id)).size === value.objects.length
    && value.objects.every(o => o && typeof o.id === 'string' && typeof o.name === 'string' && o.name.length <= 200
      && kinds.has(o.kind) && typeof o.visible === 'boolean'
      && ['position', 'rotation', 'scale'].every(key => Array.isArray(o[key]) && o[key].length === 3 && o[key].every(n => Number.isFinite(n) && Math.abs(n) <= 10000))
      && o.scale.every(n => n >= 0.01))
    && value.surface && /^#[0-9a-f]{6}$/i.test(value.surface.color)
    && ['roughness', 'metalness'].every(k => Number.isFinite(value.surface[k]) && value.surface[k] >= 0 && value.surface[k] <= 1)
    && Number.isFinite(value.surface.light) && value.surface.light >= 0 && value.surface.light <= 10
    && (value.sceneName === undefined || (typeof value.sceneName === 'string' && value.sceneName.length > 0 && value.sceneName.length <= 80))
    && (value.environment === undefined || validEnvironment(value.environment))
    && (value.blueprint === undefined || validBlueprint(value.blueprint));
}
export function validEnvironment(env) {
  return env && ['day','overcast','sunset','night'].includes(env.preset)
    && ['skyEnabled','sunEnabled','cloudsEnabled','fogEnabled'].every(k => typeof env[k] === 'boolean')
    && ['cloudDensity','fogAmount'].every(k => Number.isFinite(env[k]) && env[k] >= 0 && env[k] <= 1)
    && Number.isFinite(env.sunAzimuth) && env.sunAzimuth >= -180 && env.sunAzimuth <= 180
    && Number.isFinite(env.sunElevation) && env.sunElevation >= 0 && env.sunElevation <= 90;
}
export function fileKind(name) {
  const extension = name.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tga', 'hdr', 'exr'].includes(extension)) return 'texture';
  if (['glb', 'gltf', 'fbx', 'obj', 'blend', 'dae'].includes(extension)) return 'model';
  if (['avi', 'mp4', 'mov', 'webm', 'wav', 'mp3', 'ogg', 'flac'].includes(extension)) return 'media';
  return 'unsupported';
}
