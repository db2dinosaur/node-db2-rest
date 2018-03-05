// server bits:
const express = require('express');
const app = express();
const path = require('path');
var config = require('./config.json')
// requestor bits:
var http = require('http');
var url  = require('url');

// Instance specific config from config.json
var servport = config.servport;
var host = config.host;
var port = config.port;
var coll = config.collid;
var user = config.user;
var pwd = config.pwd;
var debug = config.debug;
var pathGetDepartments = '/services/'+coll+'/GetDepartments';
var pathGetEmployeesByDepartment = '/services/'+coll+'/GetEmployeesByDepartment';

// set the default static data service relative directory (i.e. where to get referenced stuff from)
app.use(express.static('public'));
// what to do if we're asked for root URL - default page
app.get('/', (req,res) => res.sendFile(path.join(__dirname,'/public/staff.html')));
// what to do if we're asked for GetDepartments - make a request to DB2 for z/OS REST service
app.post('/GetDepartments', (req,res) => DoGetDepartments(req,res));
// what to do if we're asked for GetEmployeesByDepartment:
// - make sure we've been passed mgr and dept values
// - make a request to DB2 for z/OS REST service
app.post('/GetEmployeesByDepartment', (req,res) => DoGetEmployeesByDepartment(req,res));
// start listening for requests on port 8080
app.listen(servport, () => console.log('serv.js listening on port '+servport));

function DoGetDepartments(req,res) {
	// build string for basic auth header
	var auth = user + ':' + pwd;
	var authstr = new Buffer(auth).toString('base64');
	// create request headers
	var headers = {
		  'Content-Type' : 'application/json',
		  'Accept'       : 'application/json',
		  'Authorization': 'basic ' + authstr
		};
	// create request options
	var options = {
		  host: host,
		  port: port,
		  path: pathGetDepartments,
		  method: 'POST',
		  headers: headers
		};
    var responseString = '';
	if (debug) {
		console.log('Request : http://'+host+':'+port+pathGetDepartments);
	}
	// create request
	var restreq = http.request(options, function(restres) {
	   restres.setEncoding('utf-8');
	   // when we get data back from the request...
	   restres.on('data',function(data) {
		  responseString += data;
	   });
	   // when the request response has finished
	   restres.on('end',function() {
		  if (debug) {
			  console.log('Response from GetDepartments:');
			  console.log(responseString);
		  }
		  res.send(responseString);
	   });
	});
	// initiate the request
	restreq.end();
}

function DoGetEmployeesByDepartment(req,res) {
	// parms supplied in data body, so...
	var data = "";
	req.on('data',function(chunk) {
		data += chunk.toString();
	});
	req.on('end',function() {
		// got the parms, now interpret them by turning it all into an interpretable url:
		var q = url.parse(req.url + '?' + data, true).query;
		if (debug) {
			console.log('GetEmployeesByDepartment using dept = \''+q.dept+'\' & mgr  = \''+q.mgr+'\'');
		}
		if (q.dept == undefined) {
			res.status(500).send('Missing dept parameter');
		} else if (q.mgr == undefined) {
			res.status(500).send('Missing mgr parameter');
		} else {
			// create request data:
			var parms = {
			  'mgr':  q.mgr,
			  'dept': q.dept
			};
			var postData = JSON.stringify(parms);
			// build string for basic auth header
			var auth = user + ':' + pwd;
			var authstr = new Buffer(auth).toString('base64');
			// create request headers
			var headers = {
				  'Content-Type' : 'application/json',
				  'Content-Length': postData.length,
				  'Accept'       : 'application/json',
				  'Authorization': 'basic ' + authstr
				};
			// create request options
			var options = {
				  host: host,
				  port: port,
				  path: pathGetEmployeesByDepartment,
				  method: 'POST',
				  headers: headers
				};
			var responseString = '';
			// create request
			var restreq = http.request(options, function(restres) {
			   restres.setEncoding('utf-8');
			   // when we get data back from the request...
			   restres.on('data',function(data) {
				  responseString += data;
			   });
			   // when the request response has finished
			   restres.on('end',function() {
				  if (debug) {
					  console.log('Response from GetEmployeesByDepartment:');
					  console.log(responseString);
				  }
				  res.send(responseString);
			   });
			});
			// send the request data
			restreq.write(postData);
			// initiate the request
			restreq.end();
		}
	});
}
