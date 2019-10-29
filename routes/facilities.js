var express = require('express');
var router = express.Router();
var axios = require('axios');
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const tough = require('tough-cookie');
const config = require('../config');
const ReadQueryBuilder = require('../utility/queryBuilderGet');
const QueryTypeEnum = require('../utility/queryTypeEnum');
const EntityEnum = require('../utility/entityEnum');

/**
 * @swagger
 * definition:
 *   Facility:
 *     properties:
 *       roomId:
 *         type: string
 *       roomName:
 *         type: string
 *       roomNumber:
 *         type: string
 *       roomType:
 *         type: string
 *       buildingId:
 *         type: string
 *       buildingName:
 *         type: string
 *       buildingCode:
 *         type: string
 *       campusName:
 *         type: string
 *       isActive:
 *         type: boolean
 *       index:
 *         type: integer
*/

/**
 * @swagger
 * /facilities/campuslist:
 *   get:
 *     tags:
 *       - facilities
 *     description: Returns a list of campus resources.  Valid filter parameters include having no filters, having a single filter value in both the filterfields and the filtervalues boxes (=), having the same number of values in each box (=), and having a single value in the filterfields box and many values in the filtervalues box ("in").
 *     parameters:
 *       - name: filterfields
 *         description: Create comma delimited string for multiple values
 *         in: query
 *         type: string 
 *       - name: filtervalues
 *         description: Create comma delimited string for multiple values
 *         in: query
 *         type: string 
 *       - name: filtertype
 *         description: Select an filtertype
 *         in: query
 *         enum: ["equals_/_in","not_equals/not_in"]
 *         type: string 
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: An array of campuses
 *         schema:
 *           $ref: '#/definitions/Campus'
 */
router.get('/campuslist', (req, res, next) => {
  var qb = new ReadQueryBuilder();
  qb.entity = EntityEnum.CAMPUS;
  qb.addFields(['Id', 'Name', 'IsActive']);
  qb.sort = 'Name';
  qb.queryType = QueryTypeEnum.LIST;
  qb.addFilterFields(req.query.filterfields);
  qb.addFilterValues(req.query.filtervalues);
  if(req.query.filtertype == 'not_equals/not_in'){
    qb.equalityFilter = false;
  };
  const logonUrl = config.defaultApi.url + config.defaultApi.logonEndpoint;
  const campusUrl = config.defaultApi.url + config.defaultApi.campusEndpoint
    +qb.toQueryString();

  const credentialData = {
    username: config.defaultApi.username,
    password: config.defaultApi.password,
  };

  axiosCookieJarSupport(axios);
  const cookieJar = new tough.CookieJar();

  axios.post(logonUrl, credentialData, {
      jar: cookieJar,
      headers: {
        withCredentials: true,
      }
  }).then(function (response) {
    if (response.data !== true) {
      res.sendStatus(401);
    }
    cookieJar.store.getAllCookies(function(err, cookies) {
      if (cookies === undefined) {
        res.send('failed to get cookies after login');
      } else {
        axios.get(campusUrl, {
          jar: cookieJar,
          headers: {
            cookie: cookies.join('; ')
          }
        }).then(function (response) {          
          let campusData = response.data.data;
          let allCampuses = []; 
          for (let i = 0; i < campusData.length; i++) {
            allCampuses[i] = {};
            allCampuses[i].campusId = campusData[i][0];
            allCampuses[i].campusName = campusData[i][1];
            allCampuses[i].isActive = campusData[i][4];
            allCampuses[i].index = i;
          }
          res.setHeader('Content-Type', 'application/json');
          res.send(allCampuses);
        }).catch(function (error) {
          res.send('respond with a resource - error ' + error);
        });
      }
    });
  })
  .catch(function (error) {
    res.send('respond with a resource - error ' + error);
  });
});

/**
 * @swagger
 * /facilities/buildinglist:
 *   get:
 *     tags:
 *       - facilities
 *     description: Returns a list of building resources.  Valid filter parameters include having no filters, having a single filter value in both the filterfields and the filtervalues boxes (=), having the same number of values in each box (=), and having a single value in the filterfields box and many values in the filtervalues box ("in").
 *     parameters:
 *       - name: filterfields
 *         description: Create comma delimited string for multiple values
 *         in: query
 *         type: string 
 *       - name: filtervalues
 *         description: Create comma delimited string for multiple values
 *         in: query
 *         type: string 
 *       - name: filtertype
 *         description: Select an filtertype
 *         in: query
 *         enum: ["equals_/_in","not_equals/not_in"]
 *         type: string 
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: An array of buildings
 *         schema:
 *           $ref: '#/definitions/Building'
 */
