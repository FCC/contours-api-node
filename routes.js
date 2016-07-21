/*
   ____  _____ _____ ______   ______      ______ 
  / __ \|  __ \_   _|  ____| |  ____|__  |  ____|
 | |  | | |__) || | | |__    | |__ ( _ ) | |__   
 | |  | |  ___/ | | |  __|   |  __|/ _ \/\  __|  
 | |__| | |    _| |_| |      | |  | (_>  < |     
  \____/|_|   |_____|_|      |_|   \___/\/_|     

*/

// **********************************************************
// require 

var express = require('express');
var router = express.Router();

var contour = require('./controllers/contour.js');

// **********************************************************
// ext

router.param('ext', function(req, res, next, ext){
	
	console.log('\n app.param ext : ' + ext);
	console.log('\n req.headers.accept before : ' + req.headers.accept);
	
    if (ext === 'json'){
		req.headers.accept = 'application/json';
    } 
	else if (ext === 'jsonp'){
		req.headers.accept = 'application/javascript';
    } 
	else if (ext === 'xml'){
		req.headers.accept = 'application/xml';
    } 
	else {
        req.headers.accept = 'application/json';
    }
	
	console.log('\n req.headers.accept after : ' + req.headers.accept);
	
	next();
});

// **********************************************************
// routes
router.use(function(req, res, next) {

    // log each request to the console
    console.log(new Date().toUTCString(), req.method, req.url);
 
    next(); 
});

// **********************************************************
// folder
router.get('/getTVContourByCallsign\.:ext?', function(req, res) {

	console.log('\n folder.get by Id: ' + req.params.folderId);
	
	contour.getTVContourByCallsign(req, res);
});

router.get('/folder/listParents\(.:ext)?', function(req, res) {
	
	console.log('\n folder.get : ');
	
	folder.getParentFolders(req, res);
});

router.get('/folder/history\(.:ext)?', function(req, res) {
	
	console.log('\n folder.get : ');
	
	folder.history(req, res);
});

router.get('/folder/search/:searchKey\(.:ext)?', function(req, res) {
	
	console.log('\n folder.get : ');
	
	folder.search(req, res);
});


router.post('/folder/create\(.:ext)?', function(req, res){
	
	console.log('\n folder.post : ');
	
	folder.create(req, res);
});

router.put('/folder/rename/:folderId\(.:ext)?', function(req, res){
	
	console.log('\n folder.put : ');
	
	folder.rename(req, res);
});

router.put('/folder/restore/:folderId\(.:ext)?', function(req, res){
	
	console.log('\n folder.put : ');
	
	folder.restore(req, res);
});
	
router.delete('/folder/remove/:folderId\(.:ext)?', function(req, res) {    
	
	console.log('\n folder.delete : ');
	
	folder.remove(req, res);
});

router.delete('/folder/purge/:folderId\(.:ext)?', function(req, res) {    
	
	console.log('\n folder.delete : ');
	
	folder.purge(req, res);
});


// **********************************************************
// file
router.get('/file/findById/:fileId\.:ext?', function(req, res) {

	console.log('\n file.get by Id: ' + req.params.fileId);
	
	file.getFileById(req, res);
});

router.get('/file/history\(.:ext)?', function(req, res) {
	
	console.log('\n file.get : ');
	
	file.history(req, res);
});

router.get('/file/search/:searchKey\(.:ext)?', function(req, res) {
	
	console.log('\n file.get : ');
	
	file.search(req, res);
});


router.post('/file/add\(.:ext)?', function(req, res){
	
	console.log('\n file.post : ');
	
	file.add(req, res);
});


router.put('/file/updateStatus/:fileId\(.:ext)?', function(req, res){

	console.log('\n file.put : ');

	file.updateStatus(req, res);
});

router.put('/file/rename/:fileId\(.:ext)?', function(req, res){

	console.log('\n file.put : ');

	file.rename(req, res);
});

router.put('/file/restore/:fileId\(.:ext)?', function(req, res){

	console.log('\n file.put : ');

	file.restore(req, res);
});
	
router.delete('/file/remove/:fileId\(.:ext)?', function(req, res) {    

	console.log('\n file.delete : ');

	file.remove(req, res);
});

router.delete('/file/purge/:fileId\(.:ext)?', function(req, res) {    

	console.log('\n file.delete : ');

	file.purge(req, res);
});

// **********************************************************
// file & folder statistics

router.get('/stats/file/upload/count\(.:ext)?', function(req, res) {
	
	console.log('\n stats.get : ');
	
	stats.fileUploadCount(req, res);
});


// **********************************************************
// exports

module.exports = router;