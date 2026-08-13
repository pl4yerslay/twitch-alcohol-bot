export default async function handler(req, res) {
  const clientId = process.env.TWITCH_CLIENT_ID;

  if (!clientId) {
    return res.status(500).json({
      error: "Brak TWITCH_CLIENT_ID"
    });
  }

  const redirectUri =
    "https://twitch-alcohol-bot.vercel.app/api/auth";

  const scope = "moderator:read:chatters";

  const twitchUrl =
    "https://id.twitch.tv/oauth2/authorize" +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}`;

  return res.redirect(302, twitchUrl);
}
