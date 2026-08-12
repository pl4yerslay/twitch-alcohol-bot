export default function handler(req, res) {
  return res.status(200).json({
    status: "dziala",
    username: req.query.username || null
  });
}
