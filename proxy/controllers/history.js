

const debug = require('debug')('proxy:server');
//const monitor = require('../lib/monitoring');
const request = require("request");
const moment = require('moment');
const _ = require('lodash');

const cometUrl =(process.env.STH_COMET_SERVICE_URL || 'http://localhost:8666/STH/v1')  
   +  '/contextEntities/type/';
const nsgiLdPrefix = (process.env.NGSI_LD_PREFIX !== undefined) ? process.env.NGSI_LD_PREFIX : 'urn:ngsi-ld:';



function readMotionCount(id, aggMethod){
    return new Promise(function(resolve, reject) {
    const options = { method: 'GET',
        url: cometUrl + 'Motion/id/' + nsgiLdPrefix +
         'Motion:' + id + '/attributes/count',
        qs: { aggrMethod: aggMethod, aggrPeriod: 'minute' },
        headers: 
        { 'fiware-servicepath': '/',
         'fiware-service': 'openiot' } };

      request(options, (error, response, body) => {
          return error ? reject(error) : resolve(JSON.parse(body));
      });
    });
}

function readLampLuminosity(id, aggMethod){
    return new Promise(function(resolve, reject) {
   var options = { method: 'GET',
  url: cometUrl + 'Lamp/id/' + nsgiLdPrefix +
    'Lamp:' + id + '/attributes/luminosity',
  qs: { aggrMethod: aggMethod, aggrPeriod: 'minute' },
  headers: 
   { 
     'fiware-servicepath': '/',
     'fiware-service': 'openiot' } };

      request(options, (error, response, body) => {
          return error ? reject(error) : resolve(JSON.parse(body));
      });
    });
}



function cometToTimeSeries(cometResponse, aggMethod, hexColor){

    const data = [];
    const labels = [];
    const color =  [];

	if(cometResponse && cometResponse.contextResponses[0].contextElement.attributes.length > 0 &&
	 cometResponse.contextResponses[0].contextElement.attributes[0].values.length > 0 ){
		const values =  cometResponse.contextResponses[0].contextElement.attributes[0].values[0];
	    let date = moment(values._id.origin);
	  
	  	_.forEach(values.points, element => {
	        data.push({ t: date.valueOf(), y: element[aggMethod] });
	        labels.push(date.format( 'HH:mm'));
	        color.push(hexColor);
	        date = date.clone().add(1, 'm');
	    });
	}

	return {
		labels,
    data,
    color
	};
}


async function readDeviceHistory (req, res){

  const id = req.params.deviceId.split(":").pop();

  const cometMotionData = await readMotionCount(id, 'sum');
  const cometLampMinData = await readLampLuminosity(id, 'min');
  const cometLampMaxData = await readLampLuminosity(id, 'max');

	const sumMotionData = cometToTimeSeries(cometMotionData, 'sum', '#45d3dd');
	const minLampData = cometToTimeSeries(cometLampMinData, 'min', '#45d3dd');
  const maxLampData = cometToTimeSeries(cometLampMaxData, 'max', '#45d3dd');

	res.render('history', { title: 'IoT Device History', id, sumMotionData, minLampData, maxLampData });
}


module.exports = {
	readDeviceHistory
};