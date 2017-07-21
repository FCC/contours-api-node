var proj4 = require('proj4');
var isNumeric = require('fast-isnumeric');
var roundTo = require('round-to');

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

var convert = function(req,res){

    var inputLon = req.query.lon;
    var inputLat = req.query.lat;

    // Check if both longitude and latitude are wrong or out of range
    if ((!isNumeric(inputLon) || -180 > inputLon || inputLon > 180) && (!isNumeric(inputLat) || -90 > inputLat || inputLat > 90)){
        res.status(400);
        res.render('err',{error_type: ' longitude and latitude error',
                        error_description: 'lon and lat parameters not numeric or out of range',
                        error_contents: ['Use decimal format (-)xx.xxxxxxx','Valid longitudes range from -180 to 180','Valid latitudes range from -90 to 90']
                });
        return;
    }

    // Check if the longitude is wrong or out of range
    if (!isNumeric(inputLon) || -180 > inputLon || inputLon > 180){
        res.status(400);
        res.render('err',{error_type: ' longitude error',
                        error_description: 'lon parameter not numeric or out of range',
                        error_contents: ['Use decimal format (-)xx.xxxxxxx','Valid longitudes range from -180 to 180']
                });
        return;
    }

    // Check if the latitude is wrong or not supported
    if (!isNumeric(inputLat) || -90 > inputLat || inputLat > 90){
        res.status(400);
        res.render('err',{error_type: ' latitude error',
                        error_description: 'lat parameter not numeric or out of range',
                        error_contents: ['Use decimal format (-)xx.xxxxxxx','Valid latitudes range from -90 to 90']
                });
        return;
    }

    var inProj = req.query.inProj;
    var outProj = req.query.outProj;
    
    var porjAssgnRes = assignInOutProjs(inProj,outProj);

    // Check if both input and output projections are wrong or not supported
    if (porjAssgnRes.inProjName === undefined && porjAssgnRes.outProjName === undefined){
        res.status(400);
        res.render('err',{error_type: ' input and output projections',
                        error_description: 'inProj and outProj prameters not in proper format or not supported by this API. Supported projections are:',
                        error_contents: ['ESPG 4326, type in URL --> WGS84','ESPG 4269, type in URL --> NAD83','ESPG 4267, type in URL --> NAD27']
                });
        return;
    }

    // Check if the input projection is wrong or not supported
    if (porjAssgnRes.inProjName === undefined){
        res.status(400);
        res.render('err',{error_type: ' input projection',
                        error_description: 'inProj prameter not in proper format or not supported by this API. Supported projections are:',
                        error_contents: ['ESPG 4326, type in URL --> WGS84','ESPG 4269, type in URL --> NAD83','ESPG 4267, type in URL --> NAD27']
                });
        return;
    }

    // Check if the output projection is wrong or not supported
    if (porjAssgnRes.outProjName === undefined){
        res.status(400);
        res.render('err',{error_type: ' output projection',
                        error_description: 'outProj prameter not in proper format or not supported by this API. Supported projections are:',
                        error_contents: ['ESPG 4326, type in URL --> WGS84','ESPG 4269, type in URL --> NAD83','ESPG 4267, type in URL --> NAD27']
                });
        return;
    }

    // The following code will create the output results if there are no errors
    var outputPoint = proj4.transform(porjAssgnRes.inProjDef,porjAssgnRes.outProjDef,[inputLon,inputLat]);

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
            'Lon': roundTo(outputPoint.x,7),
            'Lat': roundTo(outputPoint.y,7),
            'Projection': porjAssgnRes.outProjName
        }
    };
    
    res.status(200);
    res.set('Content-Type', 'application/x-javascript');
    res.send(JSON.stringify(params));

    
};

module.exports.convert = convert;