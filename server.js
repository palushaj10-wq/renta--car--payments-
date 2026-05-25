const express = require("express");
const Stripe = require("stripe");

const app = express();

app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const BASE_URL = process.env.BASE_URL || "https://renta-car-payments.onrender.com";

app.get("/", (req, res) => {
  res.send("Payment backend running");
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// PRO INSERT PAYMENTS - mos e prish
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { packageId, packageType } = req.body;
    const selectedPackage = packageId || packageType;

    let amount = 490;

    if (selectedPackage === "plus") {
      amount = 990;
    }

    if (selectedPackage === "premium") {
      amount = 1490;
    }

    console.log("PRO INSERT PACKAGE:", selectedPackage);
    console.log("PRO INSERT AMOUNT:", amount);

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
    console.error("CREATE PAYMENT INTENT ERROR:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

// STRIPE CONNECT - krijon konto per Anbieter
app.post("/create-connect-account", async (req, res) => {
  try {
    const { userId, email } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: "userId is required",
      });
    }

    const account = await stripe.accounts.create({
      type: "express",
      country: "CH",
      email: email || undefined,
      metadata: {
        userId,
      },
      capabilities: {
        card_payments: {
          requested: true,
        },
        transfers: {
          requested: true,
        },
      },
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${BASE_URL}/connect/refresh`,
      return_url: `${BASE_URL}/connect/return`,
      type: "account_onboarding",
    });

    res.json({
      stripeAccountId: account.id,
      providerStripeAccountId: account.id,
      onboardingUrl: accountLink.url,
      url: accountLink.url,
    });
  } catch (error) {
    console.error("CREATE CONNECT ACCOUNT ERROR:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

// STRIPE CONNECT - link i ri nese Anbieter e ka account-in
app.post("/create-connect-account-link", async (req, res) => {
  try {
    const { stripeAccountId, providerStripeAccountId } = req.body;
    const accountId = stripeAccountId || providerStripeAccountId;

    if (!accountId) {
      return res.status(400).json({
        error: "stripeAccountId is required",
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${BASE_URL}/connect/refresh`,
      return_url: `${BASE_URL}/connect/return`,
      type: "account_onboarding",
    });

    res.json({
      onboardingUrl: accountLink.url,
      url: accountLink.url,
    });
  } catch (error) {
    console.error("CREATE CONNECT ACCOUNT LINK ERROR:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

// BOOKING PAYMENT - pagesa e rezervimit shkon te Anbieter
app.post("/create-booking-payment-intent", async (req, res) => {
  try {
    const {
      amount,
      providerStripeAccountId,
      stripeAccountId,
      bookingId,
      customerId,
      platformFee,
    } = req.body;

    const destination = providerStripeAccountId || stripeAccountId;

    if (!amount || amount < 50) {
      return res.status(400).json({
        error: "Valid amount is required",
      });
    }

    if (!destination) {
      return res.status(400).json({
        error: "providerStripeAccountId is required",
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "chf",
      automatic_payment_methods: {
        enabled: true,
      },
      application_fee_amount: platformFee || 0,
      transfer_data: {
        destination,
      },
      metadata: {
        bookingId: bookingId || "",
        customerId: customerId || "",
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntent: paymentIntent.client_secret,
      paymentIntentClientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("CREATE BOOKING PAYMENT INTENT ERROR:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

app.get("/connect/refresh", (req, res) => {
  res.send("Stripe Connect onboarding needs to be restarted. Please return to the app.");
});

app.get("/connect/return", (req, res) => {
  res.send("Stripe Connect onboarding completed. You can return to the app.");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
