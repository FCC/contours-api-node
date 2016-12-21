// **********************************************************

'use strict';

// **********************************************************

var conductivity = require('./conductivity.js');
var gwave = require('./gwave.js');
var db_lms = require('./db_lms.js');
var db_contour = require('./db_contour.js');

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
var async = require('async');

//var promise = require('bluebird');
//var options = {
  // Initialization Options
  //promiseLib: promise
//};
//var pgp_lms = require('pg-promise')(options);
//var pgp_contours = require('pg-promise')(options);

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
	var i, denom, ch, g, asq, g, h, l, sl, cl, cg, cb, sb, sd, cd, csq, casq, numerator, denominator;
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
				var x_real= -( (2*a_1*cq)/(a_1*a_1 - sq*sq) ) * ( (-Math.cos(a_1 * (b[i]-a[i]))) + (2*Math.cos(a_1*b[i])*Math.cos(a[i]*sq)) - (Math.cos(ht[i]*sq))  );
				var inner3terms = Math.sin( a_1*(b[i]-a[i]) ) -  2* Math.sin(a_1*b[i])*Math.cos(a[i]*sq) + sq * Math.sin( ht[i]*sq )/a_1;
				var y_imag= (d_8 * cq) * ( Math.sin(ht[i]+sq)/sq + a_1/(a_1*a_1 - sq*sq) * inner3terms );

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

	var i, field, ab, cd, cda, ba, divide, current;

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
	//if ( pat === 'T' && rms > 0) {
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



var amPattern = function(idType, idValue, nradial, callback) {

	var i;

	getAmStationData(idType, idValue, function(error, result) {
		if (error) {
			callback(error, null);
		}
		else {
		
			var asyncTasks = [];
			for (i = 0; i < result.antData.length; i++) {
				var stationData1 = result.stationData[0];
				var antData1 = result.antData[i];
				var towerData1 = result.towerData[i];
				asyncTasks.push(makeOneAmPattern(stationData1, antData1, towerData1, nradial));					
			}
			
			async.parallel(asyncTasks, function(error, result){
				console.log('\n' + "all done");
				
				if (error) {
					console.log('error in makeOneAmPattern:', error);
					callback(error, []);
				
				}
				else {
					callback(null, result);
				}
			});
		}	
	});
}


var applyAmAugs = function(items, augData) {
	console.log('apply am aug')
	var i, j, azimuth, center_azimuth, span, radiation_aug, augmentation, Estd;
	var dEaug = [];
	for (i = 0; i < items.length; i++) {
		dEaug[i] = 0;
	}
	
	for (i = 0; i < augData.length; i++) {
	
		center_azimuth = augData[i].azimuth_deg;
		span = augData[i].span_deg;
		radiation_aug = augData[i].radiation_aug;
		Estd = getEstd(center_azimuth, items);
		
		for (j = 0; j < items.length; j++) {
			azimuth = items[j].azimuth;
			augmentation = calAug(azimuth, center_azimuth, span, radiation_aug, Estd, items[j].Estd);
			
			dEaug[j] += augmentation - items[j].Estd;
			//console.log('i', i, 'j', j, 'az', azimuth, 'd', augmentation)

		}
	}
	
	for (j = 0; j < items.length; j++) {
	items[j].Eaug = mathjs.round(items[j].Estd + dEaug[j], 2);
	}
	
	//console.log('items', items)
	
	return items;
}


var getEstd = function(az, items) {

	var i, az1, az2, e1, e2;
	
	for (i = 0; i < items.length-1; i++) {
		if (az >= items[i].azimuth && az <= items[i+1].azimuth) {
			az1 = items[i].azimuth;
			az2 = items[i+1].azimuth;
			e1 = items[i].Estd;
			e2 = items[i+1].Estd;
		}
	}
	if (az < items[0].azimuth || az > items[items.length-1].azimuth) {
		az1 = items[0].azimuth;
		az2 = items[items.length-1].azimuth;
		e1 = items[0].Estd;
		e2 = items[items.length-1].Estd;
		if (az < az1) {
			az1 += 360;
			az += 360;
		}
		else {
			az1 += 360;
		}
	}
	
	var e = e1 + (e2 - e1)*(az - az1)/(az2 - az1);
	
	return e;
}



