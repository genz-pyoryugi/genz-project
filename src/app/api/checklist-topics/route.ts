import { supabase } from '@/lib/supabase';
import { topics } from '@/app/checklist/model';
export const dynamic='force-dynamic';
export async function GET(){
  try {
    const {data,error}=await supabase.from('categories').select('name').order('id');
    if(!error&&data?.length)return Response.json(data.map(row=>row.name),{headers:{'Cache-Control':'no-store'}});
    const contents=await supabase.from('contents').select('category').order('id');
    const names=[...new Set((contents.data||[]).map(row=>row.category).filter((name):name is string=>typeof name==='string'&&!!name.trim()))];
    return Response.json(names.length?names:topics,{headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json(topics,{headers:{'Cache-Control':'no-store'}});}
}
