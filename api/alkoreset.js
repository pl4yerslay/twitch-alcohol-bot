export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: "Brak SUPABASE_URL lub SUPABASE_KEY"
      });
    }

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
      throw new Error("Nie udało się pobrać aktualnego streama");
    }

    const streams = await streamResponse.json();

    if (streams.length === 0) {
      throw new Error("Brak aktywnej sesji streama");
    }

    const currentStreamId = streams[0].id;

    // Reset wszystkich użytkowników w aktualnym streamie
    const resetResponse = await fetch(
      `${supabaseUrl}/rest/v1/alcohol_users?stream_id=eq.${encodeURIComponent(currentStreamId)}`,
      {
        method: "PATCH",
        headers: {
          ...headers,
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          shots: 0,
          beers: 0,
          klins: 0,
          promile: 0,
          kac: 0
        })
      }
    );

    const resetData = await resetResponse.text();

    if (!resetResponse.ok) {
      throw new Error(`Błąd resetowania: ${resetData}`);
    }

    let resetUsers = [];

    try {
      resetUsers = JSON.parse(resetData);
    } catch {
      resetUsers = [];
    }

    return res.status(200).send(
      `🔄 ALKO RESET! Wyzerowano statystyki ${resetUsers.length} użytkowników. 🧹`
    );

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Wystąpił błąd serwera",
      details: error.message
    });
  }
 }
