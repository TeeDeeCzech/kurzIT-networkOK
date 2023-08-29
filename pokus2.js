const registrationForm = document.getElementById('registration-form');
const insuredForm = document.getElementById('insured-form');
const successMessage = document.getElementById('registration-success');
const nextButton = document.getElementById('nextButton');
const registerButton = document.getElementById('registerButton');
const displayEmail = document.getElementById('displayRegisteredEmail');
const displayFirstName = document.getElementById('displayFirstName');
const displayLastName = document.getElementById('displayLastName');
const displayStreet = document.getElementById('displayStreet');
const displayCity = document.getElementById('displayCity');
const displayPhone = document.getElementById('displayPhone');
const displayInsuranceType = document.getElementById('displayInsuranceType');

let userId;

nextButton.addEventListener('click', async () => {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;

    const response = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    userId = data.userId;

    displayEmail.textContent = email;

    // Automatically log in the user after successful registration
    const loginResponse = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });

    if (!loginResponse.ok) {
        console.error('Login after registration failed');
        return;
    }

    // Proceed to the next step
    registrationForm.style.display = 'none';
    insuredForm.style.display = 'block';
});

// ...

registerButton.addEventListener('click', async () => {
    const firstName = document.getElementById('firstNameInput').value;
    const lastName = document.getElementById('lastNameInput').value;
    const street = document.getElementById('streetInput').value;
    const city = document.getElementById('cityInput').value;
    const phone = parseInt(document.getElementById('phoneInput').value); // Změna zde
    const insuranceType = document.getElementById('insuranceTypeInput').value;

    const insuredData = {
        firstName,
        lastName,
        street,
        city,
        phone,
        isAdmin: false,
    };

    const response = await fetch('http://localhost:3000/api/insured', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(insuredData)
    });

    // ...



    // Create insurance data
    const insuranceData = {
        type: insuranceType,
        amount: 1,
        validFrom: new Date().toISOString(),
        validTo: new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate()).toISOString(),
    };

    const insuranceResponse = await fetch(`http://localhost:3000/api/insured/${userId}/insurances`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(insuranceData)
    });

    // Display the entered data
    displayFirstName.textContent = firstName;
    displayLastName.textContent = lastName;
    displayStreet.textContent = street;
    displayCity.textContent = city;
    displayPhone.textContent = phone;
    displayInsuranceType.textContent = insuranceType;

    // Hide the form and show success message
    insuredForm.style.display = 'none';
    successMessage.style.display = 'block';
});





