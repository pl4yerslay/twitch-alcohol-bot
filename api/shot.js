export default async function handler(req, res) {
  try {
    const username = (req.query.username || "").toLowerCase().trim();

    if (!username) {
      return res.status(400).send("Brak nazwy użytkownika");
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: "Brak zmiennych Supabase",
        has_url: !!supabaseUrl,
        has_key: !!supabaseKey
      });
    }

    return res.status(200).json({
      status: "supabase_variables_ok",
      username
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
