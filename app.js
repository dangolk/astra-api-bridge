const serverless = require('serverless-http');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var activitiesRouter = require('./routes/activities');
var activityTypesRouter = require('./routes/activityTypes');
var facilitiesRouter = require('./routes/facilities');
var spacesRouter = require('./routes/spaces');
var userSettingsRouter = require('./routes/userSettings');


var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/activities', activitiesRouter);
app.use('/activity-types', activityTypesRouter);
app.use('/facilities', facilitiesRouter);
app.use('/spaces', spacesRouter);
app.use('/userSettings', userSettingsRouter);

module.exports.handler = serverless(app);
