const express = require('express')
const app = express()
const bodyParser= require('body-parser')
const MongoClient = require('mongodb').MongoClient


app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
})
app.use(bodyParser.urlencoded({extended: true}))

// app.use(express.static('public'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || 'localhost',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";
if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  // if (mongoURL == null) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];
      // var mongoHost =  '127.0.0.1',
      //     mongoPort =  27017,
      //     mongoDatabase = 'user',
      //     mongoUser, mongoPassword;


  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;
  }
}

var db = null,
    dbDetails = new Object();


var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;
  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      console.log(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

app.get('/', function (req, res) {
  //res.send('used for api only')
  res.sendFile("./index.html", {root:__dirname})
});

app.get('/guestlist', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var g = db.collection('guest');
        g.find().toArray(function(err, doc) {
          if (err) {
            res.status(500).send('Ops did not work');
          }
          console.log(doc)
          res.send('myguest:' + JSON.stringify(doc));
        })
  } else {
    res.send('none');
  }
});

app.post('/sendguest', function (req, res) {
  var name = req.body.name || "unknown",
      phone = req.body.phone || '(empty)',
      comment = req.body.comment || 'none';
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){console.log('error connectiong to mongodb ' + err)});
  }
  if (db) {
    var g = db.collection('guest');
        g.insert({
          name: name,
          phone: phone,
          comment: comment
        }, function(err, result) {
          console.log('result:' + result);
          g.find({name:name}).toArray(function(err, r){
            console.log('r:' + r);
          })
          res.status(200).jsonp({"success": "true"});
        })
  } else {
    res.status(400).jsonp({"success": "false"});
  }
});

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

// initDb(function(err){
//   console.log('Error connecting to Mongo. Message:\n'+err);
// });

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);
