/* cree client */


// Create variables, arrays and objects
// --------------
	var ongoing = false; // The experiment has not begun yet.
	var timeStartGlobal;
	var finalData = {};


// Functions
// --------------

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

	// Check if Object is empty.
	// http://stackoverflow.com/a/679937/1053612
	isEmpty = function(obj) {
	    return Object.keys(obj).length === 0;
	}
	
	// Return url search parameters as an object
	// http://stackoverflow.com/a/7090123/1053612
	function searchToObject(urlSearch) {
	  //var urlSearch= window.location.search;
	  var pairs = urlSearch.substring(1).split("&"),
	    obj = {},
	    pair,
	    i;

	  for ( i in pairs ) {
	    if ( pairs[i] === "" ) continue;

	    pair = pairs[i].split("=");
	    obj[ decodeURIComponent( pair[0] ) ] = decodeURIComponent( pair[1] );
	  }

	  return obj;
	}

	// Using AJAX, load the url that was received from the server through a 'load' message.
	function loadPage(url) {
		$("#container").load(url+" #container > *", function(response, status, xhr){
			$('html,body').scrollTop(0); // Scroll to the top when loading new page.
			if(status == "error"){
				$("#container").prepend('<p class="alert alert-danger" role="alert"><strong>'+msgError+'</strong> '+xhr.status+' '+xhr.statusText+' <small>'+url+'</small></p>');
			} else if(status == "success"){
				cloak.message('loaded', url); // Respond back to server with 'loaded' message
			}
		});	
		
	}
	
	// If autoJoinLobby set to false, then init() function needs to be called by the user.
	function init() {
		// join lobby to wait for other players.
		cloak.message('joinLobby');
	}
	
	// Continue to next stage
	function next() {
		
		var data = new Object();
		// Submit content of all forms -- except those with class 'ignore-form' -- before going to next page.
		$('#container form:not(.ignore-form)').each(function(index) {
			//console.log("Form no. "+index + " with the ID #" + $(this).attr('id') );
			//console.log($( this ).serializeArray() );
			data[$(this).attr('id')] = $( this ).serializeArray(); // Add each form's data to the data object.
		});
		
		if(isEmpty(data)) 
			cloak.message('next');
		else
			cloak.message('next', data);
	}


// Cloak configuration
// --------------

	// Warning! Please change the configurations in the experiment javascript-file.
	var configBasic = {
	
		messages: {
			load: function(url) { loadPage(url); },
			fin: function() {
				ongoing = false; // experiment has finished.
				finalData.timeFinalGlobal = (new Date().valueOf()-timeStartGlobal);
				// the client finalise script just returns finalData to the server
				cloak.message('fin', finalData);
			},
			
			debug: function(msg) {
				console.log('Debug: '+ msg);
			}
		},
	
		serverEvents: {
			connecting: function() { console.log('Server: connecting'); },
			begin: function() { 
				console.log('Server: begin');
				console.log('Who am i? ' + cloak.currentUser());
				// After connection has been establish ask to load the first page.
				cloak.message('ready');
			},
			resume: function() { console.log('Server: resume'); },
			disconnect: function() { console.log('Server: disconnect'); },
			end: function() { console.log('Server: end'); },
			error: function() { console.log('Server: error'); },
			joinedRoom: function(arg) { 
				console.log('Server: joinedRoom '+ arg.name); 
				if(arg.name == 'Lobby') ongoing = true; // The experiment has begun.
				cloak.message('ready', arg.name);
			},
			leftRoom: function(arg) { console.log('Server: leftRoom '+ arg.name); },
			roomMemberJoined: function(arg) { console.log('Server: roomMemberJoined ' + arg.id); },
			roomMemberLeft: function() { console.log('Server: roomMemberLeft'); },
			lobbyMemberJoined: function() { console.log('Server: lobbyMemberJoined'); },
			lobbyMemberLeft: function() { console.log('Server: lobbyMemberLeft'); },
			roomCreated: function() { console.log('Server: roomCreated'); },
			roomDeleted: function() { console.log('Server: roomDeleted'); }
		},
		
		timerEvents: {
			timerGlobal: function(millis) {
				// sets corresponding start time for the global timer. Sets it as the time now (at sync) minus the number of seconds elapsed.  
				timeStartGlobal = new Date().valueOf() - millis;
				// number of seconds elapsed is then just: (new Date().valueOf()-timeStartGlobal).
				console.log('timerGlobal value: ' + millis + " / " + timeStartGlobal);
			}
		},
	
		initialData: {
			_device: window.navigator.userAgent,
			viewport: window.innerWidth.toString()+'x'+window.innerHeight.toString(),
			screensize: window.screen.width.toString()+'x'+window.screen.height.toString(),
			language: window.navigator.language,
			referrer: document.referrer,
			parameters: searchToObject(window.location.search)
		}

	};


// Discourage pre-mature departure
// --------------
	// Display warning message if the user tries to leave while the experiment is still ungoing.
	$(window).bind('beforeunload', function(){
		if(ongoing)
			return msgLeave;
	});


// Meassure browser inattention 
// --------------
	finalData.inattention = [];

	// http://stackoverflow.com/a/1060034/1053612
	$(document).ready(function(event) {
	  var hidden = "hidden";

	  // Standards:
	  if (hidden in document)
	    document.addEventListener("visibilitychange", onchange);
	  else if ((hidden = "mozHidden") in document)
	    document.addEventListener("mozvisibilitychange", onchange);
	  else if ((hidden = "webkitHidden") in document)
	    document.addEventListener("webkitvisibilitychange", onchange);
	  else if ((hidden = "msHidden") in document)
	    document.addEventListener("msvisibilitychange", onchange);
	  // IE 9 and lower:
	  else if ("onfocusin" in document)
	    document.onfocusin = document.onfocusout = onchange;
	  // All others:
	  else
	    window.onpageshow = window.onpagehide
	    = window.onfocus = window.onblur = onchange;

	  function onchange (evt) {
	    var v = "visible", h = "hidden",
	        evtMap = {
	          focus:v, focusin:v, pageshow:v, blur:h, focusout:h, pagehide:h
	        };

	    evt = evt || window.event;
	    if (evt.type in evtMap)
	      document.body.className = evtMap[evt.type];
	    else {
	      	var visibility = this[hidden] ? "hidden" : "visible";
			document.body.className = visibility;
			finalData.inattention.push( [visibility, (new Date().valueOf()-timeStartGlobal)] );
			console.log("Browser visibility changed to " + visibility + " after " + (new Date().valueOf()-timeStartGlobal) );
		}
	  }

	  // set the initial state (but only if browser supports the Page Visibility API)
	  if( document[hidden] !== undefined )
	    onchange({type: document[hidden] ? "blur" : "focus"});
	});
