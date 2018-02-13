var db_contour = require('./db_contour.js');

var getTesting = function(req,res){
    
    var q = 'SELECT gid, name, st_x(st_centroid(geom)), st_y(st_centroid(geom)) ';
    q = q + 'FROM contour.amr_state_2010 where gid = 79';

    db_contour.any(q)
	.then(function (data) {

		if (data.length == 0) {
			console.log('\n' + 'no valid record found');
			res.status(400).send({
				'status': 'error',
				'statusCode':'400',
				'statusMessage': '0 records returned!'
			});
			return;
		}
		else {
			params = {
					'API': 'testing',
					'params passed': 'None',
					'Results': data
			};

			res.status(200);
			res.setHeader('Content-Type','application/json');
			res.send(JSON.stringify(params));
			
		}

	})
	.catch(function (err) {
		console.log('\n' + err);
		callback(err, null);
	});

};

module.exports.getTesting = getTesting;