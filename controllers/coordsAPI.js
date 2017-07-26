var proj4 = require('proj4');
var isNumeric = require('fast-isnumeric');
var roundTo = require('round-to');
var DmsCoords = require("dms-conversion").default;
var dd = require("dms-conversion");
var isInteger = require("is-integer");

var assignInOutProjs = function(inP,outP){

    var WGS84ProjDef = proj4.Proj('GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]');
    var NAD83ProjDef = proj4.Proj('GEOGCS["NAD83",DATUM["North_American_Datum_1983",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],TOWGS84[0,0,0,0,0,0,0],AUTHORITY["EPSG","6269"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4269"]]');
    var NAD27ProjDef = proj4.Proj('GEOGCS["NAD27",DATUM["North_American_Datum_1927",SPHEROID["Clarke 1866",6378206.4,294.9786982139006,AUTHORITY["EPSG","7008"]],AUTHORITY["EPSG","6267"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4267"]]');

    var result = {};

    if (inP.toUpperCase() === 'WGS84'){
        result.inProjDef = WGS84ProjDef;
        result.inProjName = 'EPSG:4326 (WGS84)';
    }
    else if(inP.toUpperCase() === 'NAD83'){
        result.inProjDef = NAD83ProjDef;
        result.inProjName = 'EPSG:4269 (NAD83)';
    }
    else if(inP.toUpperCase() === 'NAD27'){
        result.inProjDef = NAD27ProjDef;
        result.inProjName = 'EPSG:4267 (NAD27)';
    }
    else{
        result.inProjName = undefined;
    }

    if (outP.toUpperCase() === 'WGS84'){
        result.outProjDef = WGS84ProjDef;
        result.outProjName = 'EPSG:4326 (WGS84)';
    }
    else if(outP.toUpperCase() === 'NAD83'){
        result.outProjDef = NAD83ProjDef;
        result.outProjName = 'EPSG:4269 (NAD83)';
    }
    else if(outP.toUpperCase() === 'NAD27'){
        result.outProjDef = NAD27ProjDef;
        result.outProjName = 'EPSG:4267 (NAD27)';
    }
    else{
        result.outProjName = undefined;
    }

    return result;

}

var generateErrorJSON = function(error_type, error_details){
    return {
        'Error type': error_type,
        'Error details': error_details
    };

}

