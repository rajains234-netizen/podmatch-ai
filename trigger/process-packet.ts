import { task, wait } from "@trigger.dev/sdk/v3";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const processPacketTask = task({
  id: "process-packet",
  run: async (payload: { packetId: string; organizationId: string }) => {
    const supabase = createSupabaseAdminClient();

    await supabase
      .from("shipment_packets")
      .update({
        processing_status: "processing",
        processing_error: null,
        processing_started_at: new Date().toISOString(),
      })
      .eq("id", payload.packetId)
      .eq("organization_id", payload.organizationId);

    await wait.for({ seconds: 2 });

    await supabase
      .from("shipment_packets")
      .update({
        processing_status: "completed",
        processing_completed_at: new Date().toISOString(),
        ai_model_name: "trigger-placeholder",
      })
      .eq("id", payload.packetId)
      .eq("organization_id", payload.organizationId);

    return {
      ok: true,
      packetId: payload.packetId,
      organizationId: payload.organizationId,
      message: "Packet processing status updated by Trigger.dev placeholder.",
    };
  },
});