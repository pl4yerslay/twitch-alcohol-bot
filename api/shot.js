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

    // Pobieramy aktualną sesję streama
    const streamResponse = await fetch(
      `${supabaseUrl}/rest/v1/alcohol_streams?order=created_at.desc&limit=1`,
      { headers }
    );

    if (!streamResponse.ok) {
      throw new Error("Błąd podczas pobierania sesji streama");
    }

    const streams = await streamResponse.json();

    if (streams.length === 0) {
      throw new Error("Brak aktywnej sesji streama");
    }

    const currentStreamId = streams[0].id;

    // Sprawdzamy użytkownika w aktualnej sesji
    const userResponse = await fetch(
      `${supabaseUrl}/rest/v1/alcohol_users?username=eq.${encodeURIComponent(username)}&stream_id=eq.${encodeURIComponent(currentStreamId)}`,
      { headers }
    );

    if (!userResponse.ok) {
      throw new Error("Błąd podczas pobierania użytkownika");
    }

    const users = await userResponse.json();

    // Nowy użytkownik w tej sesji
    if (users.length === 0) {
      const createResponse = await fetch(
        `${supabaseUrl}/rest/v1/alcohol_users`,
        {
          method: "POST",
          headers: {
            ...headers,
            Prefer: "return=representation"
          },
          body: JSON.stringify({
            username,
            shots: 1,
            beers: 0,
            klins: 0,
            promile: 0.40,
            kac: 1.00,
            stream_id: currentStreamId
          })
        }
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Nie udało się utworzyć użytkownika: ${errorText}`);
      }

      return res.status(200).send(
        `🥃 @${username} wypił shota! To jego pierwszy dzisiaj! 🍾`
      );
    }

    const user = users[0];

    const newShots = (user.shots || 0) + 1;
    const newPromile = Number(user.promile || 0) + 0.40;
    const newKac = Number(user.kac || 0) + 1.00;

    // Aktualizacja użytkownika
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/alcohol_users?id=eq.${user.id}`,
      {
        method: "PATCH",
        headers: {
          ...headers,
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          shots: newShots,
          promile: newPromile,
          kac: newKac
        })
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Nie udało się zaktualizować użytkownika: ${errorText}`);
    }

    return res.status(200).send(
      `🥃 @${username} wypił shota! To już ${newShots} dzisiaj! 🍾`
    );

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Wystąpił błąd serwera"
    });
  }
}    });
  }
}
