const express  = require('express');
require('dotenv').config();
var MongoClient = require('mongodb').MongoClient;
var cookieParser = require('cookie-parser');
var session = require('express-session');
const {google} = require('googleapis');
var base64 = require('js-base64').Base64;
const cheerio = require('cheerio');
var open = require('open');
var Mailparser = require('mailparser').MailParser;




let savedTk = null;
let typeUser = "";

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
    if(req.session.tokens){
      res.redirect('/dashboard') // Think about on refresh token
    }
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
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.labels'
  ];

  const url = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: 'offline',

    // If you only need one scope you can pass it as a string
    scope: scopes
  });


//This should be ROLE Route(//routes//roles.js)
app.get('/admin',(req, res) =>{
    typeUser = "admin";
    res.sendFile(__dirname + '/views/admin.html')
    
});

  app.get('/intern',(req, res) =>{
    if(req.session.tokens){
      res.redirect('/dashboard') // Think about on refresh token
    }
      typeUser = "intern";
      res.sendFile(__dirname + '/views/intern.html')
  });


  app.get('/auth/admin',(req, res) =>{
    res.redirect(url);
  });

  app.get('/auth/intern',(req, res) =>{
      res.redirect(url);
  });

  app.get('/auth/google/callback', async (req, res) =>{
      //Make async function: async(req,res) =>
       
      
      const {tokens} = await oauth2Client.getToken(req.query.code)
      //console.log(tokens)
      req.session.tokens = tokens	
      oauth2Client.setCredentials(req.session.tokens);

      //This is incorrect to repeate this code mabye put a middleware here:

      var oauth2 = google.oauth2({
        auth: oauth2Client,
        version: 'v2'
      });

      oauth2.userinfo.v2.me.get(function(err, result) {
          if (err) {
            res.json(err);
          } else {
            //Save the user name and type of role in the database
            //the object that will be save will be {name:Musawenkosi Ndela, role: "intern" or "admin"}
            var userData = result.data;
            let dbUserSave = {name : userData.name, role:typeUser};
            //Do not repeat the process of adding the existing user
            dbo.collection("UserRole").find({name:userData.name}).toArray(function(err, result) {
                if (err) throw err;
                if(result.length == 0){
                  dbo.collection("UserRole").insertOne(dbUserSave, function(err, res) {
                    if(err) throw err;
                  });
                }
              });
              
             res.redirect('/dashboard') //This must be a dashboard(views/dashboard)
          }
      });
  });
  oauth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        // store the refresh_token in my database!
        console.log("refresh_token:   " + tokens.refresh_token);
      }
      /*console.log("access_token:   " + tokens.access_token);*/
  });

