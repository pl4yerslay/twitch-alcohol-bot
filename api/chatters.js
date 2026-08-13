export default async function handler(req, res) {
  try {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!clientId) {
      return res.status(500).json({
        error: "Brak TWITCH_CLIENT_ID"
      });
    }

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: "Brak SUPABASE_URL lub SUPABASE_KEY"
      });
    }

    // 1. Pobieramy zapisany User Access Token z Supabase
    const tokenResponse = await fetch(
      `${supabaseUrl}/rest/v1/twitch_auth?select=access_token&order=id.desc&limit=1`,
      {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.length) {
      return res.status(500).json({
        error: "Nie znaleziono tokena Twitch w Supabase"
      });
    }

    const accessToken = tokenData[0].access_token;

    // 2. Pobieramy ID kanału pl4yerslay
    const userResponse = await fetch(
      "https://api.twitch.tv/helix/users?login=pl4yerslay",
      {
        headers: {
          "Client-ID": clientId,
          "Authorization": `Bearer ${accessToken}`
        }
      }
    );

    const userData = await userResponse.json();

    if (!userResponse.ok || !userData.data?.length) {
      return res.status(userResponse.status).json({
        error: "Nie znaleziono kanału Twitch",
        details: userData
      });
    }

    const broadcasterId = userData.data[0].id;

    // 3. Pobieramy listę osób na czacie
    const chattersResponse = await fetch(
      `https://api.twitch.tv/helix/chat/chatters?broadcaster_id=${broadcasterId}&moderator_id=${broadcasterId}`,
      {
        headers: {
          "Client-ID": clientId,
          "Authorization": `Bearer ${accessToken}`
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
