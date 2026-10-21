async function mockPersonal(context,auth,state={rows:new Map(),failWrite:false,failRead:false}){
 await context.route('**/rest/v1/personal_checklists*',async route=>{
  const req=route.request(),url=new URL(req.url()),method=req.method();
  if(method==='GET'?state.failRead:state.failWrite)return route.fulfill({status:503,json:{code:'NETWORK'}});
  const matches=row=>row.user_id===auth.userId&&[...url.searchParams].every(([key,value])=>{
   if(['select','order','offset','limit'].includes(key))return true;
   if(value==='is.null')return row[key]===null;
   if(value.startsWith('eq.'))return String(row[key])===value.slice(3);
   return true;
  });
  let rows=[...state.rows.values()].filter(matches);
  if(method==='POST'){
   const row=req.postDataJSON();if(row.user_id!==auth.userId)return route.fulfill({status:403,json:{code:'42501'}});
   const saved={...row,pinned:false,position:null,revision:1,deleted_at:null,updated_at:new Date().toISOString()};
   state.rows.set(saved.id,saved);rows=[saved];
  }
  if(method==='PATCH')for(const row of rows)Object.assign(row,req.postDataJSON(),{revision:row.revision+1,updated_at:new Date().toISOString()});
  const single=(req.headers().accept||'').includes('vnd.pgrst.object');
  if(method==='GET')rows=rows.slice(Number(url.searchParams.get('offset')||0),Number(url.searchParams.get('offset')||0)+Number(url.searchParams.get('limit')||200));
  await route.fulfill({json:single?(rows[0]||null):rows});
 });
 return state;
}
module.exports={mockPersonal};
