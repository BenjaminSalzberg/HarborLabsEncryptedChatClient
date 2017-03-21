//https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Simple_RTCDataChannel_sample
messageInputBox = document.getElementById('send');
connectButton = document.getElementById('connectButton');
disconnectButton = document.getElementById('disconnectButton');
sendButton = document.getElementById('Sender');
receiveBox = document.getElementById('receivebox');
UserSendButton = document.getElementById('User');


function startup() {
	connectButton.addEventListener('click', connectPeers, false);
	disconnectButton.addEventListener('click', disconnectPeers, false);
	sendButton.addEventListener('click', sendMessage, false);
	UserSendButton.addEventListener('click', UserSend, false)
}
startup();


function connectPeers(){
	localConnection = new RTCPeerConnection();
	
	sendChannel = localConnection.createDataChannel("sendChannel");
	sendChannel.onopen = handleSendChannelStatusChange;
	sendChannel.onclose = handleSendChannelStatusChange;
	
	
	remoteConnection = new RTCPeerConnection();
	remoteConnection.ondatachannel = receiveChannelCallback;
	
	
	localConnection.onicecandidate = e => !e.candidate
		|| remoteConnection.addIceCandidate(e.candidate)
		.catch(handleAddCandidateError);
	
	
	
	remoteConnection.onicecandidate = e => !e.candidate
		|| localConnection.addIceCandidate(e.candidate)
		.catch(handleAddCandidateError);
	
	
	
	localConnection.createOffer()
		.then(offer => localConnection.setLocalDescription(offer))
		.then(() => remoteConnection.setRemoteDescription(localConnection.localDescription))
		.then(() => remoteConnection.createAnswer())
		.then(answer => remoteConnection.setLocalDescription(answer))
		.then(() => localConnection.setRemoteDescription(remoteConnection.localDescription))
		.catch(handleCreateDescriptionError);
}
function handleAddCandidateError() {
	console.log("PANIC, we cannot add a candidate");
}

function handleCreateDescriptionError() {
	console.log("PANIC, we cannot create a description");
}

function handleLocalAddCandidateSuccess() {
	connectButton.disabled = true;
}
function handleRemoteAddCandidateSuccess() {
	disconnectButton.disabled = false;
}


function receiveChannelCallback(event) {
	receiveChannel = event.channel;
	receiveChannel.onmessage = handleReceiveMessage;
	receiveChannel.onopen = handleReceiveChannelStatusChange;
	receiveChannel.onclose = handleReceiveChannelStatusChange;
}


function handleSendChannelStatusChange(event) {
	if (sendChannel) {
		var state = sendChannel.readyState;

		if (state === "open") {
			messageInputBox.disabled = false;
			messageInputBox.focus();
			sendButton.disabled = false;
			disconnectButton.disabled = false;
			connectButton.disabled = true;
		} else {
			messageInputBox.disabled = true;
			sendButton.disabled = true;
			connectButton.disabled = false;
			disconnectButton.disabled = true;
		}
	}
}


function handleReceiveChannelStatusChange(event) {
	if (receiveChannel) {
		console.log("Receive channel's status has changed to " + receiveChannel.readyState);
	}
}


function sendMessage() {
	var TextToSend = messageInputBox.value;
	sendChannel.send(TextToSend);
	messageInputBox.value = "";
	messageInputBox.focus();
}

function UserSend() {
	console.log("HI");
	var TextToSend = messageInputBox.value;
	var element = document.createElement("p");
	var txtNode = document.createTextNode(TextToSend);
	element.className = "Sent";
	element.appendChild(txtNode);
	receiveBox.appendChild(element);
	messageInputBox.value = "";
	messageInputBox.focus();
}


function handleReceiveMessage(event) {
	var element = document.createElement("p");
	var txtNode = document.createTextNode(event.data);
	element.className = "Recieved";
	element.appendChild(txtNode);
	receiveBox.appendChild(element);
}


function disconnectPeers() {

	// Close the RTCDataChannels if they're open.

	sendChannel.close();
	receiveChannel.close();

	// Close the RTCPeerConnections

	localConnection.close();
	remoteConnection.close();

	sendChannel = null;
	receiveChannel = null;
	localConnection = null;
	remoteConnection = null;

	// Update user interface elements

	connectButton.disabled = false;
	disconnectButton.disabled = true;
	sendButton.disabled = true;

	messageInputBox.value = "";
	messageInputBox.disabled = true;
}

