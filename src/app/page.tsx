import { getSession } from '@/app/actions';
import { redirect } from 'next/navigation';
import Dashboard from '@/components/dashboard';

export default async function Home() {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  return <Dashboard user={user} />;
}