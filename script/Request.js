
$(document).ready(function () {
	$.ajax({
	  type: 'GET',
	  url: '/messages'
	})
	.done(function (data) {
	  const msgIdsArr = data.messages
	  $.ajax({
		  type: 'GET',
		  url: '/messages/' + msgIdsArr[0].id
		})
		.done(function (data) {
			const msgData = data
			//Headers name: From, value: user.littlepig.cc
			var payloadHeaders = msgData.payload.headers;
			for (var i = 0; i < payloadHeaders; i++) {
				if(payloadHeaders.name === 'From'){
					$('#dataBody').append("<tr><td>"+ (i + 1) +"</td><td>"+ payloadHeaders.value +"</td><td>"+ msgData.snippet +"</td></tr>")
				}
			}


			//Snippet
		})
	});
});