import { getRedis } from "../../_lib/redis.js";
import { nextQuestion, viewRoom } from "../../_lib/roomStore.js";
import { withHandler } from "../../_lib/http.js";

export default withHandler(["POST"], async (req, res) => {
  const { code } = req.query;
  const hostToken = String(req.body?.hostToken || "");

  const redis = getRedis();
  const result = await nextQuestion(redis, String(code).toUpperCase(), hostToken);
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }
  res.status(200).json({ ok: true, ...viewRoom(result.room, Date.now()) });
});
