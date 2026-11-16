'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../guide/guide-measure.js'),'utf8');
// 記事の頭=100px・末尾の箱=2100px（読む長さ2000px）。画面の高さ500px
function setup({tracker=true,pathname='/guide/price-tiers/'}={}){
  const calls=[],win={},doc={},timers=[];
  const art={getBoundingClientRect:()=>({top:100-win.scrollY,bottom:3000-win.scrollY}),contains:a=>a.inArt};
  const join={getBoundingClientRect:()=>({top:2100-win.scrollY})};
  Object.assign(win,{scrollY:0,innerHeight:500,_ev:{},addEventListener:(n,fn)=>{win._ev[n]=fn;},removeEventListener:n=>{delete win._ev[n];},
    requestAnimationFrame:fn=>fn()});
  if(tracker) win.umami={getSession:()=>({cache:'test-only'}),track:(name,data)=>{calls.push({name,data});return Promise.resolve();}};
  Object.assign(doc,{readyState:'complete',_ev:{},querySelector:s=>s==='.g-art'?art:null,getElementById:id=>id==='g-join'?join:null,
    addEventListener:(n,fn)=>{doc._ev[n]=fn;}});
  vm.runInNewContext(code,{window:win,document:doc,location:{pathname},setTimeout:fn=>{timers.push(fn);},Promise});
  const scroll=y=>{win.scrollY=y;win._ev.scroll&&win._ev.scroll();};
  return {calls,win,doc,timers,scroll};
}
test('reading depth 25/50/75/100 is sent once each with the slug only',()=>{
  const {calls,scroll}=setup();
  assert.deepEqual(calls,[]);            // 画面の中は 400/2000=20%
  scroll(200); scroll(150);              // 30%
  scroll(1200); scroll(1700);            // 80%・100%
  scroll(0); scroll(1700);
  const depth=calls.filter(c=>c.name==='sss_blog_read').map(c=>c.data.depth);
  assert.deepEqual(depth,['25','50','75','100']);
  assert.ok(calls.every(c=>c.data.slug==='price-tiers'&&Object.keys(c.data).sort().join()==='depth,slug'));
});
test('outbound source links send the host; SSS funnel, own site and the payment page are skipped',()=>{
  const {calls,doc}=setup();
  const click=(a,type='click',button=0)=>doc._ev[type]({type,button,target:{closest:()=>a}});
  const link=(href,extra={})=>{const u=new URL(href);return {protocol:u.protocol,hostname:u.hostname,inArt:true,hasAttribute:n=>!!extra[n],...extra};};
  click(link('https://www.soumu.go.jp/a?b=c'));
  click(link('https://aisalonsss.com/guide/x/'));
  click(link('https://univa.cc/bMYdr5'));
  click(link('https://aisalonsss.com/?utm_source=blog',{'data-sss-position':1}));
  click(link('https://example.com/',{inArt:false}));
  click(link('https://openai.com/blog'),'auxclick',2);
  click(link('https://openai.com/blog'),'auxclick',1);
  const out=JSON.parse(JSON.stringify(calls.filter(c=>c.name==="sss_blog_outbound").map(c=>c.data)));
  assert.deepEqual(out,[{slug:'price-tiers',host:'www.soumu.go.jp'},{slug:'price-tiers',host:'openai.com'}]);
});
test('blocked analytics: finite retries, nothing thrown, pages other than articles do nothing',()=>{
  const {timers,scroll}=setup({tracker:false});
  assert.doesNotThrow(()=>scroll(1700));
  let n=0; while(timers.length&&n<100){timers.shift()();n++;}
  assert.equal(n,39);
  const idx=setup({pathname:'/guide/'});
  assert.deepEqual(Object.keys(idx.win._ev),[]);
});
