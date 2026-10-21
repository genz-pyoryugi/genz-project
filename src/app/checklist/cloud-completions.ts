import type { SupabaseClient } from '@supabase/supabase-js';
import { parseCompletions, type CompletedMission } from './completions';

const table = 'checklist_completions';
const columns = 'completion_id,category,completed_at,groups';

export function completionError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === 'PGRST205' || code === '42P01') return '완료 기록 저장소 설정이 아직 끝나지 않았어요. 관리자에게 테이블 설정을 요청해 주세요.';
  if (code === 'anonymous_provider_disabled') return '익명 로그인이 꺼져 있어요. 관리자에게 로그인 설정을 요청해 주세요.';
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') return '연결 요청이 많아요. 잠시 후 다시 시도해 주세요.';
  return '서버에 기록을 반영하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.';
}

export async function recordKey(id: string): Promise<string> {
  // Legacy IDs contain entire snapshots; a fixed-size key avoids Postgres index limits.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function cloudCompletions(client: SupabaseClient, userId: string) {
  async function assertOwner() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (data.session?.user.id !== userId) throw new Error('Session changed');
  }
  async function list(): Promise<CompletedMission[]> {
    await assertOwner();
    const result: CompletedMission[] = [];
    // Explicit pagination avoids silently dropping records beyond the API row limit.
    for (let start = 0; ; start += 200) {
      const { data, error } = await client.from(table).select(columns).eq('user_id', userId).is('deleted_at', null)
        .order('completed_at', { ascending: false }).order('record_key').range(start, start + 199);
      if (error) throw error;
      await assertOwner();
      result.push(...parseCompletions((data || []).map(row => ({ id: row.completion_id, category: row.category, completedAt: row.completed_at, groups: row.groups }))));
      if (!data || data.length < 200) return result;
    }
  }
  async function row(entry: CompletedMission) {
    parseCompletions([entry]);
    return { user_id: userId, record_key: await recordKey(entry.id), completion_id: entry.id,
      category: entry.category, completed_at: entry.completedAt, groups: entry.groups, deleted_at: null };
  }
  async function save(entry: CompletedMission) {
    await assertOwner();
    const payload = await row(entry);
    const inserted = await client.from(table).upsert(payload, { onConflict: 'user_id,record_key', ignoreDuplicates: true });
    if (inserted.error) throw inserted.error;
    await assertOwner();
    // Explicit saves restore deleted records; retries preserve the original completion time and snapshot.
    const { data, error } = await client.from(table).update({ deleted_at: null }).eq('user_id', userId)
      .eq('record_key', payload.record_key).select(columns).single();
    if (error) throw error;
    await assertOwner();
    if (!data || data.completion_id !== entry.id) throw new Error('Save not confirmed');
    return parseCompletions([{ id: data.completion_id, category: data.category, completedAt: data.completed_at, groups: data.groups }])[0];
  }
  async function setDeleted(entries: CompletedMission[], deleted: boolean) {
    for (const entry of entries) {
      await assertOwner();
      const { data, error } = await client.from(table).update({ deleted_at: deleted ? new Date().toISOString() : null })
        .eq('user_id', userId).eq('record_key', await recordKey(entry.id)).select('completion_id').single();
      if (error) throw error;
      await assertOwner();
      if (!data || data.completion_id !== entry.id) throw new Error('Change not confirmed');
    }
  }
  async function migrate(entries: CompletedMission[]) {
    // Original localStorage is never modified. Each batch is safe to retry after a network failure.
    const unique = [...new Map(parseCompletions(entries).map(entry => [entry.id, entry])).values()];
    for (let offset = 0; offset < unique.length; offset += 50) {
      await assertOwner();
      const batch = await Promise.all(unique.slice(offset, offset + 50).map(row));
      const { error } = await client.from(table).upsert(batch, { onConflict: 'user_id,record_key', ignoreDuplicates: true });
      if (error) throw error;
      // Check every key, including deletion tombstones: re-import must not resurrect deleted records.
      const verified = await client.from(table).select('record_key').eq('user_id', userId).in('record_key', batch.map(entry => entry.record_key));
      if (verified.error) throw verified.error;
      await assertOwner();
      if (verified.data?.length !== batch.length) throw new Error('Migration not confirmed');
    }
  }
  return { list, save, setDeleted, migrate };
}
