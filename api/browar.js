export default async function handler(req, res) {
  try {
    const username = (req.query.username || "").toLowerCase().trim();

    if (!username) {
      return res.status(400).json({
        step: "username",
        error: "Brak username"
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const clientId = process.env.TWITCH_CLIENT_ID;

    if (!supabaseUrl || !supabaseKey || !clientId) {
      return res.status(500).json({
        step: "env",
        supabase_url: !!supabaseUrl,
        supabase_key: !!supabaseKey,
        twitch_client_id: !!clientId
      });
    }

    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json"
    };

    // TEST 1 — Supabase
    const streamResponse = await fetch(
      `${supabaseUrl}/rest/v1/alcohol_streams?order=created_at.desc&limit=1`,
      { headers }
    );

    const streamText = await streamResponse.text();

    if (!streamResponse.ok) {
      return res.status(500).json({
        step: "supabase_stream",
        status: streamResponse.status,
        error: streamText
      });
    }

    let streams;

    try {
      streams = JSON.parse(streamText);
    } catch {
      return res.status(500).json({
        step: "supabase_stream_json",
        response: streamText
      });
    }

    if (!streams.length) {
      return res.status(500).json({
        step: "stream",
        error: "Brak aktywnego streama"
      });
    }

    const currentStreamId = streams[0].id;

    // TEST 2 — Twitch token
    const tokenResponse = await fetch(
      `${supabaseUrl}/rest/v1/twitch_auth?select=access_token&order=id.desc&limit=1`,
      { headers }
    );

    const tokenText = await tokenResponse.text();

    if (!tokenResponse.ok) {
      return res.status(500).json({
        step: "supabase_token",
        status: tokenResponse.status,
        error: tokenText
      });
    }

    let tokenData;

    try {
      tokenData = JSON.parse(tokenText);
    } catch {
      return res.status(500).json({
        step: "token_json",
        response: tokenText
      });
    }

    if (!tokenData.length || !tokenData[0].access_token) {
      return res.status(500).json({
        step: "token",
        error: "Brak access tokena w twitch_auth"
      });
    }

    const accessToken = tokenData[0].access_token;

    // TEST 3 — Twitch użytkownik
    const userResponse = await fetch(
      "https://api.twitch.tv/helix/users?login=pl4yerslay",
      {
        headers: {
          "Client-ID": clientId,
          "Authorization": `Bearer ${accessToken}`
        }
      }
    );

    const userText = await userResponse.text();

    if (!userResponse.ok) {
      return res.status(500).json({
        step: "twitch_user",
        status: userResponse.status,
        error: userText
      });
    }

    let userData;

    try {
      userData = JSON.parse(userText);
    } catch {
      return res.status(500).json({
        step: "twitch_user_json",
        response: userText
      });
    }

    if (!userData.data || !userData.data.length) {
      return res.status(500).json({
        step: "twitch_user",
        error: "Nie znaleziono pl4yerslay"
      });
    }

    const broadcasterId = userData.data[0].id;

    // TEST 4 — Chatters
    const chattersResponse = await fetch(
      `https://api.twitch.tv/helix/chat/chatters?broadcaster_id=${broadcasterId}&moderator_id=${broadcasterId}`,
      {
        headers: {
          "Client-ID": clientId,
          "Authorization": `Bearer ${accessToken}`
        }
      }
    );

    const chattersText = await chattersResponse.text();

    if (!chattersResponse.ok) {
      return res.status(500).json({
        step: "twitch_chatters",
        status: chattersResponse.status,
        error: chattersText
      });
    }

    let chattersData;

    try {
      chattersData = JSON.parse(chattersText);
    } catch {
      return res.status(500).json({
        step: "chatters_json",
        response: chattersText
      });
    }

    if (!Array.isArray(chattersData.data)) {
      return res.status(500).json({
        step: "chatters_data",
        error: "Twitch nie zwrócił tablicy chatterów",
        response: chattersData
      });
    }

    const possibleUsers = chattersData.data.filter(
      chatter =>
        chatter.user_login &&
        chatter.user_login.toLowerCase() !== username
    );

    if (!possibleUsers.length) {
      return res.status(200).json({
        success: true,
        step: "complete",
        message: "Brak drugiego użytkownika do wylosowania",
        total_chatters: chattersData.total
      });
    }

    const user2 =
      possibleUsers[Math.floor(Math.random() * possibleUsers.length)];

    return res.status(200).json({
      success: true,
      step: "complete",
      username: username,
      user2: user2.user_login,
      total_chatters: chattersData.total,
      stream_id: currentStreamId
    });

  } catch (error) {
    return res.status(500).json({
      step: "catch",
      error: error.message,
      stack: error.stack
    });
  }
 }
