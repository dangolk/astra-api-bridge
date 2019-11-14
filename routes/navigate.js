var express = require('express');
var router = express.Router();
const config = require('../config');
const ReadQueryBuilder = require('../utility/queryBuilderGet');
const QueryTypeEnum = require('../utility/queryTypeEnum');
const CredentialedQuery = require('../utility/credentialedQuery');
/**
* @swagger
* /navigate/students:
*   get:
*     tags:
*       - navigate
*     description: Returns all rooms and whether they available for the entire time specified
*     parameters:
*       - name: student_name
*         description: student name you're interested in
*         in: query
*         type: string
*         format: string
*     produces:
*       - application/json
*     responses:
*       200:
*         description: An array of Building with their availability specified
*         schema:
*           $ref: '#/definitions/Building'
*/
router.get('/students', (req, res, next) => {
  var qb = new ReadQueryBuilder();
  qb.addFields([
    'Id',
    'Person.FirstName',
    'Person.LastName',
  ]);
  qb.sort = 'Person.LastName%2CPerson.FirstName';
  // qb.limit = 100;
  qb.queryType = QueryTypeEnum.ADVANCED;  
  qb._allowUnlimitedResults = true;

  var nameFilter = `((Person.FirstName?="%${req.query.student_name}%")||(Person.LastName?="%${req.query.student_name}%"))`
  var realFilter = '(IsRealStudent==1)';
  var filter = req.query.student_name ? `${nameFilter}&&${realFilter}` : realFilter;
  qb.advancedFilter = encodeURIComponent(filter);
  
  const studentUrl = config.defaultApi.url + config.defaultApi.students + qb.toQueryString();
  console.log(studentUrl);

    var cq = new CredentialedQuery();
    cq.get(studentUrl, res).then(function (response) {         
      let studentData = response.data.data;
      console.log(studentData[0])
      let allStudents = []; 
      for (let i = 0; i < studentData.length; i++) {
        allStudents[i] = {};
        allStudents[i].id = studentData[i][0];
        allStudents[i].firstName = studentData[i][1];
        allStudents[i].lastName = studentData[i][2];
        allStudents[i].index = i;
      }
      allStudents.sort((studentA, studentB) => (studentA.lastName < studentB.lastName) ? -1 : 1);
      res.setHeader('Content-Type', 'application/json');
      res.send(allStudents);

    }).catch(function (error) {
      console.log(error);
      res.send(error);
    });
});
/**
* @swagger
* /navigate/student/courses:
*   get:
*     tags:
*       - navigate
*     description: Returns all rooms and whether they available for the entire time specified
*     parameters:
*       - name: student_id
*         description: student id you're interested in
*         in: query
*         type: string
*         format: string
*     produces:
*       - application/json
*     responses:
*       200:
*         description: An array of Building with their availability specified
*         schema:
*           $ref: '#/definitions/Building'
*/
router.get('/student/courses', (req, res, next) => {
  var qb = new ReadQueryBuilder();
  qb.addFields([
    'StudentId',
    'TermName',
    'TermSortValue',
    'AppliedTermName',
    'Sequence',
    'SequenceSortValue',
    'SubjectCode',
    'CourseNumber',
    'SubjectCourse',
    'CourseGroupName',
    'GroupDisplay',
    'Title',
    'CreditHours',
    'Status',
    'ProductiveCourseTypeCode',
    'ProductiveCourseTypeName',
    'OnTimeCourseTypeCode',
    'OnTimeCourseTypeName'
  ]);
  qb.queryType = QueryTypeEnum.ADVANCED;  
  qb._allowUnlimitedResults = true;
  var student = `(StudentId=="${req.query.student_id}")`;
  qb.advancedFilter = encodeURIComponent(student);
  console.log(qb.toQueryString());
  
  const url = config.defaultApi.url + config.defaultApi.pathwayCourses + '_dc=1573582877920' + qb.toQueryString();
  console.log(url);

    var cq = new CredentialedQuery();
    cq.get(url, res).then(function (response) {         
      let data = response.data.data;
      let all = []; 
      for (let i = 0; i < data.length; i++) {
        all[i] = {};
        all[i].id = data[i][0];
        all[i].term = data[i][1];
        all[i].sequence = data[i][2];
        all[i].status = data[i][13];
        all[i].subject = data[i][6];
        all[i].courseNumber = data[i][7];
        all[i].courseCode = data[i][8];
        all[i].creditHours = data[i][12];
        all[i].index = i;
      }
      all = all.filter(d => d.status !== 'Future' && !d.status.includes('Planned'));
      res.setHeader('Content-Type', 'application/json');
      res.send(all);

    }).catch(function (error) {
      console.log(error);
      res.send(error);
    });
});

