"use strict";

var axios = require('axios');
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const tough = require('tough-cookie');
const config = require('../config');

module.exports = class CredentialedQuery {

  constructor() { }

  async login() {
    console.log('Logging in');
    const logonUrl = config.defaultApi.url + config.defaultApi.logonEndpoint;

    const credentialData = {
      username: config.defaultApi.username,
      password: config.defaultApi.password,
    };

    axiosCookieJarSupport(axios);
    const cookieJar = new tough.CookieJar();

    var promise = new Promise(function (resolve, reject) {
      axios.post(logonUrl, credentialData, {
        jar: cookieJar,
        headers: {
          withCredentials: true,
        }
      }).then(function (response) {
        if (response.data !== true) {
          res.sendStatus(401);
          reject('Login request failed'); // need test
        } else {
          cookieJar.store.getAllCookies(function (err, cookies) {
            if (cookies === undefined) {
              res.send('failed to get cookies after login');
              reject('Cookie error'); // need test
            } else {
              console.log('Login successful');
              resolve({ cookies, cookieJar });
            }
          });
        }
      }).catch(function (error) {
        console.log(error);
        reject('respond with a resource - error ' + error);
      });
    });

    return promise;
  }

  async get(url, res, cookies = null, cookieJar = null) {
    if (cookies == null || cookieJar == null) {
      var login = await this.login();
      cookies = login.cookies;
      cookieJar = login.cookieJar;
    }

    var promise = new Promise(function (resolve, reject) {
      axios.get(url, {
        jar: cookieJar,
        headers: {
          cookie: cookies.join('; ')
        }
      }).then(function (response) {
        resolve(response);
      }).catch(function (error) {
        console.log(error);
        res.send('respond with a resource - error ' + error);
        reject('failed axios get call');
      });
    });
    return promise;
  }

  async post(url, body, res, cookies = null, cookieJar = null) {
    if (cookies == null || cookieJar == null) {
      var login = await this.login();
      cookies = login.cookies;
      cookieJar = login.cookieJar;
    }

    var promise = new Promise(function (resolve, reject) {
      axios.post(url, body, {
        jar: cookieJar,
        headers: {
          cookie: cookies.join('; ')
        }
      }).then(function (response) {
        resolve(response);
      }).catch(function (error) {
        console.log(error);
        res.send('respond with a resource - error ' + error);
        reject('failed axios post call');
      });
    });

    return promise;
  }
}