const path = require("path");
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
require("dotenv").config();

const {
  PORT = 4173,
  MONGODB_URI,
  SESSION_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL = "http://localhost:4173/auth/google/callback",
  OXAPAY_MERCHANT_API_KEY
} = process.env;

if (!MONGODB_URI || !SESSION_SECRET || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error(
    "Missing required environment variables. Check .env.example and provide MONGODB_URI, SESSION_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET."
  );
  process.exit(1);
}

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    displayName: { type: String, required: true },
    avatar: { type: String }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || "";
        const avatar = profile.photos?.[0]?.value || "";

        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.create({
            googleId: profile.id,
            displayName: profile.displayName || "Utilisateur",
            email,
            avatar
          });
        }

        done(null, user);
      } catch (error) {
        done(error);
      }
    }
  )
);

const app = express();

function normalizePayLink(payload) {
  return payload?.payLink || payload?.result || payload?.trackId || null;
}

async function requestOxaPay(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch("https://api.oxapay.com/merchants/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant: OXAPAY_MERCHANT_API_KEY, ...payload }),
      signal: controller.signal
    });

    let data;
    try {
      data = await response.json();
    } catch (_error) {
      data = { message: "Réponse OxaPay illisible." };
    }

    return { response, data };
  } finally {
    clearTimeout(timeout);
  }
}

app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGODB_URI }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      sameSite: "lax"
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/?auth=error"
  }),
  (_req, res) => {
    res.redirect("/?auth=success");
  }
);

app.post("/auth/logout", (req, res, next) => {
  req.logout((error) => {
    if (error) {
      return next(error);
    }
    req.session.destroy(() => {
      res.redirect("/");
    });
  });
});

app.get("/api/me", (req, res) => {
  if (!req.user) {
    return res.json({ authenticated: false });
  }

  return res.json({
    authenticated: true,
    user: {
      displayName: req.user.displayName,
      email: req.user.email,
      avatar: req.user.avatar
    }
  });
});

app.get("/api/payments/health", (_req, res) => {
  res.json({
    ok: true,
    oxapayConfigured: Boolean(OXAPAY_MERCHANT_API_KEY)
  });
});

app.post("/api/payments/create", async (req, res) => {
  try {
    if (!OXAPAY_MERCHANT_API_KEY) {
      return res.status(500).json({
        ok: false,
        message: "OXAPAY_MERCHANT_API_KEY est manquant sur le serveur."
      });
    }

    const amount = Number(req.body.amount);
    const currency = typeof req.body.currency === "string" ? req.body.currency.toUpperCase() : "USD";
    const allowedFiat = new Set(["USD", "EUR"]);

    if (!Number.isFinite(amount) || amount < 1) {
      return res.status(400).json({ ok: false, message: "Montant invalide (minimum 1)." });
    }

    if (!allowedFiat.has(currency)) {
      return res.status(400).json({ ok: false, message: "Devise non supportée." });
    }

    const payload = {
      amount: Number(amount.toFixed(2)),
      currency,
      lifeTime: 30,
      feePaidByPayer: 0,
      underPaidCover: 2.5,
      callbackUrl: `${req.protocol}://${req.get("host")}/api/payments/callback`,
      returnUrl: `${req.protocol}://${req.get("host")}/?payment=success`,
      description: "Depot casino",
      orderId: `casino-${Date.now()}`
    };

    if (req.user?.email) {
      payload.email = req.user.email;
    }

    const { response, data } = await requestOxaPay(payload);

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        message: data?.message || "La plateforme OxaPay a refusé la requête.",
        provider: data
      });
    }

    const payLink = normalizePayLink(data);

    if (!payLink) {
      return res.status(502).json({
        ok: false,
        message: "OxaPay n'a pas renvoyé de lien de paiement.",
        provider: data
      });
    }

    return res.json({
      ok: true,
      payment: data,
      payLink
    });
  } catch (error) {
    if (error.name === "AbortError") {
      return res.status(504).json({
        ok: false,
        message: "Timeout lors de la création du paiement OxaPay."
      });
    }

    return res.status(500).json({ ok: false, message: error.message });
  }
});

app.post("/api/payments/callback", (req, res) => {
  console.log("OxaPay callback:", req.body);
  res.status(200).json({ ok: true });
});

app.use(express.static(path.join(__dirname)));

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
