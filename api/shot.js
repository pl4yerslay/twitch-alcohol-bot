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

    const response = await fetch(
      `${supabaseUrl}/rest/v1/alcohol_users?username=eq.${encodeURIComponent(username)}`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error("Błąd połączenia z Supabase");
    }

    const users = await response.json();

    if (users.length === 0) {
      const createResponse = await fetch(
        `${supabaseUrl}/rest/v1/alcohol_users`,
        {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=representation"
          },
          body: JSON.stringify({
            username: username,
            shots: 1,
            beers: 0
          })
        }
      );

      if (!createResponse.ok) {
        throw new Error("Nie udało się utworzyć użytkownika");
      }

      return res.status(200).send({
        message: `🥃 @${username} wypił shota! To jego pierwszy dzisiaj!`
      });
    }

    const user = users[0];

    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/alcohol_users?username=eq.${encodeURIComponent(username)}`,
      {
        method: "PATCH",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          shots: user.shots + 1
        })
      }
    );

    if (!updateResponse.ok) {
      throw new Error("Nie udało się zaktualizować użytkownika");
    }

    return res.status(200).send({
      message: `🥃 @${username} wypił shota! To już ${user.shots + 1} dzisiaj. 🍾💀`
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Wystąpił błąd serwera"
    });
  }
}
