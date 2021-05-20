const express = require('express');
const app = express();

app.set("view engine", "ejs");

const expressSession = require('express-session');

const session = {
    secret: "someSecret",
    cookie: {},
    resave: false,
    saveUninitialized: false
  };

app.use(expressSession(session));

const indexController = require('./index');
app.use('/', indexController);

const { getConfiguredPassport, passportController } = require('./passport');

(async () => {
    const passport = await getConfiguredPassport();
    app.use(passport.initialize());
    app.use(passport.session());
    app.use('/', passportController);
    
    const userController = require('./user');
    app.use('/user', userController);
    
    app.listen(3000, () => {
        console.log('Server started and listening on port 3000');
    });
})();