import type { SupabaseClient } from '@supabase/supabase-js';

export type PersonalItem = { id: string; text: string; checked: boolean };
export type PersonalChecklist = {
  id: string; user_id: string; title: string; items: PersonalItem[];
  pinned: boolean; position: { x: number; y: number } | null;
  revision: number; updated_at: string; deleted_at: string | null;
};
export type PersonalPatch = Partial<Pick<PersonalChecklist, 'title' | 'items' | 'pinned' | 'position' | 'deleted_at'>>;
export const personalChanged = 'genz-personal-checklists-changed';
export function validatePersonal(title: string, items: PersonalItem[]) {
  if (!title.trim() || title.trim().length > 120) throw new Error('제목을 1~120자로 입력해 주세요.');
  if (!items.length || items.length > 100 || items.some(item => !item.text.trim() || item.text.trim().length > 500))
    throw new Error('항목을 1~100개 입력해 주세요. 각 항목은 1~500자까지 쓸 수 있어요.');
  if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('항목 ID가 중복됐어요.');
}
export function personalError(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === 'PGRST205' || code === '42P01') return '개인 체크리스트 저장소 설정이 필요해요. 관리자에게 personal_checklists 마이그레이션 적용을 요청해 주세요.';
  if (error instanceof Error && !code) return error.message;
  return '개인 체크리스트를 저장하거나 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요.';
}
export function personalStore(client: SupabaseClient, userId: string) {
  const table = () => client.from('personal_checklists');
  async function owner() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (data.session?.user.id !== userId) throw new Error('사용자 연결이 변경됐어요. 다시 연결해 주세요.');
  }
  async function list(): Promise<PersonalChecklist[]> {
    await owner();
    const result: PersonalChecklist[] = [];
    for (let start = 0; ; start += 200) {
      const { data, error } = await table().select('*').eq('user_id', userId).is('deleted_at', null)
        .order('updated_at', { ascending: false }).order('id').range(start, start + 199);
      if (error) throw error;
      await owner(); result.push(...(data || []));
      if (!data || data.length < 200) return result;
    }
  }
  async function create(title: string, items: PersonalItem[]): Promise<PersonalChecklist> {
    validatePersonal(title, items); await owner();
    const { data, error } = await table().insert({ id: crypto.randomUUID(), user_id: userId, title: title.trim(),
      items: items.map(item => ({ ...item, text: item.text.trim() })) }).select('*').single();
    if (error) throw error;
    await owner(); return data;
  }
  async function update(entry: PersonalChecklist, patch: PersonalPatch): Promise<PersonalChecklist> {
    validatePersonal(patch.title ?? entry.title, patch.items ?? entry.items); await owner();
    const { data, error } = await table().update(patch).eq('user_id', userId).eq('id', entry.id)
      .eq('revision', entry.revision).is('deleted_at', null).select('*').maybeSingle();
    if (error) throw error;
    await owner();
    if (!data) throw new Error('다른 화면에서 변경되었거나 삭제된 목록이에요. 다시 불러오기를 누르고 편집을 취소한 뒤 최신 내용을 확인해 주세요.');
    return data;
  }
  return { list, create, update };
}
