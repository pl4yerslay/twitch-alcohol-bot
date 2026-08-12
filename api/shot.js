export default async function handler(req, res) {
  try {
    const username = (req.query.username || "").toLowerCase().trim();

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

    const streams = await streamResponse.json();
    const currentStreamId = streams[0].id;

    // Pobieramy użytkownika
    const userResponse = await fetch(
      `${supabaseUrl}/rest/v1/alcohol_users?username=eq.${encodeURIComponent(username)}&stream_id=eq.${encodeURIComponent(currentStreamId)}`,
      { headers }
    );

    const userText = await userResponse.text();

    return res.status(200).json({
      stream_id: currentStreamId,
      user_status: userResponse.status,
      user_response: userText
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}
