export default async function handler(req, res) {
  try {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;

    if (!clientId) {
      return res.status(500).json({
        step: "client_id",
        error: "Brak TWITCH_CLIENT_ID w Vercelu"
      });
    }

    if (!clientSecret) {
      return res.status(500).json({
        step: "client_secret",
        error: "Brak TWITCH_CLIENT_SECRET w Vercelu"
      });
    }

    // Pobranie app access token
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
          grant_type: "client_credentials"
        })
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return res.status(500).json({
        step: "twitch_token",
        status: tokenResponse.status,
        error: tokenData
      });
    }

    // Sprawdzenie streama
    const streamResponse = await fetch(
      "https://api.twitch.tv/helix/streams?user_login=pl4yerslay",
      {
        headers: {
          "Client-ID": clientId,
          "Authorization": `Bearer ${tokenData.access_token}`
        }
      }
    );

    const streamData = await streamResponse.json();

    if (!streamResponse.ok) {
      return res.status(500).json({
        step: "twitch_stream",
        status: streamResponse.status,
        error: streamData
      });
    }

    if (streamData.data.length === 0) {
      return res.status(200).json({
        live: false,
        message: "Stream aktualnie nie jest uruchomiony."
      });
    }

    const stream = streamData.data[0];

    return res.status(200).json({
      live: true,
      stream_id: stream.id,
      started_at: stream.started_at,
      title: stream.title
    });

  } catch (error) {
    return res.status(500).json({
      step: "server",
      error: error.message
    });
  }
}
