// Routing admission estimate, not loudness analysis or an OS/codec memory claim.
// Follow the actual pre/post-fader taps, including sends that bypass a muted fader.
export function mixerVoiceGains(graph,parameterValue=p=>p?.value){
  const rows=new Map(graph.state.data.buses.map(b=>[b.id,b])),memo=new Map(),visiting=new Set();
  function gain(id){if(memo.has(id))return memo.get(id);const b=rows.get(id),n=graph.nodes.get(id);if(!b||!n)return 1;if(visiting.has(id))throw Error('믹서 음성 경로가 순환해요.');visiting.add(id);
    const value=(p,fallback=1)=>Number.isFinite(parameterValue(p))?Math.max(0,parameterValue(p)):fallback,reduction=Number.isFinite(n.compressor?.reduction)?Math.min(0,n.compressor.reduction):0,dsp=10**(reduction/20),direct=(value(n.bypassGate?.gain,b.bypass?1:0)+value(n.effectGate?.gain,b.bypass?0:1)*dsp)*value(n.gain?.gain);
    let total=direct*(b.parent?gain(b.parent):1);for(const send of b.sends||[])total+=(send.preFader?dsp:direct)*(send.level<=-80?0:10**(send.level/20))*gain(send.bus);
    visiting.delete(id);memo.set(id,total);return total;
  }
  for(const id of rows.keys())gain(id);return memo;
}
export const mixerVoiceAudibilityContract={component:'AudioListener.voiceSelection: mixer(default) | legacy',selection:'existing protected/priority/distance/source+sequence gain/stable tie order; mixer mode additionally ranks virtualizable voices using current mixer routes and compressor reduction',routing:'actual input→bypass/effect gate→fader→parent plus post-fader/pre-fader sends; pre-fader send may remain audible when its source fader is muted; sums route amplitudes conservatively',cost:'memoized DAG gains once per referenced graph per rebalance; no extra AudioNodes, meters, PCM, workers, timers or periodic audio wakeups',diagnostics:'voiceStats.selectionMode/mixerSilentActive; per voice mixerGain/estimatedAudibility',limits:['not spectral masking or perceptual LUFS analysis','filters/delay/reverb/distortion content response is not estimated','compressor reduction is shared bus feedback, not per-voice isolation','no OS codec RAM release or real mobile quality claim']};
