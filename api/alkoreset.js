export default async function handler(req, res) {
  try {
    const username = (req.query.username || "").toLowerCase().trim();

    // Tylko właściciel bota może wykonać reset
    if (username !== "pl4yerslay") {
      return res.status(403).send(
        "⛔ Nie masz uprawnień do resetowania alkoholizacji."
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json"
    };

    // Pobieramy ostatni stream
    const streamResponse = await fetch(
      `${supabaseUrl}/rest/v1/alcohol_streams?order=created_at.desc&limit=1`,
      { headers }
    );

    if (!streamResponse.ok) {
      throw new Error("Nie udało się pobrać ostatniego streama");
    }

    const streams = await streamResponse.json();

    let nextNumber = 1;

    if (streams.length > 0) {
      const lastId = streams[0].id;
      const match = String(lastId).match(/^stream-(\d+)$/);

      if (match) {
        nextNumber = Number(match[1]) + 1;
      }
    }

    const newStreamId = `stream-${nextNumber}`;

    // Tworzymy nową sesję
    const createResponse = await fetch(
      `${supabaseUrl}/rest/v1/alcohol_streams`,
      {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          id: newStreamId
        })
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Nie udało się utworzyć nowego streama: ${errorText}`);
    }

    return res.status(200).send(
      `🔄 Nowy stream rozpoczęty! Alkoholizacja została zresetowana. 🍻 [${newStreamId}]`
    );

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Nie udało się wykonać resetu",
      details: error.message
    });
  }
}
