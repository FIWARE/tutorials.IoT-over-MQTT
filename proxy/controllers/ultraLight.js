
//
// This controlller is simulates a series of devices using the Ultralight protocol
//
// Ultralight 2.0 is a lightweight text based protocol aimed to constrained devices and communications 
// where the bandwidth and device memory may be limited resources.
//
// A device can report new measures to the IoT Platform using an HTTP GET request to the /iot/d path with the following query parameters:
//
//  i (device ID): Device ID (unique for the API Key).
//  k (API Key): API Key for the service the device is registered on.
//  t (timestamp): Timestamp of the measure. Will override the automatic IoTAgent timestamp (optional).
//  d (Data): Ultralight 2.0 payload.
//
// At the moment the API key and timestamp are unused by the simulator.

/* global SOCKET_IO */
/* global MQTT_CLIENT */
const NodeCache = require( "node-cache" );
const myCache = new NodeCache();
const _ = require('lodash');
const request = require("request");
const debug = require('debug')('proxy:server');

// Connect to an IoT Agent and use fallback values if necessary
const UL_API_KEY = process.env.DUMMY_DEVICES_API_KEY || '1234';
const UL_HOST = process.env.IOTA_HTTP_HOST || 'localhost';
const UL_PORT = process.env.IOTA_HTTP_PORT || 7896;
const UL_URL = 'http://' + UL_HOST + ':' + UL_PORT + '/iot/d';
const UL_TRANSPORT = (process.env.DUMMY_DEVICES_TRANSPORT || 'HTTP');

// A series of constants used by our se of devices
const OK = ' OK';
const NOT_OK = ' NOT OK';
const DOOR_LOCKED = 's|LOCKED';
const DOOR_OPEN = 's|OPEN';
const DOOR_CLOSED = 's|CLOSED'; 

const BELL_OFF = 's|OFF';
const BELL_ON = 's|ON';

const LAMP_ON = 's|ON|l|1750';
const LAMP_OFF = 's|OFF|l|0';

const INITIAL_COUNT = 'c|0';


// The bell will respond to the "ring" command.
// this will briefly set the bell to on.
// The bell  is not a sensor - it will not report state northbound
function  processHttpBellCommand(req, res) {
	const keyValuePairs = req.body.split('|') || [''];
	const command =   getCommand (keyValuePairs[0]);
	const deviceId = 'bell' + req.params.id;
	const result =  keyValuePairs[0] + '| ' + command;
		
	// Check for a valid device and command
	if(_.indexOf(myCache.keys(), deviceId) === -1 ||
		_.indexOf(['ring'], command) === -1 ){
		return  res.status(422).send(result + NOT_OK);
	}

	// Update device state
	actuateDevice(deviceId, command);

	return res.status(200).send(result + OK);	
}

// The door responds to "open", "close", "lock" and "unlock" commands
// Each command alters the state of the door. When the door is unlocked
// it can be opened and shut by external events.
function processHttpDoorCommand(req, res) {
	const keyValuePairs = req.body.split('|') || [''];
	const command = getCommand (keyValuePairs[0]);
	const deviceId = 'door' + req.params.id;
	const result = keyValuePairs[0] + '| ' + command;

	// Check for a valid device and command
	if(_.indexOf(myCache.keys(), deviceId ) === -1 ||
		_.indexOf(['open', 'close', 'lock', 'unlock'], command) === -1 ){
		return  res.status(422).send(result + NOT_OK);
	}

	// Update device state
	actuateDevice(deviceId, command);
	
	return res.status(200).send(result + OK);	
}

// The lamp can be "on" or "off" - it also registers luminocity.
// It will slowly dim as time passes (provided no movement is detected)
function processHttpLampCommand(req, res) {
	const keyValuePairs = req.body.split('|') || [''];
	const command =   getCommand (keyValuePairs[0]);
	const deviceId = 'lamp' + req.params.id;
	const result =  keyValuePairs[0] + '| ' + command;

	// Check for a valid device and command
	if(_.indexOf(myCache.keys(), deviceId) === -1 ||
		_.indexOf(['on', 'off'], command) === -1 ){
		return  res.status(422).send(result + NOT_OK);
	}

	// Update device state
	actuateDevice(deviceId, command);
	return res.status(200).send(result + OK);	
}

