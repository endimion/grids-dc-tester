const express = require("express");
const path = require("path");
const app = express();
const findBySPId = require("./service/mongoServ").findBySPId;

// app.set("view engine", "ejs");
const public = path.join(__dirname, `public`);
const mustacheExpress = require("mustache-express");
app.engine("html", mustacheExpress());
app.set("view engine", "html");
app.set("views", __dirname + "/public");
app.use(express.static(public));
app.use("/isErasmus", express.static(public));

const expressSession = require("express-session");

const session = {
  secret: "someSecret",
  cookie: {},
  resave: false,
  saveUninitialized: false,
};

app.use(expressSession(session));

// const indexController = require("./index");
// app.use("/", indexController);

const { getConfiguredPassport, passportController } = require("./passport");

app.post(
  ["/submit-form", "/SSI/submit-form", "/isErasmus/SSI/submit-form"],
  async (req, res) => {
    const email = req.body.userEmail;
    const name = req.body.userName;
    const userAddress = req.body.userAddress;
    const postalCode = req.body.postalCode;
    const cityField = req.body.cityField;
    const countryField = req.body.countryField;

    let user = {
      email: email,
      name: name,
      userAddress: userAddress,
      postalCode: postalCode,
      cityField: cityField,
      countryField: countryField,
    };
    //...
    console.log(email);
    console.log(user);
    let existingUser = await findByEmail(user.email);

    if (existingUser.length <= 0) {
      // let activeCodes = await getActiveCodes();
      // if (activeCodes && activeCodes.length > 0) {
      // let codeToUpdate = activeCodes[0];
      await registerStudentEmail(user);
      // await updateActiveCode(codeToUpdate.code);
      await sendGiftCodeEmail(email);
      res.redirect(
        "https://www.myids-i4mlab.aegean.gr/myid-card-cross-border-field-experiment-june-2021/iced-brew-coffee-for-this-summer"
      );
      // } else {
      //   console.log("no more codes available!");
      //   res.render("expandedViewError", { error: "No more gift cards available" });
      // }
    } else {
      let base = "";
      if (req.originalUrl.indexOf(process.env.BASE_PATH) >= 0) {
        base = process.env.BASE_PATH;
      }

      res.render("expandedViewError", {
        error: `You have already received an email containing the details about receiving a special gift, to express our gratitude for your participation in this experiment. Please visit ${email} to review it.`,
        BASE_URL: base,
      });
    }
  }
);

// free for all Routes
app.get(["/", "/test-ssi/", "/isErasmus/"], (req, res) => {
  const base = process.env.BASE_PATH ? process.env.BASE_PATH : "";
  let viewObject = {};
  if (req.originalUrl.indexOf(process.env.BASE_PATH) >= 0) {
    viewObject.BASE_URL = process.env.BASE_PATH;
  } else {
    viewObject.BASE_URL = "";
  }

  res.render("home", viewObject);
});

app.get("/user", async (req, res) => {
  console.log("we accessed a protected root!");
  // const spId = req.query.spId;

  console.log("req.user");
  console.log(req.session.passport.user);
  // const base = process.env.BASE_PATH?process.env.BASE_PATH:""
  res.render("authenticated",  req.session.passport.user);
});

(async () => {
  const passport = await getConfiguredPassport();
  app.use(passport.initialize());
  app.use(passport.session());
  app.use("/", passportController);

  // const userController = require("./user");
  // app.use("/user", userController);

  app.listen(3000, () => {
    console.log("Server started and listening on port 3000");
  });
})();
