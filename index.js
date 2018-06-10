var express = require('express');
var bodyParser = require('body-parser');
var async = require('async');
var app = express();
var fs = require('fs');
var archiver = require('archiver');
var unzip = require('unzip2');
var portNum = (process.env.PORT || 5000);
var server = app.listen(portNum, function(){
    console.log("Node app is running : " + server.address().port);
});
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json({limit: '700mb'}));
app.use(bodyParser.urlencoded({limit: '700mb', extended: true, parameterLimit:50000}));
app.post('/save', function(req, res){
	try {
		async.waterfall([
			function(callback){
				if (!(fs.existsSync('./public/spool'))){  
					fs.mkdirSync('./public/spool');
				}
				var dat = new Buffer(req.body.b64, 'base64');
				var fileName = req.body.fileName;
				var filePath = './public/spool/' + fileName;
				fs.writeFile(filePath, dat, function(err){
					callback(null, fileName);
				}); 
			}], function (err, result){
				if(err){
					console.log('Error! ' + result);
				} else {
					res.send(result);
				}
			});
	} catch(err) {
		myError(err, res);
	}
});
app.post('/save_zip', function(req, res){
		var retObj = {};
		async.waterfall([
			function(callback){
				var dat = new Buffer(req.body.b64, 'base64');
				var fileName = req.body.fileName;
				var filePath = './data/zip/' + fileName;
				fs.writeFile(filePath, dat, function(err){
					callback(null, filePath);
				});
			},
			function(zipFilePath, callback){
				fs.createReadStream(zipFilePath)
				  .pipe(unzip.Parse())
				  .on('entry', function (entry) {
				    var i = entry.path;
				    var type = entry.type; // 'Directory' or 'File'
				    var size = entry.size;
				    if (i.match(/^examples\/.+/) && type == 'File'){
				    	var fileName = i.replace(/^examples\//g, '');
						var filePath = './public/spool/' + fileName;
						entry.pipe(fs.createWriteStream(filePath));
				    } else if (i == 'annotations.csv'){
				    	var csvData = '';
				    	entry.on('data', function (dat){
				    		csvData += dat;
						});
				    	entry.on('end', function (){
				    		var dat = csvData;
				    		var csvObj = {};
    						var fileList = [];
							var acsv = dat.toString();
							var recs = acsv.split(/\r\n|\r|\n/);
							for (var i = 1; i < recs.length; i++){
								var rec = recs[i].replace(/""/g, '"').replace(/"\{/g, '{').replace(/\}"/g, '}');
								var splits = rec.split(/,/);
								var thisName = splits[0].replace(/"/g, '');
								splits.shift();
								var rec2 = '[' + splits.join(',') + ']';
								if (thisName && thisName.length > 0){
									csvObj[thisName] = JSON.parse(rec2);
									fileList.push(thisName);
								}
								retObj = {csv: csvObj, files: fileList};
							}
				    	});
				    } else {
				      	entry.autodrain();
				    }
				  }).on('close', function(){
						callback(null, retObj);			  	
				  });
			}
		], function (err, result){
			if(err){
				console.log('Error! ' + result);
			} else {
				res.send(result);
			}
		});
});
app.post('/csv2zip', function(req, res){
	try {
		async.waterfall([
			function(callback){
				var csvObj = JSON.parse(req.body.csv);
				createZipFile(csvObj, callback);
			}], function (err, result){
				if(err){
					console.log('Error! ' + result);
				} else {
					res.send(result);
				}
			});
	} catch(err) {
		myError(err, res);
	}
});
module.exports = app;
initDirectory();


function myError(err, res){
    res.send(err);
}

function createZipFile(csvObj, callback){
	var fileName = 'train_' + getRandomStr() + '.zip';
	var filePath = '/data/' + fileName;
	var output = fs.createWriteStream('./public' + filePath);
	output.on('close', function() {
		callback(null, {
			name : fileName,
			url : filePath
		});
	});
	var archive = archiver('zip', {
    	zlib: { level: 9 }
	});
	archive.pipe(output);
	archive.append(csvObj.csv, { name: 'annotations.csv' });
	var data = csvObj.file;
	for (var key in data){
		if (data.hasOwnProperty(key)){
			archive.append(fs.createReadStream('./public/spool/' + key), { name: 'examples/' + key });
		}
	}
	archive.finalize();
}

function initDirectory(){
	if (!(fs.existsSync('./public/spool') && fs.statSync('./public/spool').isDirectory())) fs.mkdirSync('./public/spool');
	if (!(fs.existsSync('./public/data') && fs.statSync('./public/data').isDirectory())) fs.mkdirSync('./public/data');
	if (!(fs.existsSync('./data') && fs.statSync('./data').isDirectory())) fs.mkdirSync('./data');
	if (!(fs.existsSync('./data/zip') && fs.statSync('./data/zip').isDirectory())) fs.mkdirSync('./data/zip');
	console.log('Init Folders');  
}

function getRandomStr(){
	return Math.floor(100000000000000000 * Math.random()).toString(32);
}

