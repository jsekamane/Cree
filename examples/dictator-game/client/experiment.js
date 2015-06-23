/* CreeDictatorGame */


// Create variables, arrays and objects
// --------------
	var msgError = "Sorry, but there was an error:";
	var msgLeave = "The experiment is not finished yet. Participants that leave before the experiment ends will not receive any payment. Participants cannot re-enter the experiment. Are you sure you want to leave?";


// Functions
// --------------



// Cloack configurations
// --------------	
	var configCustom = {
		messages: {
			choose: function() {
				$('.game').removeClass('hide').show();
			},
			wait: function() {
				$('.wait').removeClass('hide').show();
			},
			split: function(msg) {
				// Round ended
				info = msg.split(';');
				$('.game').hide();
				$('.wait').hide();
				$('.result').removeClass('hide').show();
				console.log(info)
				if(info[0] == "undefined") {
					// User did not choose the split
					$('.you strong').text(100-Number(info[1]));
					$('.other strong').text(info[1]);
				} else {
					// User choose split
					$('.you strong').text(info[1]);
					$('.other strong').text(100-Number(info[1]));
				}
			},
			payment: function(amount) {
				$('.earnings strong').text("DKK "+amount);
				if(amount == "0") {
					$('.earnings span').hide();
					$('.payment').hide();
					$('.nooption').removeClass('hide').show();
				}
			}
			
		}
	};

	// Merge the basic configurations for cree with the custom configurations need to run the specefic experiment.
	config = extend(configBasic, configCustom);

	cloak.configure(config);	
	
	$(document).ready(function(event) {
		cloak.run('http://'+location.hostname+':8090');
	});


// Events and actions
// --------------
	$(document).ready(function(event) {	
		
		// Only use the function .on() to handle events, since content is loaded dynamically (delegated events). 
		// Attach all events to the '#container' and pass the selector as a parameter.
		// e.g. $('#container').on( events , selector [, data ], handler );
	
		$('#container').on('click', '.next', function(e) {
		    next();
			return false;
		});
	
		$('#container').on('submit', '#input-form', function(){
			var split = Number($('#slider input').val());
			cloak.message('split', split);
			return false;
		});
		
		$('#container').on('click', 'form .payment .btn', function () {
			$(this).button('complete') // button text will be "finished!"
			$('fieldset').hide(); // hide all others
			$('fieldset.'+$('input',this).attr('id')).removeClass('hide').show(); // show corresponding form
		});
		
	});
	