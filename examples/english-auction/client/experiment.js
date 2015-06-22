/* CreeEnglishAuction */


// Create variables, arrays and objects
// --------------
	var msgError = "Sorry, but there was an error:";
	var msgLeave = "The experiment is not finished yet. Participants that leave before the experiment ends will not receive any payment. Participants cannot re-enter the experiment. Are you sure you want to leave?";


// Functions
// --------------
	var isInteger = function(n) { return n === +n && n === (n|0); } // http://stackoverflow.com/a/3885844/1053612

	function numberWithCommas(x) { return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); } // http://stackoverflow.com/a/2901298/1053612

	// Count down
	function countdown(duration) {
		var endtime = Date.now()+duration;
		clearInterval(counter);
		var counter = window.setInterval(function(){
			remaining = endtime-Date.now();
			
			// Highlight remaining time when 20 seconds left, by flashing red text.
			if(remaining < 20*1000) $('.remaining-time').addClass('blink text-danger');
			
			// Stop the timer when count down finishes, otherwise change countdown text.
			if(remaining < 0) {
				clearInterval(counter);
				$('.remaining-time span').text(0);
				$('.remaining-time').removeClass('blink');
				//$('#input-form input, #input-form button').prop('disabled', true);
			} else {
				$('.remaining-time span').text(Math.round(remaining/1000));
			}
			
		}, 1000);
	}


// Cloack configurations
// --------------	
	var configCustom = {
		messages: {
			bids: function(msg) {
				info = msg.split(';');
				if(info[0] == cloak.currentUser())
					$('#bids tbody').prepend('<tr class="info"><td>'+info[1]+'</td><td>You</td><td>'+numberWithCommas(info[3])+'</td></tr>');
				else
					$('#bids tbody').prepend('<tr><td>'+info[1]+'</td><td>Buyer '+info[2]+'</td><td>'+numberWithCommas(info[3])+'</td></tr>');

				$('#bid input').attr('min', Number(info[3])+Number($('#bid input').attr('step'))); // Change minimun requirement when new bid enters. 
				$('.bid-highest').text(info[3]);
				$('.bid-requirement').text(Number(info[3])+Number($('#bid input').attr('step')));
			},
			values: function(msg) {
				values = msg.split(';');
				$('.price strong').text(numberWithCommas(values[0]));
				$('.value strong').text(numberWithCommas(values[1]));
				$('#bid input').prop("disabled", false);
			},
			ended: function(msg) {
				// Round ended
				
				info = msg.split(';');
				$('.highest strong').text(numberWithCommas(info[1]));
				$('.my-bid strong').text(numberWithCommas(info[0]));
				$('.game').hide();
				$('.result').removeClass('hide').show();
				if(info[1] == "0") {
					// Nobody bid
					$('.highest').hide();
					$('.no-bid').removeClass('hide').show();
					$('.my-bid.bg-success').hide();
					$('.my-bid.bg-warning').show();
				} else if(info[0] == info[1]) {
					// User is the highest bidder
					$('.my-bid.bg-success').show();
					$('.my-bid.bg-warning').hide();
				} else {
					// User is not the highest bidder
					$('.my-bid.bg-success').hide();
					$('.my-bid.bg-warning').show();
				}
				if(info[0] == "0") $('.my-bid.bg-warning span').hide(); // User did not bid.
			},
			payment: function(amount) {
				$('.earnings strong').text("DKK "+amount);
				if(amount == "0") {
					$('.earnings span').hide();
					$('.payment').hide();
					$('.nooption').removeClass('hide').show();
				}
			}
			
		},
		timerEvents: {
			timerSync: function(millis) {
				countdown(millis); // Start countdown
				console.log('timerSync value: ' + millis);
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
	
		$('#container').on('click', '.initiate', function() {
		    init();
			return false;
		});
	
		$('#container').on('click', '.next', function(e) {
		    next();
			return false;
		});
	
		$('#container').on('submit', '#input-form', function(){
			var bid = Number($('#bid input').val());
			var min = Number($('#bid input').attr('min'));
			var step = Number($('#bid input').attr('step'));
			// client-side validation of bid 
			if(bid >= min && isInteger(bid/step)) {
				cloak.message('bid', bid);
				$('#bid input').val('');
				$('#bid').removeClass('has-error');
				$('#bid .help-block').hide();
			} else {
				$('#bid').addClass('has-error');
				$('#bid .help-block').removeClass('hide').show();
			}
			return false;
		});
		
		$('#container').on('click', 'form .payment .btn', function () {
			$(this).button('complete') // button text will be "finished!"
			$('fieldset').hide(); // hide all others
			$('fieldset.'+$('input',this).attr('id')).removeClass('hide').show(); // show corresponding form
		});
		
	});
	
	