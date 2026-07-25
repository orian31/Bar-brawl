import { getRedis } from "../../_lib/redis.js";
import { submitAnswer, viewRoom } from "../../_lib/roomStore.js";
import { withHandler } from "../../_lib/http.js";

export default withHandler(["POST"], async (req, res) => {
  const { code } = req.query;
  const playerId = String(req.body?.playerId || "");
  const choice = Number(req.body?.choice);

  if (!playerId || !Number.isInteger(choice)) {
    res.status(400).json({ ok: false, error: "Missing playerId or choice" });
    return;
  }

  const redis = getRedis();
  const result = await submitAnswer(redis, String(code).toUpperCase(), playerId, choice);
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }
  res.status(200).json({ ok: true, ...viewRoom(result.room, Date.now(), { playerId }) });
});
