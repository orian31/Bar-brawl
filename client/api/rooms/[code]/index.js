import { getRedis } from "../../_lib/redis.js";
import { getRoomState, viewRoom } from "../../_lib/roomStore.js";
import { withHandler } from "../../_lib/http.js";

export default withHandler(["GET"], async (req, res) => {
  const { code } = req.query;
  const playerId = typeof req.query.playerId === "string" ? req.query.playerId : undefined;
  const redis = getRedis();

  const state = await getRoomState(redis, String(code).toUpperCase());
  if (!state) {
    res.status(404).json({ ok: false, error: "Room not found" });
    return;
  }
  res.status(200).json({ ok: true, ...viewRoom(state.room, state.now, { playerId }) });
});