app.get('/userprofile',(req, res) =>{
      var oauth2 = google.oauth2({
        auth: oauth2Client,
        version: 'v2'
      });

      oauth2.userinfo.v2.me.get(function(err, result) {
          if (err) {
            res.json(err);
          } else {
            res.json(result.data);


          }
      });
})


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
        },
      }, function(err, results) {
        if (err) return console.log('The API returned an error: ' + err);
       // console.log(results)
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




  app.get('/message/:id',(req, res) =>{
        
    //This api call will fetch the mailbody.
    const gmail = google.gmail({version: 'v1',auth: oauth2Client});
    gmail.users.messages.get({
      userId: 'me',
      id: req.params.id,
    }, (err, result) => {
      if(!err){
        var body = result.data.payload.parts[1].body.data;
        //console.log(result.data.payload)
        var htmlBody = base64.decode(body.replace(/-/g, '+').replace(/_/g, '/'));
        //console.log(htmlBody)
        var fullMsg = {id:req.params.id,message:htmlBody};
        res.json(fullMsg);
      }
    });
  });
  
  
/*  (node:11116) UnhandledPromiseRejectionWarning: TypeError: Cannot read property 'replace' of undefined
  at C:\Users\Mdu\Documents\Profile Projects\Receive-Mail\index.js:249:43
  at C:\Users\Mdu\Documents\Profile Projects\Receive-Mail\node_modules\googleapis-common\build\src\apirequest.js:50:53
  at runMicrotasks (<anonymous>)
  at processTicksAndRejections (internal/process/task_queues.js:97:5)
(node:11116) UnhandledPromiseRejectionWarning: Unhandled promise rejection. This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch(). To terminate the node process on unhandled promise rejection, use the CLI flag `--unhandled-rejections=strict` (see https://nodejs.org/api/cli.html#cli_unhandled_rejections_mode). (rejection id: 1)
(node:11116) [DEP0018] DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code.
(node:11116) UnhandledPromiseRejectionWarning: TypeError: Cannot read property 'replace' of undefined
  at C:\Users\Mdu\Documents\Profile Projects\Receive-Mail\index.js:249:43
  at C:\Users\Mdu\Documents\Profile Projects\Receive-Mail\node_modules\googleapis-common\build\src\apirequest.js:50:53
  at runMicrotasks (<anonymous>)
  at processTicksAndRejections (internal/process/task_queues.js:97:5)
(node:11116) UnhandledPromiseRejectionWarning: Unhandled promise rejection. This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch(). To terminate the node process on unhandled promise rejection, use the CLI flag `--unhandled-rejections=strict` (see https://nodejs.org/api/cli.html#cli_unhandled_rejections_mode). (rejection id: 2)
(node:11116) UnhandledPromiseRejectionWarning: TypeError: Cannot read property 'replace' of undefined
  at C:\Users\Mdu\Documents\Profile Projects\Receive-Mail\index.js:249:43
  at C:\Users\Mdu\Documents\Profile Projects\Receive-Mail\node_modules\googleapis-common\build\src\apirequest.js:50:53
  at runMicrotasks (<anonymous>)
  at processTicksAndRejections (internal/process/task_queues.js:97:5)
(node:11116) UnhandledPromiseRejectionWarning: Unhandled promise rejection. This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch(). To terminate the node process on unhandled promise rejection, use the CLI flag `--unhandled-rejections=strict` (see https://nodejs.org/api/cli.html#cli_unhandled_rejections_mode). (rejection id: 3)
(node:11116) UnhandledPromiseRejectionWarning: TypeError: Cannot read property 'replace' of undefined
  at C:\Users\Mdu\Documents\Profile Projects\Receive-Mail\index.js:249:43
  at C:\Users\Mdu\Documents\Profile Projects\Receive-Mail\node_modules\googleapis-common\build\src\apirequest.js:50:53
  at runMicrotasks (<anonymous>)
  at processTicksAndRejections (internal/process/task_queues.js:97:5)
(node:11116) UnhandledPromiseRejectionWarning: Unhandled promise rejection. This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch(). To terminate the node process on unhandled promise rejection, use the CLI flag `--unhandled-rejections=strict` (see https://nodejs.org/api/cli.html#cli_unhandled_rejections_mode). (rejection id: 4)
(node:11116) UnhandledPromiseRejectionWarning: TypeError: Cannot read property 'replace' of undefined
  at C:\Users\Mdu\Documents\Profile Projects\Receive-Mail\index.js:249:43
  at C:\Users\Mdu\Documents\Profile Projects\Receive-Mail\node_modules\googleapis-common\build\src\apirequest.js:50:53
  at runMicrotasks (<anonymous>)
  at processTicksAndRejections (internal/process/task_queues.js:97:5)
(node:11116) UnhandledPromiseRejectionWarning: Unhandled promise rejection. This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch(). To terminate the node process on unhandled promise rejection, use the CLI flag `--unhandled-rejections=strict` (see https://nodejs.org/api/cli.html#cli_unhandled_rejections_mode). (rejection id: 5)
(node:11116) UnhandledPromiseRejectionWarning: TypeError: Cannot read property 'replace' of undefined
  at C:\Users\Mdu\Documents\Profile Projects\Receive-Mail\index.js:249:43
  at C:\Users\Mdu\Documents\Profile Projects\Receive-Mail\node_modules\googleapis-common\build\src\apirequest.js:50:53
  at runMicrotasks (<anonymous>)
  at processTicksAndRejections (internal/process/task_queues.js:97:5)
(node:11116) UnhandledPromiseRejectionWarning: Unhandled promise rejection. This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch(). To terminate the node process on unhandled promise rejection, use the CLI flag `--unhandled-rejections=strict` (see https://nodejs.org/api/cli.html#cli_unhandled_rejections_mode). (rejection id: 6)
(node:11116) UnhandledPromiseRejectionWarning: TypeError: Cannot read property 'replace' of undefined
  at C:\Users\Mdu\Documents\Profile Projects\Receive-Mail\index.js:249:43
  at C:\Users\Mdu\Documents\Profile Projects\Receive-Mail\node_modules\googleapis-common\build\src\apirequest.js:50:53
  at runMicrotasks (<anonymous>)
  at processTicksAndRejections (internal/process/task_queues.js:97:5)
(node:11116) UnhandledPromiseRejectionWarning: Unhandled promise rejection. This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch(). To terminate the node process on unhandled promise rejection, use the CLI flag `--unhandled-rejections=strict` (see https://nodejs.org/api/cli.html#cli_unhandled_rejections_mode). (rejection id: 7)
*/
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