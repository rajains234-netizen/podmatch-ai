import { task } from "@trigger.dev/sdk/v3";

export const processPacketTask = task({
  id: "process-packet",
  run: async (payload: { packetId: string; organizationId: string }) => {
    return {
      ok: true,
      packetId: payload.packetId,
      organizationId: payload.organizationId,
      message: "Packet processing job placeholder completed.",
    };
  },
});