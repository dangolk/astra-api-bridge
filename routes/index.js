var express = require('express');
var router = express.Router();
const swaggerJSDoc = require('swagger-jsdoc');
var swaggerUI = require('swagger-ui-express');

var swaggerDefinition = {
  info: {
    title: 'Astra API Bridge',
    version: '0.0.2',
    description: 'This is a RESTful API that layers on top of the Astra Schedule API',
  },
  // host: 'localhost:3000',
  basePath: '/',
};

var swaggerOptions = {
  swaggerDefinition: swaggerDefinition,
  apis: ['./**/routes/*.js','routes.js'],// pass all in array
  };

var swaggerSpec = swaggerJSDoc(swaggerOptions);

router.use('/', swaggerUI.serve);

router.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

router.get('/', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

router.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

module.exports = router;
