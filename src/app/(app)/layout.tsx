import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";

// Uses cookies() → always rendered per-request. Explicit for clarity.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col overflow-hidden">
      <main className="min-h-0 flex-1">{children}</main>
      <BottomNav />
    </div>
  );
}
