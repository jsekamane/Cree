/* CreeEnglishAuction */


// Cofigurations file
// --------------
	global.experimentURL = ['./experiment1_en.json', 'utf8'];

// Configurations
// --------------
	global.clientPort = 8080;
	global.serverPort = 8090;
	global.autoCreateRooms = false; // false. Wait for totalMembers and randomly assign room.
	global.autoJoinLobby = false; // false. Wait for init() function to be fired by user.

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

	isNumber = function(n) { return !isNaN(parseFloat(n)) && isFinite(n); } // http://stackoverflow.com/a/1830844/1053612	
	
	getRandomArbitrary = function(min, max) { return Math.random() * (max - min) + min; }


// Create variables, arrays and objects
// --------------

	var bids = new Array;
	var step = new Number;
	
	
// Cloack configurations
// --------------	
	var configCustom = {
		port: serverPort,
		minRoomMembers: membersPerRoom, // min
		defaultRoomSize: membersPerRoom, // max
		autoCreateRooms: autoCreateRooms, 
		autoJoinLobby: autoJoinLobby,
		messages: {
			bid: function(amount, user) {
				storeMessage.push( ["bid", user.id, amount, cree.timeGlobal.getValue()] );
				// Server-side validation of bid
				// Check that bid is a number, greater than the highest bid, and an intger that lives up to the 'step' requirements
				if(isNumber(amount) && Number(amount) >= (bids[bids.length-1][0]+step) && isInteger(amount/step)) {
					console.log('bid of '+ amount +' from ' + user.id + " at " + timeRound.getValue());
					bids.push([amount, user.id, timeRound.getValue()]);
					user.data.bid = amount;
					var msg = 
						user.id + ';' +
						bids.length.toString() + ';' + 
						user.name +';' + 
						amount.toString();
					user.getRoom().messageMembers('bids', msg);
				} else {
					console.log('BID NOT ACCEPTED')
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
	
	global.auction = function(stage){
		
		// Auction setup
		bids = [[0,"",0]]; // Minimum bid is zero.
		step = 5; // Bids increase in increments of 5
		for(var key in cree.members)
			cree.cloak.getUser(cree.members[key]).data.bid = 0;
		
		// marginal cost selected randomly from U[0,1600]
		a = Math.round(getRandomArbitrary(0, 1600));
		
		// price is the expected second highest value of N bidders. price = a + (N-1)/(N+1)*400
		price = Math.round(a + (membersPerRoom-1)/(membersPerRoom+1)*400);
		
		console.log("a: " + a);
		console.log("price: " + price);
		
		// Store users' values
		values = [];
		
		// value of each bidder is selected randomly from U[a,a+400]
		for(var key in cree.members) {
			var user = cree.cloak.getUser(cree.members[key]);
			user.data.value = Math.round(getRandomArbitrary(a, a+400));
			values.push([user.data.value, user.id]);
			console.log("X_i: " + cree.cloak.getUser(cree.members[key]).data.value);
			
			user.message("values", price.toString()+";"+user.data.value.toString()); // user.message("values", price ; value);
		}
		
		var duration = 21000;
		
		// Create a cloak timer that syncronises across users.
		timeRound = cree.cloak.createTimer('timerSync', duration, true);
		timeRound.start();
		cree.syncTime(timeRound);
		
		// Create timer on server
		setTimeout(function() {
			cree.syncTime(timeRound); // Syncronises so all users know that the round experied.
			
			console.log("highest bid: " + bids[bids.length-1][0]+" ; "+bids[bids.length-1][1]);
			for(var key in cree.members) {
				var user = cree.cloak.getUser(cree.members[key]);
				user.message("ended", user.data.bid+";"+bids[bids.length-1][0]); // user.message("ended", user's bid ; highest bid);
				
				// Zero if user loses auction. Difference between value and bid if user wins auction.
				var profit = (user.data.bid == bids[bids.length-1][0] && user.data.bid > 0) ? (user.data.value-user.data.bid) : 0; 
				// Create profit array, if it does not exsis. Else push profit to the profit array.
				// http://stackoverflow.com/a/14614173/1053612
				(user.data.profit = user.data.profit||[]).push(profit); 
			}
			bids.shift(); // Remove the first item in array: [0,"",0];
			
			// saving auction data
			cree.experiment.stages[stage].data = {};
			cree.experiment.stages[stage].data.a = a;
			cree.experiment.stages[stage].data.price = price;
			cree.experiment.stages[stage].data.values = values;
			cree.experiment.stages[stage].data.bids = bids;
			
		}, duration);
		
	}
	
	
	
	global.payment = function(user){
		// Calculate payment for each user

		// Sum profit from each round
		var sum = user.data.profit.reduce(function(pv, cv) { return pv + cv; }, 0);
		
		// If sum is negative, then user gets zero. The exchange rate is such that 1 point equals 1/10 DKK.
		user.message("payment", Math.round(Math.max(0,sum)/10));
		
	}
	