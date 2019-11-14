require('dotenv').config();

var config = {};

config.defaultApi = {
  "url" : process.env.API_SITE || 'site',
  "username" : process.env.API_USER || 'username',
  "password" :  process.env.API_PASSWORD || 'password',
  "logonEndpoint" : 'Logon.ashx',
  "activityListEndpoint": '~api/calendar/activityList?',
  "calendarWeekGridEndpoint": '~api/calendar/CalendarWeekGrid?',
  "eventTypesEndpoint": '~api/query/eventType?',
  "eventMeetingTypesEndpoint": '~api/query/eventMeetingType?',
  "meetingTypesEndpoint": '~api/query/meetingType?',    
  "campusEndpoint": '~api/query/campus?',
  "buildingsEndpoint": '~api/query/building?',
  "roomsEndpoint": '~api/query/room?',
  "entityFeatureEndpoint": '~api/entity/Room/RoomFeatureQuantities/',
  "roomSearchEndpoint": '~api/resources/roomlist?',
  "roleEndpoint": '~api/query/role?',
  "permEndpoint": '~api/query/permission?',
  "students": '~api/query/Student?',
  "pathways": '~api/query/roadmap?',
  "pathwayCourses": '~api/query/VStudentPlanCourseDetail?',
  "studentCourses": '~api/entity/RoadMap/RoadMapCourses/',
  "courseGroupCourses": '~api/entity/CourseGroup/CourseGroupCourses/',
}

module.exports = config;
