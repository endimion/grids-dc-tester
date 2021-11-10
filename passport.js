// Part 1, import dependencies
const express = require("express");
const router = express.Router();
const passport = require("passport");
const { Strategy, discoverAndCreateClient } = require("passport-curity");
const http = require("http");
const https = require("https");

// Part 2, configure authentication endpoints
router.get("/login", passport.authenticate("curity"));
router.get("/loginEmail", (req, res) => {
  let emailCookie = req.cookies ? req.cookies.email : undefined;
  let spId = req.cookies ? req.cookies.spId : undefined;
  if (emailCookie === undefined) {
    res.cookie("email", true, { maxAge: 1000, httpOnly: true });
    console.log("cookie created successfully");
  } else {
    // yes, cookie was already present
    console.log("cookie exists", emailCookie);
  }

  res.cookie("spId", spId, { maxAge: 10000, httpOnly: true });

  res.redirect("/login");
});

router.get(
  "/callback",async (req, res, next) => {
    // console.log(req.session)
    // console.log("***************")
    // console.log(req.sessionStore.sessions)
    // console.log(req.sessionStore.sessions)
    // console.log(req.sessionStore)

    let key = Object.keys(req.sessionStore.sessions)[0];
    let oidcSession = JSON.parse(req.sessionStore.sessions[key])[
      "oidc:dss1.aegean.gr"
    ];
    req.session["oidc:dss1.aegean.gr"] = oidcSession;
    next();
  },
  passport.authenticate("curity", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/user");
  }
);

// Part 3, configuration of Passport
const getConfiguredPassport = async () => {
  // ERASMUS
  // let _issuer_url = process.env.ISSUER_URL?process.env.ISSUER_URL:"https://esmo-gateway.eu/auth/realms/SSI"
  // let _client_id = process.env.OIDC_CLIENT_ID?process.env.OIDC_CLIENT_ID:"UAegean-isErasmus"
  // let _client_secret = process.env.OIDC_CLIENT_SECRET?process.env.OIDC_CLIENT_SECRET:"4a3526a2-712f-4dda-a597-4b0c10805a0d"
  // let _redirect_uri = process.env.OIDC_REDIRECT_URI?process.env.OIDC_REDIRECT_URI:"http://localhost:3000/callback"
  //EIDAS
  // let _issuer_url = process.env.ISSUER_URL?process.env.ISSUER_URL:"https://dss1.aegean.gr/auth/realms/SSI"
  // let _client_id = process.env.OIDC_CLIENT_ID?process.env.OIDC_CLIENT_ID:"test-ssi"
  // let _client_secret = process.env.OIDC_CLIENT_SECRET?process.env.OIDC_CLIENT_SECRET:"5da95a22-1eb9-4026-9e5a-2367fa02f8e8"
  // let _redirect_uri = process.env.OIDC_REDIRECT_URI?process.env.OIDC_REDIRECT_URI:"http://localhost:3000/callback"

  // GRIDS-KYB
  let _issuer_url = process.env.ISSUER_URL
    ? process.env.ISSUER_URL
    : "https://dss1.aegean.gr/auth/realms/kyb";
  let _client_id = process.env.OIDC_CLIENT_ID
    ? process.env.OIDC_CLIENT_ID
    : "kompany-3";
  let _client_secret = process.env.OIDC_CLIENT_SECRET
    ? process.env.OIDC_CLIENT_SECRET
    : "d5980dda-512b-4986-afa1-90293adb6b59";
  let _redirect_uri = process.env.OIDC_REDIRECT_URI
    ? process.env.OIDC_REDIRECT_URI
    : "http://localhost:3000/callback";

  console.log({
    issuerUrl: _issuer_url,
    clientID: _client_id,
    clientSecret: _client_secret,
    redirectUris: [_redirect_uri, "http://localhost:3000/callback?email=true"],
  });

  // Part 3a, discover Curity Server metadata and configure the OIDC client
  const client = await discoverAndCreateClient({
    issuerUrl: _issuer_url,
    clientID: _client_id,
    clientSecret: _client_secret,
    redirectUris: [_redirect_uri],
  });

  // Part 3b, configure the passport strategy
  const strategy = new Strategy(
    {
      client,
      params: {
        // scope: "openid UAegean_Disposable_ID",
        // scope: "openid UAegean_myID_Card",
        // scope: "openid UAegean_myeIDAS_ID",
        // scope: "openid UAegean_myeduGAIN_ID",
        scope: "openid",
        // claims: claims,
      },
      fallbackToUserInfoRequest: true,
    },

    async function (accessToken, refreshToken, profile, cb) {
      let getData = new Promise((resolve, reject) => {
        const options = {
          hostname: "dss1.aegean.gr", //_user_info_request,
          // port: _user_info_port,
          path: "/auth/realms/kyb/protocol/openid-connect/userinfo",
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Length": "0",
          },
        };

        const httpsReq = https.request(options, function (res) {
          const chunks = [];
          res.on("data", function (chunk) {
            chunks.push(chunk);
          });
          res.on("end", function () {
            const body = Buffer.concat(chunks);
            console.log("******* USER INFO **********************");
            console.log(body.toString());
            resolve(JSON.parse(body.toString()))
          });
        });
        httpsReq.end();
      });
      let result = await getData
      console.log("the result is")
      console.log(result)
      return cb(null, { ...result });
    }
  );

  // Part 3c, tell passport to use the strategy
  passport.use(strategy);

  // Part 3d, tell passport how to serialize and deserialize user data
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  return passport;
};

// Part 4, export objects
exports = module.exports;
exports.getConfiguredPassport = getConfiguredPassport;
exports.passportController = router;
