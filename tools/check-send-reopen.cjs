const assert=require('node:assert/strict'),path=require('node:path');const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
 const page=await browser.newPage({viewport:{width:360,height:440},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.host={text:'',start:0,end:0,session:1,revision:1,action:'send',kind:'text',active:true,secure:false,noLearning:false,readable:true,maxHeight:520};window.sent=[];window.stale=null;window.delay=0;
  window.AndroidKeyboard={loadPreferences(){return '';},savePreferences(){return true;},height(){},sound(){},haptic(){},submitEdit(raw){const r=JSON.parse(raw);setTimeout(()=>{const ok=r.session===host.session&&r.before===host.text;if(ok)Object.assign(host,{text:r.text,start:r.start,end:r.end,revision:host.revision+1});const ack={...host,ok,requestId:r.requestId,requestSession:r.session};stale=ack;BanglaNative.acknowledge(ack);},8);},action(action){
   if(action!=='editor')return 'false';sent.push(host.text);
   const old=stale;Object.assign(host,{session:host.session+1,revision:1,text:'',start:0,end:0,active:false});BanglaNative.receive(host);
   setTimeout(()=>{Object.assign(host,{session:host.session+1,revision:1,active:true});BanglaNative.receive(host);if(old)BanglaNative.acknowledge(old);},delay);
   return 'true';
  }};
 });
 await page.goto('file:///'+path.resolve(__dirname,'../app/src/main/assets/keyboard.html').replaceAll('\\','/'));await page.evaluate(()=>BanglaNative.receive(host));
 for(let cycle=0;cycle<60;cycle++){
  await page.evaluate(cycle=>{delay=[0,16,60,150][cycle%4];for(let j=0;j<3;j++)document.querySelectorAll('#bn-grid button')[1].click();document.querySelector('#bn-enter').click();},cycle);
  await page.waitForFunction(n=>sent.length===n&&host.active,cycle+1);
  assert.equal(await page.evaluate(()=>sent.at(-1)),'ককক');assert.equal(await page.locator('#bn-output').inputValue(),'');
  const state=await page.evaluate(()=>BanglaNative.displayStatus());assert(state.rootVisible&&state.visibleButtons>=20&&state.height>200);assert.equal(state.scriptErrors,0);assert.equal(state.promiseErrors,0);assert.equal(state.activeGestures,0);
 }
 assert.deepEqual(errors,[]);console.log('PASS: 60 simulated Enter → inactive editor → delayed reopen cycles; Send waits for text, input clears, late acknowledgements do not leak into the reopened session, and the DOM stays visible. Android IME window and GPU lifecycle are not simulated.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
