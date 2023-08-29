const API_BASE_URL = 'http://localhost:3000/api';

// Pomocná funkce pro provádění HTTP požadavků
async function fetchData(url, method, data = null) {
    const requestOptions = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include', // Zahrnutí cookies do požadavků
    };

    if (data) {
        requestOptions.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}${url}`, requestOptions);

    if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage);
    }

    const responseData = await response.json();
    return responseData;
}

// Registrace uživatele
async function zaregistrovatUzivatele(email, heslo) {
    const data = { email, heslo };
    return fetchData('/register', 'POST', data);
}

// Přihlášení uživatele
async function prihlasitUzivatele(email, heslo) {
    const data = { email, heslo };
    return fetchData('/login', 'POST', data);
}

// Odhlášení uživatele
async function odhlasitUzivatele() {
    return fetchData('/logout', 'POST');
}

// Získání detailů pojištěného podle ID
async function ziskatDetailyPojisteneho(idPojisteneho) {
    return fetchData(`/insured/${idPojisteneho}`, 'GET');
}

// Získání všech pojištěných (pouze pro administrátora)
async function ziskatVsechnyPojistene() {
    return fetchData('/all-insured', 'GET');
}

// Vytvoření nového pojištěného (pouze pro administrátora)
async function vytvoritPojisteneho(dataPojisteneho) {
    return fetchData('/insured', 'POST', dataPojisteneho);
}

// Aktualizace detailů pojištěného podle ID (administrátor nebo sami uživatelé)
async function aktualizovatDetailyPojisteneho(idPojisteneho, aktualizovanaData) {
    return fetchData(`/insured/${idPojisteneho}`, 'PUT', aktualizovanaData);
}

// Vytvoření nového pojištění pro pojištěného
async function vytvoritPojisteni(idPojisteneho, dataPojisteni) {
    return fetchData(`/insured/${idPojisteneho}/insurances`, 'POST', dataPojisteni);
}

// ... Přidejte další funkce pro další API endpointy ...

// Příklad použití
async function main() {
    try {
        const registracniOdpoved = await zaregistrovatUzivatele('uzivatel@priklad.com', 'heslo');
        console.log('Odpověď na registraci:', registracniOdpoved);

        const odpovedNaPrihlaseni = await prihlasitUzivatele('uzivatel@priklad.com', 'heslo');
        console.log('Odpověď na přihlášení:', odpovedNaPrihlaseni);

        const detailyPojisteneho = await ziskatDetailyPojisteneho('id_pojisteneho');
        console.log('Detaily pojištěného:', detailyPojisteneho);

        const vsechnyPojisteni = await ziskatVsechnyPojistene();
        console.log('Všichni pojištění:', vsechnyPojisteni);

        // ... Další volání API ...

    } catch (chyba) {
        console.error('Došlo k chybě:', chyba);
    }
}

main();
