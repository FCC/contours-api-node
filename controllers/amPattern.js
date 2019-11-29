// **********************************************************

'use strict';

// **********************************************************

var conductivity = require('./conductivity.js');
var gwave = require('./gwave.js');
var area = require('./area.js');
var population = require('./population.js');
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
    var q = theta; // Short-hand reference in formulas.
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
			//console.log('sl=' + sl + ' cb=' + cb + ' casq=' + casq + ' sl=' + sl + ' cg=' + cg);
			
			numerator = sl*cb*casq - sl*cg + sb*cd*Math.cos(csq) - sb*sq*sd*Math.sin(csq) - sb*cl*casq;
			denominator = cq*sl*(cb-cg) + cq*sb*(cd-cl);
			
			//console.log('numerator=' + numerator);
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

		else if (tls[i]=='3') { // Case 1, Heads Formula, Jasik Handbook.
								// h=0; a: height of bottom section; b: height of bottom section plus lamda/4.0
			L4 = 1.57079633
			b[i] = a[i] + L4

			sq = Math.sin(q)
			numerator = (2*Math.cos( L4*sq)*Math.cos(b[i]*sq) + Math.cos(a[i]*sq) - Math.cos(a[i]) )
			denominator = cq * ( 3.0 - Math.cos(a[i]) )

			if (denominator != 0) {
				fth = numerator/denominator;
			}
		}

		else if (tls[i]=='6') { // Silliman's KREM (==> KZZU), Spokane WA 970 KHz
								// h=0; a: overall height; b: height of lower section
			sq = Math.sin(q)
			cq = Math.cos(q)

			numerator = Math.cos( a[i] * sq ) - Math.cos( a[i] - b[i])*Math.cos( b[i] * sq ) + sq*Math.sin(a[i]-b[i])*Math.sin(b[i]*sq)
			denominator = cq * (1.0 - Math.cos(a[i]-b[i]))

			if (denominator != 0) {
				fth = numerator/denominator;
			}
		}

		else if (tls[i]=='7') { // WHO, Des Moines 1040, Filing 12/14/1951, Appendix to Exhibit 7
								// If A = B, reduces to formula for regular tower
								// h: unused; a: height of lower element; b: total height of antenna;
								// c: ratio of loop currents in two elements; d: unused
			sq = Math.sin(q)
			cq = Math.cos(q)
			asq = a[i]*sq
			ca = Math.cos(a[i])
			cba = Math.cos(b[i]-a[i])
			sba = Math.sin(b[i]-a[i])

			numerator = c[i]*(Math.cos(asq)-ca) + Math.cos(b[i]*sq) - sq*Math.sin(asq)*(cba*Math.cos(asq)+sba)
			denominator = cq * ( c[i]*(1.0-ca) + (1.0-cba) )

			if (denominator != 0) {
				fth = numerator/denominator;
			}
		}

		else {
			console.log( 'getfth: Cannot handle sectionalized type. ' + tls[i]);
			console.log('set fth = 1');
			fth = 1;
			//console.log( theta,ht,a,b,c,d,tls);
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
		
		//console.log('thetas=' + fthetas + ' tls=' + tls);

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
		
		//console.log('loop=' + loop + ' small_rms=' + small_rms + ' fld=' + fld);
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

	console.log(con_smlrms);
	
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
	
	console.log('1', term1, '2', term2)

	return Q;
}

function am_tower_ref(space,orient,tow_ref){
	// Adjust database spacing (float) and orientation (float) of towers
	// to a common origin.
	// Loosely based on AMNIGHT routine am_tower_ref.f
	// Return adjusted values in electrical degrees.
	// Output orient always between 0 and 360.
	var ntow=space.length;
	if  (orient.length!=ntow || tow_ref.length!=ntow) throw new Error('Differing sizes for space, orien, tref arrays.');

	var radian=Math.PI/180.;
	var degree=180./Math.PI;

	var orient_out_rad=[];
	var space_out_rad=[];
	
	for (var itw=0; itw<ntow; itw++) {
		orient_out_rad[itw]=orient[itw]*radian;
		space_out_rad[itw]=space[itw]*radian;

		if (itw>0 && tow_ref[itw]=='1') {
			var ptw=itw-1;   // Previous tower.

			var tmp1=space_out_rad[itw]*Math.cos(orient_out_rad[itw]) +
					space_out_rad[ptw]*Math.cos(orient_out_rad[ptw]);

			var tmp2=space_out_rad[itw]*Math.sin(orient_out_rad[itw]) +
					space_out_rad[ptw]*Math.sin(orient_out_rad[ptw]);

			space_out_rad[itw]=Math.sqrt(tmp1*tmp1 + tmp2*tmp2);

			if (tmp1==0. && tmp2==0.) {
				orient_out_rad[itw]=0.;
				}
			else {
				orient_out_rad[itw]=Math.atan2(tmp2,tmp1);
				}
		}

		orient[itw]=orient_out_rad[itw]*degree;
		if (orient[itw]<0.) orient[itw]=orient[itw]+360.;

		space[itw]=space_out_rad[itw]*degree;

	}

	return [space,orient];

}

