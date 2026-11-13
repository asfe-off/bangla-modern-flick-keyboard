const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
 const page=await browser.newPage({viewport:{width:360,height:440},isMobile:true,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.host={text:'',start:0,end:0,session:1,revision:1,action:'send',kind:'text',active:true,secure:false,noLearning:false,readable:true,maxHeight:520};
  window.inFlight=0;window.maxInFlight=0;window.saved='';window.feedback={sound:0,haptic:0};
  window.AndroidKeyboard={loadPreferences(){return JSON.stringify({privateContent:{version:2,preferences:{sound:true,vibration:true}}});},savePreferencesAsync(raw){saved=raw;},height(){},sound(){feedback.sound++;},haptic(){feedback.haptic++;},action(){return 'true';},submitEdit(raw){
   const r=JSON.parse(raw);maxInFlight=Math.max(maxInFlight,++inFlight);
   setTimeout(()=>{const ok=r.session===host.session&&r.before===host.text;if(ok)Object.assign(host,{text:r.text,start:r.start,end:r.end,revision:host.revision+1});inFlight--;BanglaNative.acknowledge({...host,ok,requestId:r.requestId,requestSession:r.session});},25);
  }};
 });
 await page.goto('file:///'+path.resolve(__dirname,'../app/src/main/assets/keyboard.html').replaceAll('\\','/'));
 await page.evaluate(()=>BanglaNative.receive(host));const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
 const samples=[];let releases=0;
 // Actual browser pointer delivery exercises capture/release, preview cleanup,
 // suggestion replacement and asynchronous editor acknowledgement between paints.
 for(let batch=0;batch<12;batch++){
  const box=await page.locator('#bn-grid button').nth(1).boundingBox();const x=box.x+box.width/2,y=box.y+box.height/2;
  for(let i=0;i<100;i++){
   await page.mouse.move(x,y);await page.mouse.down();
   if(i%4===0)await page.mouse.move(x+(i%8===0?-24:24),y);
   await page.mouse.up();releases++;
  }
  await page.waitForFunction(()=>inFlight===0);
  await cdp.send('HeapProfiler.collectGarbage');const dom=await cdp.send('Memory.getDOMCounters');
  const metrics=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  const state=await page.evaluate(()=>({...BanglaNative.displayStatus(),previewHidden:document.querySelector('.bn-flick-guide').hidden,textMatches:host.text===document.querySelector('#bn-output').value,maxInFlight,...feedback}));
  assert.equal(state.keyReleases,releases);assert.equal(state.activeGestures,0);assert(state.undoEntries<=100);assert(state.rootVisible&&state.visibleButtons>=20);assert(state.previewHidden);assert(state.textMatches);assert.equal(state.maxInFlight,1);assert.equal(state.sound,releases);assert.equal(state.haptic,releases);assert.equal(state.scriptErrors,0);assert.equal(state.promiseErrors,0);
  samples.push({releases,nodes:dom.nodes,listeners:dom.jsEventListeners,heap:metrics.JSHeapUsedSize,drawState:state});
 }
 // Discarded suggestion listeners/nodes must be collectible; a small fixed
 // allowance tolerates engine bookkeeping without asserting an exact heap size.
 assert(samples.at(-1).listeners<=samples[0].listeners+100);assert(samples.at(-1).nodes<=samples[0].nodes+100);
 assert.deepEqual(errors,[]);
 const result={environment:'Desktop Edge mobile emulation; Android graphics, sound and vibration are not exercised',keyReleases:releases,errors,samples};
 fs.mkdirSync(path.resolve(__dirname,'../build'),{recursive:true});fs.writeFileSync(path.resolve(__dirname,'../build/sustained-typing.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({keyReleases:releases,firstNodes:samples[0].nodes,lastNodes:samples.at(-1).nodes,firstListeners:samples[0].listeners,lastListeners:samples.at(-1).listeners,firstHeap:samples[0].heap,lastHeap:samples.at(-1).heap,errors}));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
