const express  = require('express');
require('dotenv').config();
var MongoClient = require('mongodb').MongoClient;
var cookieParser = require('cookie-parser');
var session = require('express-session');
const {google} = require('googleapis');



let savedTk = null;

const app = express();

app.use(cookieParser());
app.use(session({resave: true,saveUninitialized: true,secret: "secret!"}));
app.use(express.static('script'))

app.listen(process.env.PORT || 3000, function () {
    console.log("Listening on port " + process.env.PORT);
})

MongoClient.connect(process.env.MONGODB_CONNECTION_STRING, {useUnifiedTopology: true},(err, db) => {
  if (err) throw err;
  var dbo = db.db("ReceiveMail");


  app.get('/', function (req, res) {
    res.sendFile(__dirname + '/views/index.html') //this must be (/login)  
  })


  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_KEY,
    'http://localhost:3000/auth/google/callback'
  );

  // generate a url that asks permissions for Blogger and Google Calendar scopes
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  const url = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: 'offline',

    // If you only need one scope you can pass it as a string
    scope: scopes
  });



  app.get('/auth/google',(req, res) =>{
      res.redirect(url);
  });

  app.get('/auth/google/callback', async (req, res) =>{
      //Make async function: async(req,res) =>
       
      
      const {tokens} = await oauth2Client.getToken(req.query.code)
      //console.log(tokens)
      req.session.tokens = tokens	
      oauth2Client.setCredentials(req.session.tokens);
      res.redirect('/dashboard') //This must be a dashboard(views/dashboard)
  });
  oauth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        // store the refresh_token in my database!
        console.log("refresh_token:   " + tokens.refresh_token);
      }
      /*console.log("access_token:   " + tokens.access_token);*/
  });



  app.get('/messages',(req, res) =>{
  	let msgArr = null;
  	let msgArrData = []
  	//Do not forget to use refresh token or get new tokens
    if(req.session.tokens){
      oauth2Client.setCredentials(req.session.tokens);  
    }else{
      //stored refresh token
      //oauth2Client.setCredentials({refresh_token:});
      res.redirect('/dashboard') // Think about on refresh token
    }

  	//every gmail method or api must be inside a function
      const gmail = google.gmail({version: 'v1',auth: oauth2Client});

      gmail.users.messages.list({
          userId: 'me',
          q: 'from:(@littlepig.cc)' // PLEASE CHECK IF A PERSON DOES HAVE littlepig senders or people who will send littlepig email
      }, (err, results) => {
          if (err) return console.log('The API returned an error: ' + err);
          //console.log(results)
          res.json(results.data)
          //res.json(msgArr[0].id)
          //Get All Messages that are from a specific sender(@littlepigcc.co.za)
          //console.log(getAllMsgFrmSender(msgArr, '@littlepig.cc'))
      });
      
  });

  app.get('/messages/:id',(req, res) =>{
  	if(req.session.tokens){
      oauth2Client.setCredentials(req.session.tokens);  
    }else{
      //stored refresh token
      //oauth2Client.setCredentials({refresh_token:});
      res.redirect('/dashboard') // Think about on refresh token
    }
  	
  	const gmail = google.gmail({version: 'v1',auth: oauth2Client});

      gmail.users.messages.get({
        userId: 'me',
        id: req.params.id,
      }, function(err, results) {
        if (err) return console.log('The API returned an error: ' + err);
        //console.log(results)
         res.json(results.data)
      });
  });

app.get('/removeLabel/:id',(req, res) =>{
  	if(req.session.tokens){
      oauth2Client.setCredentials(req.session.tokens);  
    }else{
      //stored refresh token
      //oauth2Client.setCredentials({refresh_token:});
      res.redirect('/dashboard') // Think about on refresh token
    }
  	
  	const gmail = google.gmail({version: 'v1',auth: oauth2Client});

      gmail.users.messages.modify({
        userId: 'me',
        id: req.params.id,
        requestBody: {
          removeLabelIds:["UNREAD"]
        }
      }, function(err, results) {
        if (err) return console.log('The API returned an error: ' + err);
        //console.log(results)
         res.json(results)
      });
  });

  app.get('/dashboard',(req, res) =>{
    if(req.session.tokens){
      res.sendFile(__dirname + '/views/dashboard.html')  
    }else{
      res.redirect('/') // Think about on refresh token
    }
    
  })



  ///Make sure that you solve this:The API returned an error: TypeError: Cannot read property 'access_token' of null


  /*for (var i = 0; i < msgArr.length - 1; i++) {
  			gmail.users.messages.get({
  		      userId: 'me',
  		      id: msgArr[i].id,
  		    }, function(err, results) {
  		      if (err) return console.log('The API returned an error: ' + err);

  		       msgArrData.push(results.data);
  		       res.json(msgArrData)
  		    });
  		}*/
});