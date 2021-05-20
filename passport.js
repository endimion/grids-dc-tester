// Part 0 GRIDS specific
let claims = {
  userinfo: {
    verified_claims: {
      verification: {
        trust_framework: {
          value: "grids_kyb",
        },
        userinfo_endpoint: {
          value: "www.entiyid.com",
        },
        evidence: [
          {
            type: {
              value: "company_register",
            },
            registry: {
              organisation: {
                essential: false,
                purpose: "string",
              },
              country: {
                essential: true,
                purpose: "string",
                value: "ES",
              },
            },
            time: {
              max_age: 31000000,
              essential: true,
              purpose: "string",
            },
            data: {
              essential: true,
              purpose: "string",
            },
            extractURL: {
              essential: true,
              purpose: "string",
            },
            document: {
              SKU: {
                essential: false,
                purpose: "string",
              },
              option: {
                essential: false,
                purpose: "string",
              },
            },
          },
        ],
      },
      claims: {
        family_name: null,
        given_name: null,
        birthdate: null,
        legal_name: null,
        legal_person_identifier: null,
        lei: null,
        vat_registration: null,
        address: null,
        tax_reference: null,
        sic: null,
        business_role: null,
        sub_jurisdiction: null,
        trading_status: null,
      },
    },
  },
  id_token: {
    verified_claims: {
      verification: {
        trust_framework: {
          value: "eidas",
        },
      },
      claims: {
        family_name: null,
        given_name: null,
        birthdate: null,
        person_identifier: null,
        place_of_birth: null,
        address: null,
        gender: null,
      },
    },
  },
};

// Part 1, import dependencies
const express = require("express");
const router = express.Router();
const passport = require("passport");
const { Strategy, discoverAndCreateClient } = require("passport-curity");
const http = require("http");
const https = require("https");

// Part 2, configure authentication endpoints
router.get("/login", passport.authenticate("curity"));
router.get(
  "/callback",
  passport.authenticate("curity", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/user");
  }
);

// Part 3, configuration of Passport
const getConfiguredPassport = async () => {

  let _issuer_url = process.env.ISSUER_URL?process.env.ISSUER_URL:"http://localhost:8081/auth/realms/grids"
  let _client_id = process.env.OIDC_CLIENT_ID?process.env.OIDC_CLIENT_ID:"test"
  let _client_secret = process.env.OIDC_CLIENT_SECRET?process.env.OIDC_CLIENT_SECRET:"29b60ab6-16d0-4d12-9804-397928beb3fa"
  let _redirect_uri = process.env.OIDC_REDIRECT_URI?process.env.OIDC_REDIRECT_URI:"http://localhost:3000/callback"

  console.log({
    issuerUrl: _issuer_url,
    clientID: _client_id,
    clientSecret: _client_secret,
    redirectUris: [_redirect_uri],
  })
  
  // Part 3a, discover Curity Server metadata and configure the OIDC client
  const client = await discoverAndCreateClient({
    issuerUrl: _issuer_url,
    clientID: _client_id,
    clientSecret: _client_secret,
    redirectUris: [_redirect_uri],
  });

 
  let _user_info_request = process.env.USER_INFO?process.env.USER_INFO:"localhost"
  let _user_info_port = process.env.USER_INFO_PORT?process.env.USER_INFO_PORT:"8081"
  // Part 3b, configure the passport strategy
  const strategy = new Strategy(
    {
      client,
      params: {
        scope: "openid profile",
        claims: claims,
      },
      fallbackToUserInfoRequest: true,
    },
  
    function (accessToken, refreshToken, profile, cb) {
      const options = {
        hostname: _user_info_request,
        port: _user_info_port,
        path: "/auth/realms/grids/protocol/openid-connect/userinfo",
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
        });
      });
      httpsReq.end();

      return cb(null, { profile });
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
