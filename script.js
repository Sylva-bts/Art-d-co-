const playersElement = document.getElementById("onlinePlayers");
const userPanel = document.getElementById("userPanel");
const authActions = document.getElementById("authActions");
const paymentForm = document.getElementById("paymentForm");
const paymentSubmit = document.getElementById("paymentSubmit");
const paymentResult = document.getElementById("paymentResult");
const paymentHealth = document.getElementById("paymentHealth");

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
  } catch (_error) {
    userPanel.innerHTML =
      "<p class='muted'>Impossible de charger ton profil pour le moment.</p>";
  }
}

async function checkPaymentHealth() {
  try {
    const response = await fetch("/api/payments/health");
    const data = await response.json();

    paymentHealth.textContent = data.oxapayConfigured
      ? "OxaPay est configuré sur le serveur ✅"
      : "OxaPay n'est pas configuré sur le serveur ❌";
  } catch (_error) {
    paymentHealth.textContent = "Impossible de vérifier la configuration OxaPay.";
  }
}

paymentForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  paymentSubmit.disabled = true;
  paymentResult.textContent = "Création du paiement en cours...";

  const amount = Number(document.getElementById("amount").value);
  const currency = document.getElementById("currency").value;

  try {
    const response = await fetch("/api/payments/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, currency })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      const providerMessage = data?.provider?.message ? ` (${data.provider.message})` : "";
      paymentResult.textContent = `Erreur: ${data.message || "paiement non créé"}${providerMessage}`;
      return;
    }

    paymentResult.innerHTML = `Paiement créé: <a href="${data.payLink}" target="_blank" rel="noopener noreferrer">Ouvrir le lien de paiement</a>`;
  } catch (_error) {
    paymentResult.textContent = "Erreur réseau pendant la création du paiement.";
  } finally {
    paymentSubmit.disabled = false;
  }
});

loadProfile();
checkPaymentHealth();
