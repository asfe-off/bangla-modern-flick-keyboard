const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:360,height:440},isMobile:true,hasTouch:true,colorScheme:'dark'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.host={text:'',start:0,end:0,session:1,revision:1,action:'send',kind:'text',active:true,secure:false,noLearning:false,readable:true,maxHeight:520};window.hostEvents=[];
   window.preferenceWrites=[];window.savedPreferences='';window.failSaving=false;
   localStorage.setItem('bangla-flick-v2-prefs',JSON.stringify({privateContent:{version:2,favorites:['😀'],recent:[],personalWords:[],learnedPairs:{},preferences:{learning:true}}}));
   window.AndroidKeyboard={
    edit(raw){const request=JSON.parse(raw);if(window.rejectNextEdit){window.rejectNextEdit=false;host.revision++;return JSON.stringify({...host,ok:false});}if(request.session!==host.session||request.revision!==host.revision||request.before!==host.text)return JSON.stringify({...host,ok:false});host.text=request.text;host.start=request.start;host.end=request.end;host.revision++;hostEvents.push({type:'edit',text:host.text});return JSON.stringify({ok:true,session:host.session,revision:host.revision});},
    action(action){hostEvents.push({type:'action',action});return 'true';},
    loadPreferences(){return savedPreferences;},savePreferences(raw){if(failSaving)return false;preferenceWrites.push(raw);savedPreferences=raw;return true;},
    height(value){window.keyboardHeight=value;},haptic(){},sound(){},version(){return 'test';}
   };
  });
  await page.goto('file:///'+path.resolve(__dirname,'../app/src/main/assets/keyboard.html').replaceAll('\\','/'));
  await page.evaluate(()=>BanglaNative.receive(host));
  assert.equal(await page.evaluate(()=>localStorage.getItem('bangla-flick-v2-prefs')),null);
  assert.equal(await page.evaluate(()=>JSON.parse(savedPreferences).privateContent.favorites[0]),'😀');
  const keys=page.locator('#bn-grid button');
  await keys.nth(1).tap();await page.locator('#bn-join').tap();await keys.nth(4).tap();
  assert.equal(await page.evaluate(()=>host.text),'ক্ত');
  await page.locator('#bn-undo').tap();assert.equal(await page.evaluate(()=>host.text),'ক্');await page.locator('#bn-undo').tap();assert.equal(await page.evaluate(()=>host.text),'ক্ত');
  await page.locator('#bn-delete').tap();assert.equal(await page.evaluate(()=>host.text),'');
  await keys.nth(1).focus();await page.keyboard.press('ArrowUp');assert.equal(await page.evaluate(()=>host.text),'গ');await page.locator('#bn-cycle').tap();assert.equal(await page.evaluate(()=>host.text),'খ');
  await page.locator('#bn-enter').tap();assert.equal(await page.evaluate(()=>hostEvents.at(-1).action),'editor');assert.equal(await page.locator('.bn-message').count(),0);
  // External app cursor movement and selections reset undo and preserve the editor tail.
  await page.evaluate(()=>{Object.assign(host,{text:'কত',start:1,end:1,revision:10});BanglaNative.receive(host);});
  await page.locator('#bn-join').tap();assert.equal(await page.evaluate(()=>host.text),'ক্ত');
  await page.evaluate(()=>{Object.assign(host,{text:'hello world',start:6,end:11,revision:20});BanglaNative.receive(host);});
  await keys.nth(1).tap();assert.equal(await page.evaluate(()=>host.text),'hello ক');
  // Emoji from real local emoji picker, and sidebar stays present.
  await page.locator('#bn-emoji').tap();await page.getByRole('button',{name:'Insert emoji: grinning face',exact:true}).first().tap();assert((await page.evaluate(()=>host.text)).endsWith('😀'));
  await page.locator('#bn-emoji').tap();
  // Native Send/Search/Done modes, numeric editor handling and password suggestions.
  await page.evaluate(()=>{Object.assign(host,{session:2,revision:1,text:'',start:0,end:0,kind:'number',action:'next'});BanglaNative.receive(host);});
  assert.equal(await keys.nth(0).textContent(),'1');await keys.nth(0).tap();assert.equal(await page.evaluate(()=>host.text),'1');assert.equal(await page.locator('#bn-enter').textContent(),'⇥');
  await page.evaluate(()=>{Object.assign(host,{session:3,revision:1,text:'',start:0,end:0,kind:'password',secure:true,noLearning:true,action:'done'});BanglaNative.receive(host);});
  const writesBefore=await page.evaluate(()=>preferenceWrites.length);
  await keys.nth(1).tap();assert.equal(await page.locator('#bn-suggestions button:not(:disabled)').count(),0);
  await page.locator('#bn-dictionary').tap();assert(await page.locator('#bn-dictionary-drawer').isHidden());
  await keys.nth(4).tap();await page.locator('#bn-space').tap();
  assert.equal(await page.evaluate(()=>preferenceWrites.length),writesBefore);
  assert.equal(await page.evaluate(()=>localStorage.getItem('bangla-flick-v2-prefs')),null);
  await page.evaluate(()=>{Object.assign(host,{session:4,revision:1,text:'আমা',start:3,end:3,kind:'text',secure:false,noLearning:false,action:'search'});BanglaNative.receive(host);});
  assert(await page.locator('#bn-suggestions button:not(:disabled)').count()>0);await page.locator('#bn-suggestions button').first().tap();assert((await page.evaluate(()=>host.text)).endsWith(' '));
  await page.locator('#bn-settings').tap();assert(await page.getByRole('button',{name:'Switch keyboard',exact:true}).count());await page.getByRole('button',{name:'Switch keyboard',exact:true}).tap();assert.equal(await page.evaluate(()=>hostEvents.at(-1).action),'switchIme');await page.locator('#bn-settings').tap();
  await page.evaluate(()=>{Object.assign(host,{session:5,revision:1,text:'',start:0,end:0,kind:'text',secure:false,action:'send'});BanglaNative.receive(host);});
  // Rejected stale edit must restore the host context instead of showing uncommitted text.
  await page.evaluate(()=>window.rejectNextEdit=true);await keys.nth(1).tap();assert.equal(await page.evaluate(()=>host.text),'');assert.equal(await page.locator('#bn-output').inputValue(),'');
  // App text is treated as text, never markup or executable code.
  await page.evaluate(()=>{const text='<img src=x onerror="window.injected=true">';Object.assign(host,{session:7,revision:1,text,start:text.length,end:text.length});BanglaNative.receive(host);});
  await page.locator('#bn-dictionary').tap();assert.equal(await page.evaluate(()=>window.injected),undefined);
  await page.evaluate(()=>{Object.assign(host,{session:10,revision:1,text:'constructor',start:11,end:11});BanglaNative.receive(host);});
  await page.evaluate(()=>{Object.assign(host,{session:8,revision:1,text:'',start:0,end:0});BanglaNative.receive(host);});assert.equal(await page.locator('#bn-dictionary-drawer').textContent(),'');
  // A held delete from the previous field must not continue into the next field.
  await page.locator('#bn-delete').hover();await page.mouse.down();
  await page.evaluate(()=>{Object.assign(host,{session:9,revision:1,text:'keep',start:4,end:4});BanglaNative.receive(host);});await page.waitForTimeout(650);await page.mouse.up();assert.equal(await page.evaluate(()=>host.text),'keep');
  // A storage failure must not fall back to plaintext localStorage.
  await page.evaluate(()=>window.failSaving=true);await page.locator('#bn-emoji').tap();await page.getByRole('button',{name:'Insert emoji: grinning face',exact:true}).first().tap();assert.equal(await page.evaluate(()=>localStorage.getItem('bangla-flick-v2-prefs')),null);await page.locator('#bn-emoji').tap();
  for(const width of [320,360,412]){
   await page.setViewportSize({width,height:440});await page.waitForTimeout(50);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert(await page.evaluate(()=>keyboardHeight>240&&keyboardHeight<430));
   await page.screenshot({path:path.resolve(__dirname,'../build/native-'+width+'.png'),fullPage:true});
  }
  await page.evaluate(()=>{Object.assign(host,{session:6,revision:1,text:'',start:0,end:0,active:false});BanglaNative.receive(host);});await keys.nth(1).tap();assert.equal(await page.evaluate(()=>host.text),'');
  assert.deepEqual(errors,[]);
  console.log('PASS: packaged UI with simulated Android bridge: typing, conjuncts, selection, actions, preference migration, no plaintext fallback, password learning/dictionary suppression, stale edits, text injection, held-key cancellation, field cleanup and compact layout.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
