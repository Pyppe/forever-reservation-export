const google = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const calendar = google.calendar('v3');
const auth = require('./client_secret.json').web;
const uuid = require('uuid');
const Cachd = require('cachd');
const reservationCache = new Cachd({
  ttl: 1000*60*30, // max age millis
  maxLength: 2000,
  removalStrategy: 'oldest'
});

var oauth2Client = new OAuth2(auth.client_id, auth.client_secret, 'http://localhost:3000/oauthcallback');

function generateAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'online', // 'online' (default) or 'offline' (gets refresh_token)
    scope: ['https://www.googleapis.com/auth/calendar']
  });
}

function mockEvent() {
  return {
    summary: 'Pyppe testaa',
    location: 'Forever Järvenpää',
    description: 'This is my test line.\n2nd line.',
    start: {
      dateTime: '2016-02-13T09:00:00',
      timeZone: 'Europe/Helsinki'
    },
    end: {
      dateTime: '2016-02-13T09:30:00',
      timeZone: 'Europe/Helsinki'
    },
    iCalUID: 'pyppetestaa@forever-reservations'
  };
}

function fetchEvents(auth, callback) {
  calendar.events.list({
    auth: auth,
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime'
  }, callback);
}



const express = require('express');
const app = express();
app.use(require('body-parser').json());
app.use(require('express-session')({
  genid: req => uuid.v4(),
  resave: false,
  saveUninitialized: true,
  secret: '4iKj57IWuMto4TUMFrsGyGfpJ7ubXW83' // TODO: do not save in git
}));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.get('/', (req, res) => {
  res.send({
    reservationId: req.session.reservationId,
    reservations: reservationCache.get(req.session.reservationId)
  });
});

app.get('/authenticate', (req, res) => {
  req.session['reservationId'] = req.query.id;
  res.redirect(302, generateAuthUrl());
});

app.get('/mock', (req, res) => {
  req.session['reservations'] = ['testing'];
  res.send('session saved?');
});

app.post('/reservations', (req, res) => {
  //res.header("Access-Control-Allow-Origin", "*");
  //res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  const id = uuid.v4();
  reservationCache.set(id, req.body);
  res.send({id: id});
});

app.get('/oauthcallback', (req, res) => {
  oauth2Client.getToken(req.query.code, (err, tokens) => {
    if (!err) {
      oauth2Client.setCredentials(tokens); // TODO: Cannot be global!
      /*
      fetchEvents(oauth2Client, (err, response) => {
        if (err) {
          console.log('The API returned an error: ' + err);
          return;
        }
        var events = response.items;
        res.send(events);
      });
      */

      res.redirect('/');


      /*
      calendar.events.import({
        auth: oauth2Client,
        calendarId: 'primary',
        resource: mockEvent()
      }, (err, response) => {
        if (err) {
          console.error('Error: %o', err);
          res.status(500).send(err);
          return;
        }
        res.send(response);
      });
      */
    }
  });
});


app.listen(3000, () => {
  console.log('Example app listening on port 3000!');
});

