const payBtn = document.getElementById('pay-btn');
const message = document.getElementById('message');
const paymentForm = document.getElementById('payment-form');

function setMessage(text, error = false) {
  message.textContent = text;
  message.className = error ? 'error' : 'ok';
}

paymentForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const amount = Number(document.getElementById('amount').value);

  if (!Number.isFinite(amount) || amount <= 0) {
    setMessage('Montant invalide.', true);
    return;
  }

  payBtn.disabled = true;
  payBtn.textContent = 'Chargement...';
  setMessage('');

  try {
    const res = await fetch('/api/payments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });

    const data = await res.json();

    if (!res.ok || !data.payLink) {
      throw new Error(data.message || 'Impossible de créer la transaction.');
    }

    window.location.href = data.payLink;
  } catch (error) {
    setMessage(error.message, true);
  } finally {
    payBtn.disabled = false;
    payBtn.textContent = 'Payer maintenant';
  }
});
