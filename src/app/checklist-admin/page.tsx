import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { localHost } from '@/lib/checklist-server';
import ChecklistAdmin from './view';
export const dynamic = 'force-dynamic';
export default async function Page() {
  if (!localHost((await headers()).get('host'))) notFound();
  const token = process.env.CHECKLIST_ADMIN_TOKEN;
  if (!token) return <main style={{ padding: 32 }}>서버의 CHECKLIST_ADMIN_TOKEN 설정을 확인하고 다시 시작해 주세요.</main>;
  return <ChecklistAdmin token={token} />;
}