/**
* @swagger
* /navigate/pathways:
*   get:
*     tags:
*       - navigate
*     description: Returns all rooms and whether they available for the entire time specified
*     produces:
*       - application/json
*     responses:
*       200:
*         description: An array of Building with their availability specified
*         schema:
*           $ref: '#/definitions/Building'
*/
router.get('/pathways', (req, res, next) => {
  var qb = new ReadQueryBuilder();
  qb.addFields([
    'Id',
    'Name',
    'DegreeCredentialName',
  ]);
  qb.sort = 'Name';
  // qb.limit = 100;
  qb.queryType = QueryTypeEnum.ADVANCED;  
  qb._allowUnlimitedResults = true;

  // var realFilter = `IsRealStudent==1`;
  // qb.advancedFilter = encodeURIComponent(realFilter);
  
  const url = config.defaultApi.url + config.defaultApi.pathways + qb.toQueryString();
  console.log(url);

    var cq = new CredentialedQuery();
    cq.get(url, res).then(function (response) {         
      let data = response.data.data;
      let all = []; 
      for (let i = 0; i < data.length; i++) {
        all[i] = {};
        all[i].id = data[i][0];
        all[i].name = data[i][1];
        all[i].program = data[i][2];
        all[i].index = i;
      }
      all.sort((a, b) => (a.name < b.name) ? -1 : 1);
      res.setHeader('Content-Type', 'application/json');
      res.send(all);

    }).catch(function (error) {
      console.log(error);
      res.send(error);
    });
});

/**
* @swagger
* /navigate/pathway/courses:
*   get:
*     tags:
*       - navigate
*     description: Returns all rooms and whether they available for the entire time specified
*     parameters:
*       - name: pathway_id
*         description: student id you're interested in
*         in: query
*         type: string
*         format: string
*     produces:
*       - application/json
*     responses:
*       200:
*         description: An array of Building with their availability specified
*         schema:
*           $ref: '#/definitions/Building'
*/
router.get('/pathway/courses', async (req, res, next) => {
  var qb = new ReadQueryBuilder();
  qb.queryType = QueryTypeEnum.ADVANCED;  
  qb._allowUnlimitedResults = true;
  
  const url = config.defaultApi.url + config.defaultApi.studentCourses + req.query.pathway_id;

  var cq = new CredentialedQuery();
  try {
    const pathwayResponse = await cq.get(url, res);      
    let data = pathwayResponse.data.data;
    const all = await Promise.all(data.map(async (course) => {
      const isCourseGroup = course.CourseGroupName ? true : false;
      const alternateCourseCode = course.AlternateSubjectCode ? `${course.AlternateSubjectCode} ${course.AlternateCourseNumber}` : '';

      let availableCourses = [];
      if (isCourseGroup) {
        const url = config.defaultApi.url + config.defaultApi.courseGroupCourses + course.CourseGroupId;
        const response = await cq.get(url, res);
        response.data.data.forEach((course) => {
          availableCourses.push(course.CourseName);
        });
      } else {
        availableCourses.push(course.SubjectCourse);
        if (alternateCourseCode) {
          availableCourses.push(alternateCourseCode);
        }
      }

      return {
        isCourseGroup: isCourseGroup,
        id: course.Id,
        name: isCourseGroup ? course.CourseGroupName : course.SubjectCourse,
        courseGroupId: isCourseGroup ? course.CourseGroupId : undefined,
        alternate: isCourseGroup ? course.AlternateCourseGroupName : alternateCourseCode,
        alternateId: course.AlternateCourseGroupId,
        creditHours: course.RequiredCreditHours,
        sequence: course.Sequence,
        prediction: course.PredictivePercent,
        isMileStone: course.IsMileStone,
        isGateway: course.IsGateway,
        availableCourses: availableCourses,
      }
    }));
    all.sort((a,b) => a.sequence < b.sequence ? -1 : 1);
    res.setHeader('Content-Type', 'application/json');
    res.send(all);

  }catch (error) {
    console.log(error);
    res.send(error);
  }
});

module.exports = router;
