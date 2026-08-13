export default async function handler(req, res) {
  try {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: "Brak TWITCH_CLIENT_ID lub TWITCH_CLIENT_SECRET"
      });
    }

    const redirectUri =
      "https://twitch-alcohol-bot.vercel.app/api/auth";

    // Twitch zwrócił authorization code
    if (req.query.code) {
      const tokenResponse = await fetch(
        "https://id.twitch.tv/oauth2/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code: req.query.code,
            grant_type: "authorization_code",
            redirect_uri: redirectUri
          })
        }
      );

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        return res.status(500).json({
          error: "Nie udało się wymienić authorization code na token",
          details: tokenData
        });
      }

      return res.status(200).json({
        success: true,
        message: "Twitch został pomyślnie autoryzowany.",
        scope: tokenData.scope,
        expires_in: tokenData.expires_in,
        token_received: !!tokenData.access_token,
        refresh_token_received: !!tokenData.refresh_token
      });
    }

    // Brak code → rozpoczynamy autoryzację
    const scope = "moderator:read:chatters";

    const twitchUrl =
      "https://id.twitch.tv/oauth2/authorize" +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&force_verify=true`;

    return res.redirect(302, twitchUrl);

  } catch (error) {
    return res.status(500).json({
      error: "Błąd serwera",
      details: error.message
    });
  }
}
