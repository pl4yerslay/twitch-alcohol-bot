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

    // Brak użytkownika albo brak alkoholu w tym streamie
    if (
      users.length === 0 ||
      users[0].stream_id !== currentStreamId
    ) {
      return res.status(200).send(
        `🧪 Alkomat @${username}: 0,00‰. 🟢 Czysty jak łza! 🚨 POLICE 🚨`
      );
    }

    const promile = Number(users[0].promile || 0);

    let message;

    if (promile <= 0) {
      message = `🧪 Alkomat @${username}: 0,00‰. 🟢 Czysty jak łza! 🚨 POLICE 🚨`;
    } else if (promile < 0.80) {
      message = `🧪 Alkomat @${username}: ${promile.toFixed(2).replace(".", ",")}‰. 🟢 Coś już krąży. 🚨 POLICE 🚨`;
    } else if (promile < 1.60) {
      message = `🧪 Alkomat @${username}: ${promile.toFixed(2).replace(".", ",")}‰. 🟡 No dobra, już coś jest. 😂 🚨 POLICE 🚨`;
    } else if (promile < 2.20) {
      message = `🧪 Alkom
