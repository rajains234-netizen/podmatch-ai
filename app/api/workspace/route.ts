import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type WorkspaceRow = {
  organization_id: string;
  organization_name: string;
  user_role: string;
  organization_plan: string;
  monthly_packet_limit: number;
  packets_used_this_month: number;
};

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("ensure_user_workspace");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const workspace = Array.isArray(data)
    ? (data[0] as WorkspaceRow | undefined)
    : undefined;

  if (!workspace) {
    return NextResponse.json(
      { error: "Unable to create or load workspace." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    workspace: {
      id: workspace.organization_id,
      name: workspace.organization_name,
      plan: workspace.organization_plan,
      monthly_packet_limit: workspace.monthly_packet_limit,
      packets_used_this_month: workspace.packets_used_this_month,
      role: workspace.user_role,
    },
    organization: {
      id: workspace.organization_id,
      name: workspace.organization_name,
      plan: workspace.organization_plan,
      monthly_packet_limit: workspace.monthly_packet_limit,
      packets_used_this_month: workspace.packets_used_this_month,
      role: workspace.user_role,
    },
  });
}