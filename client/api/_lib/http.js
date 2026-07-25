export function withHandler(methods, handler) {
  return async (req, res) => {
    if (!methods.includes(req.method)) {
      res.setHeader("Allow", methods.join(", "));
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }
    try {
      await handler(req, res);
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: "Internal error" });
    }
  };
}
