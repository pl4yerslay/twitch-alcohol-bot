export default async function handler(req, res) {
  try {
    const username = (req.query.username || "").toLowerCase().trim();

    if (!username) {
      return res.status(400).json({
        error: "Brak nazwy użytkownika"
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json"
    };

    // Sprawdzenie, czy użytkownik już istnieje
    const userResponse = await fetch(
      `${supabaseUrl}/rest/v1/alcohol_users?username=eq.${encodeURIComponent(username)}`,
      {
        headers
      }
    );

    if (!userResponse.ok) {
      throw new Error("Błąd podczas pobierania użytkownika");
    }

    const users = await userResponse.json();

    // Nowy użytkownik
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
            username: username,
            shots: 1,
            beers: 0,
            klins: 0,
            promile: 0.50,
            kac: 1.00,
            stream_id: null
          })
        }
      );

      if (!createResponse.ok) {
        throw new Error("Nie udało się utworzyć użytkownika");
      }

      return res.status(200).send(
        `🥃 @${username} wypił shota! To jego pierwszy dzisiaj! 🍾`
      );
    }

    const user = users[0];

    const newShots = (user.shots || 0) + 1;
    const newPromile = Number(user.promile || 0) + 0.50;
    const newKac = Number(user.kac || 0) + 1.00;

    // Aktualizacja użytkownika
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
          kac: newKac
        })
      }
    );

    if (!updateResponse.ok) {
      throw new Error("Nie udało się zaktualizować użytkownika");
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
}
