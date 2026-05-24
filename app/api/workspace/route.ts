import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { data: existingWorkspace, error: existingWorkspaceError } = await supabase
    .from("workspaces")
    .select("id, name, owner_id, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingWorkspaceError) {
    return NextResponse.json(
      { error: existingWorkspaceError.message },
      { status: 500 }
    );
  }

  if (existingWorkspace) {
    return NextResponse.json({
      workspace: existingWorkspace,
      created: false,
    });
  }

  const workspaceName =
    user.email?.split("@")[0]
      ? `${user.email.split("@")[0]}'s Workspace`
      : "My Workspace";

  const { data: newWorkspace, error: newWorkspaceError } = await supabase
    .from("workspaces")
    .insert({
      owner_id: user.id,
      name: workspaceName,
    })
    .select("id, name, owner_id, created_at")
    .single();

  if (newWorkspaceError) {
    return NextResponse.json(
      { error: newWorkspaceError.message },
      { status: 500 }
    );
  }

  await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
  });

  return NextResponse.json({
    workspace: newWorkspace,
    created: true,
  });
}