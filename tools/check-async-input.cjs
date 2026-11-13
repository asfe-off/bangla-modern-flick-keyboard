const assert=require('node:assert/strict'),path=require('node:path');const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
 const page=await browser.newPage({viewport:{width:360,height:440},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.host={text:'',start:0,end:0,session:1,revision:1,action:'send',kind:'text',active:true,secure:false,noLearning:false,readable:true,maxHeight:520};window.submits=[];window.actions=[];window.saved='';window.rejectOne=false;
  window.AndroidKeyboard={loadPreferences(){return saved;},savePreferences(raw){saved=raw;return true;},height(){},haptic(){},sound(){},action(action){actions.push({action,text:host.text});return 'true';},submitEdit(raw){
   const r=JSON.parse(raw);submits.push(r);setTimeout(()=>{
    let ok=r.session===host.session&&r.revision===host.revision&&r.before===host.text&&!rejectOne;rejectOne=false;
    if(ok)Object.assign(host,{text:r.text,start:r.start,end:r.end,revision:host.revision+1});
    BanglaNative.acknowledge({...host,ok,requestId:r.requestId,requestSession:r.session});
   },90);
  }};
 });
 await page.goto('file:///'+path.resolve(__dirname,'../app/src/main/assets/keyboard.html').replaceAll('\\','/'));await page.evaluate(()=>BanglaNative.receive(host));
 // Queue many taps without waiting for a slow Android editor between each one.
 const started=Date.now();await page.evaluate(()=>{for(let i=0;i<20;i++)document.querySelectorAll('#bn-grid button')[1].click();document.querySelector('#bn-enter').click();});assert(Date.now()-started<250);
 assert.equal(await page.locator('#bn-output').inputValue(),'ক'.repeat(20));assert.equal(await page.evaluate(()=>actions.length),0);
 await page.waitForFunction(()=>actions.length===1);assert.deepEqual(await page.evaluate(()=>actions[0]),{action:'editor',text:'ক'.repeat(20)});assert((await page.evaluate(()=>submits.length))<20);
 // Backspace and Undo/Redo must operate on the optimistic text in the correct order.
 await page.evaluate(()=>{Object.assign(host,{session:2,revision:1,text:'',start:0,end:0});BanglaNative.receive(host);for(let i=0;i<8;i++)document.querySelectorAll('#bn-grid button')[1].click();document.querySelector('#bn-delete').click();document.querySelector('#bn-undo').click();});
 await page.waitForFunction(()=>host.text==='ক'.repeat(8));await page.locator('#bn-undo').tap();await page.waitForFunction(()=>host.text==='ক'.repeat(7));
 // A same-context revision update can be retried once without dropping queued letters.
 await page.evaluate(()=>{Object.assign(host,{session:3,revision:1,text:'',start:0,end:0});BanglaNative.receive(host);rejectOne=true;document.querySelectorAll('#bn-grid button')[1].click();document.querySelectorAll('#bn-grid button')[4].click();});await page.waitForFunction(()=>host.text==='কত');
 // Old-field acknowledgements must not populate the newly focused editor.
 await page.evaluate(()=>{Object.assign(host,{session:4,revision:1,text:'',start:0,end:0});BanglaNative.receive(host);document.querySelectorAll('#bn-grid button')[1].click();Object.assign(host,{session:5,revision:1,text:'new field',start:9,end:9});BanglaNative.receive(host);});await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>host.text),'new field');assert.equal(await page.locator('#bn-output').inputValue(),'new field');
 // An actual external text change wins over an unconfirmed replacement.
 await page.evaluate(()=>{document.querySelectorAll('#bn-grid button')[1].click();Object.assign(host,{revision:host.revision+1,text:'autofilled',start:10,end:10});BanglaNative.receive(host);});await page.waitForTimeout(180);assert.equal(await page.locator('#bn-output').inputValue(),'autofilled');assert.equal(await page.evaluate(()=>host.text),'autofilled');
 assert.deepEqual(errors,[]);console.log('PASS: rapid queued typing, coalesced edits, Send after flush, deletion/Undo ordering, stale-revision retry, field-switch isolation and external-edit conflict handling with a slow editor.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
