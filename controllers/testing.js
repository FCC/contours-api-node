
var getTesting = function(req,res){
    
    res.status(200);
    res.send('Responce from testing.json API is successful!');
};

module.exports.getTesting = getTesting;