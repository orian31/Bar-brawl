import { getRedis } from "../_lib/redis.js";
import { createRoom } from "../_lib/roomStore.js";
import { withHandler } from "../_lib/http.js";

export default withHandler(["POST"], async (req, res) => {
  const redis = getRedis();
  const { code, hostToken } = await createRoom(redis);
  res.status(200).json({ ok: true, code, hostToken });
});
