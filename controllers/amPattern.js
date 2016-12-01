// **********************************************************

'use strict';

// **********************************************************

var dotenv = require('dotenv').load();
var NODE_ENV = process.env.NODE_ENV;
var NODE_PORT =  process.env.PORT;
var host =  process.env.HOST;
var geo_host =  process.env.GEO_HOST;
var geo_space = process.env.GEO_SPACE;
var EFS_ELEVATION_DATASET = process.env.EFS_ELEVATION_DATASET;
var LMS_PG = process.env.LMS_PG;
var LMS_SCHEMA = process.env.LMS_SCHEMA;
var CONTOURS_PG = process.env.CONTOURS_PG;
var CONTOURS_SCHEMA = process.env.CONTOURS_SCHEMA;

var CONTEXT_PATH = process.env.CONTEXT_PATH || 'api/contours/';
if (NODE_ENV == 'DEV' || NODE_ENV == 'LOCAL') {
	var CONTEXT_PATH = '';
}

var mathjs = require('mathjs');
var promise = require('bluebird');
var options = {
  // Initialization Options
  promiseLib: promise
};
var pgp_lms = require('pg-promise')(options);
var pgp_contours = require('pg-promise')(options);


var getBeta = function (phase, spacing, orient, azimuth) {
	var ret = phase + spacing * Math.cos(( azimuth-orient)*Math.PI/180);

	return ret;
}

var getfth = function(theta,ht,a,b,c,d,tls) {
    // Calculate f of theta for all towers
    
    // theta:  vertical angle (radians)
    // ht:     height (radians).
    // a/b/c/d parameters (radian):
           // Interpretation depends on tls.
    // tls: Top-loaded/sectionalized switch
           // 0/Null: Regular tower. 
           // 1: Top-Loaded
           // 2: Sectionalized
           // 3+: Special Sectionalized formulas
	var i, denom, ch, g, asq, g, h, l, s1, c1, cg, cb, sd, cd, csq, casq, numerator, denominator;
	var c_8, d_8, a_1;
    var ntow = ht.length;
    var q = theta // Short-hand reference in formulas.
    var sq = Math.sin(theta);
    var cq = Math.cos(theta);
    var fth = 0;
	var ftheta = [];
	for (i = 0; i < ntow; i++) {
		ftheta.push(1);
	}

	for (i = 0; i < ntow; i++) {
	
		var denom = 1;
		if (!tls[i] || tls[i] === '' || tls[i] === '0') {
			ch = Math.cos(ht[i]);
			denom = cq * (1.0 - ch);
			if (denom != 0) {
				fth = (Math.cos(ht[i] * sq) - ch) / denom;
			}
		}
			
		else if (tls[i]=='1') { // Top Loaded Tower
			g = a[i] + b[i] // a: Physical Hgt, b: TopLoading Hgt. See: 73.160
			asq = a[i] * sq;
			denom = cq * (Math.cos(b[i]) - Math.cos(g));
			if (denom != 0) {
				fth = ( Math.cos(b[i]) * Math.cos(asq) - sq * Math.sin(b[i]) * Math.sin(asq) - Math.cos(g) ) / denom;
			}
		}
		
		else if ( tls[i]=='2') { // Sectionalized Tower
			g = a[i] + b[i]; // a: Physical Hgt, b: TopLoading Hgt. See: 73.160
			h = c[i] + d[i]; // See: 73.160
			l = h - a[i];    // short-hand reference to deLta (from 73.160).
			sl = Math.sin(l);
			cl = Math.cos(l);
			sq = Math.sin(q);
			cg = Math.cos(g);
			cb = Math.cos(b[i]);
			sb = Math.sin(b[i]);
			sd = Math.sin(d[i]);
			cd = Math.cos(d[i]);
			asq = a[i] * sq;
			csq = c[i] * sq;
			casq = Math.cos(asq);
			numerator = sl*cb*casq - sl*cg + sb*cd*Math.cos(csq) - sb*sq*sd*Math.sin(csq) - sb*cl*casq;
			denominator = cq*sl*(cb-cg) + cq*sb*(cd-cl);
			if (denominator != 0) {
				fth = numerator/denominator;
			}
		}
		
		else if (tls[i]=='8') { // Sectionalized, WOC Davenport IA application.
			if (theta <= 0) { 
				fth = 1;
			}
			else {
				// Param C & D were not degrees for this sectionalized type.
				// So we need to reverse the 'radian' conversion. 
				c_8 = toDegrees(c[i]);
				d_8 = toDegrees(d[i]);
				// h[i]: Overall height of tower.
				// a[i]: Bottom section height.
				// b[i]: Top section height.
				// c[i]: Scaling factor to set fth=1 at theta=0. (WOC: 6.81293)
				// d[i]: K1 in A.D. Ring formula: Current(real)/Current(img),
				//                     at point of maximum amplitude.
				a_1 = 1.14 // Velocity of light/ Propagation vel along radiator.

				q = theta;
				cq = Math.cos(q);
				sq = Math.sin(q);
				x_real= -( (2*a_1*cq)/(a_1*a_1 - sq*sq) ) * ( (-Math.cos(a_1 * (b[i]-a[i]))) + (2*Math.cos(a_1*b[i])*Math.cos(a[i]*sq)) - (Math.cos(ht[i]*sq))  );
				inner3terms = Math.sin( a_1*(b[i]-a[i]) ) -  2* Math.sin(a_1*b[i])*Math.cos(a[i]*sq) + sq * Math.sin( ht[i]*sq )/a_1;
				y_imag= (d_8 * cq) * ( Math.sin(ht[i]+sq)/sq + a_1/(a_1*a_1 - sq*sq) * inner3terms );

				fth = Math.sqrt(x_real*x_real + y_imag*y_imag)/c_8;
			}
		}

		else {
			console.log( 'getfth: Cannot handle sectionalized type. ' + tls[i]);
			console.log( theta,ht,a,b,c,d,tls);
		}
		
		ftheta[i]=fth;
	}
	
	return ftheta;

}


