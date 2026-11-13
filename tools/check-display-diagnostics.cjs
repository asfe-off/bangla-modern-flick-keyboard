const assert=require('node:assert/strict'),path=require('node:path');const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
 const page=await browser.newPage({viewport:{width:360,height:440},isMobile:true,hasTouch:true});
 await page.addInitScript(()=>{
  window.host={text:'PRIVATE draft that must not appear in diagnostics',start:48,end:48,session:1,revision:1,action:'send',kind:'text',active:true,secure:false,noLearning:false,readable:true,maxHeight:520};
  window.AndroidKeyboard={loadPreferences(){return '';},savePreferences(){return true;},height(){},haptic(){},sound(){},action(){return 'true';},edit(){return '{}';}};
 });
 await page.goto('file:///'+path.resolve(__dirname,'../app/src/main/assets/keyboard.html').replaceAll('\\','/'));await page.evaluate(()=>{host.start=host.end=host.text.length;BanglaNative.receive(host);});
 const allowed=new Set(['width','height','top','left','scrollX','scrollY','viewportHeight','visibleButtons','documentHidden','rootVisible','scriptErrors','promiseErrors','viewportOffsetTop','visualHeight','keyReleases','activeGestures','undoEntries','domNodes']);
 let healthy=await page.evaluate(()=>BanglaNative.displayStatus());assert(healthy.visibleButtons>=20&&healthy.rootVisible&&healthy.height>200);
 for(const [key,value] of Object.entries(healthy)){assert(allowed.has(key));assert(['number','boolean'].includes(typeof value));}
 assert(!JSON.stringify(healthy).includes('PRIVATE'));
 // Different failure classes must produce distinguishable reports.
 await page.evaluate(()=>document.querySelector('.bn-phone').style.visibility='hidden');
 assert.equal((await page.evaluate(()=>BanglaNative.displayStatus())).visibleButtons,0);
 await page.evaluate(()=>document.querySelector('.bn-phone').style.visibility='');
 await page.evaluate(()=>document.querySelector('#bangla-nine').style.display='none');let hidden=await page.evaluate(()=>BanglaNative.displayStatus());assert(!hidden.rootVisible&&hidden.height===0);
 await page.evaluate(()=>document.querySelector('#bangla-nine').style.display='');
 await page.evaluate(()=>{window.dispatchEvent(new ErrorEvent('error',{message:'PRIVATE-error'}));window.dispatchEvent(new Event('unhandledrejection'));});
 const failed=await page.evaluate(()=>BanglaNative.displayStatus());assert.equal(failed.scriptErrors,1);assert.equal(failed.promiseErrors,1);assert(!JSON.stringify(failed).includes('PRIVATE-error'));
 await page.evaluate(()=>{Object.assign(host,{revision:2,simpleGraphics:true});BanglaNative.receive(host);});
 assert(await page.locator('.bn-phone').evaluate(p=>p.classList.contains('bn-simple-graphics')));
 assert.equal(await page.locator('.bn-flick-guide').evaluate(p=>getComputedStyle(p).filter),'none');
 await page.evaluate(()=>{Object.assign(host,{revision:3,simpleGraphics:false});BanglaNative.receive(host);});
 assert(!(await page.locator('.bn-phone').evaluate(p=>p.classList.contains('bn-simple-graphics'))));
 console.log('PASS: display diagnostics distinguish hidden layout/zero size/script errors, contain only numbers and booleans, exclude typed text/error messages, and switch optional graphics mode. Android native drawing still requires device testing.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
