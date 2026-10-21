const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require('../.tools/browser/node_modules/@electric-sql/pglite');
test('personal lists: real PostgreSQL owner isolation, validation, revision conflicts and persistence',async()=>{
 const db=new PGlite();
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
 const id='33333333-3333-4333-8333-333333333333',other='44444444-4444-4444-8444-444444444444';
 const items=JSON.stringify([{id:'55555555-5555-4555-8555-555555555555',text:'My task',checked:false}]);
 try{
  await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   grant usage on schema public,auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
   insert into auth.users values ('${a}'),('${b}');`);
  await db.exec(fs.readFileSync('supabase/migrations/202610200001_personal_checklists.sql','utf8'));
  const as=async(user,role='authenticated')=>db.exec(`reset role; set role ${role}; select set_config('request.jwt.claim.sub','${user}',false);`);
  const insert=(user,key)=>db.query('insert into public.personal_checklists(id,user_id,title,items) values ($1,$2,$3,$4)',[key,user,'My checklist',items]);
  await as(a);await insert(a,id);
  await as(b);await insert(b,other);
  assert.equal((await db.query('select * from public.personal_checklists')).rows.length,1);
  await assert.rejects(insert(a,'66666666-6666-4666-8666-666666666666'),/row-level security/i);
  for(const sql of ['select * from public.personal_checklists where user_id=$1','update public.personal_checklists set pinned=true where user_id=$1 returning *','delete from public.personal_checklists where user_id=$1 returning *'])assert.equal((await db.query(sql,[a])).rows.length,0);
  await assert.rejects(db.query('update public.personal_checklists set user_id=$1',[a]),/immutable|row-level security/i);
  await as(a);
  for(const bad of ['[]','{}','[{"id":"bad","text":"x","checked":false}]',JSON.stringify([{id:JSON.parse(items)[0].id,text:'',checked:false}]),JSON.stringify([{id:JSON.parse(items)[0].id,text:'x',checked:'yes'}]),JSON.stringify([...JSON.parse(items),...JSON.parse(items)])])await assert.rejects(db.query('update public.personal_checklists set items=$1',[bad]),/check constraint/i);
  for(const position of ['{}','{"x":2,"y":0}','{"x":0}'])await assert.rejects(db.query('update public.personal_checklists set position=$1',[position]),/check constraint/i);
  assert.equal((await db.query('update public.personal_checklists set pinned=true,position=$1 where revision=1 returning revision',['{"x":0.4,"y":0.2}'])).rows[0].revision,2);
  assert.equal((await db.query('update public.personal_checklists set title=$1 where revision=1 returning *',['stale'])).rows.length,0);
  let saved=(await db.query('select * from public.personal_checklists')).rows[0];assert.deepEqual(saved.position,{x:0.4,y:0.2});assert.equal(saved.pinned,true);
  await db.query('update public.personal_checklists set pinned=false');
  saved=(await db.query('select * from public.personal_checklists')).rows[0];assert.equal(saved.items[0].text,'My task');assert.deepEqual(saved.position,{x:0.4,y:0.2});
  await db.query('update public.personal_checklists set deleted_at=now()');assert.equal((await db.query('select * from public.personal_checklists where deleted_at is null')).rows.length,0);
  await as('','anon');for(const sql of ['select * from public.personal_checklists','update public.personal_checklists set pinned=false','delete from public.personal_checklists'])await assert.rejects(db.query(sql),/permission denied/i);
  await assert.rejects(insert(a,'77777777-7777-4777-8777-777777777777'),/permission denied/i);
  await as('');assert.equal((await db.query('select * from public.personal_checklists')).rows.length,0);
  await as(b);assert.equal((await db.query('select * from public.personal_checklists')).rows[0].id,other);
 }finally{await db.close();}
});
