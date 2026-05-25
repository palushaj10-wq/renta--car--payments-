const express = require("express");
const Stripe = require("stripe");

const app = express();

app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.get("/", (req, res) => {
  res.send("Payment backend running");
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/create-payment-intent", async (req, res) => {
  try {
    // Merr packageId ose packageType
    const { packageId, packageType } = req.body;

    const selectedPackage = packageId || packageType;

    let amount = 490;

    // PLUS
    if (selectedPackage === "plus") {
      amount = 990;
    }

    // PREMIUM
    if (selectedPackage === "premium") {
      amount = 1490;
    }

    console.log("PACKAGE:", selectedPackage);
    console.log("AMOUNT:", amount);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "chf",
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntent: paymentIntent.client_secret,
      paymentIntentClientSecret: paymentIntent.client_secret,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
