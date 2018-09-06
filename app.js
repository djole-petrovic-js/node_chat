const path = require('path');

require('dotenv').config({ path:path.join(__dirname,'.env') });

const
  express       = require('express'),
  logger        = require('morgan'),
  cookieParser  = require('cookie-parser'),
  bodyParser    = require('body-parser'),
  io            = require('socket.io')(),
  ioPassport    = require('passport.socketio'),
  passport      = require('passport'),
  flash         = require('connect-flash'),
  cors          = require('cors'),
  helmet        = require('helmet'),
  RateLimit     = require('express-rate-limiter'),
  socketioJwt   = require('socketio-jwt'),
  jwtConfig     = require('./utils/passport/passport-jwt-config'),
  Logger        = require('./libs/Logger'),
  MemoryStore   = require('express-rate-limiter/lib/memoryStore'),
  app           = express();

const 
  register      = require('./routes/register'),
  login         = require('./routes/login'),
  search        = require('./routes/search'),
  messages      = require('./routes/messages'),
  users         = require('./routes/users')(io),
  notifications = require('./routes/notifications')(io),
  friends       = require('./routes/friends')(io);

require('./cron/cron');
require('./io-config/io-config')(io);

process.on('unhandledRejection',(reason) => {
  Logger.log(reason,'unhandled_error');
});

const rateLimiter = new RateLimit({
  windowMs: 15*60*1000, // 15 minutes
  max: 100,
  delayMs: 0, // disabled
  db : new MemoryStore()
}).middleware();

app.enable('trust proxy');
app.use(helmet());
app.use(logger('dev'));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(flash());
app.use(passport.initialize());

passport.use(require('./utils/passport/passport-strategy'));

io.use(socketioJwt.authorize({
  secret:jwtConfig.secretOrKey ,
  handshake: true
}));

// API Routes
app.use('/api/register',rateLimiter,register);
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