var getRMS = function(pwr,fld,spc,orn,trs,phs,hgt,tls,a,b,c,d) {

    // Based on Radiat routines radiat_rms.for and radiat_small_rms.for.
    // Calculate theoretical no-loss constant, via the hemisphere (small) RMS.
    // For equations, see Appendix 2 to Int'l Treaties.
    // Variable names mostly mimic those in am_small_rms.
	
	var i, j, sum1, sum2, sum3, smrms, small_rms;
	
	var vertical_rms=[];

	var spc_orn = towref(spc, orn, trs); //Reference all towers to the first tower.
	var spc = spc_orn.spc;
	var orn = spc_orn.orn; 
	
	var s_psi = deltas(spc, orn, phs);

	var s = s_psi.s;
	var psi = s_psi.psi;
	
	var ntow = spc.length;
	
	var bescos = [];
	for (i = 0; i < ntow; i++) {
		bescos[i] = [];
			for (j = 0; j < ntow; j++) {
				bescos[i].push(0);
			}
	}
	
	sum3 = 0;
	for (var loop = 0; loop < 9; loop++) { // Stepping through vertical angles, every 10 degrees.

		var theta = 90/9 * loop;  // Vertical angle, in deg.
		var vangle = toRadians(theta); // vertical angle, in rad.
		var costhe = Math.cos(vangle);
		var fthetas = getfth(vangle, hgt, a, b, c, d, tls); //F_of_Theta for each tower.

		var ffot = []; // Holds Field Ratio * F_of_Theta data.
		for (i = 0; i < ntow; i++) {
			ffot.push(0);
		}

        for (i = 0; i < ntow; i++) {
			ffot[i] = fld[i] * fthetas[i];
			for (j = 0; j < ntow; j++) {
				bescos[i][j] = Math.cos(psi[i][j]) * bessel(s[i][j]*costhe);
			}
		}

		sum2 = 0;
		for (i = 0; i < ntow; i++) {
			sum1 = 0;
			
            for (j = 0; j < ntow; j++) {
				sum1 = sum1 + ffot[j] * bescos[i][j];
			}

		sum2 = sum2 + sum1 * ffot[i];

		}
		
		smrms = Math.sqrt(Math.abs(sum2));
        vertical_rms.push(smrms);

		if (loop == 0) {
			small_rms = smrms;
			sum3 = vertical_rms[0] * vertical_rms[0]/2;
		}
        else {
			sum3 = sum3 + vertical_rms[loop] * vertical_rms[loop] * costhe;
		}
	}
	
	var hemisphere_rms = Math.sqrt(toRadians(90/9)*sum3)  // num_steps: 9

     // Constant 'con' is given in radiat_rms (DATA TWO44) and based on:
     // "Constants for Directional Antenna Computer PRograms",
     // FCC 73-1096, Mimeo No. 02827, Oct. 26, 1973.

    var con = 244.86423; // = sqrt( 2*rc * 10e3 / 4*pi*r**2) * 10**3

	if (hemisphere_rms != 0) {
		var no_loss_k = con * Math.sqrt(pwr)/hemisphere_rms;
	}
	else {
		no_loss_k = 1;
	}

	var power_losses = curlos(fld, hgt, a, b, c, d, tls, no_loss_k);
	var total_loss = mathjs.sum(power_losses);
	var adj = pwr / (pwr + total_loss); // Adjustment factor for power loss.

	return {"con": no_loss_k * Math.sqrt(adj), "smlrms": small_rms}; // 'K', with loss & small RMS.
	
}