var project = function(req,res){

    if(req.query.lon === undefined || req.query.lat === undefined || req.query.inProj === undefined || req.query.outProj === undefined){
        res.status(400);
        res.set('Content-Type', 'application/x-javascript');
        res.send(generateErrorJSON('Missing one or more of the params', ['The parameters are lat, lon, inProj, outProj, [and outType]','lon and lat parameters should be numeric','Use decimal format (-)xx.xxxxxxx','Valid longitudes range from -180 to 180','Valid latitudes range from -90 to 90','Projection options: WGS84, NAD83, and NAD27','OutType can be DMS or DD, if left blank DD is the default']));
        return;
    }
    
    var inputLon = req.query.lon;
    var inputLat = req.query.lat;

    // Check if both longitude and latitude are wrong or out of range
    if ((!isNumeric(inputLon) || -180 > inputLon || inputLon > 180) && (!isNumeric(inputLat) || -90 > inputLat || inputLat > 90)){ 
        res.status(400);
        res.set('Content-Type', 'application/x-javascript');
        res.send(generateErrorJSON('Longitude and latitude error', ['lon and lat parameters not numeric or out of range','Use decimal format (-)xx.xxxxxxx','Valid longitudes range from -180 to 180','Valid latitudes range from -90 to 90']));
        
        return;
    }

    // Check if the longitude is wrong or out of range
    if (!isNumeric(inputLon) || -180 > inputLon || inputLon > 180){
        res.status(400);
        res.set('Content-Type', 'application/x-javascript');
        res.send(generateErrorJSON('Longitude error', ['lon parameter not numeric or out of range','Use decimal format (-)xx.xxxxxxx','Valid longitudes range from -180 to 180']));
        
        return;
    }

    // Check if the latitude is wrong or not supported
    if (!isNumeric(inputLat) || -90 > inputLat || inputLat > 90){
        res.status(400);
        res.set('Content-Type', 'application/x-javascript');
        res.send(generateErrorJSON('Latitude error', ['lat parameter not numeric or out of range','Use decimal format (-)xx.xxxxxxx','Valid Latitudes range from -90 to 90']));
        
        return;
    }

    var inProj = req.query.inProj;
    var outProj = req.query.outProj;
    
    var porjAssgnRes = assignInOutProjs(inProj,outProj);

    // Check if both input and output projections are wrong or not supported
    if (porjAssgnRes.inProjName === undefined && porjAssgnRes.outProjName === undefined){
        res.status(400);
        res.set('Content-Type', 'application/x-javascript');
        res.send(generateErrorJSON('Either input or output projections invalid', ['inProj and outProj prameters not in proper format or not supported by this API','Supported projections are: ','ESPG 4326, type in URL --> WGS84','ESPG 4269, type in URL --> NAD83','ESPG 4267, type in URL --> NAD27']));
        
        return;
    }

    // Check if the input projection is wrong or not supported
    if (porjAssgnRes.inProjName === undefined){
        res.status(400);
        res.set('Content-Type', 'application/x-javascript');
        res.send(generateErrorJSON('Input projection invalid', ['inProj and outProj prameters not in proper format or not supported by this API','Supported projections are: ','ESPG 4326, type in URL --> WGS84','ESPG 4269, type in URL --> NAD83','ESPG 4267, type in URL --> NAD27']));
        
        return;
    }

    // Check if the output projection is wrong or not supported
    if (porjAssgnRes.outProjName === undefined){
        res.status(400);
        res.set('Content-Type', 'application/x-javascript');
        res.send(generateErrorJSON('Output projection invalid', ['inProj and outProj prameters not in proper format or not supported by this API','Supported projections are: ','ESPG 4326, type in URL --> WGS84','ESPG 4269, type in URL --> NAD83','ESPG 4267, type in URL --> NAD27']));
        
        return;
    }

    // The following code will create the output results if there are no errors
    inputLon = roundTo(parseFloat(req.query.lon),7);
    inputLat = roundTo(parseFloat(req.query.lat),7);
    var outputPoint = proj4.transform(porjAssgnRes.inProjDef,porjAssgnRes.outProjDef,[inputLon,inputLat]);

    // outLon and outLat are used to output the coordinates in either DD or DMS format
    var outLon, outLat, dmsC;

    // This if statement checks if the outType parameter is included in the URL
    // If yes, it will check if the value passed is either DMS or DD
    // If not, it will default to DD
    if(req.query.outType === undefined){
        outLon = roundTo(outputPoint.x,7);
        outLat = roundTo(outputPoint.y,7);
        }
    else{
            if (req.query.outType.toUpperCase() === 'DMS'){
                dmsC = new DmsCoords(roundTo(outputPoint.y,7), roundTo(outputPoint.x,7));
                outLon = dmsC.dmsArrays.longitude[0] + '° ' + 
                    dmsC.dmsArrays.longitude[1] + "′ " +
                    roundTo(dmsC.dmsArrays.longitude[2],3) + '″ ' +
                    dmsC.dmsArrays.longitude[3];

                outLat = dmsC.dmsArrays.latitude[0] + '° ' + 
                    dmsC.dmsArrays.latitude[1] + "′ " +
                    roundTo(dmsC.dmsArrays.latitude[2],3) + '″ ' +
                    dmsC.dmsArrays.latitude[3];
            }
        else if (req.query.outType.toUpperCase() === 'DD'){
                outLon = roundTo(outputPoint.x,7);
                outLat = roundTo(outputPoint.y,7);
            
            }
        else{
                res.status(400);
                res.set('Content-Type', 'application/x-javascript');
                res.send(generateErrorJSON('outType parameter invalid', ['outType prameter should be DMS or DD','DMS --> Degree Minute Second','DD --> Decimal Degree','If outType parameter is not used in URL, default output is DD']));
                
                return;
            }
    }

    // The params is the object to be displayed as JSON
    var params = {
        'Input':
        {
            'Lon': parseFloat(inputLon),
            'Lat': parseFloat(inputLat),
            'Projection': porjAssgnRes.inProjName
        },

        'Output':
        {
            'Lon': outLon,
            'Lat': outLat,
            'Projection': porjAssgnRes.outProjName
        }
    };
    
    res.status(200);
    res.set('Content-Type', 'application/x-javascript');
    res.send(JSON.stringify(params));
};

