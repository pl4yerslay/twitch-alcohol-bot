export default async function handler(req, res) {
  try {
    const username = (req.query.username || "").toLowerCase().trim();

    if (!username) {
      return res.status(400).send("Brak nazwy użytkownika");
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const clientId = process.env.TWITCH_CLIENT_ID;

    if (!supabaseUrl || !supabaseKey || !clientId) {
      return res.status(500).json({
        error: "Brak wymaganych zmiennych środowiskowych"
      });
    }

    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json"
    };

    // 1. Pobieramy aktualny stream
    const streamResponse = await fetch(
      `${supabaseUrl}/rest/v1/alcohol_streams?order=created_at.desc&limit=1`,
      { headers }
    );

    if (!streamResponse.ok) {
      throw new Error("Nie udało się pobrać sesji streama");
    }

    const streams = await streamResponse.json();

    if (!streams.length) {
      throw new Error("Brak aktywnej sesji streama");
    }

    const currentStreamId = streams[0].id;

    // 2. Pobieramy token Twitcha z Supabase
    const tokenResponse = await fetch(
      `${supabaseUrl}/rest/v1/twitch_auth?select=access_token&order=id.desc&limit=1`,
      { headers }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.length) {
      throw new Error("Nie znaleziono tokena Twitch");
    }

    const accessToken = tokenData[0].access_token;

    // 3. Pobieramy ID kanału
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
      throw new Error("Nie znaleziono kanału Twitch");
    }

    const broadcasterId = userData.data[0].id;

    // 4. Pobieramy osoby aktualnie obecne na czacie
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
      throw new Error("Nie udało się pobrać listy chatterów");
    }

    // 5. Usuwamy osobę wydającą komendę z listy
    const possibleUsers = chattersData.data.filter(
      chatter => chatter.user_login.toLowerCase() !== username
    );

    if (!possibleUsers.length) {
      return res.status(200).send(
        `🍺 @${username} nie ma