var bessel = function(x) {

     // Calculate Bessel function of first kind, zero order.
      // Accuracy is at least 10e-6.
     // Converted from AMNIGHT routine bessel.for
     // Source of algorithm unknown.
     // Validation: http://www.mhtl.uwaterloo.ca/old/courses/me3532/js/bessel.html

	var n = 35; // Number of iterations.
	var bsign = 1;
	var btest = 1;
	var bess = 1;

	var x2 = x * x;

	var m = 1;
    while (Math.abs(btest) > 0.000001 && m <= n) {
		btest = btest * x2 / (4 * m * m);
		bsign = -bsign;
		bess  = bess + bsign * btest;
		m = m + 1;
	}
	
	return bess;
	
}	
	
	
var curlos = function(fld,hgt,a,b,c,d,tls,no_loss_k) {

	var i, field, ab, divide, current;

	var ploss = [];
	var sixty = 59.958491;
     // Derivation: See Mimeo cited in getRMS.
     // 'SIXTY'= (rc* 10e3)/(2 * pi *r), r is 1000 meters.
              // rc: resistivity of free space: 376.7303124 ohms

    for (i = 0; i < hgt.length; i++) {

		field = fld[i] * no_loss_k;

		if (tls[i] === "0" || tls[i] === "") { // Normal tower
			var divide = sixty *  (1 - Math.cos(hgt[i]) );
			var current = field / divide;
			if (hgt[i] < Math.PI/2) { 
				current = current * Math.sin(hgt[i])
			}
		}

        else if (tls[i] === "1") { // Top-Loaded
			ab = a[i] + b[i];
			divide = sixty * ( Math.cos(b[i]) - Math.cos(ab) );
            current = field / divide;
            if (ab < Math.PI/2) {
				current = current * Math.sin(ab);
			}
		}

        else if (tls[i] === "2") { // Sectionalized
			ab  = a[i] + b[i];
			cd  = c[i] + d[i];
			cda = cd - a[i];
			divide = sixty * ( Math.cos(b[i]) - Math.cos(ab) - Math.sin(b[i])*(Math.cos(d[i])-Math.cos(cda)) );
			current = field * Math.sin(Math.PI - cda) / divide;
		}

        else if (tls[i] === "3") { // Sectionalized, "HEADS, CASE 1"
			ba = b[i] - a[i];
			divide = sixty * ( 2 - Math.cos(2*ba) - Math.cos(a[i]) );
			current = field / divide;
		}
			
		else { // Remaining sectionalized types uncoded.
			current = 0; // Yielding 0. loss.	
		}

		ploss.push( current * current / 1000);
		
	}	

	return ploss;

}


