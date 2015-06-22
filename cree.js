/* cree server */

// TO-DO
// --------------
/*
	Issues
	- iPad timer 5 seconds, and not 21 seconds like the rest.
	- Auction profit, zero bid.
	
	New Features
	- admin option: first connected user vs. generate random password/URL
	- Prehaps switch to using jQuery.pagevisibility (https://github.com/dcherman/jquery.pagevisibility) or blur()/focus() http://stackoverflow.com/a/8061231/1053612
	- Quit process at end of experiment/session, such that third-party program can restart experiment, if need. Need to make ExcludeIPList for this, so subjects cannot participate in following sessions.
	- Show up fee / payment, even if experiment is full or if co-participant unexpectedly quites and ending the experiment.
	- Generate voucher code at payment stage that can be used to claim cash payment in in-person experiments.
	- Obsure the url loaded, such that the file name does not reveal infomation about experiment/stage/treatment
*/

// node.js required modules
// --------------
	// internal api
	var fs = require('fs');
	var os = require('os');
	var http = require('http');
	
	// external
	var _ = require('underscore');
	var cloak = require('cloak');
	var shuffle = require('knuth-shuffle').knuthShuffle;
	var UAParser = require('ua-parser-js');
	var connect = require('connect');
	

// Create variables, arrays and objects
// --------------
	var experiment = JSON.parse(fs.readFileSync(experimentURL[0], experimentURL[1]));
	var roomsFull = false; // Initially the rooms are empty.
	var members = new Array(); // Array with the IDs of all members. Ordered according to the sequence by which the joined.
	var loaded = new Array();
	var initTime = new Date();
	var timeGlobal = cloak.createTimer('timerGlobal', 0, false);
	var defaultExcludeDevices = [
		{"browser": {"name": "IE", "major": 9}},
		{"browser": {"name": "Safari", "major": 5.1}},
		{"browser": {"name": "Chrome", "major": 42}},
		{"browser": {"name": "Firefox", "major": 37}},
		{"browser": {"name": "Opera", "major": 12.1}},
		{"browser": {"name": "Mobile Safari", "major": 6.1}},
		{"browser": {"name": "Android Browser", "major": 4}}
	]; //{browser: {name: '', major: ''}, device: {model: '', type: '', vendor: ''}, engine: {name: '', version: ''}, os: {name: '', version: ''}}
	var ExcludeDevices = _.union(defaultExcludeDevices, experiment.ExcludeDevices);
	
	