var dd2dms = function(req,res){

    if(req.query.lon === undefined || req.query.lat === undefined){
        res.status(400);
        res.set('Content-Type', 'application/x-javascript');
        res.send(generateErrorJSON('Missing one or more of the params', ['lon and lat parameters not numeric or out of range','Use decimal format (-)xx.xxxxxxx','Valid longitudes range from -180 to 180','Valid latitudes range from -90 to 90']));
        return;
        
    }
    
    var inputLon = req.query.lon;
    var inputLat = req.query.lat;

    // Check if both longitude and latitude are wrong or out of range
    if ((!isNumeric(inputLon) || -180 > inputLon || inputLon > 180) && (!isNumeric(inputLat) || -90 > inputLat || inputLat > 90)){ 
        res.status(400);
        res.set('Content-Type', 'application/x-javascript');
        res.send(generateErrorJSON('Longitude and latitude error', ['lon and lat parameters not numeric or out of range','Use decimal format (-)xx.xxxxxxx','Valid longitudes range from -180 to 180','Valid latitudes range from -90 to 90']));
        return;
    }

    // Check if the longitude is wrong or out of range
    if (!isNumeric(inputLon) || -180 > inputLon || inputLon > 180){
        res.status(400);
        res.set('Content-Type', 'application/x-javascript');
        res.send(generateErrorJSON('Longitude error', ['lon parameter not numeric or out of range','Use decimal format (-)xx.xxxxxxx','Valid longitudes range from -180 to 180']));
        return;
    }

    // Check if the latitude is wrong or not supported
    if (!isNumeric(inputLat) || -90 > inputLat || inputLat > 90){
        res.status(400);
        res.set('Content-Type', 'application/x-javascript');
        res.send(generateErrorJSON('Latitude error', ['lat parameter not numeric or out of range','Use decimal format (-)xx.xxxxxxx','Valid Latitudes range from -90 to 90']));        
        return;
    }

    // The following code will create the output results if there are no errors
    inputLon = roundTo(parseFloat(req.query.lon),7);
    inputLat = roundTo(parseFloat(req.query.lat),7);

    var dmsC = new DmsCoords(inputLat, inputLon);
    var outLon = dmsC.dmsArrays.longitude[0] + '° ' + 
                dmsC.dmsArrays.longitude[1] + "′ " +
                roundTo(dmsC.dmsArrays.longitude[2],3) + '″ ' +
                dmsC.dmsArrays.longitude[3];

    var outLat = dmsC.dmsArrays.latitude[0] + '° ' + 
                dmsC.dmsArrays.latitude[1] + "′ " +
                roundTo(dmsC.dmsArrays.latitude[2],3) + '″ ' +
                dmsC.dmsArrays.latitude[3];

    // The params is the object to be displayed as JSON
    var params = {
        'Input':
        {
            'Lon': inputLon,
            'Lat': inputLat
        },

        'Output':
        {
            'Lon': outLon,
            'Lon parsed':{
                'degrees': dmsC.dmsArrays.longitude[0],
                'minutes': dmsC.dmsArrays.longitude[1],
                'seconds': roundTo(dmsC.dmsArrays.longitude[2],3),
                'Direction': dmsC.dmsArrays.longitude[3]
            },
            'Lat': outLat,
            'Lat parsed':{
                'degrees': dmsC.dmsArrays.latitude[0],
                'minutes': dmsC.dmsArrays.latitude[1],
                'seconds': roundTo(dmsC.dmsArrays.latitude[2],3),
                'Direction': dmsC.dmsArrays.latitude[3]
            },
        }
    };
    
    res.status(200);
    res.set('Content-Type', 'application/x-javascript');
    res.send(JSON.stringify(params));
    
};

