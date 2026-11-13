const path=require('node:path'),fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const project=path.resolve(process.argv[2]||path.join(__dirname,'..'));
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:360,height:440},isMobile:true,hasTouch:true,colorScheme:'dark'});
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
  await page.addInitScript(()=>{
   window.host={text:'',start:0,end:0,session:1,revision:1,action:'send',kind:'text',active:true,secure:false,noLearning:false,readable:true,maxHeight:520};
   window.AndroidKeyboard={loadPreferences(){return '';},savePreferences(){return true;},action(){return 'true';},height(){},haptic(){},sound(){},edit(raw){const r=JSON.parse(raw);Object.assign(host,{text:r.text,start:r.start,end:r.end,revision:host.revision+1});return JSON.stringify({ok:true,session:host.session,revision:host.revision});}};
  });
  await page.goto('file:///'+path.join(project,'app/src/main/assets/keyboard.html').replaceAll('\\','/'));await page.evaluate(()=>BanglaNative.receive(host));
  async function measure(id){return page.evaluate(id=>new Promise(resolve=>{const t=performance.now();document.getElementById(id).click();const js=performance.now()-t;requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({jsMs:+js.toFixed(1),frameMs:+(performance.now()-t).toFixed(1),buttons:document.querySelectorAll('#bn-panel button').length,nodes:document.querySelectorAll('*').length})));}),id);}
  const samples={settings:[],emoji:[],dictionary:[],symbols:[],hostRefresh:[]};
  for(const [name,id] of [['settings','bn-settings'],['emoji','bn-emoji'],['dictionary','bn-dictionary']]){
   for(let i=0;i<4;i++){samples[name].push(await measure(id));await measure(id);}
  }
  for(let i=0;i<3;i++)samples.symbols.push(await measure('bn-more'));
  await measure('bn-emoji');
  for(let i=0;i<4;i++)samples.hostRefresh.push(await page.evaluate(()=>new Promise(resolve=>{const t=performance.now();host.revision++;BanglaNative.receive(host);const js=performance.now()-t;requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({jsMs:+js.toFixed(1),frameMs:+(performance.now()-t).toFixed(1),buttons:document.querySelectorAll('#bn-panel button').length})));})));
  const summary=Object.fromEntries(Object.entries(samples).map(([name,rows])=>[name,{maxJsMs:Math.max(...rows.map(x=>x.jsMs)),averageJsMs:+(rows.reduce((n,x)=>n+x.jsMs,0)/rows.length).toFixed(1),maxFrameMs:Math.max(...rows.map(x=>x.frameMs)),maxButtons:Math.max(...rows.map(x=>x.buttons))}]));
  fs.mkdirSync(path.join(project,'build'),{recursive:true});fs.writeFileSync(path.join(project,'build/ui-benchmark.json'),JSON.stringify({cpuThrottle:6,samples,summary},null,2));console.log(JSON.stringify({cpuThrottle:6,summary}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
