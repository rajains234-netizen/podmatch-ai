import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Organization = {
  id: string;
  name: string;
  plan: string;
  monthly_packet_limit: number;
  packets_used_this_month: number;
};

type Membership = {
  organization_id: string;
  role: string;
  organizations: Organization | Organization[] | null;
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

  const { data: memberships, error: membershipError } = await supabase
    .from("organization_members")
    .select(
      "organization_id, role, organizations(id, name, plan, monthly_packet_limit, packets_used_this_month)"
    )
    .eq("user_id", user.id)
    .limit(1);

  if (membershipError) {
    return NextResponse.json(
      { error: membershipError.message },
      { status: 500 }
    );
  }

  const membership = memberships?.[0] as Membership | undefined;

  if (!membership) {
    return NextResponse.json(
      { error: "No workspace found for this user." },
      { status: 404 }
    );
  }

  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;

  if (!organization) {
    return NextResponse.json(
      { error: "Organization not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    workspace: {
      id: organization.id,
      name: organization.name,
      plan: organization.plan,
      monthly_packet_limit: organization.monthly_packet_limit,
      packets_used_this_month: organization.packets_used_this_month,
      role: membership.role,
    },
    organization: {
      id: organization.id,
      name: organization.name,
      plan: organization.plan,
      monthly_packet_limit: organization.monthly_packet_limit,
      packets_used_this_month: organization.packets_used_this_month,
      role: membership.role,
    },
  });
}