const path = require('path');

require('dotenv').config({ path:path.join(__dirname,'.env') });

const
  express     = require('express'),
  logger      = require('morgan'),
  bodyParser  = require('body-parser'),
  io          = require('socket.io')(),
  passport    = require('passport'),
  cors        = require('cors'),
  helmet      = require('helmet'),
  ioAuth      = require('./io-config/io-auth'),
  Logger      = require('./libs/Logger'),
  app         = express();

global.Logger = Logger;

require('./Models/Models');
require('./cron/removeNotActivatedAccounts');
require('./cron/mysqlBackup');
require('./cron/removeDeletedMessages');
require('./io-config/io-main')(io);

io.use(ioAuth(io));

const 
  register      = require('./routes/register'),
  login         = require('./routes/login')(io),
  search        = require('./routes/search'),
  messages      = require('./routes/messages'),
  users         = require('./routes/users')(io),
  notifications = require('./routes/notifications')(io),
  friends       = require('./routes/friends')(io);

process.on('unhandledRejection',(reason) => {
  console.error(reason);
  process.exit();
});

app.enable('trust proxy');
app.use(helmet());

if ( process.env.ENV_MODE !== 'production' ) {
  app.use(logger('dev'));
}

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());

passport.use(require('./utils/passport/passport-strategy'));

// API Routes
app.use('/api/register',register);
app.use('/api/login',login);
app.use('/api/search',search);
app.use('/api/notifications',notifications);
app.use('/api/friends',friends);
app.use('/api/messages',messages);
app.use('/api/users',users);

app.use((req, res, next) => {
  const err = new Error('Page Not Found');
  err.status = 404;

  next(err);
});

app.use((err, req, res, next) => {
  res.status(err.status || 500);

  if ( err.errorCode ) {
    return res.json(err);
  }

  res.json({
    msg:err.message,
    status:err.status,
    err:err
  });
});

app.io = io;

module.exports = app;