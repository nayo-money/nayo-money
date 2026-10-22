import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NumberPageEditor from "./NumberPageEditor";

export default async function AdminLifeNumberPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const n = Number(number);
  if (!Number.isInteger(n) || n < 1 || n > 9) redirect("/admin");

  const supabase = await createClient();
  if (!supabase) redirect("/admin");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) redirect("/admin");

  return <NumberPageEditor number={n} />;
}
