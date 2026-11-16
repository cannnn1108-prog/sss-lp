'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../sss-attribution.js'),'utf8');
test('readiness precedes clicks; registration is never prevented',async()=>{
  const events={},calls=[];
  const window={umami:{getSession:()=>({cache:'test-only'}),track:async(name,data)=>{calls.push({name,data});}}};
  vm.runInNewContext(code,{window,document:{addEventListener:(name,fn)=>{events[name]=fn;}},Promise,setTimeout});
  const link={getAttribute:()=> 'hero'};
  const event={target:{closest:()=>link},preventDefault:()=>{throw new Error('navigation interrupted');}};
  events.click(event);
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(calls.map(x=>x.name),['sss_tracking_ready','sss_join_cta']);
  assert.equal(calls[1].data.position,'hero');
  assert.deepEqual(Object.keys(calls[1].data).sort(),['position','version']);
  events.auxclick({...event,button:2});
  assert.equal(calls.length,2);
  events.auxclick({...event,button:1});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls.length,3);
});
test('blocked analytics retries finitely and leaves links usable',async()=>{
  const events={};let timers=0;
  vm.runInNewContext(code,{window:{},document:{addEventListener:(n,fn)=>{events[n]=fn;}},Promise,
    setTimeout:fn=>{timers++;fn();}});
  assert.doesNotThrow(()=>events.click({target:{closest:()=>({getAttribute:()=> 'hero'})}}));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(timers,20);
});
