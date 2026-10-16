import {engine171Fixture} from './engine-171-fixture.mjs';
import {createAsset} from '../prototype/asset-documents.js';
export async function engine172Fixture(dir){const f=await engine171Fixture(dir),mergePath='Assets/M_Merge.hbmaterial.json',mergeBase=createAsset('material','M_Merge');await f.record.project.write(mergePath,JSON.stringify(mergeBase));return {...f,mergePath,mergeBase};}
