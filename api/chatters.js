export default async function handler(req, res) {
  return res.status(200).json({
    client_id_exists: !!process.env.TWITCH_CLIENT_ID,
    client_secret_exists: !!process.env.TWITCH_CLIENT_SECRET
  });
}
