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

    function getLevelData(xp) {
      let level;

      if (xp < 150) {
        level = Math.floor(xp / 30) + 1;
      } else if (xp < 650) {
        level = 6 + Math.floor((xp - 150) / 50);
      } else if (xp < 1550) {
        level = 16 + Math.floor((xp - 650) / 60);
      } else {
        level = 31 + Math.floor((xp - 1550) / 80);

        if (level > 50) {
          level = 50;
        }
      }

      let title;

      if (level <= 5) {
        title = "Świeżak";
      } else if (level <= 10) {
        title = "Alkoholik";
      } else if (level <= 20) {
        title = "Weteran";
      } else if (level <= 35) {
        title = "Alchemik";
      } else {
        title = "Legenda";
      }

      return { level, title };
    }

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

    // 5. Usuwamy osobę używającą komendy z losowania
    const possibleUsers = chattersData.data.filter(
      chatter =>
        chatter.user_login &&
        chatter.user_login.toLowerCase() !== username
    );

    if (!possibleUsers.length) {
      return res.status(200).send(
        `🍺 @${username} nie ma z kim walić browca! Potrzeba jeszcze jednego alkoholika 😂`
      );
    }

    // 6. Losujemy drugiego użytkownika
    const user2 =
      possibleUsers[Math.floor(Math.random() * possibleUsers.length)];

    const username2 = user2.user_login.toLowerCase();

    // 7. Funkcja dodająca browara + XP
    async function giveBeer(targetUsername) {
      const userResponse = await fetch(
        `${supabaseUrl}/rest/v1/alcohol_users?username=eq.${encodeURIComponent(targetUsername)}`,
        { headers }
      );

      if (!userResponse.ok) {
        throw new Error(
          `Nie udało się pobrać użytkownika ${targetUsername}`
        );
      }

      const users = await userResponse.json();

      // Nowy użytkownik
      if (!users.length) {
        const xp = 1;
        const { level, title } = getLevelData(xp);

        const createResponse = await fetch(
          `${supabaseUrl}/rest/v1/alcohol_users`,
          {
            method: "POST",
            headers: {
              ...headers,
              Prefer: "return=representation"
            },
            body: JSON.stringify({
              username: targetUsername,
              shots: 0,
              beers: 1,
              klins: 0,
              promile: 0.40,
              kac: 2.00,
              stream_id: currentStreamId,

              xp: xp,
              level: level,
              title: title,
              wins: 0,
              losses: 0
            })
          }
        );

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          throw new Error(
            `Błąd tworzenia ${targetUsername}: ${errorText}`
          );
        }

        return;
      }

      const user = users[0];

      // Użytkownik ze starego streama
      if (user.stream_id !== currentStreamId) {
        const newXp = Number(user.xp || 0) + 1;
        const { level, title } = getLevelData(newXp);

        const resetResponse = await fetch(
          `${supabaseUrl}/rest/v1/alcohol_users?username=eq.${encodeURIComponent(targetUsername)}`,
          {
            method: "PATCH",
            headers: {
              ...headers,
              Prefer: "return=representation"
            },
            body: JSON.stringify({
              shots: 0,
              beers: 1,
              klins: 0,
              promile: 0.40,
              kac: 2.00,
              stream_id: currentStreamId,

              xp: newXp,
              level: level,
              title: title
            })
          }
        );

        if (!resetResponse.ok) {
          const errorText = await resetResponse.text();
          throw new Error(
            `Błąd resetowania ${targetUsername}: ${errorText}`
          );
        }

        return;
      }

      // Ten sam stream
      const newBeers = Number(user.beers || 0) + 1;
      const newPromile = Number(user.promile || 0) + 0.40;
      const newKac = Number(user.kac || 0) + 2.00;

      const newXp = Number(user.xp || 0) + 1;
      const { level, title } = getLevelData(newXp);

      const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/alcohol_users?username=eq.${encodeURIComponent(targetUsername)}`,
        {
          method: "PATCH",
          headers: {
            ...headers,
            Prefer: "return=representation"
          },
          body: JSON.stringify({
            beers: newBeers,
            promile: newPromile,
            kac: newKac,

            xp: newXp,
            level: level,
            title: title
          })
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(
          `Błąd aktualizacji ${targetUsername}: ${errorText}`
        );
      }
    }

    // 8. Browara dostają obie osoby
    await giveBeer(username);
    await giveBeer(username2);

    // 9. Wiadomość
    return res.status(200).send(
      `🍺 @${username} wali browca z @${username2} 🍻 ALKOHOLICY | ⭐ +1 XP`
    );

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Wystąpił błąd serwera",
      details: error.message
    });
  }
 }
