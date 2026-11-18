// Health component: damage lowers the current health (not below 0) unless the actor is still invincible from the last
// hit; reaching 0 reports a death once. Regeneration starts regenDelay seconds after the last damage.
import {componentDefaults} from './scene-components.js';

export const healthOf=o=>{const c=o?.components?.find(c=>c.type==='Health'&&c.properties?.enabled!==false);return c&&{...componentDefaults('Health'),...c.properties};};
export function healthState(o,h){o.healthState??={current:h.maxHealth,lastDamage:-Infinity,invincibleUntil:-Infinity,dead:false};return o.healthState;}
export function applyHealthDamage(o,damage,now){
  const h=healthOf(o);if(!h)return {applied:true};const s=healthState(o,h);
  if(s.dead||now<s.invincibleUntil)return {applied:false};
  s.current=Math.max(0,Math.min(h.maxHealth,s.current-damage));if(damage>0){s.lastDamage=now;s.invincibleUntil=now+h.invincibleTime;}
  if(s.current<=0&&!s.dead){s.dead=true;return {applied:true,died:true,destroy:!!h.destroyOnDeath};}
  if(s.current>0)s.dead=false;return {applied:true};
}
export function regenerate(o,h,dt,now){const s=healthState(o,h);if(s.dead||h.regenPerSecond<=0||now-s.lastDamage<h.regenDelay)return;s.current=Math.min(h.maxHealth,s.current+h.regenPerSecond*dt);}
