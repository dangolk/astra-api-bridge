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

    qb.advancedFilter = encodeURIComponent(end + '&&' +  start + '&&' + doNotSchedule);

    const roomsUrl = config.defaultApi.url + config.defaultApi.roomSearchEndpoint + qb.toQueryString()

      var cq = new CredentialedQuery();
      cq.get(roomsUrl, res).then(function (response) {
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
            rooms.forEach(function(item, index) {
              if (item.roomId === roomId) {
                item.available = false;
              }
            })
          }
          res.send(rooms);

        })
        .catch(function(error) {
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
 *         in: query
 *         required: true
 *         type: string
 *         format: string
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
 router.post('/rooms/:id/reservation', async (req, res, next) => {
  const roomId = req.params.id;
  console.log(roomId);
  // const start = req.query.start;
  // const end = req.query.end;

  // INPUTS
  const userEmail = 'DemoUser@aais.com';
  const userName = 'Demo User';
  const eventName = 'Outlook Test Meeting';
  // const from = new Date('2019-08-17 01:00:00.000');
  // const to = new Date('2019-08-17 02:00:00.000');
  // const roomId = '27e57397-1f8d-47e4-85f1-8963899fa0d9';

  // CONFIG
  const institutionName = 'AS8DEMO1'; // todo RT - do we need this???????
  // const baseUrl = 'http://qeapp/SG86044Merced';
  // const username = 'sysadmin'; // I think this is already being config'd in the bridge API
  // const password = 'apple';

    const from = new Date('2019-08-17 01:00:00.000');
    const to = new Date('2019-08-17 02:00:00.000');
    const startDate = from.setHours(0,0,0,0);
    const endDate = to.setHours(0,0,0,0);
    const startMinute = from.getMinutes();
    const endMinute = to.getMinutes();

  // const startDate = start.setHours(0,0,0,0);
  // const endDate = end.setHours(0,0,0,0);
  // const startMinute = start.getMinutes();
  // const endMinute = end.getMinutes();
  console.log(`${startDate} , ${endDate} , ${startMinute} , ${endMinute}`);
  const description = `This event was created by ${userName} (${userEmail}) and automatically created here by the Ad Astra Outlook Add-in.`;
  const currentYear = new Date().getFullYear().toString(); // this is needed to craft the request number

  const customerName = 'Outlook';
  const customerContactName = 'Outlook'; // This is the username, not full name

  const eventId = uuidv4();
  const eventMeetingId = uuidv4();
  const eventRequestId = uuidv4();
  const eventRequestMeetingId = uuidv4();
  const eventMeetingResourceId = uuidv4();

  // axios.defaults.withCredentials = true;
  // axiosCookieJarSupport(axios);
  // const cookieJar = new tough.CookieJar();

  // await axios.post(`${baseUrl}/logon.ashx`, { username, password }, { jar: cookieJar }).then((response) => {
  //     console.log(JSON.stringify(response.data));
  // }).catch((error) => { console.error(error); });

  let roomNumber = '';
  let roomName = '';
  let buildingName = '';
  let buildingCode = '';
  let campusName = '';
  let roomSisKey = '';

  var qb = new ReadQueryBuilder();
  qb.addFields(['Id', 'Name', 'roomNumber', 'RoomType.Name', 'Building.Name', 'Building.BuildingCode']);
  qb.addFields(['MaxOccupancy', 'IsActive', 'Building.Campus.Name', 'SisKey']);
  qb.addFilterFields('Id');
  qb.addFilterValues(roomId);



  var cq = new CredentialedQuery();
  const roomLookupUrl = config.defaultApi.url + config.defaultApi.roomsEndpoint + qb.toQueryString();  
  await cq.get(roomLookupUrl, res).then(function (response) {
    console.log('#### ' + response.data.data); // todo RT remove this 
    let room = response.data.data[0];
    roomName = room[1];
    roomNumber = room[2];
    buildingName = room[4];
    buildingCode = room[5];
    campusName = room[8];
    roomSisKey = room[9];
    console.log(`roomName = ${roomName}`);
    console.log(`roomNumber = ${roomNumber}`);
    console.log(`buildingName = ${buildingName}`);
    console.log(`buildingCode = ${buildingCode}`);
    console.log(`campusName = ${campusName}`);
    console.log(`roomSisKey = ${roomSisKey}`);
  }).catch((error) => { console.error(error); });
  
  let eventRequestFormId = '';
  await cq.get(`${config.defaultApi.url}/~api/query/EventReqForm?fields=Id,Name&filter=IsActive==1`, res).then((response) => {
      eventRequestFormId = response.data.data[0][0];
      console.log(`eventRequestFormId = ${eventRequestFormId}`);
  }).catch((error) => { console.error(error); });


  let roomConfigurationId = '';
  await cq.get(`${config.defaultApi.url}/~api/query/roomconfiguration?fields=Id%2CIsActive&filter=RoomId=="${roomId}"%26%26IsActive==1%26%26IsDefault==1`, res).then((response) => {
      roomConfigurationId = response.data.data[0][0];
      console.log(`roomConfigurationId = ${roomConfigurationId}`);
  }).catch((error) => { console.error(error); });

  // todo RT - need to revisit institution Id?  
  let institutionId = '';
  await cq.get(`${config.defaultApi.url}/~api/query/organization?fields=Id,name,isactive,InstanceName`, res).then((response) => {
      // Only pull active institutions that match the InstanceName
      response.data.data.map((institution) => {
          if (institution[3] == institutionName && institution[2]) {
              institutionId = institution[0];
          }    
      });
      console.log(`institutionId = ${institutionId}`);
  }).catch((error) => { console.error(error); });

    
  let currentMaxRequestNumber = 0;
  await cq.get(`${config.defaultApi.url}/~api/query/eventrequest?fields=RequestNumber&sortOrder=-RequestNumber&Limit=1`, res).then((response) => {
      response.data.data.map((requestNumber) => {
          let year = requestNumber[0].split('-')[0];
          let number = parseInt(requestNumber[0].split('-')[1]);
          if (year == currentYear && number > currentMaxRequestNumber) {
              currentMaxRequestNumber = number;
          }
      });
      console.log(`currentMaxRequestNumber = ${currentMaxRequestNumber}`);
  }).catch((error) => { console.error(error); });

  const requestNumber = `${currentYear}-${(currentMaxRequestNumber + 1).toString().padStart(5, '0')}`;
  console.log(`requestNumber = ${requestNumber}`);

  let reservationNumber = '';
  await cq.get(`${config.defaultApi.url}/~api/events/GetReservationNumber`, res).then((response) => {
      reservationNumber = response.data;
      console.log(`reservationNumber = ${reservationNumber}`);
  }).catch((error) => { console.error(error); });


  let customerId = '';
  await cq.get(`${config.defaultApi.url}/~api/query/customer?filter=Name%3D%3D%22${customerName}%22&fields=Id,Name`, res).then((response) => {
      customerId = response.data.data[0][0];
      console.log(`customerId = ${customerId}`);
  }).catch((error) => { console.error(error); });

  let customerContactId = '';
  await cq.get(`${config.defaultApi.url}/~api/query/user?filter=UserName%3D%3D%22${customerContactName}%22%26%26IsActive%3D%3D1&fields=Id,UserName,IsActive`, res).then((response) => {
      customerContactId = response.data.data[0][0];
      console.log(`customerContactId = ${customerContactId}`);
  }).catch((error) => { console.error(error); });


  // TODO Unsure what event type to use for this - is 'Unknown' standard?
  // await cq.get(`${config.defaultApi.url}/~api/query/EventType?fields=Id,Name&filter=IsActive%3D%3D1`, res).then((response) => {
  //   console.log(response);
  // }).catch((error) => { console.error(error); });

  // let eventTypeId = null; 
  // let eventTypeName = null;
  // console.log(`eventTypeId = ${eventTypeId}`);
  // console.log(`eventTypeName = ${eventTypeName}`);

    const postBody = JSON.stringify({
        "Event": {
            "+": [
                {
                    "Id": eventId,
                    "AccountingKey": null,
                    "AllowAttendeeSignUp": false,
                    "CustomerContactName": customerName,
                    "CustomerContactId": customerContactId,
                    "PrimaryCustomerContactId": customerContactId,
                    "CustomerId": customerId,
                    "CustomerName": customerName,
                    "Description": null, //description,
                    "DoNotifyPrimaryContact": true,
                    "EditCounter": 0,
                    "EstimatedAttendance": 0,
                    "EventOwnerName": "Administrator, System", //"", // ??
                    "EventRequestId": null, //eventRequestId,
                    "EventTypeId": "4c7bc919-329a-4298-a502-c886a2bb2785", //eventTypeId,
                    "EventTypeName": "Administrative", //eventTypeName,
                    "ExternalDescriptionId": null,
                    "InstitutionContactId": null,
                    "InstitutionId": "fceb4a8d-d166-4762-9572-01f91b89b27d",//institutionId,
                    "IsFeatured": false,
                    "IsPrivate": false,
                    "LastImportedDate": null,
                    "LastSisUpdateDate": null,
                    "Name": "Ryan Outlook Test", //"",
                    "Notify": null,
                    "NextMeetingNumber": 0,
                    "OwnerId": customerContactId,
                    "PrimaryCustomerContactId": customerContactId,
                    "RecordableAttendeeType": 0, //null,
                    "RequiresAttention": false,
                    "RequiresAttentionReason": null,
                    "ReservationNumber": reservationNumber,
                    "SisKey": null, //roomSisKey,
                    "StatusText": "",
                    "UploadedPictureId": null,
                    "WorkflowInstanceId": null,
                    "WorkflowIntent": "S",
                    "WorkflowIntentOwnerId": "da30a6dd-04ae-4453-8c53-4622dd2c5da3", //null,
                    "WorkflowState": null
                }
            ]
        },
        "EventRequestMeeting": {
            "+": [
                {
                    "Id": eventRequestMeetingId,
                    "Description": description,
                    "EndDate": endDate,
                    "EndMinute": endMinute,
                    "EventMeetingTypeId": null,
                    "EventReqMeetingGroupId": null,
                    "EventRequestId": eventRequestId,
                    "IsFeaturedEvent": false,
                    "IsPrivateEvent": false,
                    "IsRoomRequired": true,
                    "LastImportedDate": null,
                    "LastSisUpdateDate": null,
                    "MaxAttendance": null,
                    "Name": eventName,
                    "RecurrencePatternId": null,
                    "RequiresAttention": false,
                    "RequiresAttentionReason": null,
                    "RoomConfigurationId": roomConfigurationId, // Not sure if this is needed
                    "SisKey": roomSisKey,
                    "StartDate": startDate,
                    "StartMinute": startMinute
                }
            ]
        },
        "EventMeeting": {
            "+": [
                {
                    "Id": eventMeetingId,
                    "AccountingKey": null,
                    "ActualAttendance": 0, //null,
                    "BuildingRoom": "Adams Hall 102", //`${buildingName} ${roomName}`,
                    "ConflictDesc": "",
                    "ConflictsWithHoliday": false,
                    "CustomerContactId": customerContactId,
                    "CustomerContactName": customerContactName,
                    "CustomerId": customerId,
                    "CustomerName": customerName,
                    "DaysMask": 0, //null,
                    "Description": null,
                    "Duration": 0, //(endMinute - startMinute),
                    "EndDate": "2019-10-16T00:00:00",//endDate,
                    "EndMinute": 1110, //endMinute,
                    "EventId": eventId,
                    "EventMeetingGroupId": null,
                    "EventMeetingTypeId": null,
                    "EventMeetingTypeName": "",
                    "EventRequestMeetingId": "", //eventRequestMeetingId,
                    "InstitutionContactId": null,
                    "IsException": false, //null,
                    "IsFeatured": false,
                    "IsPrivate": false,
                    "IsRoomRequired": true,
                    "IsUsageOutDated": false, //null,
                    "LastImportedDate": null,
                    "LastSisUpdateDate": null,
                    "MaxAttendance": 0, //null,
                    "MeetingNumber": 0,
                    "Name": "Ryan Outlook Test", //eventName,
                    "OwnerId": customerContactId,
                    "RecurrencePatternId": null,
                    "RequiresAttention": false,
                    "RequiresAttentionReason": null,
                    "ResourcesSummary": "",
                    "SisKey": null, // roomSisKey,
                    "StartDate": "2019-10-16T00:00:00", //startDate,
                    "StartMinute": 1080, //startMinute,
                    "StatusText": "",
                    "WorkflowIntent": "S",
                    "WorkflowIntentOwnerId": customerContactId,
                    "WorkflowState": null
                }
            ]
        },
        "EventMeetingResource": {
            "+": [
                {
                    "AllowDoubleBookMask": 0,
                    "CampusName": "", //campusName,
                    "ConflictingActivityId": null,
                    "ConflictingActivityTypeCode": 0,
                    // "CreatedBy": null,
                    "Description":  "Adams Hall 102", //`${buildingName} ${roomName}`,
                    "EndDate": null,          
                    "EndMinute": 0,
                    "EventMeetingId": eventMeetingId,
                    "FailedAvailabilityCheck": false,
                    "Id": eventMeetingResourceId,
                    "LastSisUpdateDate": null,
                    "LastImportedDate": null,
                    // "ModifiedBy": null,
                    "MoveWithMeeting": true,
                    // "Name": "",
                    "RequiresAttention": false,
                    "RequiresAttentionReason": null,
                    "ResourceId": roomConfigurationId,
                    "ResourceName":  "Adams Hall 102",//`${buildingCode} ${roomNumber}`,
                    "ResourceTypeCode": 49, // 49 is the hardcoded code for the Room type
                    "ResourceReservationId": null,
                    "ScheduledBy": null,
                    "ScheduledDate": null,              
                    "SelectedQty": 1,
                    "SisKey": null,
                    "StatusText": "",
                    "StartDate": null,
                    "StartMinute": 0,         
                    "UsageTypeCode": 0, //2, // Need to look into whether this works with a request
                    "WorkflowIntent": "S",
                    "WorkflowIntentOwnerId": customerContactId,
                    "WorkflowState": null
                }
            ]
        }
    });

    console.log(`postBody = ${postBody}`);

    await cq.post(`${config.defaultApi.url}/~api/Entity`, postBody, res).then((response) => {
        console.log(JSON.stringify(response.data));
        res.sendStatus(200);
      }).catch((error) => { console.error(error); });


});


{
	"Event": {
		"+": [{
			  "Id": "761e9671-eb09-11e9-a234-0112467ade44",
			  "ReservationNumber": "20191009-00006",
			  "Name": "Ryan Outlook Test",
			  "WorkflowInstanceId": null,
			  "EditCounter": 0,
			  "WorkflowIntent": "S",
			  "WorkflowIntentOwnerId": "da30a6dd-04ae-4453-8c53-4622dd2c5da3",
			  "WorkflowState": null,
			  "EventTypeId": "4c7bc919-329a-4298-a502-c886a2bb2785",
			  "CustomerId": "b0661fc2-a8ad-11e4-8aab-277e3893bef1",
			  "PrimaryCustomerContactId": "5cbccd60-b892-11e4-a947-17c0833f6baf",
			  "DoNotifyPrimaryContact": true,
			  "EstimatedAttendance": 0,
			  "InstitutionContactId": null,
			  "IsFeatured": false,
			  "IsPrivate": false,
			  "RecordableAttendeeType": 0,
			  "AllowAttendeeSignUp": false,
			  "Description": null,
			  "ExternalDescriptionId": null,
			  "OwnerId": "da30a6dd-04ae-4453-8c53-4622dd2c5da3",
			  "InstitutionId": "fceb4a8d-d166-4762-9572-01f91b89b27d",
			  "EventRequestId": null,
			  "AccountingKey": null,
			  "NextMeetingNumber": 0,
			  "UploadedPictureId": null,
			  "SisKey": null,
			  "LastSisUpdateDate": null,
			  "LastImportedDate": null,
			  "RequiresAttention": false,
			  "RequiresAttentionReason": null,
			  "EventTypeName": "Administrative",
			  "EventOwnerName": "Administrator, System",
			  "CustomerName": "Chi Omega (Chi O)",
			  "CustomerContactName": "Aasness, Albert",
			  "StatusText": "",
			  "CustomerContactId": "5cbccd60-b892-11e4-a947-17c0833f6baf",
			  "Notify": null
		}]
	},
	"EventMeeting": {
		"+": [{
			  "Id": "761e9672-eb09-11e9-a234-0112467ade44",
			  "MeetingNumber": 0,
			  "Name": "Ryan Outlook Test",
			  "EventId": "761e9671-eb09-11e9-a234-0112467ade44",
			  "WorkflowIntent": "S",
			  "WorkflowIntentOwnerId": "da30a6dd-04ae-4453-8c53-4622dd2c5da3",
		  	"WorkflowState": null,
			  "IsRoomRequired": true,
			  "EventMeetingTypeId": null,
			  "EventMeetingGroupId": null,
			  "StartDate": "2019-10-16T00:00:00",
			  "EndDate": "2019-10-16T00:00:00",
			  "DaysMask": 0,
			  "StartMinute": 1080,
			  "EndMinute": 1110,
			  "RecurrencePatternId": null,
			  "MaxAttendance": 0,
			  "ActualAttendance": 0,
			  "CustomerContactId": "5cbccd60-b892-11e4-a947-17c0833f6baf",
			  "InstitutionContactId": null,
			  "IsFeatured": false,
			  "IsPrivate": false,
			  "IsException": false,
			  "Description": null,
			  "OwnerId": "da30a6dd-04ae-4453-8c53-4622dd2c5da3",
			  "AccountingKey": null,
			  "IsUsageOutDated": false,
			  "SisKey": null,
			  "LastSisUpdateDate": null,
			  "LastImportedDate": null,
			  "RequiresAttention": false,
			  "RequiresAttentionReason": null,
			  "BuildingRoom": "Adams Hall 102",
			  "EventMeetingTypeName": "",
			  "EventRequestMeetingId": "",
			  "CustomerName": "",
			  "CustomerId": "",
			  "CustomerContactName": "",
			  "Duration": 0,
			  "StatusText": "",
			  "ConflictsWithHoliday": false,
			  "ConflictDesc": "",
			  "ResourcesSummary": ""
		}]
	},
	"EventMeetingResource": {
		"+": [{
			    "Id": "761e9673-eb09-11e9-a234-0112467ade44",
			    "ResourceTypeCode": 49,
			    "ResourceId": "270d2b74-aa97-4048-bda6-6e9cbd635de5",
          "ResourceReservationId": null,
			    "SelectedQty": 1,
			    "WorkflowIntent": "S",
			    "WorkflowIntentOwnerId": "da30a6dd-04ae-4453-8c53-4622dd2c5da3",
			    "WorkflowState": null,
			    "UsageTypeCode": 0,
			    "EventMeetingId": "761e9672-eb09-11e9-a234-0112467ade44",
			    "MoveWithMeeting": true,
			    "FailedAvailabilityCheck": false,
			    "Description": "Adams Hall 102",
			    "ScheduledBy": null,
			    "ScheduledDate": null,
			    "ConflictingActivityId": null,
			    "ConflictingActivityTypeCode": 0,
			    "AllowDoubleBookMask": 0,
			    "SisKey": null,
			    "LastSisUpdateDate": null,
			    "LastImportedDate": null,
			    "RequiresAttention": false,
			    "RequiresAttentionReason": null,
			    "ResourceName": "Adams Hall 102",
			    "CampusName": "",
			    "StatusText": "",
			    "StartDate": null,
			    "EndDate": null,
			    "StartMinute": 0,
			    "EndMinute": 0
		}]
	}
}
module.exports = router;
