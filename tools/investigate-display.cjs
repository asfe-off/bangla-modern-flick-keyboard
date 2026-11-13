const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const project=path.resolve(process.argv[2]||path.join(__dirname,'..'));
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:360,height:440},isMobile:true,hasTouch:true,colorScheme:'dark'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const cdp=await page.context().newCDPSession(page);
  await page.addInitScript(()=>{
   window.host={text:'',start:0,end:0,session:1,revision:1,action:'send',kind:'text',active:true,secure:false,noLearning:false,readable:true,maxHeight:520,simpleGraphics:false};window.saved='';
   window.AndroidKeyboard={loadPreferences(){return saved;},savePreferences(raw){saved=raw;return true;},savePreferencesAsync(raw){saved=raw;},action(){return 'true';},height(value){window.measuredHeight=value;},haptic(){},sound(){},edit(raw){const r=JSON.parse(raw);Object.assign(host,{text:r.text,start:r.start,end:r.end,revision:host.revision+1});return JSON.stringify({ok:true,session:host.session,revision:host.revision});}};
   window.inspectKeyboard=()=>{
    const phone=document.querySelector('.bn-phone'),rect=phone.getBoundingClientRect();
    const visible=[...document.querySelectorAll('#bangla-nine button')].filter(button=>{const r=button.getBoundingClientRect(),style=getComputedStyle(button);return r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0&&style.display!=='none'&&style.visibility==='visible'&&+style.opacity>0;});
    return {nodes:document.querySelectorAll('*').length,visibleButtons:visible.length,height:rect.height,top:rect.top,scroll:document.scrollingElement.scrollTop,bodyHeight:document.body.getBoundingClientRect().height,keyHeight:getComputedStyle(phone).getPropertyValue('--bn-key-height'),theme:getComputedStyle(phone).colorScheme};
   };
  });
  await page.goto('file:///'+path.join(project,'app/src/main/assets/keyboard.html').replaceAll('\\','/'));await page.evaluate(()=>BanglaNative.receive(host));
  let checks=0,maxNodes=0,minButtons=1e9,maxHeight=0;const samples=[];
  for(let batch=0;batch<30;batch++){
   const rows=await page.evaluate(batch=>{
    const rows=[];
    for(let step=0;step<60;step++){
     const mode=step%10;
     if(mode===0){Object.assign(host,{session:host.session+1,revision:1,text:'',start:0,end:0,active:true,kind:'text',secure:false,noLearning:false,maxHeight:batch%3===0?300:520,simpleGraphics:batch%2===0});BanglaNative.receive(host);}
     if(mode===1)document.querySelectorAll('#bn-grid button')[1].click();
     if(mode===2)document.querySelector('#bn-settings').click();
     if(mode===3){const options=document.querySelectorAll('.bn-choice-control');if(options.length){options[0].click();const choices=document.querySelectorAll('.bn-choice-options:not([hidden]) button');choices[batch%Math.max(1,choices.length)]?.click();}document.querySelector('#bn-panel').scrollTop=1e5;}
     if(mode===4)document.querySelector('#bn-emoji').click();
     if(mode===5)document.querySelector('#bn-panel').scrollTop=batch%2?1e6:0;
     if(mode===6)document.querySelector('#bn-dictionary').click();
     if(mode===7)document.querySelector('#bn-more').click();
     if(mode===8){Object.assign(host,{session:host.session+1,kind:'password',secure:true,noLearning:true});BanglaNative.receive(host);}
     if(mode===9){Object.assign(host,{session:host.session+1,active:false,text:'',start:0,end:0});BanglaNative.receive(host);Object.assign(host,{session:host.session+1,active:true,secure:false,noLearning:false,kind:'text'});BanglaNative.receive(host);}
     rows.push(inspectKeyboard());
    }return rows;
   },batch);
   for(const sample of rows){checks++;maxNodes=Math.max(maxNodes,sample.nodes);minButtons=Math.min(minButtons,sample.visibleButtons);maxHeight=Math.max(maxHeight,sample.height);assert(sample.visibleButtons>=12,JSON.stringify({checks,sample}));assert(sample.height>=200&&sample.height<600,JSON.stringify(sample));assert.equal(sample.top,0);assert.equal(sample.scroll,0);assert(sample.nodes<900);}
   // Browser lifecycle/pressure injection is useful to isolate DOM faults. It is
   // not an Android IME window, GPU driver or ColorOS lifecycle reproduction.
   if(batch%3===0){await cdp.send('Page.setWebLifecycleState',{state:'frozen'});await cdp.send('Page.setWebLifecycleState',{state:'active'});await cdp.send('Memory.simulatePressureNotification',{level:'moderate'});}
   await page.setViewportSize(batch%2?{width:360,height:440}:{width:412,height:390});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   samples.push(await page.evaluate(()=>inspectKeyboard()));
  }
  assert.deepEqual(errors,[]);
  const result={browser:'Edge desktop mobile emulation; not Android WebView',checks,maxNodes,minButtons,maxHeight,lifecycleFreezeResumePairs:10,memoryPressureEvents:10,blankDOMStates:0,errors,samples};
  fs.mkdirSync(path.join(project,'build'),{recursive:true});fs.writeFileSync(path.join(project,'build/display-investigation.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({...result,samples:undefined}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
