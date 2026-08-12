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

    const streamResponse = await fetch(
      `${supabaseUrl}/rest/v1/alcohol_streams?order=created_at.desc&limit=1`,
      { headers }
    );

    const responseText = await streamResponse.text();

    return res.status(200).json({
      supabase_status: streamResponse.status,
      supabase_response: responseText
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}