var towref = function(spc,orn,trs) {
    // Set all towers to common origin
    // Spacing and orienation in radians
	var i, p, tmp1, tmp2;
	for (i = 0; i < spc.length; i++) {
		if (i > 0 && trs[i] === '1') {
            p = i-1; // previous tower
			tmp1 = spc[i]*Math.cos(orn[i]) + spc[p]*Math.cos(orn[p]);
			tmp2 = spc[i]*Math.sin(orn[i]) + spc[p]*Math.sin(orn[p]);

			spc[i] = Math.sqrt(tmp1*tmp1 + tmp2*tmp2);

			if (tmp1 == 0 && tmp2 == 0) {
				orn[i] = 0;
			}
			else {
				orn[i]=Math.atan2(tmp2, tmp1);
			}
			
			if (orn[i] <0) {
				orn[i] = orn[i] + 2*Math.PI;
			}
			
		}
	}
	
	return {"spc": spc, "orn": orn};

}

var deltas = function(spc, orn, phs) {

    // CALCULATES THE DIFFERENCE IN PHASING AND SPACING BETWEEN THE TOWERS
    // All values in radians.
    // Based on AMNIGHT routine spcpsi.for
	var i, j, s_tmp, temp;
	
	var ntow = spc.length;

    // Set up matrices, with x the width and y the height of the matrices.
	
	var s = [];
	var si = [];
	
	for (i = 0; i < ntow; i++) {
		s[i] = [];
		si[i] = [];
			for (j = 0; j < ntow; j++) {
				s[i].push(0);
				si[i].push(0);
			}
	}
	
    // s= [[0 for i in range(ntow)] for j in range(ntow)] # Spacing between tower,   preset to zeroes
    // si=[[0 for i in range(ntow)] for j in range(ntow)] # Difference in phasing, preset to zeroes

	
	if (ntow == 1) {
		return {"s": s, "psi": si};
	}

	for (i = 0; i < ntow; i++) {

        for (j = 0; j < i; j++) {

			temp = (spc[i]*spc[i]) + (spc[j]*spc[j]) - 2*spc[i]*spc[j]*Math.cos(orn[i]-orn[j]); // Law of cosines.
			if (temp < 0.001) {
				console.log('deltas: Towers are co-located.');
			}
			s[i][j]  = Math.sqrt(temp);
            si[i][j] = phs[i]-phs[j];
            s[j][i]  = s[i][j];
            si[j][i] = -si[i][j];
		}			
	}

	return {"s": s, "psi": si};
}

var congen = function(pat, pwr, rms, fld, spc, orn, trs, phs, hgt, tls, a, b, c, d) {

    // Determine array constant, with losses, based on 'small' RMS.
    // Convert to radians before calculating RMS:
	var i;
	var ntow = fld.length;
	var hgt1 = [];
	var spc1 = [];
	var orn1 = [];
	var phs1 = [];
	
	for (i = 0; i < ntow; i++) {
		hgt1[i] = toRadians(hgt[i]);
		spc1[i] = toRadians(spc[i]);
		orn1[i] = toRadians(orn[i]);
		phs1[i] = toRadians(phs[i]);
		a[i] = toRadians(a[i]);
		b[i] = toRadians(b[i]);
		c[i] = toRadians(c[i]);
		d[i] = toRadians(d[i]);
	}

    var con_smlrms=getRMS(pwr, fld, spc1, orn1, trs, phs1, hgt1, tls, a, b, c, d);

	var con = con_smlrms.con;
	var smlrms = con_smlrms.smlrms;
	if (true || pat === 'T' || pat === 'A' && rms > 0) {
		con = rms/smlrms;
	}
	// Get a value for con even for ND (theoretical) patterns.
	return con;

}


