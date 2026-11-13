const path=require('node:path'),assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:360,height:440},isMobile:true,hasTouch:true,colorScheme:'dark'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const cdp=await page.context().newCDPSession(page);
  await page.addInitScript(()=>{
   window.host={text:'',start:0,end:0,session:1,revision:1,action:'send',kind:'text',active:true,secure:false,noLearning:false,readable:true,maxHeight:520};window.saved='',window.asyncSaves=[],window.soundEvents=[];
   window.AndroidKeyboard={loadPreferences(){return saved;},savePreferences(raw){saved=raw;return true;},savePreferencesAsync(raw){asyncSaves.push(raw);saved=raw;},action(){return 'true';},height(){},haptic(){},sound(type){soundEvents.push(type);},edit(raw){const r=JSON.parse(raw);Object.assign(host,{text:r.text,start:r.start,end:r.end,revision:host.revision+1});return JSON.stringify({ok:true,session:host.session,revision:host.revision});}};
  });
  await page.goto('file:///'+path.resolve(__dirname,'../app/src/main/assets/keyboard.html').replaceAll('\\','/'));await page.evaluate(()=>BanglaNative.receive(host));
  const panel=page.locator('#bn-panel');
  async function scrollPanel(value){await panel.evaluate((p,value)=>p.scrollTop=value,value);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
  async function swipeFrom(locator){
   await locator.scrollIntoViewIfNeeded();const before=await panel.evaluate(p=>p.scrollTop);
   const box=await locator.boundingBox();assert(box);const x=box.x+box.width*.6,y=box.y+box.height*.5;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*15}]});await page.waitForTimeout(16);}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(80);return (await panel.evaluate(p=>p.scrollTop))-before;
  }
  await page.locator('#bn-settings').tap();assert.equal(await panel.locator('select').count(),0);
  await scrollPanel(0);await page.getByRole('button',{name:'Theme',exact:true}).tap();
  await page.getByRole('radio',{name:'Theme: Dark',exact:true}).tap();assert.equal(await page.evaluate(()=>JSON.parse(saved).privateContent.preferences.theme),'dark');assert(await page.evaluate(()=>asyncSaves.length>0));
  await page.getByRole('button',{name:'Key height',exact:true}).tap();await page.getByRole('radio',{name:'Key height: Small phone',exact:true}).tap();assert.equal(await page.evaluate(()=>JSON.parse(saved).privateContent.preferences.height),80);
  // A swipe beginning on a selectable Settings row must scroll, not activate it.
  await scrollPanel(0);assert(await swipeFrom(page.getByRole('button',{name:'Theme',exact:true}))>20);assert.equal(await page.getByRole('button',{name:'Theme',exact:true}).getAttribute('aria-expanded'),'false');assert.equal(await page.evaluate(()=>document.scrollingElement.scrollTop),0);
  await page.waitForTimeout(400);await page.getByRole('switch',{name:'System key sounds',exact:true}).scrollIntoViewIfNeeded();await page.getByRole('switch',{name:'System key sounds',exact:true}).tap();assert(await page.getByRole('switch',{name:'System key sounds',exact:true}).isChecked(),'Sound switch did not turn on');
  await page.locator('#bn-settings').tap();await page.locator('#bn-grid button').nth(1).tap();assert((await page.evaluate(()=>soundEvents)).includes('click'));
  await page.locator('#bn-emoji').tap();await page.getByRole('button',{name:'Insert emoji: grinning face',exact:true}).first().waitFor();assert(await panel.locator('button').count()<180);
  const before=await page.evaluate(()=>host.text);await page.getByRole('button',{name:'Insert emoji: grinning face',exact:true}).first().tap();assert.equal(await page.evaluate(()=>host.text),before+'😀');
  // Updating the host must preserve the mounted emoji rows and scroll position.
  await scrollPanel(1200);await panel.evaluate(p=>{window.keptPanelChild=p.lastElementChild;window.keptScroll=p.scrollTop;});
  await page.evaluate(()=>{host.revision++;BanglaNative.receive(host);});assert(await page.evaluate(()=>keptPanelChild===document.querySelector('#bn-panel').lastElementChild));assert.equal(await panel.evaluate(p=>p.scrollTop),await page.evaluate(()=>keptScroll));
  await scrollPanel(1e8);await page.getByRole('button',{name:'Insert emoji: flag: Wales',exact:true}).waitFor();assert(await panel.locator('button').count()<180);
  await page.getByRole('button',{name:'Insert emoji: flag: Wales',exact:true}).tap();assert((await page.evaluate(()=>host.text)).endsWith('🏴󠁧󠁢󠁷󠁬󠁳󠁿'));
  await scrollPanel(0);await page.getByRole('button',{name:'Insert emoji: grinning face',exact:true}).first().waitFor();
  for(const width of [320,360,412]){await page.setViewportSize({width,height:440});await page.waitForTimeout(40);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await panel.locator('button').count()<180);}
  await page.locator('#bn-emoji').tap();
  // Indexed completion must keep the previous dictionary's ranking and results.
  const common='আমি তুমি আমার তোমার আমাকে আমাদের আমরা ভালো ভাল আছি আছে আছেন আছো কেমন কি কী কেন কোথায় কোথায় কখন আজ আজকে কাল এখন পরে যাব যাবে যাবো করব করবো করছি করতে হবে হবে না হ্যাঁ ঠিক আছে ধন্যবাদ অনেক একটা একটু বাসায় বাসায় বাড়ি বাড়ি খাই খাব খাবে বাংলাদেশ বাংলা ইংরেজি ফোন কথা বলো বলছি দেখা হবে ভালোবাসি বন্ধু সময় সময় জন্য সঙ্গে সবাই টাকা কাজ পড়া পড়া স্কুল কলেজ বিশ্ববিদ্যালয় বিশ্ববিদ্যালয় সমস্যা নতুন পুরোনো তোমাকে আপনাকে আপনি তারা তাদের নেই চাই চাও পারি পারবে গিয়েছি গিয়েছি এসেছে সবাই আবার দুপুর রাতে সকালে বসে থাকব থাকবো'.split(/\s+/);
  for(const prefix of ['আ','আম','ক','কর','স','বা','শ','অজানা']){
   const expected=await page.evaluate(({prefix,common})=>[...new Set([...common,...BanglaFlickWordsBn])].filter(w=>w.toLowerCase().startsWith(prefix.normalize('NFC'))&&w!==prefix).slice(0,3),{prefix,common});
   await page.evaluate(prefix=>{Object.assign(host,{text:prefix,start:prefix.length,end:prefix.length,revision:host.revision+1});BanglaNative.receive(host);},prefix);
   const actual=await page.locator('#bn-suggestions button:not(:disabled):not(.bn-emoji-candidate)').allTextContents();assert.deepEqual(actual,expected);
  }
  // Touch preview fans out to all four sides; input commits only on release.
  for(const [dx,dy,expected,index] of [[0,0,'ক',0],[-36,0,'খ',1],[0,-36,'গ',2],[36,0,'ঘ',3],[0,36,'ঙ',4]]){
   await page.evaluate(()=>{Object.assign(host,{session:host.session+1,text:'',start:0,end:0,revision:1});BanglaNative.receive(host);});
   const box=await page.locator('#bn-grid button').nth(1).boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});assert(await page.locator('.bn-flick-guide').isHidden());
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx,y:y+dy}]});if(index){assert(await page.locator('.bn-flick-guide').isVisible());assert.equal(await page.locator('.bn-flick-selected').getAttribute('data-index'),String(index));assert.equal(await page.locator('.bn-flick-selected').textContent(),expected);}else assert(await page.locator('.bn-flick-guide').isHidden());assert.equal(await page.evaluate(()=>host.text),'');
   if(index===2)await page.screenshot({path:path.resolve(__dirname,'../build/flick-preview.png')});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await page.evaluate(()=>host.text),expected);assert(await page.locator('.bn-flick-guide').isHidden());
  }
  for(const width of [320,412]){
   await page.setViewportSize({width,height:440});
   for(const index of [0,2,6,8]){const box=await page.locator('#bn-grid button').nth(index).boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-36,y}]});const guide=await page.locator('.bn-flick-guide').boundingBox();assert(guide.x>=0&&guide.y>=0&&guide.x+guide.width<=width&&guide.y+guide.height<=440);await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert(await page.locator('.bn-flick-guide').isHidden());}
  }
  await page.locator('#bn-settings').tap();await scrollPanel(0);await page.screenshot({path:path.resolve(__dirname,'../build/settings-fixed.png')});
  assert.deepEqual(errors,[]);console.log('PASS: inline settings choices, touch scrolling over controls, async preference dispatch, sound routing, virtual emoji insertion/history, full picker reachability, stable host refresh and completion ranking.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
