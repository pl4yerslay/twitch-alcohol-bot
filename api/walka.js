export default async function handler(req, res) {
  try {
    const username = (req.query.username || "").toLowerCase().trim();
    const opponent = (req.query.opponent || "").toLowerCase().trim();

    if (!username) {
      return res.status(400).send("Brak nazwy użytkownika");
    }

    if (!opponent) {
      return res.status(400).send(
        `⚔️ @${username}, użycie: !walka @user`
      );
    }

    if (username === opponent) {
      return res.status(200).send(
        `😂 @${username}, nie możesz walczyć sam ze sobą!`
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json"
    };

    // Sprawdzamy, czy przeciwnik istnieje
    const opponentResponse = await fetch(
      `${supabaseUrl}/rest/v1/alcohol_users?username=eq.${encodeURIComponent(opponent)}`,
      { headers }
    );

    if (!opponentResponse.ok) {
      throw new Error("Nie udało się sprawdzić przeciwnika");
    }

    const opponentUsers = await opponentResponse.json();

    if (opponentUsers.length === 0) {
      return res.status(200).send(
        `⚔️ @${username}, @${opponent} nie ma jeszcze postaci RPG! 🍻`
      );
    }

    // Sprawdzamy, czy użytkownik nie ma już oczekującej walki
    const existingResponse = await fetch(
      `${supabaseUrl}/rest/v1/pending_fights?or=(challenger.eq.${encodeURIComponent(username)},opponent.eq.${encodeURIComponent(username)})`,
      { headers }
    );

    if (!existingResponse.ok) {
      throw new Error("Nie udało się sprawdzić oczekujących walk");
    }

    const existingFights = await existingResponse.json();

    if (existingFights.length > 0) {
      return res.status(200).send(
        `⚔️ @${username}, masz już oczekujące wyzwanie! Najpierw je rozstrzygnij. 😂`
      );
    }

    // Sprawdzamy, czy przeciwnik też nie ma oczekującej walki
    const opponentFightResponse = await fetch(
      `${supabaseUrl}/rest/v1/pending_fights?or=(challenger.eq.${encodeURIComponent(opponent)},opponent.eq.${encodeURIComponent(opponent)})`,
      { headers }
    );

    if (!opponentFightResponse.ok) {
      throw new Error("Nie udało się sprawdzić walk przeciwnika");
    }

    const opponentFights = await opponentFightResponse.json();

    if (opponentFights.length > 0) {
      return res.status(200).send(
        `⚔️ @${opponent} ma już oczekującą walkę! Poczekaj, aż ją rozstrzygnie. 😂`
      );
    }

    // Tworzymy wyzwanie
    const createResponse = await fetch(
      `${supabaseUrl}/rest/v1/pending_fights`,
      {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          challenger: username,
          opponent: opponent
        })
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Błąd tworzenia wyzwania: ${errorText}`);
    }

    return res.status(200).send(
      `⚔️ @${username} wyzywa @${opponent} na pojedynek bimbru! 🍾 @${opponent} wpisz !tak, żeby zaakceptować!`
    );

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Wystąpił błąd serwera",
      details: error.message
    });
  }
}
