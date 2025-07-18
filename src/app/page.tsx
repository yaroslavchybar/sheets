import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard";

export default async function Home() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  return <Dashboard user={user} />;
}
