
$(document).ready(function () {
	//Fix this need to pass it to a function like insertRow(numMsg, Name of sender and snippet)

	getMessagesArr();
	

	$("#dataBody").click(function( event ) {
		var parNodeId = event.target.parentNode.id
		var parElem = document.getElementById(parNodeId)
		console.log(parElem)
		var childElem = parElem.querySelector(".boldRow")
		console.log(childElem)
		if(childElem != undefined){
			//console.log("It works")
			$("#" + parNodeId).children().removeClass("boldRow");
			removeUnread(parElem.id)
		}
	})
});

function getMessagesArr() {
	$.ajax({
	  type: 'GET',
	  url: '/messages'
	})
	.done(function (data) {
	  const msgIdsArr = data.messages
	  for (var i = 0; i < msgIdsArr.length; i++) {
	  	getMessageById(msgIdsArr[i].id)
	  }
	  
	});
}


/*This function return a message and 
that message we find 'From' header and is inserted in the row of table and its snippet*/

function getMessageById(id) {
	$.ajax({
	  type: 'GET',
	  url: '/messages/' + id
	})
	.done(function (data) {
		const msgData = data
		//console.log(id)
		//This is where we look for the unread label or messages
		var labelsIDArr = msgData.labelIds

		var isUnread = labelsIDArr.find((items) =>{
			return items === "UNREAD"
		})
		
		//This is wrong way to do for this function it must return message data so that it can be reusable
		//Headers name: From, value: user.littlepig.cc
		var payloadHeaders = msgData.payload.headers;
		

		for (var i = 0; i < payloadHeaders.length; i++) {
			if(payloadHeaders[i].name === 'From'){
				if(isUnread == "UNREAD") $('#dataBody').append("<tr id=" + id  +"><td class='boldRow'>"+ payloadHeaders[i].value +"</td><td class='boldRow'>"+ msgData.snippet +"</td></tr>")
				$('#dataBody').append("<tr id=" + id  +"><td>"+ payloadHeaders[i].value +"</td><td>"+ msgData.snippet +"</td></tr>")
			}
		}
	})
}


function removeUnread(id) {
	$.ajax({
	  type: 'GET',
	  url: '/removeLabel/' + id
	})
	.done(function (data) {
	  console.log(data)
	  
	});
}