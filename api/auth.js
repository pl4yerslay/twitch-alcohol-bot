export default async function handler(req, res) {
  try {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: "Brak TWITCH_CLIENT_ID lub TWITCH_CLIENT_SECRET"
      });
    }

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: "Brak SUPABASE_URL lub SUPABASE_KEY"
      });
    }

    const redirectUri =
      "https://twitch-alcohol-bot.vercel.app/api/auth";

    // Jeśli mamy authorization code — wymieniamy go na token Twitcha
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
          error: "Nie udało się pobrać tokena Twitch",
          details: tokenData
        });
      }

      // Zapis tokenów do Supabase
      const supabaseResponse = await fetch(
        `${supabaseUrl}/rest/v1/twitch_auth`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=minimal"
          },
          body: JSON.stringify({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token
          })
        }
      );

      if (!supabaseResponse.ok) {
        const supabaseError = await supabaseResponse.text();

        return res.status(500).json({
          error: "Nie udało się zapisać tokena w Supabase",
          details: supabaseError
        });
      }

      return res.status(200).json({
        success: true,
        message: "Twitch został autoryzowany i token został zapisany.",
        scope: tokenData.scope,
        token_saved: true
      });
    }

    // Brak code → rozpoczynamy autoryzację Twitcha
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
