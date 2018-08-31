require('dotenv').config();

const
  express       = require('express'),
  path          = require('path'),
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

app.enable('trust proxy');

const rateLimiter = new RateLimit({
  windowMs: 15*60*1000, // 15 minutes
  max: 100,
  delayMs: 0, // disabled
  db : new MemoryStore()
}).middleware();

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
app.use('/api/login',rateLimiter,login);
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

app.use(function(err, req, res, next) {
  res.status(err.status || 500);

  res.json({
    msg:err.message,
    status:err.status,
    err:err
  });
});

app.io = io;

module.exports = app;