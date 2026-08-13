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

    // Pobieramy użytkownika
    const userResponse = await fetch(
      `${supabaseUrl}/rest/v1/alcohol_users?username=eq.${encodeURIComponent(username)}`,
      { headers }
    );

    if (!userResponse.ok) {
      throw new Error("Nie udało się pobrać użytkownika");
    }

    const users = await userResponse.json();

    // Użytkownik nie istnieje
    if (users.length === 0) {
      return res.status(200).send(
        `⭐ @${username} nie ma jeszcze postaci RPG. 🍻`
      );
    }

    const user = users[0];

    const xp = Number(user.xp || 0);
    const level = Number(user.level || 1);
    const title = user.title || "Świeżak";

    return res.status(200).send(
      `⭐ @${username} | Lv. ${level} | XP: ${xp} | 🏷️ ${title}`
    );

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Wystąpił błąd serwera",
      details: error.message
    });
  }
 }
