// Original keyboard engine code: MIT. Word/emoji data are separate licensed assets.

(() => {
  const root=document.getElementById('bangla-nine');
  let displayScriptErrors=0,displayPromiseErrors=0,displayKeyReleases=0;
  window.addEventListener('error',()=>displayScriptErrors++);
  window.addEventListener('unhandledrejection',()=>displayPromiseErrors++);
  const output=root.querySelector('#bn-output'), status=root.querySelector('#bn-status');
  const grid=root.querySelector('#bn-grid'), symbols=root.querySelector('#bn-symbols');
  const space=root.querySelector('#bn-space'), more=root.querySelector('#bn-more'), join=root.querySelector('#bn-join');
  const bnGroups=[['অ','আ','ই','ঈ','উ'],['ক','খ','গ','ঘ','ঙ'],['চ','ছ','জ','ঝ','ঞ'],['ট','ঠ','ড','ঢ','ণ'],['ত','থ','দ','ধ','ন'],['প','ফ','ব','ভ','ম'],['য','র','ল','শ','ষ'],['স','হ','ড়','ঢ়','য়'],['এ','ঐ','ও','ঔ','ঊ']];
  const enGroups=['abc','def','ghi','jkl','mno','pqrs','tuv','wxyz'].map(x=>[...x]);
  // Each array is [tap, left, up, right, down]. Missing directions are intentionally empty.
  const symbolPages=[
    [['ঋ','ঁ','ঃ','ৎ','ং'],['@','#','*','&','%'],['/','\\','|','_','~'],
     ['"',"'",'`','“','”'],['(',')','[',']'],['-','+','=','×','÷'],
     [':',';','…','•','·'],['৳','$','€','£','¥'],['.',',','?','!','।']],
    [['{','}','<','>','^'],['±','≠','≈','≤','≥'],['°','℃','℉','µ','Ω'],
     ['‘','’','«','»','„'],['—','–','¡','§','¶'],['©','®','™','℠'],
     ['↔','←','↑','→','↓'],['✓','✗','☐','☑','☒'],['¢','₹','₩','₽','₿']]
  ];
  function symbolGroups(page,lang=language){
    const groups=symbolPages[page-1].map(group=>group.slice());
    if(lang==='en'&&page===1){groups[0]=[];groups[7]=['$','৳','€','£','¥'];groups[8][4]='¿';}
    return groups;
  }
  const signs={'অ':'','আ':'া','ই':'ি','ঈ':'ী','উ':'ু','ঊ':'ূ','ঋ':'ৃ','এ':'ে','ঐ':'ৈ','ও':'ো','ঔ':'ৌ'};
  const positions=['center','left','up','right','down'];
  let language='bn', symbolPage=0, uppercase=false;
  const v2data={bnWords:window.BanglaFlickWordsBn,enWords:window.BanglaFlickWordsEn,emojiGroups:window.BanglaFlickEmoji,keySounds:{}};
  let nativeMirror=null,nativeSecure=false,nativeNoLearning=false,nativeNumeric=false,nativeAction="newline",nativeActive=false;
  let nativePending=null,nativeEditId=0,nativeDeferredAction=null;
  let activePanel=null,lastChoice=null,clips=[],favoriteMode=false,handledPhysical=false;
  const panel=root.querySelector('#bn-panel');let settingsGroup=null,emojiView=null;
  const activeGestureTargets=new Set();
  const defaults={suggestions:true,nextWords:true,height:88,theme:'system',letterScale:1,hints:true,vibration:false,sound:false,flickDistance:18,holdDelay:500,learning:false,digits:'auto',startLanguage:'bn',spaceSwitch:true,tabMode:'tab',deleteSpeed:80,doubleTap:350,skin:'',enterAction:'send'};
  let preferences={...defaults},favorites=[],recent=[],personalWords=[],learnedPairs={},redoSnapshot=null,capsLock=false,lastShiftTime=0;
  function restoreState(state){
    const data=state?.privateContent;if(!data||data.version!==2)return;
    const valid=new Set(v2data.emojiGroups.flatMap(g=>g.items.map(e=>e[0])));
    favorites=Array.isArray(data.favorites)?data.favorites.filter(e=>valid.has(e)).slice(0,60):[];
    recent=Array.isArray(data.recent)?[...new Set(data.recent.filter(e=>valid.has(e)))].slice(0,30):[];
    preferences.suggestions=data.suggestions!==false;
    preferences.height=[80,88,96,104,116].includes(data.height)?data.height:88;
    if(data.preferences)for(const key of Object.keys(defaults)){if(typeof data.preferences[key]===typeof defaults[key])preferences[key]=data.preferences[key];}
    preferences.height=[80,88,96,104,116].includes(preferences.height)?preferences.height:88;
    personalWords=Array.isArray(data.personalWords)?data.personalWords.filter(w=>typeof w==='string'&&/^[\p{L}\p{M}'-]{1,60}$/u.test(w)).slice(0,200):[];
    learnedPairs=data.learnedPairs&&typeof data.learnedPairs==='object'?data.learnedPairs:{};
  }
  try{
    const saved=AndroidKeyboard.loadPreferences();
    if(saved)restoreState(JSON.parse(saved));
    else {
      const legacy=localStorage.getItem('bangla-flick-v2-prefs');
      if(legacy){restoreState(JSON.parse(legacy));persistPreferences();}
    }
  }catch{}
  // Remove the previous version's plaintext copy, including when migration fails.
  try{localStorage.removeItem('bangla-flick-v2-prefs');}catch{}
  function persistPreferences(){
    const state={privateContent:{version:2,favorites,recent,suggestions:preferences.suggestions,height:preferences.height,preferences,personalWords,learnedPairs}};
    const bytes=()=>new TextEncoder().encode(JSON.stringify(state)).length;
    while(bytes()>15000&&Object.keys(learnedPairs).length)delete learnedPairs[Object.keys(learnedPairs)[0]];
    while(bytes()>15000&&personalWords.length)personalWords.pop();
    try{
      const json=JSON.stringify(state);
      if(window.BanglaNative&&typeof AndroidKeyboard.savePreferencesAsync==='function')AndroidKeyboard.savePreferencesAsync(json);
      else if(!AndroidKeyboard.savePreferences(json))status.textContent='Could not save encrypted settings';
    }catch{status.textContent='Could not save encrypted settings';}
  }
  const commonBn='আমি তুমি আমার তোমার আমাকে আমাদের আমরা ভালো ভাল আছি আছে আছেন আছো কেমন কি কী কেন কোথায় কোথায় কখন আজ আজকে কাল এখন পরে যাব যাবে যাবো করব করবো করছি করতে হবে হবে না হ্যাঁ ঠিক আছে ধন্যবাদ অনেক একটা একটু বাসায় বাসায় বাড়ি বাড়ি খাই খাব খাবে বাংলাদেশ বাংলা ইংরেজি ফোন কথা বলো বলছি দেখা হবে ভালোবাসি বন্ধু সময় সময় জন্য সঙ্গে সবাই টাকা কাজ পড়া পড়া স্কুল কলেজ বিশ্ববিদ্যালয় বিশ্ববিদ্যালয় সমস্যা নতুন পুরোনো তোমাকে আপনাকে আপনি তারা তাদের নেই চাই চাও পারি পারবে গিয়েছি গিয়েছি এসেছে সবাই আবার দুপুর রাতে সকালে বসে থাকব থাকবো'.split(/\s+/);
  const wordsBn=[...new Set([...commonBn,...v2data.bnWords])];
  function indexWords(words){const buckets=new Map();for(const word of words){const first=word[0].toLowerCase();if(!buckets.has(first))buckets.set(first,[]);buckets.get(first).push(word);}return buckets;}
  const wordIndexes={bn:indexWords(wordsBn),en:indexWords(v2data.enWords)};
  function findWords(prefix,limit,exclude='',both=false){
    const found=[],seen=new Set(),query=prefix.toLowerCase();
    const add=word=>{if(word!==exclude&&!seen.has(word)&&word.toLowerCase().startsWith(query)){seen.add(word);found.push(word);}};
    for(const word of personalWords){if(both||(language==='bn')===/\p{Script=Bengali}/u.test(word))add(word);if(found.length===limit)return found;}
    for(const lang of both?['bn','en']:[language])for(const word of wordIndexes[lang].get(query[0])??[]){add(word);if(found.length===limit)return found;}
    return found;
  }
  function wordRange(){
    const caret=output.selectionStart,text=output.value;
    const before=text.slice(0,caret).match(/[\p{L}\p{M}]+$/u)?.[0]??'';
    const after=text.slice(output.selectionEnd).match(/^[\p{L}\p{M}]+/u)?.[0]??'';
    return{prefix:before,start:caret-before.length,end:output.selectionEnd+after.length};
  }
  function updateSuggestions(){
    if(nativeSecure||nativeNumeric){const row=root.querySelector("#bn-suggestions");row.replaceChildren();for(let i=0;i<3;i++){const b=document.createElement("button");b.disabled=true;b.textContent="—";row.append(b);}return;}
    const target=root.querySelector('#bn-suggestions');if(!target)return;
    const {prefix,start,end}=wordRange();const normalized=prefix.normalize('NFC').toLowerCase();
    let choices=[];
    if(preferences.suggestions&&normalized){
      choices=findWords(normalized,3,prefix);
    }
    if(preferences.suggestions&&!normalized&&preferences.nextWords){
      const last=output.value.slice(0,start).trim().match(/[\p{L}\p{M}]+$/u)?.[0]?.toLowerCase();
      if(last){const scores={...(basePairs[language][last]??{})};for(const [word,count] of Object.entries(learnedPairs[language+':'+last]??{}))scores[word]=(scores[word]??0)+count*3;choices=Object.entries(scores).sort((a,b)=>b[1]-a[1]).map(e=>e[0]).slice(0,3);}
    }
    choices=[...new Set(choices)];
    const lastToken=normalized||output.value.slice(0,start).trim().match(/[\p{L}\p{M}]+$/u)?.[0]?.toLowerCase()||'';
    const emoji=matchingEmoji(lastToken);
    target.replaceChildren();
    for(let i=0;i<3;i++){
      if(i===2&&emoji){
        const b=document.createElement('button');b.type='button';b.textContent=emoji;b.className='bn-emoji-candidate';b.setAttribute('aria-label','Insert suggested emoji: '+(emojiNames.get(emoji)??emoji));
        tap(b,()=>{const chosen=defaultTone(emoji);insert(chosen);recent=[chosen,...recent.filter(e=>e!==chosen)].slice(0,30);persistPreferences();status.textContent='Emoji inserted';});target.append(b);continue;
      }
      const b=document.createElement('button');b.type='button';b.textContent=choices[i]??'—';b.disabled=!choices[i];
      b.setAttribute('aria-label',choices[i]?'Complete word: '+choices[i]:'No suggestion');
      tap(b,()=>{
        save();const trailing=output.value.slice(end);const word=choices[i]+(/^\s/u.test(trailing)?'':' ');
        replace(word,start,end);learnBoundary();status.textContent='Inserted: '+choices[i];
      });target.append(b);
    }
    if(activePanel==='dictionary')renderInlineDictionary();
  }
  function updateCycle(){
    const b=root.querySelector('#bn-cycle');if(!b)return;
    const valid=lastChoice&&language===lastChoice.language&&output.selectionStart===lastChoice.end&&output.selectionEnd===lastChoice.end&&output.value.slice(lastChoice.start,lastChoice.end)===lastChoice.text;
    b.disabled=!valid;
  }
  function insertChoice(letters,index,independent=false){
    const letter=letters[index];if(letter===undefined)return;
    const before=output.value,start=output.selectionStart,end=output.selectionEnd;
    insert(letter,independent);
    if(output.value===before)return;
    const stop=output.selectionStart,tail=before.slice(end);
    // Keep an exact before-edit snapshot, so changing a vowel can restore or replace its sign correctly.
    lastChoice={letters:letters.slice(),index,independent,before,start,end,selectionStart:start,selectionEnd:end,stop,tail,text:output.value.slice(start,stop),language};
    if(before.slice(0,start).endsWith('্')&&Object.hasOwn(signs,letter)&&!independent)lastChoice.start=start-1;
    lastChoice.end=stop;lastChoice.text=output.value.slice(lastChoice.start,stop);updateCycle();
  }
  function reverseCycle(){
    if(!lastChoice)return;const previous=lastChoice;
    let next=(previous.index-1+previous.letters.length)%previous.letters.length;
    const current=snapshot();
    output.value=previous.before;
    output.setSelectionRange(previous.selectionStart,previous.selectionEnd);
    const undoLength=history.length;
    insertChoice(previous.letters,next,previous.independent);
    history.splice(undoLength);history.push(current);
    status.textContent='↺ '+previous.letters[next];
  }
  function openPanel(name){if(nativeSecure&&name==='dictionary'){status.textContent='Dictionary is unavailable in a password field';return;}activePanel=activePanel===name?null:name;if(activePanel==='dictionary')symbolPage=0;favoriteMode=false;panel.scrollTop=0;render();scheduleEmojiViewport();status.textContent=activePanel==='emoji'?'Hold an emoji to pin it to Favorites':activePanel==='dictionary'?'Dictionary uses the word at the cursor':activePanel==='settings'?'Keyboard settings':'Tap or flick a letter';}
  function panelButton(label,action,aria=label){const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label',aria);b.addEventListener('click',action);return b;}
  function applyPanel(){
    root.querySelector('.bn-phone').style.setProperty('--bn-key-height',preferences.height+'px');
    const dictionary=activePanel==='dictionary'||activePanel==='feedback';
    root.querySelector('.bn-board').classList.toggle('bn-panel-open',!!activePanel&&!dictionary);
    panel.hidden=!activePanel||dictionary;
    panel.classList.toggle('bn-settings-panel',activePanel==='settings');settingsGroup=null;
    panel.classList.toggle('bn-reading-panel',['help','about','terms','privacy'].includes(activePanel));
    for(const [id,name] of [['#bn-emoji','emoji'],['#bn-dictionary','dictionary'],['#bn-settings','settings']])root.querySelector(id).setAttribute('aria-pressed',String(activePanel===name));
    root.querySelector('#bn-dictionary-drawer').hidden=!dictionary;
    if(dictionary){if(activePanel==='feedback')renderFeedback();else renderInlineDictionary();return;}
    if(emojiView){cancelAnimationFrame(emojiView.frame);emojiView=null;}
    if(!activePanel){panel.replaceChildren();return;}
    grid.hidden=true;symbols.hidden=true;panel.replaceChildren();
    if(activePanel==='emoji')renderEmoji();else if(activePanel==='settings')renderSettings();else renderInfoPage(activePanel);
  }
  function sectionTitle(title){const h=document.createElement('h3');h.textContent=title;panel.append(h);if(activePanel==='settings'){settingsGroup=document.createElement('section');settingsGroup.className='bn-settings-group';settingsGroup.setAttribute('aria-label',title);panel.append(settingsGroup);}}
  const emojiNames=new Map(v2data.emojiGroups.flatMap(g=>g.items));
  const emojiExact=new Map(),emojiTokens=new Map();
  for(const [emoji,name] of emojiNames){if(!emojiExact.has(name))emojiExact.set(name,emoji);for(const token of name.split(/[ -]/))if(!emojiTokens.has(token))emojiTokens.set(token,emoji);}
  const emojiKeywords={
    love:'❤️',heart:'❤️',ভালোবাসা:'❤️',ভালোবাসি:'❤️',ভালবাসা:'❤️',happy:'😊',smile:'😊',হাসি:'😊',খুশি:'😊',
    laugh:'😂',lol:'😂',হাহা:'😂',cry:'😭',crying:'😭',কান্না:'😭',sad:'😢',দুঃখ:'😢',angry:'😡',রাগ:'😡',
    cat:'🐱',বিড়াল:'🐱',বিড়াল:'🐱',dog:'🐶',কুকুর:'🐶',flower:'🌸',ফুল:'🌸',food:'🍽️',খাবার:'🍽️',
    coffee:'☕',কফি:'☕',tea:'🍵',চা:'🍵',birthday:'🎂',জন্মদিন:'🎂',thanks:'🙏',ধন্যবাদ:'🙏',fire:'🔥',আগুন:'🔥',
    yes:'👍',ঠিক:'👍',no:'👎',sleep:'😴',ঘুম:'😴',rain:'🌧️',বৃষ্টি:'🌧️',sun:'☀️',সূর্য:'☀️',পতাকা:'🇧🇩',bangladesh:'🇧🇩'
  };
  function matchingEmoji(query){
    if(!query||[...query].length<2)return null;
    if(Object.prototype.hasOwnProperty.call(emojiKeywords,query))return emojiKeywords[query];
    if(/[a-z]/.test(query)){
      if(emojiExact.has(query))return emojiExact.get(query);
      if(query.length>=3)return emojiTokens.get(query)??null;
    }
    return null;
  }
  function renderInlineDictionary(){if(nativeSecure){root.querySelector('#bn-dictionary-drawer').replaceChildren();return;}
    const drawer=root.querySelector('#bn-dictionary-drawer');if(!drawer)return;
    drawer.replaceChildren();
    const {start,end,prefix}=wordRange();
    const current=output.value.slice(start,end)||output.value.slice(0,start).trim().match(/[\p{L}\p{M}]+$/u)?.[0]||'';
    const header=document.createElement('div');header.className='bn-dictionary-heading';
    const text=document.createElement('span');text.textContent=current?'Dictionary · '+current:'Dictionary · type a word above';
    header.append(text,panelButton('×',()=>{activePanel=null;render();},'Close dictionary'));drawer.append(header);
    if(!current){const p=document.createElement('p');p.className='bn-settings-note';p.textContent='Keep typing with the keys below. Matching spellings will appear here.';drawer.append(p);return;}
    const matches=findWords(current,12,'',true);
    const results=document.createElement('div');results.className='bn-dictionary-candidates';
    for(const candidate of matches){
      const b=panelButton(candidate,()=>{
        const range=wordRange();let from=range.start,to=range.end;
        if(!range.prefix){const tail=output.value.slice(0,range.start).match(/([\p{L}\p{M}]+)\s*$/u);if(tail){from=range.start-tail[0].length;to=from+tail[1].length;}}
        save();replace(candidate,from,to);status.textContent='Chosen: '+candidate;
      },'Choose dictionary word: '+candidate);results.append(b);
    }
    drawer.append(results);
    if(!matches.length){const p=document.createElement('p');p.className='bn-settings-note';p.textContent='No matching spelling in this dictionary.';drawer.append(p);}
    drawer.append(panelButton(personalWords.includes(current)?'Remove personal word':'Save personal word',()=>{
      personalWords=personalWords.includes(current)?personalWords.filter(w=>w!==current):[current,...personalWords].slice(0,200);persistPreferences();updateSuggestions();
    }));
    const p=document.createElement('p');p.className='bn-settings-note';p.textContent='Spelling candidates and personal words; definitions are not included.';drawer.append(p);
  }
  function toggleFavorite(emoji){favorites=favorites.includes(emoji)?favorites.filter(e=>e!==emoji):[...favorites,emoji].slice(-60);persistPreferences();applyPanel();status.textContent=favorites.includes(emoji)?'Added to Favorites':'Removed from Favorites';}
  function emojiButton(emoji){
    const b=document.createElement('button');b.type='button';b.textContent=emoji;b.setAttribute('aria-label',(favoriteMode?'Pin or unpin ':'Insert emoji: ')+(emojiNames.get(emoji)??emoji));
    if(favoriteMode)b.setAttribute('aria-pressed',String(favorites.includes(emoji)));
    let timer=null,held=false,cancelled=false,x=0,y=0;
    const cancel=()=>{cancelled=true;clearTimeout(timer);};
    b.addEventListener('pointerdown',e=>{x=e.clientX;y=e.clientY;held=false;cancelled=false;timer=setTimeout(()=>{held=true;if(!cancelled)toggleFavorite(emoji);},550);});
    b.addEventListener('pointermove',e=>{if(Math.hypot(e.clientX-x,e.clientY-y)>10)cancel();});
    b.addEventListener('pointercancel',cancel);b.addEventListener('pointerup',()=>clearTimeout(timer));
    b.addEventListener('contextmenu',e=>e.preventDefault());
    b.addEventListener('click',()=>{
      clearTimeout(timer);if(cancelled||held)return;
      if(favoriteMode){toggleFavorite(emoji);return;}
      const selected=defaultTone(emoji);insert(selected);recent=[selected,...recent.filter(e=>e!==selected)].slice(0,30);persistPreferences();
      refreshEmojiHistory();
    });return b;
  }
  function emojiGrid(items,empty,historyKind=null){
    if(!items.length&&!historyKind)return;
    const note=document.createElement('p');note.className='bn-empty';note.textContent=empty??'';note.hidden=!!items.length;if(historyKind)panel.append(note);
    const block=document.createElement('div');block.className='bn-emoji-window';
    const layer=document.createElement('div');layer.className='bn-emoji-grid';block.append(layer);panel.append(block);
    emojiView.lists.push({block,layer,items,note,historyKind,columns:0,from:-1,to:-1});
  }
  function scheduleEmojiViewport(){if(!emojiView)return;cancelAnimationFrame(emojiView.frame);emojiView.frame=requestAnimationFrame(updateEmojiViewport);}
  function updateEmojiViewport(){
    if(!emojiView||activePanel!=='emoji')return;
    const columns=Math.max(1,Math.floor((panel.clientWidth-16+3)/45)),stride=47,top=panel.scrollTop,bottom=top+panel.clientHeight;
    for(const list of emojiView.lists){
      list.note.hidden=!!list.items.length;list.block.hidden=!list.items.length;
      const rows=Math.ceil(list.items.length/columns);list.block.style.height=Math.max(0,rows*stride-3)+'px';
      list.layer.style.gridTemplateColumns='repeat('+columns+',minmax(0,1fr))';
    }
    // Batch geometry reads before mounting buttons; avoid a layout for every category.
    const offsets=emojiView.lists.map(list=>list.block.offsetTop);
    for(let index=0;index<emojiView.lists.length;index++){
      const list=emojiView.lists[index],rows=Math.ceil(list.items.length/columns),offset=offsets[index];
      const from=Math.max(0,Math.min(rows,Math.floor((top-offset)/stride)-2)),to=Math.max(from,Math.min(rows,Math.ceil((bottom-offset)/stride)+2));
      if(list.from===from&&list.to===to&&list.columns===columns)continue;
      list.from=from;list.to=to;list.columns=columns;list.layer.style.top=from*stride+'px';
      const fragment=document.createDocumentFragment();for(let i=from*columns;i<Math.min(to*columns,list.items.length);i++)fragment.append(emojiButton(list.items[i]));list.layer.replaceChildren(fragment);
    }
  }
  function refreshEmojiHistory(){
    if(!emojiView)return;
    // Keep the category DOM and scroll position when inserting an emoji.
    for(const list of emojiView.lists)if(list.historyKind){list.items=list.historyKind==='favorites'?favorites:recent;list.from=-1;}
    scheduleEmojiViewport();
  }
  function renderEmoji(){
    emojiView={lists:[],frame:0};
    const actions=document.createElement('div');actions.className='bn-panel-actions';
    actions.append(panelButton(favoriteMode?'Done pinning':'★ Edit favorites',()=>{favoriteMode=!favoriteMode;const scroll=panel.scrollTop;applyPanel();panel.scrollTop=scroll;}));panel.append(actions);
    sectionTitle('Favorites');emojiGrid(favorites,'Hold an emoji below to pin it here.','favorites');
    sectionTitle('Recent');emojiGrid(recent,'Your recently used emoji will appear here.','recent');
    for(const group of v2data.emojiGroups){sectionTitle(group.name);emojiGrid(group.items.map(e=>e[0]));}
    scheduleEmojiViewport();
  }
  function renderSettings(){
    const header=document.createElement('div');header.className='bn-settings-header';const title=document.createElement('strong');title.textContent='Settings';header.append(title);panel.append(header);
    const help=panelButton('Help · How to use',()=>openInfoPage('help'),'Help: How to use the keyboard');help.className='bn-help-entry';panel.append(help);
    sectionTitle('Appearance');
    setting('Theme','theme',[['system','System'],['light','Light'],['dark','Dark']]);
    setting('Key height','height',[[80,'Small phone'],[88,'Compact'],[104,'Comfortable'],[116,'Large']]);
    setting('Letter size','letterScale',[[.9,'Small'],[1,'Standard'],[1.1,'Large']]);
    setting('Show flick labels','hints');
    sectionTitle('Touch & feedback');setting('Vibration, where supported','vibration');
    setting('System key sounds','sound');
    setting('Flick distance','flickDistance',[[14,'Short'],[18,'Standard'],[24,'Long']]);
    setting('Hold duration','holdDelay',[[400,'Short'],[500,'Standard'],[700,'Long']]);
    sectionTitle('Suggestions');setting('Word completion','suggestions');setting('Next-word suggestions','nextWords');
    setting('Learn word pairs on this device','learning');
    const note=document.createElement('p');note.className='bn-settings-note';note.textContent='Learning is optional. You can clear learned words at any time.';panel.append(note);
    panel.append(panelButton('Manage personal words',()=>{activePanel='dictionary';symbolPage=0;render();}));
    panel.append(panelButton('Clear learned word pairs',()=>{learnedPairs={};persistPreferences();updateSuggestions();status.textContent='Learned word pairs cleared';}));
    sectionTitle('Language & typing');
    setting('Starting language','startLanguage',[['bn','বাংলা'],['en','English']]);
    setting('Number row','digits',[['auto','Follow language'],['en','Always 123']]);setting('Swipe Space to switch language','spaceSwitch');
    setting('Tab inserts','tabMode',[['tab','Tab character'],['2','2 spaces'],['4','4 spaces']]);
    setting('Hold-Backspace speed','deleteSpeed',[[140,'Slow'],[80,'Standard'],[45,'Fast']]);
    setting('Double-tap Shift window','doubleTap',[[250,'Fast'],[350,'Standard'],[500,'Relaxed']]);

    const enterNote=document.createElement('p');enterNote.className='bn-settings-note';enterNote.textContent='Tap uses the current action. Hold Enter for a new line.';panel.append(enterNote);
    sectionTitle('Emoji');setting('Default skin tone','skin',[['','No default'],['🏻','Light'],['🏼','Medium-light'],['🏽','Medium'],['🏾','Medium-dark'],['🏿','Dark']]);
    panel.append(panelButton('Clear recent emoji',()=>{recent=[];persistPreferences();status.textContent='Recent emoji cleared';}));
    sectionTitle('Keyboard');panel.append(panelButton('Switch keyboard',()=>requestNativeAction('switchIme')),panelButton('Hide keyboard',()=>requestNativeAction('hide')));
    sectionTitle('About & Legal');
    for(const [page,title] of [['about','About Bangla Modern Flick Keyboard'],['feedback','Feedback / Report a bug'],['terms','Terms & Conditions'],['privacy','Privacy Policy']])panel.append(panelButton(title,()=>openInfoPage(page)));
    sectionTitle('Reset');panel.append(panelButton('Restore default settings',()=>{preferences={...defaults,enterAction:'send'};persistPreferences();render();status.textContent='Default settings restored';}));
  }
  function openInfoPage(name){if(nativeSecure&&name==='feedback'){status.textContent='Feedback is unavailable in a password field';return;}activePanel=name;if(name==='feedback')symbolPage=0;render();panel.scrollTop=0;status.textContent={help:'Keyboard help',about:'About Bangla Modern Flick Keyboard',terms:'Terms & Conditions',privacy:'Privacy Policy',feedback:'Describe the issue in the main message box'}[name];}
  function renderInfoPage(name){
    panel.classList.add('bn-reading-panel');
    panel.append(panelButton('‹ Settings',()=>{activePanel='settings';render();panel.scrollTop=0;},'Back to Settings'));
    const title=document.createElement('h2');title.textContent={help:'How to use',about:'Bangla Modern Flick Keyboard',terms:'Terms & Conditions',privacy:'Privacy Policy'}[name]??'Help';panel.append(title);
    const content={
      help:[
        ['Tap or flick','Tap a tile for its large middle letter. Slide left, up, right or down and release for the smaller letter in that direction. You can release over a sidebar button; the original tile keeps the gesture.'],
        ['Vowels and কার','Vowels attach automatically after consonants: ক + আ → কা. At a word’s beginning they appear as full vowels: আ + ম + ই → আমি. Hold a vowel tile briefly before releasing or flicking to force a separate vowel.'],
        ['যুক্তবর্ণ','Type the first consonant, tap যুক্ত, then type the next consonant. Example: ক → যুক্ত → ষ = ক্ষ; ন → যুক্ত → দ = ন্দ. A highlighted যুক্ত key means it is waiting for the next consonant.'],
        ['Quick punctuation','On the যুক্ত key, flick left for comma, up for দাঁড়ি ।, right for ?, or down for !. In English, tapping inserts an apostrophe and flicking up inserts a full stop.'],
        ['বাংলা ↔ English','Tap Space to insert a space. Swipe it left or right to switch language. The digits change too, unless you choose “Always 123” in Settings.'],
        ['চিহ্ন: two pages','Tap চিহ্ন once for everyday signs, again for extra signs, and a third time to return to letters. In Bangla, the first tile has ঋ in the middle, ঁ left, ঃ up, ৎ right and ং down.'],
        ['Emoji','Type a word such as love, cry or হাসি in the main message box. A matching emoji appears in the rightmost suggestion slot. Tap it to insert. The Emoji button opens Favorites, Recent and categories; scroll up or down. Hold an emoji to pin it, or use Edit favorites.'],
        ['Word suggestions and Dictionary','Tap a suggested word to complete it. Dictionary reads the word at your cursor and keeps the keys visible; choose a spelling or save a personal word. It lists words, not definitions.'],
        ['Cycle and Tab','↺ replaces your last tile choice with the previous character from that tile. It is disabled when there is no eligible character. ⇥ inserts a tab, or spaces if you selected that option in Settings.'],
        ['Shift and Caps Lock','In English, tap ⇧ for one capital letter. Double-tap it for Caps Lock ⇪. Tap again to return to lowercase.'],
        ['Undo, Redo and delete','Undo reverses your last edit. The button changes to Redo, which restores it. A new edit starts a new Undo cycle. Tap Backspace to delete; hold it to keep deleting.'],
        ['Enter and new lines','Tap Enter for Send, Search or Done. Hold it to add a new line. On Android, the current app decides what Enter does.'],
        ['Adjust the fit','Settings lets you change key height, letter size, flick distance, hold duration, theme and feedback. The Small phone size keeps the keyboard compact.'],
        ['Keep the sidebars','The left sidebar remains available while Emoji, Settings or Help is open. Tap Emoji or Settings to switch views. Tap the same mode button again to close it.']
      ],
      about:[
        ['A keyboard built around flicks','Bangla Modern Flick Keyboard uses nine main tiles to type Bangla and English. This Android test keyboard uses a local interface connected to the focused app.'],
        ['Suggestions','Word completion uses a subset of OpenBangla’s dictionary and an English FrequencyWords list. Next-word suggestions use a small phrase model and optional local learning.'],
        ['Emoji and source credits','Emoji characters come from Unicode Emoji 16.0 and use the device’s artwork. Monochrome icons use the preview’s Lucide icons. Source notices are included with the prototype.'],
        ['Build','Personal prototype · updated 13 November 2026. Android test build 0.1.3.']
      ],
      terms:[
        ['Personal prototype edition · 13 November 2026','These terms describe this personal testing version of Bangla Modern Flick Keyboard. They do not cover a future published release.'],
        ['Use and accuracy','Use the prototype to try the layout and input features. Review generated text and suggestions before using them elsewhere. Features and word coverage may change.'],
        ['Your text','You retain your rights in the text you type. The keyboard does not claim ownership of your messages, personal words or feedback.'],
        ['Included resources','Third-party dictionaries, word lists and emoji data retain their own attribution and license terms. Their notices are bundled with the prototype.'],
        ['Preview actions','Enter sends the editor action requested by the app you are typing into. Feedback is prepared for you to review and copy; it is not submitted to a support service.']
      ],
      privacy:[
        ['Personal prototype edition · 13 November 2026','This notice describes the offline Android test build. The app you type into has its own privacy practices.'],
        ['Typed messages','The keyboard handles editor text in memory and clears its working context when hidden or when the field changes. It does not explicitly save full drafts in its preference storage or send them to a keyboard developer server.'],
        ['Saved preferences','Settings, favorite emoji, recent emoji, personal words and enabled word-pair learning are saved through private app storage on this device, encrypted with AES-GCM using an Android Keystore key. They may remain until you clear them.'],
        ['Optional learning','Word-pair learning is off by default. If enabled, a limited set of recent word pairs is stored with your preferences. You can turn learning off and clear its history in Settings.'],
        ['Network and permissions','Typing, dictionary lookup and suggestions in this build use bundled data without network requests from the keyboard code. Optional key sounds and supported vibration are used only when enabled.'],
        ['Feedback','A feedback report includes only the message you choose to prepare, the prototype name and language. It stays in this session unless you copy or share it yourself.'],
        ['Clear saved keyboard data','Use the button below to remove saved personal words, learned pairs, emoji history and favorites, and reset settings. This does not remove messages already entered into another app.']
      ]
    };
    for(const [heading,body] of content[name]??content.help){const article=document.createElement('section');article.className='bn-help-card';const h=document.createElement('h3');h.textContent=heading;const p=document.createElement('p');p.textContent=body;article.append(h,p);panel.append(article);}
    if(name==='help')panel.append(panelButton('Try the keyboard',()=>{activePanel=null;symbolPage=0;render();status.textContent='Try ক → যুক্ত → ষ';}));
    if(name==='privacy')panel.append(panelButton('Clear saved keyboard data',()=>{favorites=[];recent=[];personalWords=[];learnedPairs={};preferences={...defaults};persistPreferences();render();status.textContent='Saved keyboard data cleared';}));
  }
  let feedbackReport='';
  function renderFeedback(){
    const drawer=root.querySelector('#bn-dictionary-drawer');drawer.replaceChildren();
    const header=document.createElement('div');header.className='bn-dictionary-heading';header.textContent='Feedback / Report a bug';header.append(panelButton('×',()=>{activePanel=null;render();},'Close feedback'));drawer.append(header);
    const info=document.createElement('p');info.className='bn-settings-note';info.textContent='Describe the issue in the main message box, using the keyboard below. Then prepare a report to review or copy. Nothing is submitted automatically.';drawer.append(info);
    drawer.append(panelButton('Prepare feedback report',()=>{
      if(!output.value.trim()){status.textContent='Describe the issue in the main message box first';return;}
      feedbackReport='Bangla Modern Flick Keyboard · personal prototype\nLanguage: '+language+'\n\n'+output.value;showReport();status.textContent='Feedback prepared — not sent';
    }));
    function showReport(){
      drawer.querySelector('.bn-feedback-report')?.remove();const report=document.createElement('div');report.className='bn-feedback-report';const text=document.createElement('textarea');text.readOnly=true;text.className='bn-search';text.value=feedbackReport;text.setAttribute('aria-label','Prepared feedback report');report.append(text);
      report.append(panelButton('Copy report',async()=>{try{await navigator.clipboard.writeText(feedbackReport);status.textContent='Feedback report copied';}catch{text.focus();text.select();status.textContent='Report selected — use your device’s Copy action';}}));drawer.append(report);
    }
    if(feedbackReport)showReport();
  }
  function setting(label,key,options){
    const wrap=document.createElement(options?'div':'label');wrap.className='bn-setting';const labelText=document.createElement('span');labelText.className='bn-setting-label';labelText.textContent=label;wrap.append(labelText);
    const control=document.createElement(options?'button':'input');control.setAttribute('aria-label',label);
    const changed=()=>{persistPreferences();applyAppearance();updateSuggestions();setEnterLabel();reportHeight();if(key==='digits')render();};
    if(options){
      control.type='button';control.className='bn-choice-control';control.textContent=options.find(([value])=>String(value)===String(preferences[key]))?.[1]??'';control.setAttribute('aria-expanded','false');
      const choices=document.createElement('div');choices.className='bn-choice-options';choices.hidden=true;choices.setAttribute('role','radiogroup');choices.setAttribute('aria-label',label+' options');
      control.addEventListener('click',()=>{choices.hidden=!choices.hidden;control.setAttribute('aria-expanded',String(!choices.hidden));});
      control.addEventListener('click',()=>{if(choices.childElementCount)return;for(const [value,text] of options){const option=panelButton(text,()=>{preferences[key]=value;control.textContent=text;choices.hidden=true;control.setAttribute('aria-expanded','false');for(const b of choices.children)b.setAttribute('aria-checked',String(b===option));changed();},label+': '+text);option.setAttribute('role','radio');option.setAttribute('aria-checked',String(String(preferences[key])===String(value)));choices.append(option);}});
      wrap.append(control,choices);
    }else{control.type='checkbox';control.setAttribute('role','switch');control.checked=!!preferences[key];control.onchange=()=>{preferences[key]=control.checked;changed();};const switchWrap=document.createElement('span');switchWrap.className='bn-switch';switchWrap.append(control);wrap.append(switchWrap);}
    (settingsGroup??panel).append(wrap);
  }
  function applyAppearance(){
    const phone=root.querySelector('.bn-phone'),dark=preferences.theme==='dark'||preferences.theme==='system'&&matchMedia('(prefers-color-scheme:dark)').matches;
    phone.style.colorScheme=dark?'dark':'light';
    // Explicit colors also work on OEM WebViews without CSS light-dark() support.
    const colors=dark?['#292929','#646464','#fafafa','#e0e0e0','#414141','#325b50']:['#e8e9ed','#fff','#17212a','#505c68','#d3d7dc','#c3e9de'];
    ['bg','key','text','sub','action','highlight'].forEach((name,index)=>phone.style.setProperty('--bn-'+name,colors[index]));
    phone.style.setProperty('--bn-key-height',preferences.height+'px');phone.style.setProperty('--bn-letter-scale',preferences.letterScale);
    phone.classList.toggle('bn-hide-hints',!preferences.hints);
  }
  function defaultTone(emoji){
    if(!preferences.skin||/[🏻🏼🏽🏾🏿]/u.test(emoji))return emoji;
    const plain=text=>text.replace(/[🏻🏼🏽🏾🏿\uFE0F]/gu,'');
    return [...emojiNames.keys()].find(item=>item.includes(preferences.skin)&&plain(item)===plain(emoji))??emoji;
  }
  function renderDictionary(){
    sectionTitle('Dictionary · personal words');
    const search=document.createElement('input');search.className='bn-search';search.setAttribute('aria-label','Find or add a word');search.placeholder='Find or add a word…';panel.append(search);
    const add=panelButton('Add personal word',()=>{
      const word=search.value.trim().normalize('NFC');if(!/^[\p{L}\p{M}'-]{1,60}$/u.test(word)){status.textContent='Enter a single word';return;}
      personalWords=[word,...personalWords.filter(w=>w!==word)].slice(0,200);persistPreferences();updateSuggestions();refresh();status.textContent='Personal word saved';
    });panel.append(add);const results=document.createElement('div');panel.append(results);
    function refresh(){
      results.replaceChildren();const query=search.value.trim().normalize('NFC').toLowerCase();
      const list=query?[...new Set([...personalWords,...wordsBn,...v2data.enWords])].filter(w=>w.toLowerCase().startsWith(query)).slice(0,30):personalWords;
      if(!list.length){results.textContent=query?'No matching words. You can add your own.':'Search word spellings or add personal words for suggestions.';return;}
      list.forEach(word=>{const row=document.createElement('div');row.className='bn-word-row';const b=panelButton(word,()=>insert(word+' '),'Insert word: '+word);b.className='bn-word-button';row.append(b);
        if(personalWords.includes(word))row.append(panelButton('×',()=>{personalWords=personalWords.filter(w=>w!==word);persistPreferences();updateSuggestions();refresh();},'Remove personal word: '+word));results.append(row);
      });
    }
    search.oninput=refresh;refresh();
    const note=document.createElement('p');note.className='bn-settings-note';note.textContent='Word spellings and your personal suggestion list. Definitions are not included.';panel.append(note);
  }
  function setUndoLabel(){const button=root.querySelector('#bn-undo');button.textContent=redoSnapshot?'Redo':'Undo';button.setAttribute('aria-label',redoSnapshot?'Redo last undone action':'Undo last action');}
  function undoOrRedo(){
    if(redoSnapshot){history.push(snapshot());const state=redoSnapshot;redoSnapshot=null;output.value=state.text;output.setSelectionRange(state.start,state.end);status.textContent='Redone';}
    else{const state=history.pop();if(!state)return;redoSnapshot=snapshot();output.value=state.text;output.setSelectionRange(state.start,state.end);status.textContent='Undone';}
    lastChoice=null;syncJoin();updateCycle();updateSuggestions();setUndoLabel();nativeSync();
  }
  function changeShift(){
    const now=performance.now();
    if(capsLock){capsLock=false;uppercase=false;lastShiftTime=0;}
    else if(now-lastShiftTime<=preferences.doubleTap&&lastShiftTime){capsLock=true;uppercase=true;lastShiftTime=0;}
    else{uppercase=!uppercase;lastShiftTime=now;}
    renderLetters();status.textContent=capsLock?'Caps Lock on':uppercase?'Next letter uppercase':'Lowercase';
  }
  function holdKey(button,tapAction,holdAction,repeat=false){
    let timer=null,interval=null,active=null,held=false;
    const clear=()=>{clearTimeout(timer);clearInterval(interval);};
    button.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;event.preventDefault();active=event.pointerId;held=false;button.setPointerCapture(active);
      timer=setTimeout(()=>{if(active===null)return;held=true;holdAction();if(repeat)interval=setInterval(holdAction,preferences.deleteSpeed);},preferences.holdDelay);
    });
    button.addEventListener('pointerup',event=>{if(active!==event.pointerId)return;clear();active=null;handledPhysical=true;if(!held)tapAction();});
    for(const event of ['pointercancel','lostpointercapture'])button.addEventListener(event,()=>{clear();active=null;});
    button.addEventListener('click',event=>{if(!event.pointerType&&!event.sourceCapabilities?.firesTouchEvents)tapAction();});
    button.addEventListener('contextmenu',event=>event.preventDefault());
  }
  const graphemes=new Intl.Segmenter('bn',{granularity:'grapheme'});
  function deleteOne(){if(!output.value.length&&nativeActive){requestNativeAction('delete');return;}let{start,end}=snapshot();if(start===end&&start>0){const last=[...graphemes.segment(output.value.slice(0,start))].at(-1);start=last.index;}if(start!==end){save();replace('',start,end);status.textContent='Deleted';}}
  function setEnterLabel(){const action=nativeAction,button=root.querySelector('#bn-enter');button.textContent={send:'↵',search:'⌕',done:'✓',next:'⇥',go:'↵',newline:'↵'}[action];button.setAttribute('aria-label',({send:'Send',search:'Search',done:'Done',next:'Next',go:'Go',newline:'New line'}[action])+'. Hold for new line.');}
  function enterAction(){if(!nativeActive)return;requestNativeAction('editor');return;
    const action=preferences.enterAction??'send';if(action==='newline'){insert('\n');return;}
    if(action==='done'){output.blur();status.textContent='Done';return;}
    const text=output.value;if(!text.trim())return;
    if(action==='send'){
      const p=document.createElement('p');p.className='bn-message';p.textContent=text;root.querySelector('#bn-messages').append(p);save();replace('',0,text.length);status.textContent='Sent to preview';
    }else status.textContent='Search requested: '+text;
    root.dispatchEvent(new CustomEvent('keyboardaction',{detail:{action,text},bubbles:true}));
  }
  const phraseSamples={
    bn:['আমি ভালো আছি','আমি এখন বাসায় যাব','আমি আজকে কাজ করব','আমি তোমাকে ভালোবাসি','আমি জানি না','তুমি কেমন আছো','তুমি কি করছো','তুমি কোথায় আছো','আমার নাম কি','আমার ভালো লাগে','তোমার সাথে কথা বলব','তোমার কি খবর','ভালো আছি তুমি','ঠিক আছে পরে কথা হবে','অনেক ধন্যবাদ তোমাকে','আজকে কি করব','আজকে দেখা হবে','কাল দেখা হবে','পরে কথা বলব','এখন কি করছো','কি খবর তোমার','আমি বাংলা লিখি','বাংলা ভাষায় কথা বলি','হ্যাঁ ঠিক আছে','না আমি জানি না','আমরা সবাই ভালো আছি','খুব ভালো হয়েছে','এই কাজ করতে হবে'],
    en:['i am fine','i am going home','i will see you tomorrow','i love you','i do not know','i think so','how are you','what are you doing','where are you','thank you very much','see you soon','see you tomorrow','have a good day','good morning everyone','good night friend','let me know','can you help me','that is fine','it is okay','we can do it','are you coming','you are welcome']
  };
  const basePairs={bn:{},en:{}};
  for(const [lang,phrases] of Object.entries(phraseSamples))for(const phrase of phrases){const words=phrase.toLowerCase().split(' ');for(let i=0;i<words.length-1;i++){const row=basePairs[lang][words[i]]??={};row[words[i+1]]=(row[words[i+1]]??0)+1;}}
  let lastLearnedText='';
  function learnBoundary(){if(nativeNoLearning)return;
    if(nativeNoLearning||!preferences.learning||! /\s$/.test(output.value.slice(0,output.selectionStart)))return;
    const before=output.value.slice(0,output.selectionStart);if(before===lastLearnedText)return;lastLearnedText=before;
    const match=before.trim().match(/([\p{L}\p{M}]+)\s+([\p{L}\p{M}]+)$/u);if(!match)return;
    const key=language+':'+match[1].toLowerCase();const row=learnedPairs[key]??={};const next=match[2].toLowerCase();row[next]=(Number(row[next])||0)+1;
    const keys=Object.keys(learnedPairs);if(keys.length>80)delete learnedPairs[keys[0]];
    for(const [key,row] of Object.entries(learnedPairs)){const entries=Object.entries(row).sort((a,b)=>b[1]-a[1]).slice(0,5);learnedPairs[key]=Object.fromEntries(entries);}
    persistPreferences();
  }
  async function writeClipboard(text){try{await navigator.clipboard.writeText(text);status.textContent='Copied';return true;}catch{status.textContent='Saved below. System clipboard is unavailable in this preview.';return false;}}
  function renderClipboard(){
    sectionTitle('Clipboard');const actions=document.createElement('div');actions.className='bn-panel-actions';
    actions.append(panelButton('Copy',async()=>{
      const text=output.value.slice(output.selectionStart,output.selectionEnd)||output.value;if(!text){status.textContent='Nothing to copy';return;}
      clips=[text,...clips.filter(c=>c!==text)].slice(0,8);applyPanel();await writeClipboard(text);
    }));
    actions.append(panelButton('Cut',async()=>{
      const {start,end}=snapshot();if(start===end){status.textContent='Select text in the message first';return;}
      const text=output.value.slice(start,end);clips=[text,...clips.filter(c=>c!==text)].slice(0,8);save();replace('',start,end);applyPanel();await writeClipboard(text);
    }));
    actions.append(panelButton('Paste',async()=>{try{const text=await navigator.clipboard.readText();if(text)insert(text);}catch{status.textContent='Paste into the box below, then tap Insert.';panel.querySelector('textarea')?.focus();}}));panel.append(actions);
    const label=document.createElement('label');label.className='bn-setting';label.textContent='Paste text here if your browser blocks clipboard access';const field=document.createElement('textarea');field.className='bn-manual-paste';field.inputMode='text';field.setAttribute('aria-label','Manual paste');label.append(field);panel.append(label);
    panel.append(panelButton('Insert pasted text',()=>{if(field.value)insert(field.value);}));
    sectionTitle('Copied in this session');
    if(!clips.length){const p=document.createElement('p');p.className='bn-empty';p.textContent='Copied text stays here until this preview closes.';panel.append(p);}
    clips.forEach(text=>{const button=panelButton(text.length>80?text.slice(0,80)+'…':text,()=>insert(text),'Paste saved clip: '+text.slice(0,60));button.className='bn-clip';panel.append(button);});
  }
  function setupExtras(){
    root.addEventListener('pointerdown',event=>{handledPhysical=false;const button=event.target.closest('button');if(button)activeGestureTargets.add(button);},true);
    for(const name of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(name,event=>{const button=event.target.closest('button');if(button)activeGestureTargets.delete(button);},true);
    panel.addEventListener('scroll',scheduleEmojiViewport,{passive:true});
    root.addEventListener('click',event=>{
      if(handledPhysical&&(event.pointerType||event.sourceCapabilities?.firesTouchEvents)){
        event.preventDefault();event.stopImmediatePropagation();handledPhysical=false;
      }
    },true);
    function playSystemClick(button){AndroidKeyboard.sound(button.id==='bn-delete'?'delete':button.classList.contains('bn-key')||button.closest('#bn-numbers')?'click':'modifier');}
    root.addEventListener('pointerup',event=>{
      if(!event.target.closest('button'))return;
      displayKeyReleases++;
      if(preferences.vibration)AndroidKeyboard.haptic();
      if(preferences.sound)playSystemClick(event.target.closest('button'));
    });
    tap(root.querySelector('#bn-emoji'),()=>openPanel('emoji'));
    tap(root.querySelector('#bn-dictionary'),()=>openPanel('dictionary'));
    tap(root.querySelector('#bn-tab'),()=>insert(preferences.tabMode==='tab'?'\t':' '.repeat(Number(preferences.tabMode))));
    tap(root.querySelector('#bn-settings'),()=>openPanel('settings'));
    tap(root.querySelector('#bn-cycle'),reverseCycle);
    tap(root.querySelector('#bn-undo'),undoOrRedo);
    holdKey(root.querySelector('#bn-enter'),enterAction,()=>insert('\n'));
    holdKey(root.querySelector('#bn-delete'),deleteOne,deleteOne,true);
    language=preferences.startLanguage;
    window.addEventListener('openai:set_globals',event=>{const state=event.detail?.globals?.widgetState;if(state){restoreState(state);render();}});
  }


  const history=[];
  const snapshot=()=>({text:output.value,start:output.selectionStart,end:output.selectionEnd});
  function save(){redoSnapshot=null;setUndoLabel();history.push(snapshot());if(history.length>100)history.shift();}
  function replace(text,start=output.selectionStart,end=output.selectionEnd){output.value=output.value.slice(0,start)+text+output.value.slice(end);output.setSelectionRange(start+text.length,start+text.length);nativeSync();syncJoin();learnBoundary();updateSuggestions();lastChoice=null;updateCycle();}
  function consonantEnd(text){return /(?:[ক-হড়ঢ়য়]|[ডঢয]়)$/.test(text);}
  function syncJoin(){
    const before=output.value.slice(0,output.selectionStart);
    const ready=language==='bn'&&output.selectionStart===output.selectionEnd&&before.endsWith('্')&&consonantEnd(before.slice(0,-1));
    join.setAttribute('aria-pressed',String(ready));
    join.setAttribute('aria-label',language==='bn'?(ready?'Ready to join: choose the next consonant':'Join consonants: type a consonant, tap this key, then type the next consonant')+'. Flick left for comma, up for dari, right for question mark, down for exclamation mark.':'Insert apostrophe. Flick left for comma, up for full stop, right for question mark, down for exclamation mark.');
  }
  function insert(letter,independent=false){if(!nativeActive)return;
    if(letter===undefined)return;
    let start=output.selectionStart,end=output.selectionEnd,before=output.value.slice(0,start),text=letter;
    if(Object.hasOwn(signs,letter)&&!independent){
      if(before.endsWith('্')&&consonantEnd(before.slice(0,-1))){start--;before=before.slice(0,-1);}
      if(consonantEnd(before))text=signs[letter];
    }
    if(letter==='্'){
      if(before.endsWith('্')&&consonantEnd(before.slice(0,-1))){status.textContent='যুক্ত প্রস্তুত — এবার পরের ব্যঞ্জনবর্ণ চাপুন';syncJoin();return;}
      if(!consonantEnd(before)){status.textContent='আগে একটি ব্যঞ্জনবর্ণ লিখুন — যেমন ক → যুক্ত → ত';return;}
    }
    save();replace(text,start,end);
    status.textContent=letter==='্'?'যুক্ত প্রস্তুত — এবার পরের ব্যঞ্জনবর্ণ চাপুন':letter===' '?'Space inserted':letter==='\n'?'New line':text?letter+' → '+text:'অ → inherent vowel';
    if(language==='en'&&uppercase&&!capsLock&&/^[A-Z]$/.test(letter)){uppercase=false;renderLetters();}
  }
  const flickGuide=document.createElement('div');flickGuide.className='bn-flick-guide';flickGuide.hidden=true;flickGuide.setAttribute('aria-hidden','true');root.querySelector('.bn-phone').append(flickGuide);
  let guideOwner=null,guideLetters=[],guideBounds=null,guideIndex=-1;
  function showFlickGuide(key,letters){
    guideBounds=key.getBoundingClientRect();guideOwner=key;guideLetters=letters;guideIndex=-1;flickGuide.replaceChildren(document.createElement('span'));updateFlickGuide(0);
  }
  function updateFlickGuide(index){
    if(!guideOwner||index===guideIndex)return;guideIndex=index;
    if(index===0||guideLetters[index]===undefined){flickGuide.hidden=true;return;}
    const box=guideBounds;let width=Math.max(54,Math.min(98,box.width*1.15)),height=Math.max(54,Math.min(78,box.height*1.12)),x=box.x+box.width/2-width/2,y=box.y+box.height/2-height/2;
    if(index===1){const tip=box.left+12;width=Math.min(width,tip-3);x=tip-width;}
    if(index===3){x=box.right-12;width=Math.min(width,innerWidth-x-3);}
    if(index===2){const tip=box.top+10;height=Math.min(height,tip-3);y=tip-height;}
    if(index===4){y=box.bottom-10;height=Math.min(height,innerHeight-y-3);}
    flickGuide.style.left=Math.max(3,Math.min(innerWidth-width-3,x))+'px';flickGuide.style.top=Math.max(3,Math.min(innerHeight-height-3,y))+'px';flickGuide.style.width=width+'px';flickGuide.style.height=height+'px';flickGuide.style.fontSize=Math.min(36,(width-16)*.75,(height-12)*.65)+'px';flickGuide.dataset.direction=positions[index];
    const choice=flickGuide.firstChild;choice.className='bn-flick-selected';choice.dataset.index=index;choice.textContent=guideLetters[index];flickGuide.hidden=false;
  }
  function hideFlickGuide(key){if(guideOwner===key){guideOwner=null;flickGuide.hidden=true;}}
  function direction(dx,dy){return Math.hypot(dx,dy)<preferences.flickDistance?0:Math.abs(dx)>Math.abs(dy)?(dx<0?1:3):(dy<0?2:4);}
  // One pointer gesture produces one action. Native click remains available to keyboards and assistive tools.
  function gesture(button,action,{preview,start,hold=false}={}){
    let active=null,timer=null,ignoreClick=false;
    const reset=()=>{clearTimeout(timer);active=null;hideFlickGuide(button);button.querySelectorAll('.bn-active').forEach(x=>x.classList.remove('bn-active'));};
    button.addEventListener('pointerdown',e=>{
      if(e.button!==0||active)return;
      e.preventDefault();ignoreClick=false;active={id:e.pointerId,x:e.clientX,y:e.clientY,start:performance.now()};button.setPointerCapture(e.pointerId);
      if(start)start();
      if(hold)timer=setTimeout(()=>{if(active)status.textContent='Separate vowel · release or swipe to choose';},preferences.holdDelay);
    });
    button.addEventListener('pointermove',e=>{if(active&&active.id===e.pointerId&&preview)preview(e.clientX-active.x,e.clientY-active.y,performance.now()-active.start);});
    button.addEventListener('pointerup',e=>{
      if(!active||active.id!==e.pointerId)return;
      const details={dx:e.clientX-active.x,dy:e.clientY-active.y,held:performance.now()-active.start>=preferences.holdDelay,shift:e.shiftKey};
      handledPhysical=true;ignoreClick=true;reset();action(details);
    });
    button.addEventListener('pointercancel',()=>{ignoreClick=true;reset();});button.addEventListener('lostpointercapture',reset);
    button.addEventListener('contextmenu',e=>e.preventDefault());
    button.addEventListener('keydown',()=>{ignoreClick=false;});
    button.addEventListener('click',e=>{
      // A physical gesture was already handled on release. Click-only activation is also valid.
      if(ignoreClick){ignoreClick=false;return;}
      action({dx:0,dy:0,held:false,shift:e.shiftKey});
    });
  }
  function tap(button,action){gesture(button,d=>{if(Math.hypot(d.dx,d.dy)<18)action(d);});}
  function tile(letters,isSymbol=false){
    const key=document.createElement('button');key.type='button';key.className='bn-key'+(isSymbol?' bn-symbol':'');
    if(!letters.length){key.disabled=true;key.setAttribute('aria-label','Empty tile');return key;}
    const vowel=letters.some(letter=>Object.hasOwn(signs,letter));
    key.setAttribute('aria-label',(isSymbol?'Insert '+letters[0]+'. ':'')+letters.map((x,i)=>positions[i]+': '+x).join(', ')+'. Arrow keys choose direction.'+(vowel?' Hold or Shift for a separate vowel.':''));
    letters.forEach((letter,i)=>{const span=document.createElement('span');span.className='bn-'+positions[i];span.lang=language;span.textContent=letter;key.append(span);});
    gesture(key,d=>insertChoice(letters,direction(d.dx,d.dy),vowel&&(d.held||d.shift)),{
      hold:vowel,
      start:()=>showFlickGuide(key,letters),
      preview:(dx,dy,elapsed)=>{const i=direction(dx,dy);updateFlickGuide(i);[...key.children].forEach((s,n)=>s.classList.toggle('bn-active',n===i));status.textContent=letters[i]===undefined?'No letter in this direction':letters[i]+(Object.hasOwn(signs,letters[i])&&elapsed>=preferences.holdDelay?' · separate vowel':'');}
    });
    key.addEventListener('keydown',e=>{
      const i={ArrowLeft:1,ArrowUp:2,ArrowRight:3,ArrowDown:4}[e.key];
      if(i){e.preventDefault();insertChoice(letters,i,vowel&&e.shiftKey);}
      else if(e.shiftKey&&(e.key==='Enter'||e.key===' ')){e.preventDefault();insertChoice(letters,0,vowel);}
    });
    return key;
  }
  let renderedLettersKey='',renderedSymbolKey='',renderedNumberKey='';
  function renderLetters(){
    const key=[language,uppercase,capsLock,nativeNumeric].join(':');if(renderedLettersKey===key)return;renderedLettersKey=key;
    if(nativeNumeric){grid.replaceChildren();for(const digit of "123456789")grid.append(tile([digit]));return;}
    grid.replaceChildren();
    const groups=language==='bn'?bnGroups:enGroups.map(a=>a.map(x=>uppercase?x.toUpperCase():x));
    groups.forEach(letters=>grid.append(tile(letters)));
    if(language==='en'){
      const shift=document.createElement('button');shift.type='button';shift.className='bn-key bn-shift';shift.textContent=capsLock?'⇪':'⇧';shift.setAttribute('aria-label','Shift: uppercase next letter');shift.setAttribute('aria-pressed',String(uppercase));
      tap(shift,changeShift);grid.append(shift);
    }
    grid.setAttribute('aria-label',language==='bn'?'Nine main letter tiles':'Nine English tiles');
  }
  function render(){
    renderLetters();
    const symbolKey=language+':'+symbolPage;if(renderedSymbolKey!==symbolKey){renderedSymbolKey=symbolKey;symbols.replaceChildren();if(symbolPage)symbolGroups(symbolPage).forEach(group=>symbols.append(tile(group,true)));}
    symbols.setAttribute('aria-label','Symbols page '+symbolPage);
    const numbers=root.querySelector('#bn-numbers');numbers.lang=language;numbers.setAttribute('aria-label',language==='bn'?'Bengali numbers':'English numbers');
    const numberKey=[language,nativeNumeric,preferences.digits].join(':');if(renderedNumberKey!==numberKey){renderedNumberKey=numberKey;numbers.replaceChildren();for(const digit of language==='bn'&&!nativeNumeric&&preferences.digits!=='en'?'১২৩৪৫৬৭৮৯০':'1234567890'){
      const button=document.createElement('button');button.type='button';button.textContent=digit;button.setAttribute('aria-label','Insert '+digit);tap(button,()=>insert(digit));numbers.append(button);
    }}
    grid.hidden=symbolPage!==0;symbols.hidden=symbolPage===0;applyPanel();
    more.setAttribute('aria-pressed',String(symbolPage!==0));more.setAttribute('aria-label',symbolPage===2?'Return to main keys':'Show symbols page '+(symbolPage+1));
    more.replaceChildren(document.createTextNode(language==='bn'?'চিহ্ন':'?#+'));
    if(symbolPage){const indicator=document.createElement('small');indicator.textContent=language==='bn'?(symbolPage===1?'১ / ২':'২ / ২'):symbolPage+' / 2';more.append(indicator);}
    root.querySelector('.bn-side').classList.toggle('bn-symbol-mode',symbolPage!==0||!!activePanel);
    root.querySelector('.bn-heading > span').textContent=symbolPage?(language==='bn'?'চিহ্ন '+(symbolPage===1?'১ / ২':'২ / ২'):'Symbols '+symbolPage+' / 2'):'9 tiles';
    space.replaceChildren();const label=document.createElement('span');label.textContent=language==='bn'?'স্পেস · বাংলা':'Space · English';const hint=document.createElement('small');hint.textContent=language==='bn'?'← English →':'← বাংলা →';space.append(label,hint);
    space.setAttribute('aria-label','Space. Swipe left or right, or press an arrow key, to switch language. Current language: '+(language==='bn'?'Bengali':'English'));
    root.querySelector('.bn-heading strong').textContent=(language==='bn'?'বাংলা':'English')+' · Flick';
    join.replaceChildren();join.setAttribute('aria-label',(language==='bn'?'Tap to insert hasanta and join consonants. Flick up for dari':'Tap to insert apostrophe. Flick up for full stop')+', left for comma, right for question mark, down for exclamation mark. Arrow keys also work.');
    [language==='bn'?'যুক্ত':"'",',',language==='bn'?'।':'.','?','!'].forEach((label,index)=>{const span=document.createElement('span');span.className='bn-'+positions[index];span.textContent=label;join.append(span);});
    root.querySelector('#bn-help').textContent=symbolPage?(language==='bn'?'চিহ্ন: ১ → ২ → অক্ষর. Tap the middle or flick toward a symbol.':'?#+: 1 → 2 → main keys. Tap the middle or flick toward a symbol.'):language==='bn'?'Tap = middle · Swipe = direction shown. Hold a vowel for its separate form. Swipe Space to switch language.':'Tap or flick the letter groups. ⇧ capitalizes the next letter. Swipe Space to switch language.';
    syncJoin();updateSuggestions();updateCycle();applyAppearance();setEnterLabel();setUndoLabel();
  }
  function switchLanguage(){language=language==='bn'?'en':'bn';uppercase=false;capsLock=false;lastChoice=null;render();status.textContent=language==='bn'?'বাংলা · ১২৩':'English · 123';}
  gesture(space,d=>{
    if(preferences.spaceSwitch&&Math.abs(d.dx)>=35&&Math.abs(d.dx)>Math.abs(d.dy)*1.3)switchLanguage();
    else if(Math.hypot(d.dx,d.dy)<18)insert(' ');
  },{preview:(dx,dy)=>{if(Math.abs(dx)>=35&&Math.abs(dx)>Math.abs(dy)*1.3)status.textContent=language==='bn'?'Release for English':'বাংলার জন্য ছেড়ে দিন';}});
  space.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();switchLanguage();}});
  tap(more,()=>{activePanel=null;lastChoice=null;symbolPage=(symbolPage+1)%3;render();status.textContent=symbolPage?'Symbols '+symbolPage+' / 2':'Main letter keys';});
  const quickSymbols=()=>[language==='bn'?'্':"'",',',language==='bn'?'।':'.','?','!'];
  gesture(join,d=>insert(quickSymbols()[direction(d.dx,d.dy)]),{preview:(dx,dy)=>{const char=quickSymbols()[direction(dx,dy)];status.textContent=char==='্'?'যুক্ত — পরের ব্যঞ্জনবর্ণের সঙ্গে জুড়ুন':char;}});
  join.addEventListener('keydown',e=>{const index={ArrowLeft:1,ArrowUp:2,ArrowRight:3,ArrowDown:4}[e.key];if(index){e.preventDefault();insert(quickSymbols()[index]);}});

  output.addEventListener('beforeinput',save);
  output.addEventListener('input',()=>{lastChoice=null;syncJoin();learnBoundary();updateCycle();updateSuggestions();});
  output.addEventListener('click',()=>{lastChoice=null;updateCycle();updateSuggestions();});
  output.addEventListener('select',()=>{updateSuggestions();updateCycle();});
  output.addEventListener('select',syncJoin);
  output.addEventListener('keyup',syncJoin);
  output.addEventListener('pointerup',syncJoin);
  function receiveHost(state){
    if(!state||typeof state.text!=='string')return;
    const newSession=!nativeMirror||nativeMirror.session!==state.session;
    if(nativePending&&!newSession&&state.active&&state.readable!==false&&state.secure===nativeMirror.secure&&state.kind===nativeMirror.kind){
      if(state.text===nativePending.text&&state.start===nativePending.start&&state.end===nativePending.end){acknowledgeEdit({...state,requestId:nativePending.requestId,requestSession:nativePending.session});return;}
      if(state.text===nativeMirror.text&&state.start===nativeMirror.start&&state.end===nativeMirror.end){nativeMirror={...nativeMirror,...state};return;}
    }
    if(nativePending){nativePending=null;nativeDeferredAction=null;}
    const previous=nativeMirror;
    const contentChanged=newSession||output.value!==state.text||output.selectionStart!==state.start||output.selectionEnd!==state.end;
    const layoutChanged=newSession||!previous||previous.kind!==state.kind||previous.secure!==state.secure||previous.maxHeight!==state.maxHeight||previous.simpleGraphics!==state.simpleGraphics;
    nativeMirror={...state};nativeActive=!!state.active&&state.readable!==false;nativeSecure=!!state.secure;nativeNoLearning=!!state.noLearning;nativeAction=state.action||'newline';nativeNumeric=state.kind==='number'||state.kind==='phone';
    root.querySelector('.bn-phone').classList.toggle('bn-simple-graphics',state.simpleGraphics===true);
    output.value=state.text;output.setSelectionRange(Math.min(state.start,state.text.length),Math.min(state.end,state.text.length));
    if(contentChanged){history.length=0;redoSnapshot=null;lastChoice=null;}
    if(newSession){
      nativePending=null;nativeDeferredAction=null;
      for(const button of activeGestureTargets)button.dispatchEvent(new PointerEvent('pointercancel',{bubbles:false}));activeGestureTargets.clear();
      capsLock=false;uppercase=false;
      symbolPage=0;activePanel=null;feedbackReport='';lastLearnedText='';panel.replaceChildren();root.querySelector('#bn-dictionary-drawer').replaceChildren();status.textContent='Tap or flick a letter';
    }
    if(state.maxHeight)root.querySelector('.bn-phone').style.setProperty('--host-max-height',state.maxHeight+'px');
    if(layoutChanged)render();else if(contentChanged){syncJoin();updateSuggestions();updateCycle();setUndoLabel();}
    setEnterLabel();if(layoutChanged)reportHeight();
  }
  function requestNativeAction(action){if(!nativeActive){AndroidKeyboard.action(action);return;}nativeDeferredAction=action;nativeSync();}
  function nativeSync(retries=0){
    if(!nativeMirror||!nativeActive||nativePending)return;
    const request={session:nativeMirror.session,revision:nativeMirror.revision,before:nativeMirror.text,text:output.value,start:output.selectionStart,end:output.selectionEnd,requestId:++nativeEditId,retries};
    if(request.text===nativeMirror.text&&request.start===nativeMirror.start&&request.end===nativeMirror.end){if(nativeDeferredAction){const action=nativeDeferredAction;nativeDeferredAction=null;AndroidKeyboard.action(action);}return;}
    try{
      if(typeof AndroidKeyboard.submitEdit==='function'){const raw=JSON.stringify(request);if(raw.length>65536){status.textContent='Editor context too large; reopen the keyboard';return;}nativePending=request;AndroidKeyboard.submitEdit(raw);return;}
      const response=JSON.parse(AndroidKeyboard.edit(JSON.stringify(request)));
      if(response.ok){nativeMirror={...nativeMirror,...response,text:request.text,start:request.start,end:request.end};nativeSync();}
      else receiveHost(response);
    }catch{nativePending=null;nativeDeferredAction=null;status.textContent='The app is not ready for keyboard input';}
  }
  function acknowledgeEdit(response){
    const pending=nativePending;if(!pending||response.requestId!==pending.requestId||response.requestSession!==pending.session)return;
    nativePending=null;
    if(response.ok&&response.session===pending.session){nativeMirror={...nativeMirror,...response,text:pending.text,start:pending.start,end:pending.end};nativeSync();return;}
    if(response.session===pending.session&&response.text===nativeMirror.text&&response.start===nativeMirror.start&&response.end===nativeMirror.end&&response.active&&response.readable!==false&&pending.retries<1){nativeMirror={...nativeMirror,...response};nativeSync(pending.retries+1);return;}
    nativeDeferredAction=null;receiveHost(response);
  }
  let heightFrame=0,lastReportedHeight=0;
  function reportHeight(){
    cancelAnimationFrame(heightFrame);heightFrame=requestAnimationFrame(()=>{const height=Math.ceil(root.getBoundingClientRect().height);if(height!==lastReportedHeight){lastReportedHeight=height;AndroidKeyboard.height(height);}});
  }
  new ResizeObserver(reportHeight).observe(root);
  function displayStatus(){
    const box=root.getBoundingClientRect(),style=getComputedStyle(root);
    const visibleButtons=[...root.querySelectorAll('button')].filter(button=>{const b=button.getBoundingClientRect(),s=getComputedStyle(button);return b.width>0&&b.height>0&&b.bottom>0&&b.top<innerHeight&&s.visibility==='visible'&&s.display!=='none'&&Number(s.opacity)>0;}).length;
    return {width:Math.round(box.width),height:Math.round(box.height),top:Math.round(box.top),left:Math.round(box.left),scrollX:scrollX,scrollY:scrollY,viewportHeight:innerHeight,visibleButtons,documentHidden:document.hidden,rootVisible:style.visibility==='visible'&&style.display!=='none'&&Number(style.opacity)>0,scriptErrors:displayScriptErrors,promiseErrors:displayPromiseErrors,viewportOffsetTop:visualViewport?.offsetTop??0,visualHeight:Math.round(visualViewport?.height??innerHeight),keyReleases:displayKeyReleases,activeGestures:activeGestureTargets.size,undoEntries:history.length,domNodes:root.querySelectorAll('*').length};
  }
  window.BanglaNative={receive:receiveHost,acknowledge:acknowledgeEdit,displayStatus,preferenceSaveFailed(){status.textContent='Could not save settings';if(activePanel==='settings'){let note=panel.querySelector('.bn-save-error');if(!note){note=document.createElement('p');note.className='bn-save-error';panel.prepend(note);}note.textContent='Could not save settings. Please try again.';}}};
  window.addEventListener('resize',()=>{reportHeight();scheduleEmojiViewport();});
  matchMedia('(prefers-color-scheme:dark)').addEventListener('change',applyAppearance);

  setupExtras();render();
})();



