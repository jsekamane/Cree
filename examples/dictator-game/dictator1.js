/* CreeDictatorGame */


// Cofigurations file
// --------------
	global.experimentURL = ['./dictator1.json', 'utf8'];

// Configurations
// --------------
	global.clientPort = 8080;
	global.serverPort = 8090;
	global.autoCreateRooms = false; // false. Wait for totalMembers and randomly assign room.
	global.autoJoinLobby = true; // false. Wait for init() function to be fired by user.

	global.totalMembers = 2;
	global.membersPerRoom = 2; // totalMembers should be devidable by membersPerRoom, e.g. totalMembers/membersPerRoom gives the total number of rooms.

	global.requireUniqueIP = false;

	global.storeMessage = new Array(); // empty array to that is used to log all the messages the users sends to the server.


// node.js required modules
// --------------		
	var cree = require('cree');
	
// Functions
// --------------
	isInteger = function(n) { return n === +n && n === (n|0); } // http://stackoverflow.com/a/3885844/1053612

// Create variables, arrays and objects
// --------------
	
	
// Cloack configurations
// --------------	
	var configCustom = {
		port: serverPort,
		minRoomMembers: membersPerRoom, // min
		defaultRoomSize: membersPerRoom, // max
		autoCreateRooms: autoCreateRooms, 
		autoJoinLobby: autoJoinLobby,
		messages: {
			split: function(amount, user) {
				storeMessage.push( ["split", user.id, amount, cree.timeGlobal.getValue()] );
				
				// Server-side validation of split
				// Only the first user is dictator. Check that split is integer between 0 and 100.
				if(user.name == 1 && isInteger(amount) && Number(amount) >= 0 && Number(amount) <= 100) {
					user.data.split = amount;
					room = user.getRoom();
					for(var key in room.getMembers()) {
						var user = cree.cloak.getUser(room.getMembers()[key].id)
						user.message("split", user.data.split+";"+amount); // user.message("split", user's split ; split);

						// If user choose split then his/her profit is the split, otherwise it is 100 minus the split
						var profit = (user.data.split == amount) ? amount : 100-amount; 
						// Create profit array, if it does not exsis. Else push profit to the profit array.
						(user.data.profit = user.data.profit||[]).push(profit); 
					}
				} else {
					console.log('SPLIT NOT ACCEPTED')
				}
			}
					
		}
	}
		
	// Merge the basic configurations for cree with the custom configurations need to run the specefic experiment.
	config = cree.extend(cree.configBasic, configCustom);
	
	cree.cloak.configure(config);
	
	cree.cloak.run();
	// Start the global timer
	cree.timeGlobal.start();

	cree.connect()
		.use(cree.connect.static('./client'))
		.listen(clientPort);
	
	
// Server-side scripts
// --------------
	
	// These scripts are automaticlly called once users have succesfully loaded the url of the stage.
	// The script should be added to the global domain (e.g.: global.auction = function(){} ), such that it can be called from cree.js.
	// Add corresponding line with the script name to the stage in the .json file.
	// e.g.: "script": "auction"
	
	global.dictator = function(stage, room){
		// There are only two subjects. The first subject is always the dictator.
		for(var key in room.getMembers()) {
			var user = cree.cloak.getUser(room.getMembers()[key].id);
			if(key == 0) 
				user.message("choose"); // Tell user to choose a split
			else
				user.message("wait"); // Tell user to wait for split
		}
	}

	global.payment = function(user){
		// Calculate payment for each user
		// Sum profit from each round
		var sum = user.data.profit.reduce(function(pv, cv) { return pv + cv; }, 0);
		user.message("payment", sum);
	}
	