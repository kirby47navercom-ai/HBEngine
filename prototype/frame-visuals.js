// Nodes whose object group needs per-frame visual work in prepareCamera2D (vehicle wheels, cloth, ropes, world LODs,
// sprite skins, particles). Builders mark the node that carries the data so the frame loop visits only those groups
// instead of reading every group's userData.
export const frameVisualNodes=new Set();
export function markFrameVisual(node){if(node)frameVisualNodes.add(node);}