var amPattern = function(idType, idValue, nradial, field, callback) {

	var i;

	getAmStationData(idType, idValue, function(error, result) {
		if (error) {
			callback(error, null);
		}
		else {
		
			var asyncTasks = [];
			
			for (i = 0; i < result.antData.length; i++) {
				if (result.antData[i].lat_deg != null && result.antData[i].lon_deg) { //only use antenna with valid lat/lon
					var stationData1 = result.stationData[0];
					var antData1 = result.antData[i];
					var towerData1 = result.towerData[i];
					asyncTasks.push(makeOneAmPattern(stationData1, antData1, towerData1, nradial));
				}
				
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
	var Eaug, dEsq, dEsqSum;
	
	for (i = 0; i < items.length; i++) {
		azimuth = items[i].azimuth;
		dEsqSum = 0;
		//console.log('i', i, 'az', azimuth)
		
		for (j = 0; j < augData.length; j++) {
			center_azimuth = augData[j].azimuth_deg;
			span = augData[j].span_deg;
			radiation_aug = augData[j].radiation_aug;
			Estd = getEstd(center_azimuth, items);
			
			//console.log('j', j, ' aug', radiation_aug, ' Estd', Estd);
			
			dEsq = calAug(azimuth, center_azimuth, span, radiation_aug, Estd);
			dEsqSum += dEsq;
		}
		Eaug = Math.sqrt(items[i].Estd*items[i].Estd + dEsqSum);
		items[i].Eaug = mathjs.round(Eaug, 2);
	}
	
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

var calAug = function(azimuth, center_azimuth, span, radiation_aug, Estd_center) {

	var D = Math.abs(azimuth - center_azimuth);
	if (D > 180) {
		D = 360 - D;
	}
	if (D >= span/2.0) {
		return 0;
	}
	var Eaug = radiation_aug;

	var dEsq = (Eaug*Eaug - Estd_center*Estd_center)*Math.cos(Math.PI*D/span)*Math.cos(Math.PI*D/span);

	return dEsq;
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
	else if (idType === 'applIdNumber') {
		var eng_data_table = LMS_SCHEMA + ".gis_am_eng_data";
		q = "SELECT a.*, b.* from " + LMS_SCHEMA + ".gis_facility a, " + eng_data_table + 
		" b WHERE a.facility_id = b.facility_id and b.application_id = '" + idValue + "' ";
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
		
		q = "SELECT * FROM " + LMS_SCHEMA + ".gis_application WHERE application_id in " + applicationId_str;
		
		console.log(q);
		
		db_lms.any(q)
		.then(function (data) {
			var applicationData = data;

			q = "SELECT * FROM " + LMS_SCHEMA + ".gis_am_ant_sys WHERE application_id in " + applicationId_str +
				"and eng_record_type = 'C' and hours_operation in ('D', 'U') ";
					
			db_lms.any(q)
			.then(function (data) {	

				if (data.length == 0) {
					console.log('\n' + 'no valid ant record found');
					callback('no valid ant record found for this station', null);
					return;
				}
				
				var antData = data;
				antData = addFileNumber(antData, applicationData);
				console.log(antData);
				
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
		
		
	})
	.catch(function (err) {
		console.log('\n' + err);
		callback(err, null);
	});
}

var addFileNumber = function(antData, applicationData) {
	var i, j, fileNumber;
	for (i = 0; i < antData.length; i++) {
		fileNumber = "";
		for (j = 0; j < applicationData.length; j++) {
			if (applicationData[j].application_id === antData[i].application_id) {
				var app_arn = "";
				if (applicationData[j].app_arn !== null) {
					app_arn = applicationData[j].app_arn;
				}
				fileNumber = applicationData[j].file_prefix + "-" + app_arn;
			}
		}
		fileNumber = fileNumber.replace(/\s/g, '');
		antData[i].file_number = fileNumber;
	}
	
	return antData;
}

var amContour = function(idType, idValue, nradial, field, areaFlag, pop, callback) {

	amPattern(idType, idValue, nradial, field, function(error, result) {
		if (error) {
			callback(error, null);
		}
		else {
			//RESULTS CONTAIN ONE OR MORE ANTENNA PATTERNS
			
			var asyncTasks = [];
			for (var i = 0; i < result.length; i++) {
				asyncTasks.push(getOneAmContour(result[i], nradial, field, areaFlag, pop));			
			}
			
			async.parallel(asyncTasks, function(error, result){
				console.log('\n' + "asyncTasks all done");
				
				if (error) {
					callback(error, []);
				}
				else {
				
					var features = [];
					for (i = 0; i < result.length; i++) {
							features.push(result[i].features[0])	
						}
					}
					var contours = {type: "FeatureCollection", "features": features};
					callback(null, contours);		
			});	
		}
	});
}

var getOneAmContour = function(patternData, nradial, field, areaFlag, pop) {return function(callback) {

	var freq_center = getCenterFreq(patternData.inputData.fac_frequency)/1000;
	console.log("center frequency = " + freq_center);

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
	
	var lat_nad27 = getDecimalLatLon(patternData.inputData.lat_deg, patternData.inputData.lat_min, patternData.inputData.lat_sec, patternData.inputData.lat_dir);
	var lon_nad27 = getDecimalLatLon(patternData.inputData.lon_deg, patternData.inputData.lon_min, patternData.inputData.lon_sec, patternData.inputData.lon_dir);
	var q = "SELECT ST_AsGeoJson(ST_Transform(ST_GeomFromText('POINT(" + lon_nad27 + " " + lat_nad27 + ")', 4267),4326)) as latlon";
	console.log('\n' + 'NAD27 to WGS84 Query='+q);
	db_contour.any(q)
		.then(function (data) {
			var field_input = field;
			
			var latlon84 = JSON.parse(data[0].latlon);
			var lat_84 = latlon84.coordinates[1];
			var lon_84 = latlon84.coordinates[0];
			lat_84 = Math.floor(lat_84*1000000+0.5)/1000000;
			lon_84 = Math.floor(lon_84*1000000+0.5)/1000000;
			var distance = 2000;
			console.log('start getting conductivity at ' + lat_84 + ' ' + lon_84);
			
			var p1 = patternData.inputData.ant_sys_id;
			var p2 = patternData.inputData.application_id;
			var p3 = patternData.inputData.lat_deg;
			var p4 = patternData.inputData.lat_min;
			var p5 = patternData.inputData.lat_sec;
			var p6 = patternData.inputData.lat_dir;
			var p7 = patternData.inputData.lon_deg;
			var p8 = patternData.inputData.lon_min;
			var p9 = patternData.inputData.lon_sec;
			var p10 = patternData.inputData.lon_dir;
			
			conductivity.selectConductivity(p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, lat_84, lon_84, nradial, distance, function(error, result) {
			
				if (error) {
					callback(error, null);
					return;
				}
				else {
					console.log('getOneAmContour: done getting conductivity');
			
					var conductivityData = result;
					
					var coordinates = [];
					var contourData = [];

					if (field_input == undefined) {
						var field = 0.5;
						//if (patternData.inputData.station_class != "A") {
						//	field = 0.025;
						//}
					}
					else {
						var field = field_input;
					}			
					patternData.inputData.field = field;
					
					for (var i = 0; i < conductivityData.conductivity.length; i++) {
						
						var azimuth = conductivityData.conductivity[i].azimuth;
						//console.log('az=' + azimuth)
						var zones_orig = conductivityData.conductivity[i].zones;
						//console.log('zones=' + zones)
						
						var zones = [];
						for (var n = 0; n < zones_orig.length; n++) {
							if (zones_orig[n].distance > 2) {
								zones.push(zones_orig[n])
							}
						}
						
						for (var j = 0; j < zones.length; j++) {
						//console.log(j, zones[j].conductivity, zones[j].distance)
						
						}

						//var freq = patternData.inputData.fac_frequency/1000;
						//var freq_center = freq;
						//if (freq >= 0.72 && freq <= 0.76) {
						//	freq_center = 0.74;
						//}
						
						var power = patternData.amPattern[i].Eth * mathjs.sqrt(patternData.inputData.power);
						if (patternData.inputData.domestic_pattern == 'S') {
							power = patternData.amPattern[i].Estd;
						}
						else if (patternData.inputData.domestic_pattern == 'A') {
							power = patternData.amPattern[i].Eaug;
						}

						power = mathjs.round(power, 2);
						distance = cal_equivalent_distance(zones, field, freq_center, power);
						
						//console.log('dist=' + distance)
						
						var latlon = getLatLonFromDist(lat_84, lon_84, azimuth, distance);
						latlon[0] = mathjs.round(latlon[0], 6);
						latlon[1] = mathjs.round(latlon[1], 6);
						coordinates.push([latlon[1], latlon[0]]);
						contourData.push({
							"x": latlon[1],
							"y": latlon[0],
							"z": 0,
							"distance": distance,
							"fs1km": power,
							"azimuth": azimuth
						});
					}
					
					coordinates.push(coordinates[0]);
					contourData.push(contourData[0]);
					
					console.log('areaFlag=' + areaFlag + ' pop=' + pop)
					
					var geom = JSON.stringify({"type": "MultiPolygon", "coordinates": [[coordinates]]});
					
					if (areaFlag === 'true') {
						area.getArea(geom, function(error, response) {
							if (error) {
							console.log("Area API error: ", error)
								var area = -999;
								var area_unit = response.area_unit;
							}
							else {
								var area = response.area;
								var area_unit = response.area_unit;
							}
								
							if (pop === 'true') {
								population.getPopulation(geom, function(error, response) {
									if (error) {
										console.log('population API error: ' + error);
										var population = -999;
									}
									else {
										var population = response.population;
									}
									
									var properties = patternData.inputData;
									properties.antenna_lat = lat_84;
									properties.antenna_lon = lon_84;
									properties.area = area;
									properties.area_unit = area_unit;
									properties.pop = population;
									properties.contourData = contourData;
									var contour_geojson = {
															"type": "FeatureCollection",
															"features": [
																		{
																			"type": "Feature",
																			"geometry": {
																				"type": "MultiPolygon",
																				"coordinates": [[coordinates]]
																				},
																			"properties": properties
																		}
															]				
									};
									console.log('done making 1 contour for area=true and pop=true');
									callback(null, contour_geojson);
									
								});
							}
							else {
								var properties = patternData.inputData;
								properties.antenna_lat = lat_84;
								properties.antenna_lon = lon_84;
								properties.area = area;
								properties.area_unit = area_unit;
								properties.contourData = contourData;
								var contour_geojson = {
														"type": "FeatureCollection",
														"features": [
																	{
																		"type": "Feature",
																		"geometry": {
																			"type": "MultiPolygon",
																			"coordinates": [[coordinates]]
																			},
																		"properties": properties
																	}
														]				
								};
								console.log('done making 1 contour for area=true and pop=false');
								callback(null, contour_geojson);
							
							}
						});
					}
					else {
						if (pop === 'true') {
							population.getPopulation(geom, function(error, response) {
								if (error) {
									population = -999;
								}
								else {
									population = response.population;
								}
								
								var properties = patternData.inputData;
								properties.antenna_lat = lat_84;
								properties.antenna_lon = lon_84;
								properties.pop = population;
								properties.contourData = contourData;
								var contour_geojson = {
														"type": "FeatureCollection",
														"features": [
																	{
																		"type": "Feature",
																		"geometry": {
																			"type": "MultiPolygon",
																			"coordinates": [[coordinates]]
																			},
																		"properties": properties
																	}
														]				
								};
								console.log('done making 1 contour for area=false and pop=true');
								callback(null, contour_geojson);
							});
						}
						else {
							var properties = patternData.inputData;
							properties.antenna_lat = lat_84;
							properties.antenna_lon = lon_84;
							properties.contourData = contourData;
							var contour_geojson = {
													"type": "FeatureCollection",
													"features": [
																{
																	"type": "Feature",
																	"geometry": {
																		"type": "MultiPolygon",
																		"coordinates": [[coordinates]]
																		},
																	"properties": properties
																}
													]				
							};
							console.log('done making 1 contour for area=false and pop=false');
							callback(null, contour_geojson);
						}
					}
				
				}
			});
		})
		.catch(function (err) {
			console.log('\n' + err);
			callback(err, null);
			return;
		});	
}}

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
	
	amPattern(idType, idValue, nradial, 0.5, function(error, result) {
		//the value 0.5 is a place holder only
		
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
	var facilityId = req.query.facilityId;
	var applicationId = req.query.applicationId;
	
	var nradial = req.query.nradial;
	var field = req.query.field;
	var pop = req.query.pop;
	var areaFlag = req.query.area;
	
	var idType;
	var idValue;
	
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
	
	
		
	if ( 360 % nradial != 0) {
		console.log('\n' + 'Invalid nradial value: 360 % nradial must be zero');
		res.status(400).send({
		'status': 'error',
		'statusCode':'400',
		'statusMessage': 'Invalid nradial value: 360 % nradial must be zero'
		});
		return;
	}

	if (field != undefined && !field.match(/^\.?\d+\.?\d*$/)) {
		console.log('\n' + 'Invalid field value');
		res.status(400).send({
		'status': 'error',
		'statusCode':'400',
		'statusMessage': 'Invalid field value.'
		});
		return;
	}
	
	if (field != undefined) {
		field = parseFloat(field);
	}
	
	
	if (callsign != undefined) {
		idType = "callsign";
		idValue = callsign.toUpperCase();
	}
	else if (facilityId != undefined) {
		idType = "facilityid";
		idValue = facilityId;
	}
	else if (applicationId != undefined) {
		idType = "applIdNumber";
		idValue = applicationId;
	}
	

	amContour(idType, idValue, nradial, field, areaFlag, pop, function(error, result) {
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
	console.log('antData', antData);
	//console.log(towerData);
	
	var nradial1 = 360; //get full 360 radials first, then sub-sample for output based on actual nradial
	
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
	
	//var spc_orn = towref(spc, orn, trs);
	//spc = spc_orn.spc;
	//orn = spc_orn.orn;
	
	var pwr = antData.power;
	var rms = antData.rms_theoretical;
	var pat = antData.domestic_pattern;
	
	//console.log(pat, pwr, rms, fld, spc, orn, trs, phs, hgt, tls, topload_a, topload_b, topload_c, topload_d)
	var k = congen(pat, pwr, rms, fld, spc, orn, trs, phs, hgt, tls, topload_a, topload_b, topload_c, topload_d);
		
	var x, y;
	var K = k;

	var Q_cal = getQ(pwr, K, fld);
	
	if (antData.q_factor_custom_ind != null && antData.q_factor != null) {
		var Q = antData.q_factor
	}
	else {
		var Q = Q_cal;
	}
	
	console.log('K=', K, 'Q=', Q);

	var azimuths = [];
	var azimuth;
	var Eths = [];
	var Estds = [];
	var item;
	var items = [];
	
	//var deltaAz = 360/nradial;
	var deltaAz = 1;
	
	//spc[2] =200; //test for KFXN
	//console.log('spc', spc, 'orn', orn)
	
	//var spc_orn = towref(spc, orn, trs);
	//spc = spc_orn.spc;
	//orn = spc_orn.orn;
	//console.log('spc_orn', spc_orn);
	
	var spc_orn = am_tower_ref(spc, orn, trs);
	//console.log('spc_orn', spc_orn)
	spc = spc_orn[0];
	orn = spc_orn[1];
	
	
	//console.log('spc', spc, 'orn', orn)
	
	for (var n = 0; n < nradial1; n++) {
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
		"file_number": antData.file_number,
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
		"q_factor_db": antData.q_factor,
		"q_factor_custom_ind": antData.q_factor_custom_ind,
		"q_factor_calculated": Math.round(Q_cal*100)/100,
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
		amPattern = subSampleAmPattern(amPattern, nradial);
		
	
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

var subSampleAmPattern = function(amPattern, nradial) {
	var az;
	var amPatternNew = [];
	var deltaAz = Math.floor(360/nradial + 0.5);
	for (var i = 0; i < nradial; i++) {
		az = Math.floor(i * deltaAz + 0.5);
		amPatternNew.push(amPattern[az]);
	}
	
	return amPatternNew;
}

function getLatLonFromDist(lat1, lon1, az, d) {
//az: azimuth in degrees
//d: distance in km

    lat1 = lat1 * Math.PI / 180.0;
    lon1 = lon1 * Math.PI / 180.0;
    az = az * Math.PI / 180.0;

    var R = 6371; //earth radius in kms
    var lat2 = Math.asin(Math.sin(lat1) * Math.cos(d / R) + Math.cos(lat1) * Math.sin(d / R) * Math.cos(az));
    var lon2 = lon1 + Math.atan2(Math.sin(az) * Math.sin(d / R) * Math.cos(lat1), Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2));

    lat2 = lat2 * 180 / Math.PI;
    lon2 = lon2 * 180 / Math.PI;

    return [lat2, lon2]
}

var cal_equivalent_distance = function(zones, field, freq, power) {

	var dist_to_required_field = [];
	var dist_to_break = [];
	var field_at_break = [];
	var field_at_break_0;
	var dist_to_previous_field = [];
	var dist_to_previous_field_0;
	var dist_delta = [];
	var zone_number = 0;
	var isDone = false;
	
	//console.log('start while loop')
	
	while(!isDone) {
		//console.log('zone_number', zone_number)
		if (zone_number == 0) {
			//console.log('inside 1')
			dist_delta[zone_number] = 0
			//console.log('inside 2')
			dist_to_required_field.push(gwave.amDistance(zones[zone_number].conductivity, 15, freq, field, power));
			//console.log('inside 3')
			dist_to_break.push(zones[zone_number].distance);
			//console.log('cond=', zones[zone_number].conductivity, 'freq', freq, 'field', field, 'power', power)
			field_at_break.push(gwave.amField(zones[zone_number].conductivity, 15, freq, dist_to_break[zone_number], power));
			dist_to_previous_field.push(0);
			//console.log('field_at_break', field_at_break[zone_number])
			//field_at_break.push(
		}
		else {
			dist_to_previous_field_0 = gwave.amDistance(zones[zone_number].conductivity, 15, freq, field_at_break[zone_number-1], power)
			dist_to_previous_field.push(dist_to_previous_field_0);
			dist_delta.push(dist_to_previous_field[zone_number] - dist_to_break[zone_number-1]);
			dist_to_break.push(zones[zone_number].distance + mathjs.sum(dist_delta));
			field_at_break.push(gwave.amField(zones[zone_number].conductivity, 15, freq, dist_to_break[zone_number], power));
			//console.log('dist_to_previous_field', dist_to_previous_field[zone_number], 'dist_to_break', dist_to_break[zone_number-1], 'dist_delta',dist_delta[zone_number], 'field_at_break', field_at_break[zone_number] )
			dist_to_required_field.push(gwave.amDistance(zones[zone_number].conductivity, 15, freq, field, power));
		}
		//console.log('field_at_break', field_at_break)
		//console.log('dist_to_previous_field', dist_to_previous_field)
		//console.log('dist_delta', dist_delta)
		//console.log('dist_to_break', dist_to_break)
		
		//console.log('zone', zone_number, 'dist_to_required_field',dist_to_required_field[zone_number], 'dist_to_previous_field', dist_to_previous_field[zone_number], 'dist_delta', dist_delta[zone_number], 'dist_to_break', dist_to_break[zone_number], 'field_at_break', field_at_break[zone_number]);
		if (field_at_break[zone_number] <= field) {
			var distance = dist_to_required_field[zone_number] - mathjs.sum(dist_delta) ;
			
			//console.log('distance=', distance)
			isDone = true;
		}
		else {
			zone_number++;
			if (zone_number > zones.length-1) {
			var distance = zones[zones.length-1].distance;
			isDone = true;
			}
		}
	}
	distance = Math.floor(distance*10 + 0.5)/10;
	
	return distance;		
}

var getCenterFreq = function(freq) {
	var freq_band = [
		[540, 560, 550],
		[570, 590, 580],
		[600, 620, 610],
		[630, 650, 640],
		[660, 680, 670],
		[690, 710, 700],
		[720, 760, 740],
		[770, 810, 790],
		[820, 860, 840],
		[870, 910, 890],
		[920, 960, 940],
		[970, 1030, 1000],
		[1040, 1100, 1070],
		[1110, 1170, 1140],
		[1180, 1240, 1210],
		[1250, 1330, 1290],
		[1340, 1420, 1380],
		[1430, 1510, 1470],
		[1520, 1600, 1560],
		[1610, 1700, 1655]
	];
	
	for (var i = 0; i < freq_band.length; i++) {
		if (freq >= freq_band[i][0] && freq <= freq_band[i][1]) {
			return freq_band[i][2];
		}
	}
	
	return freq;
}

module.exports.congen = congen;
module.exports.getAmPattern = getAmPattern;
module.exports.getAmContour = getAmContour;
module.exports.amContour = amContour;