var toRadians = function(a) {
	return a * Math.PI / 180;
}

var toDegrees = function(a) {
	return a * 180 / Math.PI;
}

var getQ = function(pwr, K, fld) {
	var g = 1;
	var r2 = 0;
	for (var i = 0; i < fld.length; i++) {
	r2 += fld[i]*fld[i];
	}

	var Erss = K*Math.sqrt(r2);

	var term1 = 0.025*g*Erss;
	var term2 = 10*g
	if (pwr > 1) {
		term2 = 10*g*Math.sqrt(pwr);
	}

	var Q = Math.max(term1, term2);

	return Q;
}



var amPattern = function(callsign, callback) {

	var i;

	getAmStationData(callsign, function(error, result) {
		if (error) {
			callback(error, null);
		}
		else {
			//extract ant and tower data
			var hgt = [];
			var fld = [];
			var spc = [];
			var phs = [];
			var tls = [];
			var orn = [];
			var topload_a = [];
			var topload_b = [];
			var topload_c = [];
			var topload_d = [];
			var trs = [];
			for (i = 0; i < result.towerData.length; i++) {
				hgt.push(result.towerData[i].elec_hgt_deg);
				fld.push(result.towerData[i].field_ratio);
				spc.push(result.towerData[i].spacing_deg);
				phs.push(result.towerData[i].phasing_deg);
				orn.push(result.towerData[i].orientation_deg);
				tls.push(result.towerData[i].top_loaded_switch);
				topload_a.push(result.towerData[i].topload_a);
				topload_b.push(result.towerData[i].topload_b);
				topload_c.push(result.towerData[i].topload_c);
				topload_d.push(result.towerData[i].topload_d);
				trs.push(result.towerData[i].tower_ref_switch);
			}
			
			var pwr = result.antData[0].power;
			var rms = result.antData[0].rms_theoretical;
			var pat = result.antData[0].domestic_pattern;
			
			//console.log(pat, pwr, rms, fld, spc, orn, trs, phs, hgt, tls, topload_a, topload_b, topload_c, topload_d)
			var k = congen(pat, pwr, rms, fld, spc, orn, trs, phs, hgt, tls, topload_a, topload_b, topload_c, topload_d);
				
			var x, y;
			var K = k;

			var Q = getQ(pwr, K, fld);
			
			console.log('K=', K, 'Q=', Q);

			var azimuths = [];
			var Eths = [];
			var Estds = [];
			var item;
			var items = [];
			for (var azimuth = 0; azimuth < 360; azimuth += 5) {
				azimuths.push(azimuth);
				
				var v = mathjs.complex(0,0);
				for (i = 0; i < fld.length; i++) {
					var beta = getBeta(phs[i], spc[i], orn[i], azimuth);
					var alpha = 90 - beta;
					if (alpha > -180) {
						alpha += 360;
					}
					x = fld[i] * mathjs.cos(alpha*Math.PI/180);
					y = fld[i] * mathjs.sin(alpha*Math.PI/180);
					v = mathjs.add(v, mathjs.complex(x, y));
					
				}

				var Eth = K*mathjs.abs(v);
				var Estd = 1.05*Math.sqrt(Eth*Eth + Q*Q);
				
				item = {"azimuth": azimuth, "Eth": mathjs.round(Eth, 2), "Estd": mathjs.round(Estd, 2)};
				items.push(item);
			}
			
			var inputData = {
				"callsign": result.stationData[0].fac_callsign,
				"facility_id": result.stationData[0].facility_id,
				"station_class": result.stationData[0].station_class,
				"application_id": result.antData[0].application_id,
				"ant_sys_id": result.antData[0].ant_sys_id,
				"domestic_pattern": result.antData[0].domestic_pattern,
				"rms_theoretical": result.antData[0].rms_theoretical,
				"q_factor": Math.round(Q*100)/100,
				"k_factor": Math.round(K*100)/100,
				"hours_operation": result.antData[0].hours_operation,
				"power": result.antData[0].power,
				"number_of_tower": result.towerData.length
			}
			
			var ret = {
				"inputData": inputData,
				"amPattern": items
			};
			
			callback(null, ret);
			
			console.log('done');
		
		}
	
	
	});
	
	

}

