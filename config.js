require('dotenv').config();

var config = {};

config.defaultApi = {
  "url" : process.env.API_SITE || 'site',
  "username" : process.env.API_USER || 'username',
  "password" :  process.env.API_PASSWORD || 'password',
  "instanceName" :  process.env.INSTANCE_NAME || 'instanceName',
  "customerName" :  process.env.CUSTOMER_NAME || 'Outlook',
  "logonEndpoint" : 'Logon.ashx',
  "activityListEndpoint": '~api/calendar/activityList?',
  "calendarWeekGridEndpoint": '~api/calendar/CalendarWeekGrid?',
  "eventTypesEndpoint": '~api/query/eventType?',
  "eventMeetingTypesEndpoint": '~api/query/eventMeetingType?',
  "meetingTypesEndpoint": '~api/query/meetingType?',    
  "campusEndpoint": '~api/query/campus?',
  "buildingsEndpoint": '~api/query/building?',
  "roomsEndpoint": '~api/query/room?',
  "roomSearchEndpoint": '~api/resources/roomlist?',
  "roleEndpoint": '~api/query/role?',
  "permEndpoint": '~api/query/permission?'
}

module.exports = config;
