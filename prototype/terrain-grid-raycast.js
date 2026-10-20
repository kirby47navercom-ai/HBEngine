import {Matrix4, Ray, Vector3} from 'three';

// The regular height grid provides its own spatial index. Neighbor cells cover
// rays on grid lines/corners, including a hole bordering a solid cell.
export function raycastTerrainGrid(mesh, worldRay) {
  const geometry = mesh?.geometry, grid = geometry?.userData.terrainGrid;
  if (!grid || !geometry.boundingBox) return null;
  mesh.updateWorldMatrix(true, false);
  const ray = new Ray().copy(worldRay).applyMatrix4(new Matrix4().copy(mesh.matrixWorld).invert());
  const p = geometry.attributes.position, {width, height} = grid, box = geometry.boundingBox;
  const sx = (box.max.x - box.min.x) / (width - 1), sz = (box.max.z - box.min.z) / (height - 1);
  let near = 0, far = Infinity;
  for (const axis of ['x', 'z']) {
    const direction = ray.direction[axis], origin = ray.origin[axis];
    if (direction === 0) { if (origin < box.min[axis] || origin > box.max[axis]) return null; }
    else {
      let a = (box.min[axis] - origin) / direction, b = (box.max[axis] - origin) / direction;
      if (a > b) [a, b] = [b, a]; near = Math.max(near, a); far = Math.min(far, b);
    }
  }
  if (near > far) return null;
  const start = ray.at(near, new Vector3());
  let x = Math.max(0, Math.min(width - 2, Math.floor((start.x - box.min.x) / sx)));
  let z = Math.max(0, Math.min(height - 2, Math.floor((start.z - box.min.z) / sz)));
  const dx = Math.sign(ray.direction.x), dz = Math.sign(ray.direction.z);
  const stepX = dx ? sx / Math.abs(ray.direction.x) : Infinity, stepZ = dz ? sz / Math.abs(ray.direction.z) : Infinity;
  let nextX = dx ? Math.max(near, (box.min.x + (x + (dx > 0 ? 1 : 0)) * sx - ray.origin.x) / ray.direction.x) : Infinity;
  let nextZ = dz ? Math.max(near, (box.min.z + (z + (dz > 0 ? 1 : 0)) * sz - ray.origin.z) / ray.direction.z) : Infinity;
  const visited = new Set(), a = new Vector3(), b = new Vector3(), c = new Vector3(), point = new Vector3();
  let closest = Infinity, hit = null, triangles = 0;
  for (let step = 0; step < width + height + 4; step++) {
    for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) {
      const cx = x + ox, cz = z + oz, key = cz * (width - 1) + cx;
      if (cx < 0 || cx >= width - 1 || cz < 0 || cz >= height - 1 || visited.has(key)) continue;
      visited.add(key); if (grid.holes?.[key]) continue;
      const at = cz * width + cx;
      for (const ids of [[at, at + width, at + 1], [at + 1, at + width, at + width + 1]]) {
        triangles++;
        a.fromBufferAttribute(p, ids[0]); b.fromBufferAttribute(p, ids[1]); c.fromBufferAttribute(p, ids[2]);
        if (!ray.intersectTriangle(a, b, c, mesh.material.side !== 2, point)) continue;
        const distance = point.distanceToSquared(ray.origin);
        if (distance < closest) { closest = distance; hit = point.clone(); }
      }
    }
    const next = Math.min(nextX, nextZ);
    if (!dx && !dz || next > far || hit && next * next > closest) break;
    const moveX = nextX <= nextZ, moveZ = nextZ <= nextX;
    if (moveX) { x += dx; nextX += stepX; }
    if (moveZ) { z += dz; nextZ += stepZ; }
    if (x < 0 || x >= width - 1 || z < 0 || z >= height - 1) break;
  }
  return hit ? {point: hit.applyMatrix4(mesh.matrixWorld), object: mesh, testedTriangles: triangles} : null;
}
