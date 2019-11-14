var express = require('express');
var router = express.Router();
var async = require("async");
var uuidv4 = require('uuidv4').default;
const config = require('../config');
const ReadQueryBuilder = require('../utility/queryBuilderGet');
const QueryTypeEnum = require('../utility/queryTypeEnum');
const CredentialedQuery = require('../utility/credentialedQuery');

/**
 * @swagger
 * /spaces/rooms/availability:
 *   get:
 *     tags:
 *       - rooms
 *     description: Returns all rooms and whether they available for the entire time specified
 *     parameters:
 *       - name: start
 *         description: The beginning date and time 
 *         in: query
 *         required: true
 *         type: string
 *         format: date
 *       - name: end
 *         description: The ending date and time
 *         in: query
 *         required: true
 *         type: string
 *         format: date
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: An array of rooms with their availability specified
 *         schema:
 *           $ref: '#/definitions/Room'
 */
router.get('/rooms/availability', (req, res, next) => {

  // implementation notes: this is a two step process: 
  // 1) get a list of all rooms available at all for the date(s) 
  // 2) find rooms that are unavailable during the actual meeting time

  let filterStartDate = req.query.start;
  let filterEndDate = req.query.end;
  console.log('Starting GET');

  if (!filterStartDate || !filterEndDate) {
    res.sendStatus(400);
  } else {
    var qb = new ReadQueryBuilder();
    qb.sort = '%2BBuilding.Name,Name';
    qb.queryType = QueryTypeEnum.ADVANCED;
    qb.limit = 500;
    // todo RT extend comparison operations in query builder so we can use paramterized field/value pairs instead of this hacky 'advanced' version: 
    var start = `EffectiveStartDate<="${filterStartDate}"`;
    var end = `EffectiveEndDate>="${filterEndDate}"`;
    var doNotSchedule = 'DoNotSchedule == 0';

    qb.advancedFilter = encodeURIComponent(end + '&&' + start + '&&' + doNotSchedule);
    const roomsUrl = config.defaultApi.url + config.defaultApi.roomSearchEndpoint + qb.toQueryString()

    var cq = new CredentialedQuery();
    console.log('Got query object');
    cq.get(roomsUrl, res).then(function (response) {
      console.log('Performing GET');
      let roomData = response.data.data;
      let rooms = [];
      for (let i = 0; i < roomData.length; i++) {
        rooms[i] = {};
        rooms[i].roomId = roomData[i][0];
        rooms[i].roomBuildingAndNumber = roomData[i][1];
        rooms[i].whyIsRoomIdHereTwice = roomData[i][2];
        rooms[i].available = true; // assume this until disproven by retrieving activity list
      }

      // step 2 is to find conflicting activities so we can mark those rooms as not available
      //var secondQuery = new ReadQueryBuilder();
      // temporary hack
      let end2 = encodeURIComponent(filterStartDate);
      let start2 = encodeURIComponent(filterEndDate);
      let secondaryQuery = 'start=0&limit=500&isForWeekView=false' +
        '&fields=ActivityId%2CActivityPk%2CActivityName%2CParentActivityId%2CParentActivityName%2CMeetingType%2CDescription%2CStartDate%2CEndDate%2CDayOfWeek%2CStartMinute%2CEndMinute%2CActivityTypeCode%2CResourceId%2CCampusName%2CBuildingCode%2CRoomNumber%2CRoomName%2CLocationName%2CInstitutionId%2CSectionId%2CSectionPk%2CIsExam%2CIsCrosslist%2CIsAllDay%2CIsPrivate%2CEventId%2CEventPk%2CCurrentState%2CNotAllowedUsageMask%2CUsageColor%2CUsageColorIsPrimary%2CEventTypeColor%2CMaxAttendance%2CActualAttendance%2CCapacity' +
        '&entityProps=&_s=1' +
        `&filter=(((StartDate%3C%22${start2}%22)%26%26(EndDate%3E%22${end2}%22))%26%26((NotAllowedUsageMask%3D%3Dnull)%7C%7C((NotAllowedUsageMask%268)%3D%3D8)))` +
        '&sortOrder=%2BStartDate%2C%2BStartMinute&page=1&group=%7B%22property%22%3A%22StartDate%22%2C%22direction%22%3A%22ASC%22%7D&sort=%5B%7B%22property%22%3A%22StartDate%22%2C%22direction%22%3A%22ASC%22%7D%2C%7B%22property%22%3A%22StartMinute%22%2C%22direction%22%3A%22ASC%22%7D%5D'

      const url = config.defaultApi.url + config.defaultApi.calendarWeekGridEndpoint + secondaryQuery;
      cq.get(url, res).then(function (response) {
        res.setHeader('Content-Type', 'application/json');

        let data = response.data.data;
        let unavailableRooms = [];
        for (let i = 0; i < data.length; i++) {
          let roomId = data[i][13]
          unavailableRooms[i] = roomId;

          // this is brute force O(n^2), might want to consider a more elegant solution
          rooms.forEach(function (item, index) {
            if (item.roomId === roomId) {
              item.available = false;
            }
          })
        }
        res.send(rooms);

      })
        .catch(function (error) {
          res.send(error);
        })
    }).catch(function (error) {
      res.send(error);
    });
  }
});