// Functions
// --------------

	// Function that parses the user agent of the browser.
	var parser = new UAParser();

	// Get public and local IP's
	var getRequest = http.get({'host': 'api.ipify.org', 'port': 80, 'path': '/'}, function(resp) {
		resp.on('data', function(ip) {
	    console.log(("Join experiment via THE INTERNET using: " + "http://"+ip+":"+clientPort).warn);
	  });
	});
	getRequest.on('error', function (err) { console.log(err); });
	var interfaces = os.networkInterfaces();
	var addresses = [];
	for (var k in interfaces) {
	    for (var k2 in interfaces[k]) {
	        var address = interfaces[k][k2];
	        if (address.family === 'IPv4' && !address.internal) {
	            addresses.push(address.address);
	        }
	    }
	}
	console.log(("Join experiment via LOCAL NETWORK using: " + "http://"+addresses[0]+":"+clientPort).warn);
	// Display propper error if not connected to local network, or if not connected to internet

	// Underscore.js' extend() function goes one level deep only. This merges all depths of objects.
	// http://stackoverflow.com/a/14843976/1053612
	extend = function(target, source) {
		for (var prop in source)
			if (prop in target)
				extend(target[prop], source[prop]);
			else
				target[prop] = source[prop];
		return target;
	}

	// Remove item from array
	removeItem = function(array, item) {
		var index = array.indexOf(item);
		if(index > -1) array.splice(index, 1);
	};

	/*String.prototype.hashCode = function() { // TO-DO: Obsure the url loaded?
	  var hash = 0, i, chr, len;
	  if (this.length === 0) return hash;
	  for (i = 0, len = this.length; i < len; i++) {
	    chr   = this.charCodeAt(i);
	    hash  = ((hash << 5) - hash) + chr;
	    hash |= 0; // Convert to 32bit integer
	  }
	  return hash;
	};*/

	var randomRooms = function(method) {
		switch (method) {
			case 'withinRooms':
			
				// If users are not in rooms yet, just re-run function but with 'acrossRooms' method.
				if(cloak.getLobby().getMembers(true).length == members.length) {
					randomRooms("acrossRooms");
				} else {
					// loop through rooms. In each room run knuth shuffle to randomises the ordering. Give players new names based on new ordering.
					for(var i in cloak.getRooms(true)) {
						var room = cloak.getRoom(cloak.getRooms(true)[i].id);
						var roomMembers = _.pluck(room.getMembers(true), 'id');
						// Using the knuth shuffle to randomises the ordering of the original array, e.g.: b = ['b','g','a','h','f','i','c','e','d']
						var b = shuffle(roomMembers.slice(0));
						for(var j in b) {
							cloak.getUser(b[j]).name = (Number(j)+1).toString();
						}
					}
				}
				break;
				
			case 'acrossRooms':
			default:
				// Using the knuth shuffle to randomises the ordering of the original array, e.g.: b = ['b','g','a','h','f','i','c','e','d']
		        var b = shuffle(members.slice(0));
		        // Create multidimensional array with equal number of membersPerRoom. Allocating members to rooms. E.g.: c = [['b','g','a'],['h','f','i'],['c','e','d']]
		        var c = [];
		        while(b.length) 
					c.push(b.splice(0,membersPerRoom)); 

				// Now place each memeber in the his/hers allocated room.
				for(var i in cloak.getRooms(true)) {
					var room = cloak.getRoom(cloak.getRooms(true)[i].id);
					var roomMembers = c[i];
					for(var j in roomMembers) {
						console.log(roomMembers[j] + ' in ' + room.name + ' ('+room.getMembers(true).length+'/'+room.size+')');
						cloak.getUser(roomMembers[j]).joinRoom(room);
						cloak.getUser(roomMembers[j]).name = (Number(j)+1).toString();
					}
				}
				break;
			
		}
	};
	
	// Syncronise a timer across all members.
	var syncTime = function(timer){
		for(var key in members) {
			timer.sync(cloak.getUser(members[key]));
		}	
	};
	
	// Syncronise user stages. E.g. wait for other users to catch up to the waiting stage.
	var syncStage = function(user, stage, method){
		switch (method) {
			case 'withinRooms':
			
				var room = user.getRoom();
				if(stageCount(stage, room) == room.size) {
					console.log("Finished syncronising in " + room.name + ". Enough members in stage " + stage);
					
					// Once all members are present start experiment
					for(var key in room.getMembers(true)) {
						user = cloak.getUser(room.getMembers(true)[key].id);
						nextStage(user);
					}
				}
				break;
				
			case 'acrossRooms':
			default:
				if(stageCount(stage) == members.length) {
					console.log("Finished syncronising. Enough members in stage " + stage);

					// Once all members are present start experiment
					for(var key in members) {
						user = cloak.getUser(members[key]);
						nextStage(user);
					}
				}
				break;
		}
	};

	// Counts and returns the number of users in a particular stage.
	var stageCount = function(stage, room) {
		i = 0;
		var stagemembers = (typeof room  === 'undefined') ? members : _.pluck(room.getMembers(true), 'id');
		for(var key in stagemembers)
			if(cloak.getUser(stagemembers[key]).data._stage == stage) 
				i++;
		return i;
	};
	
	
	// Counts and returns the number of users in a particular url.
	var loadCount = function(url) {
		i = 0;
		for(var key in members)
			if(cloak.getUser(members[key]).data._load == url) 
				i++;
		return i;
	};
	
	// Load page
	var load = function(user, url){
		user.data._load = url; // log the latest loaded stage
		user.message('load', url); // make the user load the stage
	};
	
	// Push the user to the next stage
	var nextStage = function(user){
		
		// First time nextStage() is called set the stage to zero. Otherwise keep track when continuing to the next stage
		user.data._stage = (typeof user.data._stage === 'undefined') ? 0 : user.data._stage+1;
		
		// Next stage is which type?
		var type = (typeof experiment.stages[user.data._stage].type === 'undefined') ? null : experiment.stages[user.data._stage].type; // 'undefined' set to null.
		switch (type) {
			
			// Static page. User does not have to wait but can continue to next stage on his/her own.
			case null:
			case 'static':
				var stage = experiment.stages[user.data._stage]; // stage in json file
				load(user, stage.url);
				break;
			
			// Syncronise users. Such that they proceed, as a group, to the next stage.
			case 'sync':
				load(user, experiment.stages[user.data._stage].url); // load waiting stage
				syncStage(user, user.data._stage, experiment.stages[user.data._stage].method); // syncronise users (wait for others)
				break;
			
			case 'randomise':
				// We only want to randomise once. So we do it when the first user enters the stage.
				if(stageCount(user.data._stage) == 1) {
					randomRooms(experiment.stages[user.data._stage].method);
				}
				nextStage(user);
				break;
		}
		
	};


	var lobbyCount = function(user) {

		if(!roomsFull) {
			load(user, experiment.utilities.lobby);
			//user.joinRoom(cloak.getLobby());
		
			// Initiate the experiment when suffeciently many (totalMembers) are waiting in the lobby
			if(!autoCreateRooms) {
				if(cloak.getLobby().getMembers().length == totalMembers) {
			        console.log('Got enough members. Let us start');
			        roomsFull = true;
			        //cloak.configure({autoJoinLobby: false});
			
			        // Create array with users IDs, e.g.: members = ['a','b','c','d','e','f','g','h','i']; 
			        for(var key in cloak.getLobby().getMembers()) { // cloak.getLobby().getMembers()
			        	members[key] = cloak.getLobby().getMembers()[key].id;
			        }

					// Create empty rooms
					for(var i=0; i < totalMembers/membersPerRoom; i++) {
						cloak.createRoom('Room '+i);
					}
				
					// Syncronise time across users
					syncTime(timeGlobal);
				
					// Randomise across rooms, such that users that entered the lobby/experiment first are not grouped together.
					randomRooms('acrossRooms');
				
					// Once all members are present start experiment, by loading the first stage.
					for(var key in members) {
						nextStage(cloak.getUser(members[key]));
					}
				}
			}
			
		} else {
			load(user, experiment.utilities.full)
			//user.delete();
			user.data._disable = true;
		}
	
	};
	
	var roomCount = function(room, user) {
		// When autoCreateRooms == true, the rooms are automatically created once enough users are in lobby.
		// Initiate the experiment when suffeciently many (membersPerRoom) are waiting in the lobby (autoCreateRooms).
		if(autoCreateRooms && typeof user.data._stage === 'undefined') {
			if(room.getMembers(true).length == membersPerRoom) {
				console.log('Got enough members in ' + room.name);
				
				for(var key in room.getMembers()) {
					user = room.getMembers()[key];
					user.name = (Number(key)+1).toString();

					members.push(user.id)
					nextStage(user);
				}
				
				if(members.length == totalMembers) {
					console.log('Got enough members.');
					roomsFull = true;
					
					// Syncronise time across users
					syncTime(timeGlobal);
				}
			}
		}
	}

	// Finalize the experiment
	var fin = function(){
		console.log("Last user has finished the experiment!");
		
		var userdata = new Object();
		for(var key in cloak.getUsers()) {
			cloak.getUsers()[key].data.device = parser.setUA(cloak.getUsers()[key].data._device).getResult(); // Parse the useragent before saving data.
			userdata[cloak.getUsers()[key].id] = cloak.getUsers()[key].data; 
		}
		
		// Alternatively consider using async.series or RSVP.Promise.
		var saveDataSuccess = saveExperimentSuccess = saveLogSucess = saveIPSucess= false;
		var successSave = function (){
			if(saveDataSuccess && saveExperimentSuccess && saveLogSucess && saveIPSucess) {
				
				// quit proccess
				console.log(typeof cloak);
				cloak.stop(function(){
					console.log(" -- server closed -- ");
					process.exit(0); // quit node.js process with succes
				})
				
			}
		}
		
		// Save user IPs if requireUniqueIP == TRUE, such that when running continues experiments (forever start xxx.js) users can only participate once.
		// TO-DO
		/*if(requireUniqueIP) {
			var experimentConfig = JSON.parse(fs.readFileSync(experimentURL[0], experimentURL[1]));
			for(var key in cloak.getUsers()) {
				experimentConfig.ExcludeIPs.push(cloak.getUsers()[key].data.ip);
			}
			fs.writeFileSync(experimentURL[0], JSON.stringify(experimentConfig, null, '\t'));
			console.log(experimentURL[0]);
			saveIPSucess = true;
			successSave();
		} else {
			saveIPSucess = true;
			successSave();
		}*/
		saveIPSucess = true;
		
		// Save user data.
		fs.writeFile('data/data_'+initTime.valueOf()+'_user.json', JSON.stringify(userdata,null,'\t'), function (err) {
			if (err) return console.log(err);
			console.log('data_'+initTime.valueOf()+'_user.json');
			saveDataSuccess = true;
			successSave();
		});
		
		// Save additional experiment data.
		experiment.initTime = initTime.valueOf();
		experiment.timeFinalGlobal = timeGlobal.getValue();
		var experimentdata = experiment;
		fs.writeFile('data/data_'+initTime.valueOf()+'_experiment.json', JSON.stringify(experimentdata,null,'\t'), function (err) {
			if (err) return console.log(err);
			console.log('data_'+initTime.valueOf()+'_experiment.json');
			saveExperimentSuccess = true;
			successSave();
		});
		
		// Save log of all messages send by the users.
		fs.writeFile('data/data_'+initTime.valueOf()+'_messages.json', JSON.stringify(storeMessage,null,'\t'), function (err) {
			if (err) return console.log(err);
			console.log('data_'+initTime.valueOf()+'_message.json');
			saveLogSucess = true;
			successSave();
		});
		
		

		
	};
	
	// Check is device is okay. Output: true/false. Input: the browsers user agent.
	var approvedDevice = function(userAgent){
		var ua = parser.setUA(userAgent).getResult();
		//console.log(ua);
		var approval = true;
		_.each(ExcludeDevices, function(a) {
			//if(typeof(a.device) != 'undefined') console.log(ua.device.type + " ?? " + a.device.type);
			if(typeof(a.browser) != 'undefined' && ua.browser.name == a.browser.name && ua.browser.major < a.browser.major) {
				// The user's browser is too old.
				console.log(ua.browser.name + " v." + ua.browser.major + " is too old major version");
				approval = false;
			} else if(typeof(a.device) != 'undefined' && ua.device.type == a.device.type) {
				// The user's devices is not allowed
				console.log(ua.device.type + " is not allowed");
				approval = false;
			} else {
				//return true;
			}
		});
		return approval;
	};
	
	// Check if user has same IP as a user in the lobby.
	var uniqueIP = function(ip) {
		var unique = true;
		for(var key in cloak.getLobby().getMembers()) {
			if(ip == cloak.getLobby().getMembers()[key].data.ip)
				unique = false;
	    }
		return unique;
	}