var getAmStationData = function(callsign, callback) {

var q;

	try {
		var db_lms = pgp_lms(LMS_PG);
		console.log('\n' + 'connected to LMS DB');
	}
	catch(e) {
		console.log('\n' + 'connection to LMS DB failed' + e);
	}
	
	try {
		var db_contours = pgp_contours(CONTOURS_PG);
		console.log('\n' + 'connected to CONTOURS DB');
	}
	catch(e) {
		console.log('\n' + 'connection to CONTOURS DB failed' + e);
	}
	
	var eng_data_table = LMS_SCHEMA + ".gis_am_eng_data";
	q = "SELECT a.*, b.* from " + LMS_SCHEMA + ".gis_facility a, " + eng_data_table + 
	" b WHERE a.facility_id = b.facility_id and a.fac_callsign = '" + callsign + "' ";
	//+ "and b.am_dom_status = 'L' and a.fac_status = 'LICEN'";

	db_lms.any(q)
	.then(function (data) {
		if (data.length == 0) {
			console.log('\n' + 'no valid record found');
			callback('no valid record found for this station', null);
			return;
		}
		
		var stationData = data;
		var applicationId = [];
		for (var i = 0; i < stationData.length; i++) {
			applicationId.push(stationData[i].application_id);
		}
		
		var applicationId_str = '(' + applicationId.toString() + ')';
		q = "SELECT * FROM " + LMS_SCHEMA + ".gis_am_ant_sys WHERE application_id in " + applicationId_str +
			"and eng_record_type = 'C' and hours_operation = 'D' and am_dom_status = 'L'";
			
		db_lms.any(q)
		.then(function (data) {	
			if (data.length == 0) {
				console.log('\n' + 'no valid ant record found');
				callback('no valid ant record found for this station', null);
				return;
			}
			
			var antData = data;
			
			var antSysId = antData[0].ant_sys_id;
			
			q = "SELECT * FROM " + LMS_SCHEMA + ".gis_am_towers WHERE ant_sys_id = " + antSysId + " ORDER BY tower_num";
			
			db_lms.any(q)
			.then(function (data) {	
				if (data.length == 0) {
					console.log('\n' + 'no valid ant record found');
					callback('no valid tower record found for this station', null);
					return;
				}
				
				var towerData = data;	
				callback(null, {"stationData": stationData, "antData": antData, "towerData": towerData});
			
			})
			.catch(function (err) {
				console.log('\n' + err);
				callback(err, null);
			});
			
		})
		.catch(function (err) {
			console.log('\n' + err);
			callback(err, null);
		});
		
	})
	.catch(function (err) {
		console.log('\n' + err);
		callback(err, null);
	});


}


var getAmPattern = function(req, res) {
	console.log('================== getAmPattern API =============');

	var callsign = req.query.callsign;
	
	callsign = callsign.toUpperCase();
	
	amPattern(callsign, function(error, result) {
		if (error) {
			res.send({"error": error});
		}
		else {
			res.send(result);
		}

	});
}


module.exports.congen = congen;
module.exports.getAmPattern = getAmPattern;








