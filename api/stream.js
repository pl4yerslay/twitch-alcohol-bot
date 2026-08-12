export default async function handler(req, res) {
  try {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;

    // Pobranie tokenu aplikacji Twitch
    const tokenResponse = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      {
        method: "POST"
      }
    );

    if (!tokenResponse.ok) {
      throw new Error("Nie udało się uzyskać tokenu Twitch");
    }

    const tokenData = await tokenResponse.json();

    // Sprawdzenie aktualnego streama
    const streamResponse = await fetch(
      "https://api.twitch.tv/helix/streams?user_login=pl4yerslay",
      {
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${tokenData.access_token}`
        }
      }
    );

    if (!streamResponse.ok) {
      throw new Error("Nie udało się sprawdzić streama");
    }

    const streamData = await streamResponse.json();

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
    console.error(error);

    return res.status(500).json({
      error: "Błąd podczas sprawdzania streama"
    });
  }
}
