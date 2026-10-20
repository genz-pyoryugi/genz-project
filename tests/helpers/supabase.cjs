// Deterministic network fixture. These tests do not create production anonymous users.
const {randomUUID}=require('node:crypto');
async function mockSupabase(context,initial=[]) {
 const state={userId:randomUUID(),rows:new Map(),failWrite:false,failRead:false,delayWrite:0,signups:0,writes:0,failWriteAt:0};
 const {createHash}=require('node:crypto');
 for(const entry of initial){const key=createHash('sha256').update(entry.id).digest('hex');state.rows.set(key,{user_id:state.userId,record_key:key,completion_id:entry.id,category:entry.category,completed_at:entry.completedAt,groups:entry.groups,deleted_at:null});}
 const user=()=>({id:state.userId,aud:'authenticated',role:'authenticated',is_anonymous:true,app_metadata:{provider:'anonymous',providers:[]},user_metadata:{},created_at:new Date().toISOString()});
 const session=()=>({access_token:[{alg:'HS256',typ:'JWT'},{sub:state.userId,role:'authenticated',is_anonymous:true,exp:Math.floor(Date.now()/1000)+3600},'fixture'].map((part,index)=>index===2?part:Buffer.from(JSON.stringify(part)).toString('base64url')).join('.'),token_type:'bearer',expires_in:3600,refresh_token:'test-refresh-token',user:user()});
 state.session=session;
 await context.route('**/auth/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/signup'))state.signups++;
  await route.fulfill({json:path.endsWith('/user')?user():session()});
 });
 await context.route('**/rest/v1/checklist_completions*',async route=>{
  const req=route.request(),url=new URL(req.url()),method=req.method();
  if(method!=='GET')state.writes++;
  const fail=method==='GET'?state.failRead:state.failWrite||state.writes===state.failWriteAt;
  if(method!=='GET'&&state.delayWrite)await new Promise(resolve=>setTimeout(resolve,state.delayWrite));
  if(fail)return route.fulfill({status:503,json:{code:'NETWORK',message:'fixture failure'}});
  if(url.searchParams.get('user_id')&&url.searchParams.get('user_id')!==`eq.${state.userId}`)return route.fulfill({json:[]});
  const matches=row=>row.user_id===state.userId&&[...url.searchParams].every(([key,value])=>{
   if(['select','order','offset','limit','on_conflict'].includes(key))return true;
   if(value==='is.null')return row[key]===null;
   if(value.startsWith('eq.'))return row[key]===value.slice(3);
   if(value.startsWith('in.('))return value.slice(4,-1).split(',').includes(row[key]);
   return true;
  });
  let rows=[...state.rows.values()].filter(matches);
  if(method==='POST'){
   const payload=req.postDataJSON();
   for(const row of Array.isArray(payload)?payload:[payload]){
    if(row.user_id!==state.userId)return route.fulfill({status:403,json:{code:'42501',message:'RLS denied'}});
    if(!state.rows.has(row.record_key))state.rows.set(row.record_key,structuredClone(row));
   }
   return route.fulfill({status:201,json:[]});
  }
  if(method==='PATCH'){const payload=req.postDataJSON();for(const row of rows)Object.assign(row,payload);}
  rows.sort((a,b)=>Date.parse(b.completed_at)-Date.parse(a.completed_at));
  const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||rows.length);
  rows=rows.slice(offset,offset+limit);
  const single=(req.headers().accept||'').includes('vnd.pgrst.object');
  if(single&&!rows.length)return route.fulfill({status:406,json:{code:'PGRST116',message:'No rows'}});
  await route.fulfill({json:single?rows[0]:rows});
 });
 // Keep all browser tests independent of production tables and outbound network access.
 await require('./personal-supabase.cjs').mockPersonal(context,state);
 const fs=require('node:fs'),ts=require('typescript'),material={exports:{}};
 new Function('exports',ts.transpileModule(fs.readFileSync('src/lib/pdf-checklists.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(material.exports);
 const rows=material.exports.materialChecklists.map(list=>({id:`pdf:${list.id}`,category:list.category,title:list.title,
  ...Object.fromEntries(list.items.map((text,index)=>[`item${index+1}`,text])),source_url:'https://example.test/source.pdf',source_title:'PDF source',source_pages:list.pages,source_evidence:list.evidence}));
 await context.route('**/api/checklists',route=>route.fulfill({json:rows}));
 await context.route('**/api/checklist-topics',route=>route.fulfill({json:[...new Set(rows.map(row=>row.category))]}));
 return state;
}
module.exports={mockSupabase};