function processMqttMessage(topic, message) {
	const mqttBrokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://mosquitto';
	SOCKET_IO.emit( 'mqtt' , mqttBrokerUrl + topic + '  ' + message);
	const path = topic.split("/");
	if (path.pop() === 'cmd'){
		const keyValuePairs = message.split('|') || [''];
		const command =  getCommand (keyValuePairs[0]);
		const deviceId = path.pop();
		const result =  keyValuePairs[0] + '| ' + command;

		if(_.indexOf(myCache.keys(), deviceId) !== -1){
			actuateDevice(deviceId, command);
			const topic = '/' + UL_API_KEY + '/' +  deviceId + '/cmdexe'
			MQTT_CLIENT.publish(topic, result + OK)
		}
	}
}

function actuateDevice(deviceId, command){
	switch (deviceId.replace(/\d/g, '')){
		case "bell":
			if (command === 'ring'){
				setDeviceState( deviceId, BELL_ON, false);
				SOCKET_IO.emit(deviceId, BELL_ON);
			}
			break;
		case "door":
			if (command === 'open'){
				setDeviceState( deviceId, DOOR_OPEN);
			} else if (command === 'close' || command === 'unlock'){
				setDeviceState( deviceId, DOOR_CLOSED);
			} else if (command === 'lock'){
				setDeviceState( deviceId, DOOR_LOCKED);
			} 
			break;
		case "lamp":
			if (command === 'on'){
				setDeviceState( deviceId, LAMP_ON);
			}
			if (command === 'off'){
				setDeviceState( deviceId, LAMP_OFF);
			}
			break;
		}

}

//
// Splits the deviceId from the command sent.
//
function getCommand (string){
	const command =  string.split('@');
	if (command.length === 1){
		command.push('');
	}
	return command[1];
}

// Set up 16 IoT devices, a door, bell, motion sensor and lamp for each of 4 locations.
//
// The door can be OPEN CLOSED or LOCKED
// The bell can be ON or OFF - it does not report state.
// The motion sensor counts the number of people passing by
// The lamp can be ON or OFF. This also registers luminocity.
// It will slowly dim as time passes (provided no movement is detected)
function init (){
	setDeviceState( 'door001', DOOR_LOCKED);
	setDeviceState( 'door002', DOOR_LOCKED);
	setDeviceState( 'door003', DOOR_LOCKED);
	setDeviceState( 'door004', DOOR_LOCKED);

	setDeviceState( 'bell001', BELL_OFF, false);
	setDeviceState( 'bell002', BELL_OFF, false);
	setDeviceState( 'bell003', BELL_OFF, false);
	setDeviceState( 'bell004', BELL_OFF, false);

	setDeviceState( 'lamp001', LAMP_OFF);
	setDeviceState( 'lamp002', LAMP_OFF);
	setDeviceState( 'lamp003', LAMP_OFF);
	setDeviceState( 'lamp004', LAMP_OFF);

	setDeviceState( 'motion001', INITIAL_COUNT);
	setDeviceState( 'motion002', INITIAL_COUNT);
	setDeviceState( 'motion003', INITIAL_COUNT);
	setDeviceState( 'motion004', INITIAL_COUNT);
}

//
// Transformation function from Ultralight Protocol to an object
// Ultralight is a series of pipe separated key-value pairs.
// Each key and value is in turn separated by a pipe character
//
// e.g. s|ON|l|1000 becomes
// { s: 'ON', l: '1000'}
//
function getDeviceState(deviceId){
	const ultraLight = myCache.get(deviceId);
	const obj = {};
	const keyValuePairs = ultraLight.split('|')
	for (let i = 0; i < keyValuePairs.length; i = i + 2) {
		obj[keyValuePairs[i]] = keyValuePairs[i+ 1];
	}
	return obj;
}
//
// Sets the device state in the in-memory cache. If the device is a sensor
// it also reports (and attempts to send) the northbound traffic to the IoT agent.
// The state of the dummy device is also sent to the browser for display
//
function setDeviceState(deviceId, state, isSensor = true){
	const previousState = myCache.get(deviceId);
	myCache.set(deviceId, state);
	
	if ( isSensor && (state !== previousState) ){
		

		if (UL_TRANSPORT ===  'HTTP'){
			const options = { method: 'POST',
			  url: UL_URL,
			  qs: { k: UL_API_KEY, i: deviceId },
			  headers: 
			   { 'Content-Type': 'text/plain' },
			  body: state };
			 const debugText =  'POST ' + UL_URL + '?i=' + options.qs.i  + '&k=' + options.qs.k;

			request(options,  (error) => {
			  if (error){
			  	debug( debugText +  " " + error.code)
			  } 
			});
			SOCKET_IO.emit( 'http' ,  debugText + '  ' + state);
		}
		if (UL_TRANSPORT === 'MQTT') {
			const topic = '/' + UL_API_KEY + '/' +  deviceId + '/attrs'
			MQTT_CLIENT.publish(topic, state)
		}
	}
	
	SOCKET_IO.emit(deviceId, state);
}


