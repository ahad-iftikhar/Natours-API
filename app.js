const path = require('path');
const express = require('express');
const morgan = require('morgan');

const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// GLOBAL Middlewares

// Set security HTTP headers
app.use(helmet()); // This wil set security http headers

// Developement Logging
if (process.env.NODE_ENV === 'developement') {
  // reading environement variable and checking if the environment is developement
  app.use(morgan('dev')); // This will just log the data like status code on the console
}

// Limit requestes from same IP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in hour!',
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
// app.use(express.json());
app.use(express.json({ limit: '10kb' })); // Limiting the data to only 10kb

// Data sanitization against NoSQL query injection
app.use(mongoSanitize()); // Preventing from attack, like not giving email while logging instead give a mongo query that always execute to true

// Data sanitization against XSS
app.use(xss()); // Preventing from attact, so that the user don't send any malicious data like html with some JS that will effect our data in DB.

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// Serving static files
// app.use(express.static(`${__dirname}/public`)); // This will create public folder as route folder so anything we request from browser will look in the public folder
app.use(express.static(path.join(__dirname, 'public')));

// app.use((req, res, next) => {
//   console.log('Hello from the middleware');
//   next();
// });

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// Routes
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Didn't find ${req.originalUrl} URL!`,
  // });

  // const err = new Error(`Didn't find ${req.originalUrl} URL!`);
  // err.statusCode = 404;
  // err.status = 'fail';

  // next(err); // If we pass any argument to next it will be considered an error
  next(new AppError(`Didn't find ${req.originalUrl} URL!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
