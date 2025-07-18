import { redirect } from 'next/navigation';
import Dashboard from '@/components/dashboard';
import { getSession } from './actions';

export default async function Home() {
  const user = await getSession();

  if (!user) {
    return redirect('/login');
  }

  return <Dashboard user={user} />;
}