var calAug = function(azimuth, center_azimuth, span, radiation_aug, Estd_center, Estd) {

	var D = Math.abs(azimuth - center_azimuth);
	if (D >= span/2.0) {
		return Estd;
	}
	var Eaug = radiation_aug;

	var value = Estd*Estd + (Eaug*Eaug - Estd_center*Estd_center)*Math.cos(Math.PI*D/span)*Math.cos(Math.PI*D/span);
	if (value >= 0) {
		var value = Math.sqrt(value);
	}
	else {
		value = Estd;
	}
	//console.log('Estd', Estd, 'Eaug', Eaug, 'Estd_center', Estd_center, 'D', D, 'span', span, 'value', value)

	return value;
}



var getAmStationData = function(idType, idValue, callback) {

var q;


	
	if (idType === 'callsign') {
		var eng_data_table = LMS_SCHEMA + ".gis_am_eng_data";
		q = "SELECT a.*, b.* from " + LMS_SCHEMA + ".gis_facility a, " + eng_data_table + 
		" b WHERE a.facility_id = b.facility_id and a.fac_callsign = '" + idValue + "' ";
		//+ "and b.am_dom_status = 'L' and a.fac_status = 'LICEN'";
	}
	else if (idType === 'facilityid') {
		var eng_data_table = LMS_SCHEMA + ".gis_am_eng_data";
		q = "SELECT a.*, b.* from " + LMS_SCHEMA + ".gis_facility a, " + eng_data_table + 
		" b WHERE a.facility_id = b.facility_id and a.facility_id = '" + idValue + "' ";
		//+ "and b.am_dom_status = 'L' and a.fac_status = 'LICEN'";
	}
	else {
		console.log('\n' + 'invalid idType ' + idType);
		callback('invalid idType ' + idType, null);
		return;
	}
	
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
			"and eng_record_type = 'C' and hours_operation in ('D', 'U') ";
			
		console.log(q)
			
		db_lms.any(q)
		.then(function (data) {	
			if (data.length == 0) {
				console.log('\n' + 'no valid ant record found');
				callback('no valid ant record found for this station', null);
				return;
			}
			
			var antData = data;
			
			var antSysIds = [];
			for (var i = 0; i < antData.length; i++) {
				antSysIds.push(antData[i].ant_sys_id);
			}
			var antSysIdStr = "(" + antSysIds.toString() + ")";
				
			q = "SELECT * FROM " + LMS_SCHEMA + ".gis_am_towers WHERE ant_sys_id in " + antSysIdStr + " ORDER BY ant_sys_id, tower_num";
			
			db_lms.any(q)
			.then(function (data) {
			
				if (data.length == 0) {
					console.log('\n' + 'no valid ant record found');
					callback('no valid tower record found for this station', null);
					return;
				}
				
				var towerData = [];
				for (var i = 0; i < antData.length; i++) {
					var towerData1 = [];
					for (var j = 0; j < data.length; j++) {
						if (data[j].ant_sys_id === antData[i].ant_sys_id) {
							towerData1.push(data[j]);
						}
					}
					towerData.push(towerData1);
				}
				
				console.log('antData', antData.length, 'towerData', towerData.length);
				
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

var amContour = function(callsign, callback) {
		amPattern(callsign, function(error, result) {
		if (error) {
			callback(error, null);
		}
		else {
		
			var patternData = result;
			var latlonArray = [patternData.inputData.lat_deg,
								patternData.inputData.lat_min,
								patternData.inputData.lat_sec,
								patternData.inputData.lat_dir,
								patternData.inputData.lon_deg,
								patternData.inputData.lon_min,
								patternData.inputData.lon_sec,
								patternData.inputData.lon_dir
								];
								
			if (latlonArray.indexOf(null) >= 0) {
				callback('missing antenna lat/lon data', null);
				return;
			}
			
			try {
				var db_contours = pgp_contours(CONTOURS_PG);
				console.log('\n' + 'connected to CONTOURS DB');
			}
			catch(e) {
				console.log('\n' + 'connection to CONTOURS DB failed' + e);
				callback('connection to CONTOURS DB failed' + e, null);
				return;
			}
			
			var lat_nad27 = getDecimalLatLon(patternData.inputData.lat_deg, patternData.inputData.lat_min, patternData.inputData.lat_sec, patternData.inputData.lat_dir);
			var lon_nad27 = getDecimalLatLon(patternData.inputData.lon_deg, patternData.inputData.lon_min, patternData.inputData.lon_sec, patternData.inputData.lon_dir);
			var q = "SELECT ST_AsGeoJson(ST_Transform(ST_GeomFromText('POINT(" + lon_nad27 + " " + lat_nad27 + ")', 4267),4326)) as latlon";
			console.log('\n' + 'NAD27 to WGS84 Query='+q);
			db_contours.any(q)
				.then(function (data) {
					var latlon84 = JSON.parse(data[0].latlon);
					var lat_84 = latlon84.coordinates[1];
					var lon_84 = latlon84.coordinates[0];
					var nradial = 72;
					var distance = 1200;
					conductivity.getConductivity(lat_84, lon_84, nradial, distance, function(error, result) {
						if (error) {
						callback(error, null);
						}
						else {
						var conductivityData = result;
						conductivityData.conductivity[0] = {
							"azimuth": 0,
							"zones": [
									{"conductivity": 10,
									"distance": 20},
									{"conductivity": 5,
									"distance": 50},
									{"conductivity": 15,
									"distance": 1200}
								]
						
						
							}
						
						for (var i = 0; i < conductivityData.conductivity.length*0 + 1; i++) {
							console.log('i', i);
							
							var azimuth = conductivityData.conductivity[i].azimuth;
							var zones = conductivityData.conductivity[i].zones;
							
							for (var j = 0; j < zones.length; j++) {
							console.log(j, zones[j].conductivity, zones[j].distance)
							
							}
							
							
							
							var field = gwave.amField(zones[0].conductivity, 15, 1, zones[0].distance, 100);
							
							console.log('field', field)

						
						}
						
						
						callback(null, result);
						
						}

					});
				
				})
				.catch(function (err) {
					console.log('\n' + err);
					callback(err, null);
					return;
				});
		}

	});

}




var getAmPattern = function(req, res) {
	console.log('================== getAmPattern API =============');

	var idType = req.query.idType
	var idValue = req.query.idValue;
	var nradial = req.query.nradial;
	
	if (idType == undefined) {
		console.log('\n' + 'missing idType');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'missing idType.'
		});
		return;
	}
	
	if (idType != undefined && ["callsign", "facilityid"].indexOf(idType.toLowerCase()) < 0 ) {
		console.log('\n' + 'Invalid idType value, must be callsign or facilityid');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'Invalid idType value, must be callsign or facilityid'
		});
		return;
	}
	
	if (nradial == undefined) {
		nradial = 360;
	}

	if ( !(''+nradial).match(/^\d+$/)) {
		console.log('\n' + 'Invalid nradial value');
		res.status(400).send({
		'status': 'error',
		'statusCode':'400',
		'statusMessage': 'Invalid nradial value.'
		});
		return;
	}
	
	nradial = parseInt(nradial);
	
	if ( nradial < 8 || nradial > 360) {
		console.log('\n' + 'Invalid nradial value range, must be [8, 360]');
		res.status(400).send({
		'status': 'error',
		'statusCode':'400',
		'statusMessage': 'Invalid nradial value range, must be [8, 360]'
		});
		return;
	}
	
	idType = idType.toLowerCase();
	idValue = idValue.toUpperCase();
	
	amPattern(idType, idValue, nradial, function(error, result) {
		if (error) {
			res.send({"error": error});
		}
		else {
			res.send(result);
		}

	});
}


var getAmContour = function(req, res) {
	console.log('================== getAmContour API =============');

	var callsign = req.query.callsign;
	
	callsign = callsign.toUpperCase();
	
	amContour(callsign, function(error, result) {
		if (error) {
			res.send({"error": error});
		}
		else {
		
			var patternData = result;
			res.send(patternData);
		}

	});
}

function getDecimalLatLon(deg, min, sec, dir) {

	var value = parseFloat(deg) + parseFloat(min)/60.0 + parseFloat(sec)/3600.0;
	if (dir == 'W' || dir == 'S') {
		value = -1 * value;
		
	}
	
	return value;
}

var makeOneAmPattern = function(stationData, antData, towerData, nradial, callback) {return function(callback) {
	//extract ant and tower data
	
	//towerData[2].spacing_deg = 200;
	//console.log('antData', antData);
	//console.log(towerData);
	
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
	for (var i = 0; i < towerData.length; i++) {
		hgt.push(towerData[i].elec_hgt_deg);
		fld.push(towerData[i].field_ratio);
		spc.push(towerData[i].spacing_deg);
		phs.push(towerData[i].phasing_deg);
		orn.push(towerData[i].orientation_deg);
		tls.push(towerData[i].top_loaded_switch);

		topload_a.push(towerData[i].topload_a);
		topload_b.push(towerData[i].topload_b);
		topload_c.push(towerData[i].topload_c);
		topload_d.push(towerData[i].topload_d);
		trs.push(towerData[i].tower_ref_switch);
	}
	
	var pwr = antData.power;
	var rms = antData.rms_theoretical;
	var pat = antData.domestic_pattern;
	
	//console.log(pat, pwr, rms, fld, spc, orn, trs, phs, hgt, tls, topload_a, topload_b, topload_c, topload_d)
	var k = congen(pat, pwr, rms, fld, spc, orn, trs, phs, hgt, tls, topload_a, topload_b, topload_c, topload_d);
		
	var x, y;
	var K = k;

	var Q = getQ(pwr, K, fld);
	
	console.log('K=', K, 'Q=', Q);

	var azimuths = [];
	var azimuth;
	var Eths = [];
	var Estds = [];
	var item;
	var items = [];
	
	var deltaAz = 360/nradial;
	
	//spc[2] =200; //test for KFXN
	
	for (var n = 0; n < nradial; n++) {
		azimuth = n * deltaAz;
		azimuths.push(azimuth);
		
		var v = mathjs.complex(0,0);
		for (i = 0; i < fld.length; i++) {
			var beta = getBeta(phs[i], spc[i], orn[i], azimuth);
			var alpha = 90 - beta;
			if (alpha < -180) {
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
		"callsign": stationData.fac_callsign,
		"facility_id": stationData.facility_id,
		"station_class": stationData.station_class,
		"application_id": antData.application_id,
		"ant_sys_id": antData.ant_sys_id,
		"ant_mode": antData.ant_mode,
		"ant_dir_ind": antData.ant_dir_ind,
		"fac_frequency": stationData.fac_frequency,
		"lat_deg": antData.lat_deg,
		"lat_min": antData.lat_min,
		"lat_sec": antData.lat_sec,
		"lat_dir": antData.lat_dir,
		"lon_deg": antData.lon_deg,
		"lon_min": antData.lon_min,
		"lon_sec": antData.lon_sec,
		"lon_dir": antData.lon_dir,
		"domestic_pattern": antData.domestic_pattern,
		"rms_theoretical": antData.rms_theoretical,
		"q_factor": Math.round(Q*100)/100,
		"k_factor": Math.round(K*100)/100,
		"hours_operation": antData.hours_operation,
		"power": antData.power,
		"number_of_tower": towerData.length,
		"eng_record_type": antData.eng_record_type,
		"am_dom_status": antData.am_dom_status,
		"nradial": nradial
	}
	
	//get aug

	var q = "SELECT * FROM mass_media.gis_am_augs WHERE ant_sys_id = " + antData.ant_sys_id;
	db_lms.any(q)
	.then(function (data) {
		var augData = data;	
		var amPattern = applyAmAugs(items, augData);
		
		amPattern = reformatAmPattern(amPattern, inputData);
	
		var ret = {
			"inputData": inputData,
			"amPattern": amPattern
		};
		
		callback(null, ret);
		
		console.log('makeOneAmPattern done');
	
	})
	.catch(function (err) {
		console.log('\n' + err);
		callback(err, null);
	});
		
}};

var reformatAmPattern = function(amPattern, inputData) {
	var i, item;
	var pattern = [];
	for (i = 0; i < amPattern.length; i++) {
		if (inputData.domestic_pattern === 'A') {
			item = {
				"azimuth": amPattern[i].azimuth,
				"Eth": amPattern[i].Eth,
				"Estd": amPattern[i].Estd,
				"Eaug": amPattern[i].Eaug
			};
		}
		else if (inputData.domestic_pattern === 'S') {
		
			item = {
				"azimuth": amPattern[i].azimuth,
				"Eth": amPattern[i].Eth,
				"Estd": amPattern[i].Estd
			};
		}
		else {
			item = {
				"azimuth": amPattern[i].azimuth,
				"Eth": amPattern[i].Eth
			};
		}
		
		pattern.push(item);
	}

	return pattern;

}


module.exports.congen = congen;
module.exports.getAmPattern = getAmPattern;
module.exports.getAmContour = getAmContour;








