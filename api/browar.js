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

    // 1. Aktualny stream
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

    // 2. Token Twitcha
    const tokenResponse = await fetch(
      `${supabaseUrl}/rest/v1/twitch_auth?select=access_token&order=id.desc&limit=1`,
      { headers }
    );

    if (!tokenResponse.ok) {
      throw new Error("Nie udało się pobrać tokena Twitch z Supabase");
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.length || !tokenData[0].access_token) {
      throw new Error("Brak access tokena Twitch");
    }

    const accessToken = tokenData[0].access_token;

    // 3. ID kanału
    const twitchUserResponse = await fetch(
      "https://api.twitch.tv/helix/users?login=pl4yerslay",
      {
        headers: {
          "Client-ID": clientId,
          "Authorization": `Bearer ${accessToken}`
        }
      }
    );

    if (!twitchUserResponse.ok) {
      throw new Error("Nie udało się pobrać danych kanału Twitch");
    }

    const twitchUserData = await twitchUserResponse.json();

    if (!twitchUserData.data?.length) {
      throw new Error("Nie znaleziono kanału pl4yerslay");
    }

    const broadcasterId = twitchUserData.data[0].id;

    // 4. Lista chatterów
    const chattersResponse = await fetch(
      `https://api.twitch.tv/helix/chat/chatters?broadcaster_id=${broadcasterId}&moderator_id=${broadcasterId}`,
      {
        headers: {
          "Client-ID": clientId,
          "Authorization": `Bearer ${accessToken}`
        }
      }
    );

    if (!chattersResponse.ok) {
      const errorText = await chattersResponse.text();
      throw new Error(`Nie udało się pobrać chatterów: ${errorText}`);
    }

    const chattersData = await chattersResponse.json();

    // 5. Usuwamy osobę używającą komendy z możliwości losowania
    const possibleUsers = chattersData.data.filter(
      chatter =>
        chatter.user_login &&
        chatter.user_login.toLowerCase() !== username
    );

   