// Cloack configurations
// --------------

	// Warning! Please change the configurations in the experiment javascript-file.
	var configBasic = {
		messages: {
			ready: function(msg, user) {
				storeMessage.push( ["ready", user.id, msg, timeGlobal.getValue()] );
				
				var userRoom = (typeof user.getRoom() === 'undefined') ? null : user.getRoom().name; // 'undefined' set to null so it matches msg.
				if(userRoom == msg) { // Only if user reports ready from room where he is supposed to be. Otherwise ignore.
					
					switch (msg) {
						case null: // ('ready')
							
							// Only accept users that fulfill requirements
							if(experiment.ExcludeIPs.indexOf(user.data.ip) !== -1){
								// The user's IP is in the list of excluded IPs, so user is declined
								load(user, experiment.utilities.decline);
								user.data._disable = true;
							} else if(!approvedDevice(user.data._device)) {
								// The user's device is on the excluded list
								load(user, experiment.utilities.decline);
								user.data._disable = true;
							} else if(requireUniqueIP && !uniqueIP(user.data.ip)) {
								// The user's has the same IP as a user currently waiting in the lobby.
								load(user, experiment.utilities.decline);
								user.data._disable = true;
							} else {
								
								// User fulfills all requirements.
								if(roomsFull) {
									load(user, experiment.utilities.full);
									//user.delete();
									user.data._disable = true;
								} else if(!autoJoinLobby) {
									load(user, experiment.utilities.front);
								}
								
							}
							
							break;
						case 'Lobby': // ('ready', 'Lobby')
							lobbyCount(user);
							break;
						default: // ('ready', 'Room X')
							//console.log('Ready: '+user.id+' in '+msg);
					}
					
				}
			},
			loaded: function(url, user) {
				storeMessage.push( ["loaded", user.id, url, timeGlobal.getValue()] );
				
				// TO-DO: Only if user reports loaded from where he is supposed to be.
				
				// Only consider loaded message once we come to the stages. Only consider the message when url and load correspond.
				if(user.data._stage >= 0 && user.data._load == url) {
					
					// if there is a server script then run it
					if(typeof experiment.stages[user.data._stage].script !== 'undefined') {
					
						// Create loaded array, if it does not exsis. Else push user id to the array.
						// http://stackoverflow.com/a/14614173/1053612
						(experiment.stages[user.data._stage].loaded = experiment.stages[user.data._stage].loaded || []).push(user.id);
					
						switch (experiment.stages[user.data._stage].method) {
							
							// METHOD: perUser
							case 'perUser':
								console.log("Load the script for user " + user.id);
								global[experiment.stages[user.data._stage].script](user);
								break;
					
					
							// METHOD: withinRooms
							case 'withinRooms':
								var room = user.getRoom();
								// When all users in the same room have succesfully have loaded the url or stage. (syncing).
								// if intersection between users in room and users that have loaded script equals the number of membersPerRoom.
								if(_.intersection(_.pluck(room.getMembers(true), 'id'), experiment.stages[user.data._stage].loaded).length == membersPerRoom) {
									console.log("Load script for all users in " + room.name);
									global[experiment.stages[user.data._stage].script](user.data._stage, room);
								}
								break;
								
								
							// METHOD: acrossRooms
							case 'acrossRooms':
							default:
								// When all users succesfully have loaded the url or stage. (syncing).
								if(experiment.stages[user.data._stage].loaded.length == members.length) {
									console.log("Load the script!")
									global[experiment.stages[user.data._stage].script](user.data._stage);
								}
						}
					}
					
					console.log(user.id + ": " + user.data._stage + " / " + experiment.stages.length);
					// if succesfully loaded last stage
					if(experiment.stages.length-1 == user.data._stage || user.data._fallback) {
						// run the client finalise script.
						user.message('fin');
					}
				}

			},
			next: function(data, user) {
				storeMessage.push( ["next", user.id, data, timeGlobal.getValue()] );
				
				// TO-DO: Only if user is allowed to continue to next stage.
				if(data) {
					// if user.data.submitted doesn't exsist then create it. Add stageX as property name, and save the sumbitted data within this.
					(user.data.submitted = user.data.submitted || {})["stage"+user.data._stage] = data; 
				}
				
				nextStage(user);
			},
			joinLobby: function(msg, user) {
				storeMessage.push( ["joinLobby", user.id, msg, timeGlobal.getValue()] );
				
				if(typeof user.getRoom() === 'undefined') // Only if not already in a room.
					if(requireUniqueIP && !uniqueIP(user.data.ip)) {
						// The user's has the same IP as a user currently waiting in the lobby.
						load(user, experiment.utilities.decline);
						user.data._disable = true;
					} else {
						user.joinRoom(cloak.getLobby());
					}
			},
			fin: function(finalData, user) {
				storeMessage.push( ["fin", user.id, finalData, timeGlobal.getValue()] );
				// Add finalData to the other data of the user.
				user.data = _.extend(user.data, finalData);
				
				console.log("Last stage from user " + user.id);
				user.data._disable = true;
				
				// Create loaded array on last stage, if it does not exsis. Else push user id to the array.
				(experiment.stages[user.data._stage].loaded = experiment.stages[user.data._stage].loaded || []).push(user.id);
				// When all users succesfully have loaded and executed the client finalise script, the run the server finalise script.
				if(members.length == 0) fin();
				else if(typeof experiment.stages[experiment.stages.length-1].loaded != undefined) {
					//console.log(experiment.stages[user.data._stage].loaded.length + " " + members.length);
					if(experiment.stages[experiment.stages.length-1].loaded.length == members.length) fin();
				}
				
				
				
				
				// Create loaded array on last stage, if it does not exsis. Else push user id to the array.
				//(experiment.loadedFinal = experiment.loadedFinal || []).push(user.id);
				// When all users succesfully have loaded and executed the client finalise script, the run the server finalise script.
				//console.log(experiment.loadedFinal.length)
				//if(experiment.loadedFinal.length == members.length) fin();
				
			}
			
		},
		room: {
			init: function() {
				/*if(autoCreateRooms) {
					room = this;
					console.log("New room created " + room.name + " with " + room.size + " users!");
					
					console.log(room.getMembers(true));
					
					for(var key in room.getMembers()) {
						user = room.getMembers()[key];
						console.log(user.id);
						user.name = (Number(j)+1).toString();
						
						members.push(user.id)
						nextStage(user);
						//syncTime(timeGlobal);
						
					}
					
				}*/
			},
			newMember: function(user) {
				roomCount(this, user);
			},
			close: function(room) {
				//console.log("Closing room " + room.name);
			},
			memberLeaves: function(room) {
				//console.log("Member left room " + room.name);
				/*if(room.minRoomMembers !== null && room.getMembers(true).length >= room.minRoomMembers) {
					for(var user in room.getMembers(true)) {
						load(user, experiment.utilities.fallback);
					}
				}*/
			}
		},
		clientEvents: {
			begin: function(user) {
				user.data.ip = cloak._host(user._socket);
				user.data.connection = [];
				user.data.connection.push(["begin", timeGlobal.getValue()]);
			},
			resume: function(user) {
				user.data.connection.push(["resume", timeGlobal.getValue()]);
			},
			disconnect: function(user) {
				user.data.connection.push(["disconnect", timeGlobal.getValue()]);
				
				var room = user.getRoom();
				
				// If user signed up for the experiment
				if(typeof(room) != 'undefined') {
					if(!user.data._disable) {
						console.log("User " + user.id + " disconnected from " + room.name);
					
						// If lobby, then just remove user from lobby. Else remove users from room an relocate remaing if nessacary.
						if(room.isLobby) { 
							user.leaveRoom(); 
						} else {
							user.leaveRoom();
					
							// Relocate the remaing users to the fallback page.
							if(room.minRoomMembers !== null && room.getMembers().length < room.minRoomMembers) {
								for(var key in room.getMembers()) {
									console.log("Relocate user " + room.getMembers()[key].id + " to fallback page");
									room.getMembers()[key].data._fallback = true;
									load(room.getMembers()[key], experiment.utilities.fallback);
									removeItem(members, room.getMembers()[key].id); // remove relocated users from list of members
								}
								removeItem(members, user.id); // remove disconnected user from list of members
							}
						}
					}
				}
				
			}
		}
	}
	

	
// Export node.js module 
// --------------	
	module.exports.randomRooms = randomRooms;
	module.exports.extend = extend;
	module.exports.configBasic = configBasic;
	module.exports.members = members;
	module.exports.syncTime = syncTime;
	module.exports.timeGlobal = timeGlobal;
	module.exports.experiment = experiment;
	module.exports.cloak = cloak;
	module.exports.connect = connect;