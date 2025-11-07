import { loadStripe } from "@stripe/stripe-js";

// Replace this with your actual publishable key from .env
const stripe = await loadStripe("pk_test_51QEAd...your_key_here");

// Create Elements
const elements = stripe.elements();
const cardElement = elements.create("card");
cardElement.mount("#card-element");

const form = document.getElementById("payment-form");
const message = document.getElementById("payment-message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  message.textContent = "Processing...";

  try {
    const res = await fetch("http://localhost:5000/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 5000 }), // $50.00 in cents
    });

    const data = await res.json();

    const { error, paymentIntent } = await stripe.confirmCardPayment(
      data.clientSecret,
      {
        payment_method: {
          card: cardElement,
        },
      }
    );

    if (error) {
      message.textContent = "❌ " + error.message;
    } else if (paymentIntent.status === "succeeded") {
      message.textContent = "✅ Payment successful!";
    }
  } catch (err) {
    console.error(err);
    message.textContent = "Something went wrong.";
  }
});
