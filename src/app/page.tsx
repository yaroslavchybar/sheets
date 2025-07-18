import { redirect } from 'next/navigation';
import Dashboard from '@/components/dashboard';
import { currentUser } from '@clerk/nextjs/server';

export default async function Home() {
  const user = await currentUser();

  if (!user) {
    // This will be caught by the Clerk middleware, but it's good practice
    // to have a server-side check as well.
    return redirect('/sign-in');
  }

  return <Dashboard />;
}
