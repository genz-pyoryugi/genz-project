// Actual PostgreSQL (WASM) evaluation of the migration, not a mocked policy evaluator.
// npm install --prefix .tools/browser --no-save @electric-sql/pglite
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createHash}=require('node:crypto');
const {PGlite}=require('../.tools/browser/node_modules/@electric-sql/pglite');

test('migration enforces owner isolation for anonymous authenticated users and denies unauthenticated access',async()=>{
 const db=new PGlite();
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
 try{
  await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   grant usage on schema public,auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
   insert into auth.users values ('${a}'),('${b}');`);
  await db.exec(fs.readFileSync('supabase/migrations/202610150001_checklist_completions.sql','utf8'));
  const as=async(id,role='authenticated')=>{await db.exec(`reset role; set role ${role}; select set_config('request.jwt.claim.sub','${id}',false);`);};
  const insert=async(id,key)=>db.query(`insert into public.checklist_completions(user_id,record_key,completion_id,category,completed_at,groups) values ($1,$2,$3,'Category',now(),'[{"id":"g"}]')`,[id,createHash('sha256').update(key).digest('hex'),key]);
  await as(a);await insert(a,'a');
  await as(b);await insert(b,'b');
  assert.equal((await db.query('select * from public.checklist_completions')).rows.length,1);
  await assert.rejects(insert(a,'forged-owner'),/row-level security/i);
  assert.equal((await db.query('update public.checklist_completions set deleted_at=now() where user_id=$1 returning *',[a])).rows.length,0);
  assert.equal((await db.query('delete from public.checklist_completions where user_id=$1 returning *',[a])).rows.length,0);
  await assert.rejects(db.query('update public.checklist_completions set user_id=$1',[a]),/row-level security/i);
  await as(a);
  await assert.rejects(insert(a,'a'),/duplicate key/i);
  assert.equal((await db.query('update public.checklist_completions set deleted_at=now() returning *')).rows.length,1);
  assert.equal((await db.query('select * from public.checklist_completions where deleted_at is null')).rows.length,0);
  assert.equal((await db.query('update public.checklist_completions set deleted_at=null returning *')).rows.length,1);
  await as('','anon');
  for(const sql of ['select * from public.checklist_completions','delete from public.checklist_completions','update public.checklist_completions set deleted_at=now()'])await assert.rejects(db.query(sql),/permission denied/i);
  await assert.rejects(insert(a,'unauthenticated'),/permission denied/i);
  await as('');assert.equal((await db.query('select * from public.checklist_completions')).rows.length,0);
  await assert.rejects(insert(a,'no-jwt-sub'),/row-level security/i);
  await as(a);assert.equal((await db.query('delete from public.checklist_completions returning *')).rows.length,1);
  await as(b);assert.equal((await db.query('select * from public.checklist_completions')).rows.length,1);
 }finally{await db.close();}
});
