export default async function handler(req, res) {
  try {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: "Brak TWITCH_CLIENT_ID lub TWITCH_CLIENT_SECRET"
      });
    }

    // 1. Pobieramy token aplikacji
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
        error: "Nie udało się pobrać tokena Twitch",
        details: tokenData
      });
    }

    // 2. Pobieramy ID kanału pl4yerslay
    const userResponse = await fetch(
      "https://api.twitch.tv/helix/users?login=pl4yerslay",
      {
        headers: {
          "Client-ID": clientId,
          "Authorization": `Bearer ${tokenData.access_token}`
        }
      }
    );

    const userData = await userResponse.json();

    if (!userResponse.ok || !userData.data?.length) {
      return res.status(500).json({
        error: "Nie znaleziono kanału Twitch"
      });
    }

    const broadcasterId = userData.data[0].id;

    // 3. Pobieramy listę osób na czacie
    const chattersResponse = await fetch(
      `https://api.twitch.tv/helix/chat/chatters?broadcaster_id=${broadcasterId}&moderator_id=${broadcasterId}`,
      {
        headers: {
          "Client-ID": clientId,
          "Authorization": `Bearer ${tokenData.access_token}`
        }
      }
    );

    const chattersData = await chattersResponse.json();

    if (!chattersResponse.ok) {
      return res.status(chattersResponse.status).json({
        error: "Nie udało się pobrać listy czatu",
        details: chattersData
      });
    }

    return res.status(200).json({
      success: true,
      broadcaster: "pl4yerslay",
      total_chatters: chattersData.total,
      chatters: chattersData.data
    });

  } catch (error) {
    return res.status(500).json({
      error: "Błąd serwera",
      details: error.message
    });
  }
 }