var dms2dd = function(req,res){

    if(req.query.lonD === undefined || req.query.lonM === undefined || req.query.lonS === undefined || req.query.lonDi === undefined
        || req.query.latD === undefined || req.query.latM === undefined || req.query.latS === undefined || req.query.latDi === undefined)
    {
        res.status(400);
        res.set('Content-Type', 'application/x-javascript');
        res.send(generateErrorJSON('Missing one or more of the params', ['Parameters are: lonD, lonM, lonS, lonDi, LatD, latM, latS, and LatDi',
                                'LonD --> longitude degrees','LonM --> longitude minutes','LonS --> longitude seconds','LonDi --> longitude direction',
                                'LonD should be a whole number (integer) ranged from -180 to 180','LatD also should be a whole number (integer) ranged from -90 to 90',
                                'Minutes range from 0-60 also as whole numbers','Seconds range also from 0-60 and can have decimals']));
        return;
    }
    
    var inputLonD = req.query.lonD;
    var inputLonM = req.query.lonM;
    var inputLonS = req.query.lonS;
    var inputLonDi = req.query.lonDi;
    var inputLatD = req.query.latD;
    var inputLatM = req.query.latM;
    var inputLatS = req.query.latS;
    var inputLatDi = req.query.latDi;

    // Check if lonD, lonM, latD, and latM are numeric before checking if they are integers
    // since isInteger does not verify number strings
    if (!isNumeric(inputLonD)){
        res.status(400);
        res.set('Content-Type', 'application/x-javascript');
        res.send(generateErrorJSON('Longitude degree error', ['lonD parameter not a number']));
        return;
    }
    else{
        inputLonD = parseFloat(inputLonD);
    }

    if (!isNumeric(inputLonM)){
        res.status(400);
        res.set('Content-Type', 'application/x-javascript');
        res.send(generateErrorJSON('Longitude degree error', ['lonM parameter not a number']));
        return;
    }
    else{
        inputLonM = parseFloat(inputLonM);
    }

    if (!isNumeric(inputLatD)){
        res.status(400);
        res.set('Content-Type', 'application/x-javascript');
        res.send(generateErrorJSON('Latitude degree error', ['latD parameter not a number']));
        return;
    }
    else{
        inputLatD = parseFloat(inputLatD);
    }
    
    if (!isNumeric(inputLatM)){
        res.status(400);
        res.set('Content-Type', 'application/x-javascript');
        res.send(generateErrorJSON('Latitude degree error', ['latM parameter not a number']));
        return;
    }
    else{
        inputLatM = parseFloat(inputLatM);
    }
    
    // Check if lonD is wrong or out of range
    if ((!isInteger(inputLonD) || -180 > inputLonD || inputLonD > 180)){ 
        res.status(400);
        res.set('Content-Type', 'application/x-javascript');
        res.send(generateErrorJSON('Longitude degree error', ['lonD parameter not a whole number or out of range','Valid longitudes range from -180 to 180']));
        return;
    }

    // Check if latD is wrong or out of range
    if ((!isInteger(inputLatD) || -90 > inputLatD || inputLatD > 90)){ 
        res.status(400);
        res.set('Content-Type', 'application/x-javascript');
        res.send(generateErrorJSON('Latitude degree error', ['latD parameter not a whole number or out of range','Valid latitudes range from -90 to 90']));
        return;
    }

    // Check if lonM is wrong or out of range
    if (!isInteger(inputLonM) || 0 > inputLonM || inputLonM > 60){
        res.status(400);
        res.set('Content-Type', 'application/x-javascript');
        res.send(generateErrorJSON('Longitude minutes error', ['lonM parameter not a whole number or out of range','Valid longitude minutes range from 0 to 60']));
        return;
    }

    // Check if lonM is wrong or out of range
    if (!isInteger(inputLatM) || 0 > inputLatM || inputLatM > 60){
        res.status(400);
        res.set('Content-Type', 'application/x-javascript');
        res.send(generateErrorJSON('Latitude minutes error', ['latM parameter not a whole number or out of range','Valid latitude minutes range from 0 to 60']));
        return;
    }

    // Check if lonS is wrong or out of range
    if (!isNumeric(inputLonS) || 0 > inputLonS || inputLonS > 60){
        res.status(400);
        res.set('Content-Type', 'application/x-javascript');
        res.send(generateErrorJSON('Longitude seconds error', ['lonS parameter not numeric or out of range','Valid longitude seconds range from 0.0 to 60.0']));
        return;
    }

    // Check if latS is wrong or out of range
    if (!isNumeric(inputLatS) || 0 > inputLatS || inputLatS > 60){
        res.status(400);
        res.set('Content-Type', 'application/x-javascript');
        res.send(generateErrorJSON('Latitude seconds error', ['latS parameter not numeric or out of range','Valid latitude seconds range from 0.0 to 60.0']));
        return;
    }

    // Check if lonDi is wrong
    if (inputLonDi.toUpperCase() !== 'E' && inputLonDi.toUpperCase() !== 'W'){
        res.status(400);
        res.set('Content-Type', 'application/x-javascript');
        res.send(generateErrorJSON('Longitude direction error', ['lonDi parameter can be E for East or W for West']));
        return;
    }

    // Check if latDi is wrong
    if (inputLatDi.toUpperCase() !== 'N' && inputLatDi.toUpperCase() !== 'S'){
        res.status(400);
        res.send(generateErrorJSON('Latitude direction error', ['latDi parameter can be N for North or S for South']));
        res.set('Content-Type', 'application/x-javascript');
        return;
    }

    inputLonD = parseInt(req.query.lonD);
    inputLonM = parseInt(req.query.lonM);
    inputLonS = roundTo(parseFloat(req.query.lonS),3);
    inputLatD = parseInt(req.query.latD);
    inputLatM = parseInt(req.query.latM);
    inputLatS = roundTo(parseFloat(req.query.latS),3);

    var inputLon = inputLonD + '° ' + inputLonM + '′ ' + inputLonS + '″ ' + inputLonDi.toUpperCase();
    var inputLat = inputLatD + '° ' + inputLatM + '′ ' + inputLatS + '″ ' + inputLatDi.toUpperCase();

    var dmsStrings = [inputLat, inputLon];
    var dmsCoords = dmsStrings.map(dd.parseDms);
    var outLat = dmsCoords[0].toString();
    outLat = roundTo(parseFloat(outLat),7);
    var outLon = dmsCoords[1].toString();
    outLon = roundTo(parseFloat(outLon),7);

    // The params is the object to be displayed as JSON
    var params = {
        'Input':
        {
            'Lon': inputLon,
            'Lat': inputLat
        },

        'Output':
        {
            'Lon': outLon,
            'Lat': outLat
        }
    };
    
    res.status(200);
    res.set('Content-Type', 'application/x-javascript');
    res.send(JSON.stringify(params));
};

module.exports.project = project;
module.exports.dms2dd = dms2dd;
module.exports.dd2dms = dd2dms;