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

    // Pobieramy aktualny stream
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

    // Pobieramy użytkownika
    const userResponse = await fetch(
      `${supabaseUrl}/rest/v1/alcohol_users?username=eq.${encodeURIComponent(username)}`,
      { headers }
    );

    if (!userResponse.ok) {
      throw new Error("Nie udało się pobrać użytkownika");
    }

    const users = await userResponse.json();

    // Brak użytkownika
    if (users.length === 0) {
      return res.status(200).send(
        `📊 @${username} nie ma jeszcze żadnych statystyk w tym streamie. 🍻`
      );
    }

    const user = users[0];

    // Użytkownik pochodzi ze starego streama
    if (user.stream_id !== currentStreamId) {
      return res.status(200).send(
        `📊 @${username} nie wypił jeszcze nic w tym streamie. 🍻`
      );
    }

    const shots = Number(user.shots || 0);
    const beers = Number(user.beers || 0);
    const klins = Number(user.klins || 0);
    const promile = Number(user.promile || 0).toFixed(2);
    const kac = Number(user.kac || 0).toFixed(2);

    return res.status(200).send(
      `📊 @${username} | 🥃 Shoty: ${shots} | 🍺 Piwa: ${beers} | 🍸 Kliny: ${klins} | 🥴 ${promile}‰ | 🤢 Kac: ${kac}`
    );

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Wystąpił błąd serwera",
      details: error.message
    });
  }
 }