router.get('/buildinglist', (req, res, next) => {
  var qb = new ReadQueryBuilder();
  qb.entity = EntityEnum.BUILDING;
  qb.addFields(['Id', 'Name', 'BuildingCode', 'Campus.Name','IsActive']);
  qb.sort = 'Campus.Name%2CName';
  qb.queryType = QueryTypeEnum.LIST;  
  qb.addFilterFields(req.query.filterfields);
  qb.addFilterValues(req.query.filtervalues);
  if(req.query.filtertype == 'not_equals/not_in'){
    qb.equalityFilter = false;
  };
  const logonUrl = config.defaultApi.url + config.defaultApi.logonEndpoint;
  const buildingsUrl = config.defaultApi.url + config.defaultApi.buildingsEndpoint
  +qb.toQueryString();


  const credentialData = {
    username: config.defaultApi.username,
    password: config.defaultApi.password,
  };

  axiosCookieJarSupport(axios);
  const cookieJar = new tough.CookieJar();

  axios.post(logonUrl, credentialData, {
      jar: cookieJar,
      headers: {
        withCredentials: true,
      }
  }).then(function (response) {
    if (response.data !== true) {
      res.sendStatus(401);
    }
    cookieJar.store.getAllCookies(function(err, cookies) {
      if (cookies === undefined) {
        res.send('failed to get cookies after login');
      } else {
        axios.get(buildingsUrl, {
          jar: cookieJar,
          headers: {
            cookie: cookies.join('; ')
          }
        }).then(function (response) {          
          let buildingData = response.data.data;
          let allBuildings = []; 
          for (let i = 0; i < buildingData.length; i++) {
            allBuildings[i] = {};
            allBuildings[i].buildingId = buildingData[i][0];
            allBuildings[i].buildingName = buildingData[i][1];
            allBuildings[i].buildingCode = buildingData[i][2];
            allBuildings[i].campusName = buildingData[i][3];
            allBuildings[i].isActive = buildingData[i][4];
            allBuildings[i].index = i;
          }
          res.setHeader('Content-Type', 'application/json');
          res.send(allBuildings);
        }).catch(function (error) {
          res.send('respond with a resource - error ' + error);
        });
      }
    });
  })
  .catch(function (error) {
    res.send('respond with a resource - error ' + error);
  });
});

/**
 * @swagger
 * /facilities/roomlist:
 *   get:
 *     tags:
 *       - facilities
 *     description: Returns a list of building resources.  Valid filter parameters include having no filters, having a single filter value in both the filterfields and the filtervalues boxes (=), having the same number of values in each box (=), and having a single value in the filterfields box and many values in the filtervalues box ("in").
 *     parameters:
 *       - name: filterfields
 *         description: Create comma delimited string for multiple values
 *         in: query
 *         type: string 
 *       - name: filtervalues
 *         description: Create comma delimited string for multiple values
 *         in: query
 *         type: string 
 *       - name: filtertype
 *         description: Select an filtertype
 *         in: query
 *         enum: ["equals_/_in","not_equals/not_in"]
 *         type: string 
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: An array of rooms
 *         schema:
 *           $ref: '#/definitions/room'
 */
