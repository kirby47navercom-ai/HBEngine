import {parentPort,workerData} from 'node:worker_threads';
import {computeMeshAtlas} from '../prototype/mesh-atlas-core.js';

try {
  const {mesh,settings}=workerData;
  const result=await computeMeshAtlas(mesh,settings,progress=>parentPort.postMessage({progress}));
  parentPort.postMessage({result});
} catch (error) {
  parentPort.postMessage({error:error.message});
}