// Transformation function from a state object to the Ultralight Protocol
// Ultralight is a series of pipe separated key-value pairs.
// Each key and value is in turn separated by a pipe character
//
// e.g. s|ON,l|1000
function toUltraLight (object){
	const strArray = [];
	_.forEach(object, function(value, key) {
		strArray.push(key + '|' + value);
	});
	return strArray.join ('|');
}

// Return the state of the door with the same number as the current element
// this is because no people will enter if the door is LOCKED, and therefore
// both the motion sensor will not increment an the smart lamp will slowly
// decrease
function getDoorState (deviceId, type){
	const door = getDeviceState(deviceId.replace(type, 'door'));
	return  door.s || 'LOCKED';
}

// Return the state of the lamp with the same number as the current element
// this is because fewer people will enter the building if the lamp is OFF, 
// and therefore the motion sensor will increment more slowly
function getLampState (deviceId, type){
	const lamp = getDeviceState(deviceId.replace(type, 'lamp'));
	return  lamp.s || 'OFF';
}

// Pick a random number between 1 and 10
function getRandom (){
	return  Math.floor(Math.random() * 10) + 1;
}




setTimeout (() =>{
	// Initialize the array of sensors and periodically update them.
	init ();


	let isRunningDoor = false;
	let isRunning = false;


	// Every few seconds, update the state of the dummy devices in a 
	// semi-random fashion. 
	setInterval(() => {
	    if(!isRunningDoor){
	        isRunningDoor = true;

	        const deviceIds = myCache.keys();

			_.forEach(deviceIds, (deviceId) => {
				const state = getDeviceState(deviceId);
				const isSensor = true;

				switch (deviceId.replace(/\d/g, '')){
					case "door":
						//  The door is OPEN or CLOSED or LOCKED,
						if(state.s !== 'LOCKED'){
							// Randomly open and close the door if not locked.
							// lower the rate if the lamp is off.
							const rate = (getLampState (deviceId, 'door') === 'ON') ? 3 : 6;
							state.s = (getRandom() > rate) ? 'OPEN' : 'CLOSED';
						}
						setDeviceState(deviceId, toUltraLight(state), isSensor);
					break;
				}

				
			});
			
	       isRunningDoor = false;
	    }
	}, 5000);




	// Every seconds, update the state of the dummy devices in a 
	// semi-random fashion. 
	setInterval( () => {
	    if(!isRunning){
	        isRunning = true;

	        const deviceIds = myCache.keys();

			_.forEach(deviceIds, (deviceId) => {
				const state = getDeviceState(deviceId);
				let isSensor = true;

				switch (deviceId.replace(/\d/g, '')){
					
					case "bell":
						// ON or OFF - Switch off the bell if it is still ringing
						if(state.s === 'ON'){
							state.s = 'OFF';
						}
						isSensor = false;	
						break;

					case "motion":
						// If the door is OPEN, randomly switch the count of the motion sensor
						if(getDoorState (deviceId, 'motion') === 'OPEN'){
							if (state.c === 1 ){
								state.c = 0;
							} else {
								state.c =  ((getRandom() > 3) ? 1 : 0);
							}
						} else	{
							state.c = 0;
						}
						setDeviceState(deviceId, toUltraLight(state), isSensor);
						break;			


					case "lamp":
						if(state.s === 'OFF'){
							state.l = 0;
						} else if(getDoorState (deviceId, 'lamp') === 'OPEN'){
							// if the door is open set the light to full power
							state.l = parseInt(state.l) || 1000;
							state.l = state.l + (getRandom() * getRandom() );
							if (state.l < 1900){
								state.l = state.l + 30 + (getRandom() * getRandom() );
							}
							if (state.l > 2000){
								state.l = 2000;
							}
						} else if (state.l > 1000){
							// if the door is closed dim the light
							state.l = parseInt(state.l) || 2000;
							if  (getRandom() > 3) {
								state.l = state.l - 30 - (getRandom() * getRandom() );
							}
							state.l = state.l + getRandom();
						}
						break;	
				}

				setDeviceState(deviceId, toUltraLight(state), isSensor);
			});
			
	       isRunning = false;
	    }
	}, 1000);

}, 3000);




module.exports = {
	processHttpBellCommand,
	processHttpDoorCommand,
	processHttpLampCommand,
	processMqttMessage
};