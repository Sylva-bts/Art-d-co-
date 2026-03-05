const playersElement = document.getElementById("onlinePlayers");
const userPanel = document.getElementById("userPanel");
const authActions = document.getElementById("authActions");
const paymentForm = document.getElementById("paymentForm");
const paymentResult = document.getElementById("paymentResult");

let players = 12450;
setInterval(() => {
  const change = Math.floor(Math.random() * 8) - 2;
  players = Math.max(12000, players + change);
  playersElement.textContent = players.toLocaleString("fr-FR");
}, 1600);

async function loadProfile() {
  try {
    const response = await fetch("/api/me");
    const data = await response.json();

    if (!data.authenticated) {
      userPanel.innerHTML =
        "<p class='muted'>Connecte-toi avec Google pour personnaliser ton espace joueur.</p>";
      return;
    }

    const { displayName, email, avatar } = data.user;

    authActions.innerHTML = `
      <form method="post" action="/auth/logout">
        <button class="btn btn-outline" type="submit">Déconnexion</button>
      </form>
    `;

    userPanel.innerHTML = `
      <div class="profile-card">
        ${avatar ? `<img src="${avatar}" alt="Avatar de ${displayName}" />` : ""}
        <div>
          <strong>${displayName}</strong>
          <p>${email}</p>
        </div>
      </div>
    `;
  } catch (error) {
    userPanel.innerHTML =
      "<p class='muted'>Impossible de charger ton profil pour le moment.</p>";
  }
}

paymentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  paymentResult.textContent = "Création du paiement en cours...";

  const amount = Number(document.getElementById("amount").value);

  try {
    const response = await fetch("/api/payments/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      paymentResult.textContent = `Erreur: ${data.message || "paiement non créé"}`;
      return;
    }

    const payUrl = data.payment?.result || data.payment?.payLink || "Paiement créé";
    paymentResult.innerHTML = `Paiement créé: <a href="${payUrl}" target="_blank" rel="noopener noreferrer">${payUrl}</a>`;
  } catch (error) {
    paymentResult.textContent = "Erreur réseau pendant la création du paiement.";
  }
});

loadProfile();
