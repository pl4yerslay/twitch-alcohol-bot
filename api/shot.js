export default async function handler(req, res) {
  try {
    const username = (req.query.username || "").toLowerCase().trim();

    if (!username) {
      return res.status(400).send("Brak nazwy użytkownika");
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json"
    };

    // =========================
    // FUNKCJA POZIOMU I TYTUŁU
    // =========================

    function getLevelData(xp) {
      let level;

      // Poziomy 1-5
      // Każdy kolejny poziom = 30 XP
      if (xp < 150) {
        level = Math.floor(xp / 30) + 1;
      }

      // Poziomy 6-15
      else if (xp < 650) {
        level = 6 + Math.floor((xp - 150) / 50);
      }

      // Poziomy 16-30
      else if (xp < 1550) {
        level = 16 + Math.floor((xp - 650) / 60);
      }

      // Poziomy 31-50
      else {
        level = 31 + Math.floor((xp - 1550) / 80);

        // Maksymalny poziom
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

      return {
        level,
        title
      };
    }

    // =========================
    // AKTUALNA SESJA
    // =========================

    const streamResponse = await fetch(
      `${supabaseUrl}/rest/v1/alcohol_streams?order=created_at.desc&limit=1`,
      { headers }
    );

    if (!streamResponse.ok) {
      throw new Error("Nie udało się pobrać sesji streama");
    }

    const streams = await streamResponse.json();

    if (streams.length === 0) {
      throw new Error("Brak aktywnej sesji streama");
    }

    const currentStreamId = streams[0].id;

    // =========================
    // POBIERAMY UŻYTKOWNIKA
    // =========================

    const userResponse = await fetch(
      `${supabaseUrl}/rest/v1/alcohol_users?username=eq.${encodeURIComponent(username)}`,
      { headers }
    );

    if (!userResponse.ok) {
      throw new Error("Nie udało się pobrać użytkownika");
    }

    const users = await userResponse.json();

    // =========================
    // NOWY UŻYTKOWNIK
    // =========================

    if (users.length === 0) {
      const xp = 5000;
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
            username: username,

            // Statystyki alkoholu
            shots: 1,
            beers: 0,
            klins: 0,
            promile: 0.80,
            kac: 1.00,
            stream_id: currentStreamId,

            // RPG
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
        throw new Error(`Błąd tworzenia użytkownika: ${errorText}`);
      }

      return res.status(200).send(
        `🥃 @${username} wypił shota! To jego pierwszy dzisiaj! 🍾 OCHLEJMORDA | ⭐ +1 XP`
      );
    }

    const user = users[0];

    // =========================
    // NOWY STREAM
    // =========================
    // Resetujemy TYLKO statystyki alkoholu.
    // XP, level, title, wins i losses zostają.
    // =========================

    if (user.stream_id !== currentStreamId) {
      const newXp = Number(user.xp || 0) + 1;
      const { level, title } = getLevelData(newXp);

      const resetResponse = await fetch(
        `${supabaseUrl}/rest/v1/alcohol_users?username=eq.${encodeURIComponent(username)}`,
        {
          method: "PATCH",
          headers: {
            ...headers,
            Prefer: "return=representation"
          },
          body: JSON.stringify({
            shots: 1,
            beers: 0,
            klins: 0,
            promile: 0.80,
            kac: 1.00,
            stream_id: currentStreamId,

            // RPG NIE JEST RESETOWANE
            xp: newXp,
            level: level,
            title: title
          })
        }
      );

      if (!resetResponse.ok) {
        const errorText = await resetResponse.text();
        throw new Error(`Błąd resetowania użytkownika: ${errorText}`);
      }

      return res.status(200).send(
        `🥃 @${username} wypił shota! To jego pierwszy dzisiaj! 🍾 OCHLEJMORDA | ⭐ +1 XP`
      );
    }

    // =========================
    // TEN SAM STREAM
    // =========================

    const newShots = Number(user.shots || 0) + 1;
    const newPromile = Number(user.promile || 0) + 0.80;
    const newKac = Number(user.kac || 0) + 1.00;

    // RPG
    const oldXp = Number(user.xp || 0);
    const newXp = oldXp + 1;

    const oldLevel = Number(user.level || 1);
    const { level: newLevel, title: newTitle } = getLevelData(newXp);

    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/alcohol_users?username=eq.${encodeURIComponent(username)}`,
      {
        method: "PATCH",
        headers: {
          ...headers,
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          shots: newShots,
          promile: newPromile,
          kac: newKac,

          // RPG
          xp: newXp,
          level: newLevel,
          title: newTitle
        })
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Błąd aktualizacji użytkownika: ${errorText}`);
    }

    // =========================
    // LEVEL UP
    // =========================

    if (newLevel > oldLevel) {
      return res.status(200).send(
        `🎉 @${username} wbił POZIOM ${newLevel}! ⭐ ${newXp} XP | 🏷️ ${newTitle} | 🥃 Shoty: ${newShots} | 🍾 OCHLEJMORDA`
      );
    }

    return res.status(200).send(
      `🥃 @${username} wypił shota! To już ${newShots} dzisiaj! 🍾 OCHLEJMORDA | ⭐ +1 XP`
    );

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Wystąpił błąd serwera",
      details: error.message
    });
  }
 }