router.get('/roomlist', (req, res, next) => {
  
  var qb = new ReadQueryBuilder();
  qb.entity = EntityEnum.ROOM;
  qb.addFields(['Id', 'Name', 'roomNumber', 'RoomType.Name']);
  qb.addFields(['Building.Name', 'Building.BuildingCode', 'MaxOccupancy', 'IsActive']);
  qb.sort = '%2BBuilding.Name,Name';
  qb.queryType = QueryTypeEnum.LIST;  
  qb.addFilterFields(req.query.filterfields);
  qb.addFilterValues(req.query.filtervalues);
  if(req.query.filtertype == 'not_equals/not_in'){
    qb.equalityFilter = false;
  };
  const logonUrl = config.defaultApi.url + config.defaultApi.logonEndpoint;
  const roomsUrl = config.defaultApi.url + config.defaultApi.roomsEndpoint
    +qb.toQueryString();

  const credentialData = {
    username: config.defaultApi.username,
    password: config.defaultApi.password,
  };

  axiosCookieJarSupport(axios);
  const cookieJar = new tough.CookieJar();

  axios.post(logonUrl, credentialData, {
      jar: cookieJar,
      headers: {
        withCredentials: true,
      }
  }).then(function (response) {
    if (response.data !== true) {
      res.sendStatus(401);
    }
    cookieJar.store.getAllCookies(function(err, cookies) {
      if (cookies === undefined) {
        res.send('failed to get cookies after login');
      } else {
        axios.get(roomsUrl, {
          jar: cookieJar,
          headers: {
            cookie: cookies.join('; ')
          }
        }).then(function (response) {          
          let roomData = response.data.data;
          let allrooms = []; 
          for (let i = 0; i < roomData.length; i++) {
            allrooms[i] = {};
            allrooms[i].roomId = roomData[i][0];
            allrooms[i].roomName = roomData[i][1];
            allrooms[i].roomNumber = roomData[i][2];
            allrooms[i].roomType = roomData[i][3];
            allrooms[i].buildingName = roomData[i][4];
            allrooms[i].buildingCode = roomData[i][5];
            allrooms[i].maxOccupancy = roomData[i][6];
            allrooms[i].isActive = roomData[i][7];
            allrooms[i].index = i;
          }
          res.setHeader('Content-Type', 'application/json');
          res.send(allrooms);
        }).catch(function (error) {
          res.send('respond with a resource - error ' + error);
        });
      }
    });
  })
  .catch(function (error) {
    res.send('respond with a resource - error ' + error);
  });
});

/**
 * @swagger
 * /facilities/availroomslist:
 *   get:
 *     tags:
 *       - facilities
 *     description: Returns a list of rooms that do not include the conflicts entered. Use with the findConflicts call to find available event space.
 *     parameters:
 *       - name: Conflicts
 *         description: A comma delimited list of Room Ids
 *         in: query
 *         required: True
 *         type: string 
 *         format: string
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: An array of rooms
 *         schema:
 *           $ref: '#/definitions/room'
 */
router.get('/availroomslist', (req, res, next) => {
  const filterconflicts = req.query.Conflicts;

  var qb = new ReadQueryBuilder();
  qb.entity = EntityEnum.ROOM;
  qb.addFields(['Id', 'Name', 'roomNumber', 'RoomType.Name']);
  qb.addFields(['Building.Name', 'Building.BuildingCode', 'MaxOccupancy', 'IsActive']);
  qb.sort = '%2BBuilding.Name,Name';
  qb.addFilterFields('Id');
  qb.addFilterValues(filterconflicts);
  qb.equalityFilter = false;

  const logonUrl = config.defaultApi.url + config.defaultApi.logonEndpoint;
  const roomsUrl = config.defaultApi.url + config.defaultApi.roomsEndpoint
    +qb.toQueryString();

  const credentialData = {
    username: config.defaultApi.username,
    password: config.defaultApi.password,
  };

  axiosCookieJarSupport(axios);
  const cookieJar = new tough.CookieJar();

  axios.post(logonUrl, credentialData, {
      jar: cookieJar,
      headers: {
        withCredentials: true,
      }
  }).then(function (response) {
    if (response.data !== true) {
      res.sendStatus(401);
    }
    cookieJar.store.getAllCookies(function(err, cookies) {
      if (cookies === undefined) {
        res.send('failed to get cookies after login');
      } else {
        axios.get(roomsUrl, {
          jar: cookieJar,
          headers: {
            cookie: cookies.join('; ')
          }
        }).then(function (response) {          
          let roomData = response.data.data;
          let allrooms = []; 
          for (let i = 0; i < roomData.length; i++) {
            allrooms[i] = {};
            allrooms[i].roomId = roomData[i][0];
            allrooms[i].roomName = roomData[i][1];
            allrooms[i].roomNumber = roomData[i][2];
            allrooms[i].roomType = roomData[i][3];
            allrooms[i].buildingName = roomData[i][4];
            allrooms[i].buildingCode = roomData[i][5];
            allrooms[i].maxOccupancy = roomData[i][6];
            allrooms[i].isActive = roomData[i][7];
            allrooms[i].index = i;
          }
          res.setHeader('Content-Type', 'application/json');
          res.send(allrooms);
        }).catch(function (error) {
          res.send('respond with a resource - error ' + error);
        });
      }
    });
  })
  .catch(function (error) {
    res.send('respond with a resource - error ' + error);
  });
});



module.exports = router;