/**
 * @swagger
 * /spaces/rooms/{roomId}/reservation:
 *   post:
 *     tags:
 *       - rooms
 *     description: Reserve the given room for the time duration specified
 *     parameters:
 *       - name: roomId
 *         description: Unique identifier for the room 
 *         in: path
 *         required: true
 *         type: string
 *         format: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - start
 *               - end
 *               - userName
 *               - userEmail
 *               - name
 *             properties:
 *               start:
 *                 description: The beginning date and time 
 *                 type: string
 *                 format: date
 *               end:
 *                 description: The ending date and time
 *                 type: string
 *                 format: date
 *               userName:
 *                 description: The full name of the user booking the event
 *                 type: string
 *                 format: string
 *               userEmail:
 *                 description: The email of the user booking the event
 *                 type: string
 *                 format: email
 *               name:
 *                 description: The name of the event
 *                 type: string
 *                 format: string
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: An array of rooms with their availability specified
 *         schema:
 *           $ref: '#/definitions/Room'
 */
router.post('/rooms/:roomId/reservation', async (req, res, next) => {
  // INPUTS
  const roomId = req.params.roomId;
  console.log(`roomId: ${roomId}`);
  const userEmail = req.body.userEmail;
  console.log(`userEmail: ${userEmail}`);
  const userName = req.body.userName;
  console.log(`userName: ${userName}`);
  const eventName = req.body.name;
  console.log(`eventName: ${eventName}`);
  const from = new Date(req.body.start);
  console.log(`from: ${from}`);
  const to = new Date(req.body.end);
  console.log(`to: ${to}`);

  const instanceName = config.defaultApi.instanceName;
  const customerName = config.defaultApi.customerName;
  const url = config.defaultApi.url;

  const startMinute = from.getMinutes() + (from.getHours() * 60);
  const endMinute = to.getMinutes() + (to.getHours() * 60);
  const startDate = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const endDate = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const duration = endMinute - startMinute;
  const formattedStartDate = `${from.getFullYear()}-${from.getMonth() + 1}-${from.getDate()}%2000%3A00%3A00`;
  const formattedEndDate = `${to.getFullYear()}-${to.getMonth() + 1}-${to.getDate()}%2000%3A00%3A00`;
  const currentYear = new Date().getFullYear().toString(); // this is needed to craft the request number

  const description = `This event was created by ${userName} (${userEmail}) and automatically created here by the Ad Astra Outlook Add-in.`;

  const eventId = uuidv4();
  const eventMeetingId = uuidv4();
  const eventMeetingResourceId = uuidv4();
  console.log(`eventId: ${eventId}`);
  console.log(`eventMeetingId: ${eventMeetingId}`);
  console.log(`eventMeetingResourceId: ${eventMeetingResourceId}`);

  var cq = new CredentialedQuery();
  var cookies = null;
  var cookieJar = null;
  await cq.login().then((login) => {
    cookies = login.cookies;
    cookieJar = login.cookieJar;
  });

  var qb = new ReadQueryBuilder();
  qb.addFields(['Id', 'Name', 'roomNumber', 'RoomType.Name', 'Building.Name', 'Building.BuildingCode']);
  qb.addFields(['MaxOccupancy', 'IsActive', 'Building.Campus.Name', 'SisKey']);
  qb.addFilterFields('Id');
  qb.addFilterValues(roomId);
  const roomLookupUrl = url + config.defaultApi.roomsEndpoint + qb.toQueryString();

  let roomNumber = '';
  let roomName = '';
  let buildingName = '';
  let buildingCode = '';
  let campusName = '';
  let roomSisKey = '';
  await cq.get(roomLookupUrl, res, cookies, cookieJar).then(function (response) {
    let room = response.data.data[0];
    roomName = room[1];
    roomNumber = room[2];
    buildingName = room[4];
    buildingCode = room[5];
    campusName = room[8];
    roomSisKey = room[9];
    console.log(`roomName: ${roomName}`);
    console.log(`roomNumber: ${roomNumber}`);
    console.log(`buildingName: ${buildingName}`);
    console.log(`buildingCode: ${buildingCode}`);
    console.log(`campusName: ${campusName}`);
    console.log(`roomSisKey: ${roomSisKey}`);
  }).catch((error) => { console.error(error); });

  let roomConfigurationId = '';
  await cq.get(`${url}~api/query/roomconfiguration?fields=Id%2CIsActive&filter=RoomId=="${roomId}"%26%26IsActive==1%26%26IsDefault==1`, res, cookies, cookieJar).then((response) => {
    roomConfigurationId = response.data.data[0][0];
    console.log(`roomConfigurationId: ${roomConfigurationId}`);
  }).catch((error) => { console.error(error); });

  let institutionId = '';
  await cq.get(`${url}~api/query/organization?fields=Id,name,isactive,InstanceName`, res, cookies, cookieJar).then((response) => {
    // Get the ID of the active institution that matches the InstanceName in config
    response.data.data.map((institution) => {
      if (institution[3] == instanceName && institution[2]) {
        institutionId = institution[0];
      }
    });
    console.log(`institutionId: ${institutionId}`);
  }).catch((error) => { console.error(error); });

  let currentMaxRequestNumber = 0;
  await cq.get(`${url}~api/query/eventrequest?fields=RequestNumber&sortOrder=-RequestNumber&Limit=1`, res, cookies, cookieJar).then((response) => {
    response.data.data.map((requestNumber) => {
      let year = requestNumber[0].split('-')[0];
      let number = parseInt(requestNumber[0].split('-')[1]);
      if (year == currentYear && number > currentMaxRequestNumber) {
        currentMaxRequestNumber = number;
      }
    });
    console.log(`currentMaxRequestNumber: ${currentMaxRequestNumber}`);
  }).catch((error) => { console.error(error); });

  const requestNumber = `${currentYear}-${(currentMaxRequestNumber + 1).toString().padStart(5, '0')}`;
  console.log(`requestNumber: ${requestNumber}`);

  let reservationNumber = '';
  await cq.get(`${url}~api/events/GetReservationNumber`, res, cookies, cookieJar).then((response) => {
    reservationNumber = response.data;
    console.log(`reservationNumber: ${reservationNumber}`);
  }).catch((error) => { console.error(error); });

  let customerId = '';
  await cq.get(`${url}~api/query/customer?filter=Name%3D%3D%22${customerName}%22&fields=Id,Name`, res, cookies, cookieJar).then((response) => {
    customerId = response.data.data[0][0];
    console.log(`customerId: ${customerId}`);
  }).catch((error) => { console.error(error); });

  let customerContactId = '';
  let personId = '';
  await cq.get(`${url}~api/query/customercontact?filter=CustomerId%3D%3D%22${customerId}%22%26%26IsActive%3D%3D1%26%26IsPrimaryContact%3D%3D1&fields=Id,PersonId,IsActive`, res, cookies, cookieJar).then((response) => {
    customerContactId = response.data.data[0][0];
    personId = response.data.data[0][1];
    console.log(`customerContactId: ${customerContactId}`);
    console.log(`personId: ${personId}`);
  }).catch((error) => { console.error(error); });

  let customerContactFullName = '';
  await cq.get(`${url}~api/query/people?filter=Id%3D%3D%22${personId}%22%26%26IsActive%3D%3D1&fields=FirstName,LastName`, res, cookies, cookieJar).then((response) => {
    customerContactFullName = `${response.data.data[0][1]}, ${response.data.data[0][0]}`;
    console.log(`customerContactFullName: ${customerContactFullName}`);
  }).catch((error) => { console.error(error); });

  let userId = '';
  await cq.get(`${url}~api/query/user?filter=PersonId%3D%3D%22${personId}%22%26%26IsActive%3D%3D1&fields=Id,UserName,IsActive`, res, cookies, cookieJar).then((response) => {
    userId = response.data.data[0][0];
    console.log(`userId: ${userId}`);
  }).catch((error) => { console.error(error); });

  // TODO Unsure what event type to use for this - is 'Unknown' standard?
  let eventTypeId = '';
  let eventTypeName = '';
  await cq.get(`${url}~api/query/EventType?fields=Id,Name&filter=IsActive%3D%3D1`, res, cookies, cookieJar).then((response) => {
    eventTypeId = response.data.data[0][0];
    eventTypeName = response.data.data[0][1];
    console.log(`eventTypeId: ${eventTypeId}`);
    console.log(`eventTypeName: ${eventTypeName}`);
  }).catch((error) => { console.error(error); });

  await cq.get(`${url}~api/scheduling/adhocroomevent?incRmsWActConflicts=true&showOnlyAvailableRooms=false&startDate=${formattedStartDate}&endDate=${formattedEndDate}&mtgInstances=[{"Id":"${eventId}","MeetingId":"${eventId}","Name":"${eventName}","MeetingDate":"${formattedStartDate}","DayMask":0,"StartMinute":${startMinute},"Duration":${duration},"IsException":false,"IsCancellation":false,"Displayed":false}]&prefRooms=${roomId}&page=1&start=0&limit=25`, res, cookies, cookieJar).then((response) => {
    console.log('Ad hoc room event call succeeded');
  }).catch((error) => { console.error(error); });

  let postBody = JSON.stringify({
    "Event": {
      "+": [
        {
          "Id": eventId,
          "AccountingKey": null,
          "AllowAttendeeSignUp": false,
          "CustomerId": customerId,
          "CustomerName": customerName,
          "Description": description,
          "DoNotifyPrimaryContact": true,
          "EditCounter": 0,
          "EstimatedAttendance": 0,
          "EventRequestId": null,
          "EventTypeId": eventTypeId,
          "EventTypeName": eventTypeName,
          "ExternalDescriptionId": null,
          "InstitutionContactId": null,
          "InstitutionId": institutionId,
          "IsFeatured": false,
          "IsPrivate": false,
          "LastImportedDate": null,
          "LastSisUpdateDate": null,
          "Name": eventName,
          "Notify": null,
          "OwnerId": userId,
          "PrimaryCustomerContactId": customerContactId,
          "CustomerContactId": customerContactId,
          "CustomerName": customerName,
          "CustomerContactName": customerContactFullName,
          "RecordableAttendeeType": 0,
          "RequiresAttention": false,
          "RequiresAttentionReason": null,
          "ReservationNumber": reservationNumber,
          "SisKey": null,
          "WorkflowInstanceId": null,
          "WorkflowIntent": "S",
          "WorkflowIntentOwnerId": userId,
          "NextMeetingNumber": 0,
          "UploadedPictureId": null,
          "EventOwnerName": customerContactFullName,
          "StatusText": "",
          "WorkflowState": null
        }
      ]
    },
    "EventMeeting": {
      "+": [
        {
          "Id": eventMeetingId,
          "CustomerContactId": customerContactId,
          "ActualAttendance": 0,
          "BuildingRoom": `${buildingCode} ${roomName}`,
          "ConflictDesc": "",
          "ConflictsWithHoliday": false,
          "CustomerId": customerId,
          "CustomerName": customerName,
          "DaysMask": 0,
          "Description": null,
          "Duration": duration,
          "EndDate": endDate,
          "EndMinute": endMinute,
          "EventId": eventId,
          "IsException": false,
          "IsFeatured": false,
          "IsPrivate": false,
          "IsRoomRequired": true,
          "IsUsageOutDated": false,
          "LastImportedDate": null,
          "LastSisUpdateDate": null,
          "MaxAttendance": 0,
          "MeetingNumber": 0,
          "Name": eventName,
          "OwnerId": userId,
          "RecurrencePatternId": null,
          "RequiresAttention": false,
          "RequiresAttentionReason": null,
          "ResourcesSummary": "",
          "SisKey": null,
          "StartDate": startDate,
          "StartMinute": startMinute,
          "StatusText": "",
          "WorkflowIntent": "S",
          "WorkflowIntentOwnerId": userId,
          "EventMeetingTypeId": null,
          "EventMeetingGroupId": null,
          "InstitutionContactId": null,
          "AccountingKey": null,
          "EventMeetingTypeName": "",
          "EventRequestMeetingId": "",
          "CustomerContactName": customerContactFullName,
          "WorkflowState": null
        }
      ]
    },
    "EventMeetingResource": {
      "+": [
        {
          "Id": eventMeetingResourceId,
          "ResourceTypeCode": 49,
          "ResourceId": roomConfigurationId,
          "ResourceReservationId": null,
          "SelectedQty": 1,
          "WorkflowIntent": "S",
          "WorkflowIntentOwnerId": userId,
          "WorkflowState": null,
          "UsageTypeCode": 2,
          "EventMeetingId": eventMeetingId,
          "MoveWithMeeting": true,
          "FailedAvailabilityCheck": false,
          "Description": `${buildingCode} ${roomName}`,
          "ScheduledBy": null,
          "ScheduledDate": null,
          "ConflictingActivityId": null,
          "ConflictingActivityTypeCode": null, // !
          "AllowDoubleBookMask": 0, // !
          "SisKey": null,
          "LastSisUpdateDate": null,
          "LastImportedDate": null,
          "RequiresAttention": false,
          "RequiresAttentionReason": null,
          "ResourceName": `${buildingCode} ${roomName}`,
          "CampusName": campusName,
          "StatusText": "",
          "StartDate": null,
          "EndDate": null,
          "StartMinute": startMinute,
          "EndMinute": endMinute
        }
      ]
    }
  });

  await cq.post(`${url}~api/Entity`, postBody, res, cookies, cookieJar).then((response) => {
    console.log('Entity call succeeded');
  }).catch((error) => { console.error(error); });

  await cq.get(`${url}~api/workflow/event?eventId=${eventId}`, res, cookies, cookieJar).then((response) => {
    console.log('Workflow call succeeded');
  }).catch((error) => { console.error(error); });

  // TODO what should we return?
  res.send({ eventId, eventMeetingId, eventMeetingResourceId });
});

module.exports = router;
