import { getRedis } from "../../_lib/redis.js";
import { joinRoom, viewRoom } from "../../_lib/roomStore.js";
import { withHandler } from "../../_lib/http.js";

export default withHandler(["POST"], async (req, res) => {
  const { code } = req.query;
  const name = String(req.body?.name || "").trim().slice(0, 20);
  if (!name) {
    res.status(400).json({ ok: false, error: "Enter a name" });
    return;
  }

  const redis = getRedis();
  const result = await joinRoom(redis, String(code).toUpperCase(), name);
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }
  res.status(200).json({
    ok: true,
    playerId: result.playerId,
    ...viewRoom(result.room, Date.now(), { playerId: result.playerId })
  });
});
