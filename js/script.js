//https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Simple_RTCDataChannel_sample
messageInputBox = document.getElementById('send');//defines messageInputBox to be the name the element with id 'send'
connectButton = document.getElementById('connectButton');//see above
disconnectButton = document.getElementById('disconnectButton')//see above
sendButton = document.getElementById('Sender');//see above
receiveBox = document.getElementById('receivebox');//see above
UserSendButton = document.getElementById('User');//see above


function startup() {
	connectButton.addEventListener('click', connectPeers, false);//when the button is pressed, run this method
	disconnectButton.addEventListener('click', disconnectPeers, false);//see above
	sendButton.addEventListener('click', sendMessage, false);//see above
	UserSendButton.addEventListener('click', UserSend, false)//see above
}
startup();//run the startup function


function connectPeers(){
	localConnection = new RTCPeerConnection();//create a new RTC peer connection object
	
	sendChannel = localConnection.createDataChannel("sendChannel");//create a channel where data will be sent from
	sendChannel.onopen = handleSendChannelStatusChange;//when send channel opens handle that change
	sendChannel.onclose = handleSendChannelStatusChange;//when send channel closes handle that change
	
	
	remoteConnection = new RTCPeerConnection();//create a new remote connection
	remoteConnection.ondatachannel = receiveChannelCallback;//tells us whether remote channel is open or closed
	
	//setting up ICE connection, this is more involved when doing outside of s single web page, needs to contact the server etc. 
	localConnection.onicecandidate = e => !e.candidate//set up local server as Ice candidate
		|| remoteConnection.addIceCandidate(e.candidate)
		.catch(handleAddCandidateError);
	
	
	
	remoteConnection.onicecandidate = e => !e.candidate//set up remote server as Ice candidate
		|| localConnection.addIceCandidate(e.candidate)
		.catch(handleAddCandidateError);
	
	
	//		https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Simple_RTCDataChannel_sample#Start_the_connection_attempt
	localConnection.createOffer()//creates an offer between two servers via ICE
		.then(offer => localConnection.setLocalDescription(offer))
		.then(() => remoteConnection.setRemoteDescription(localConnection.localDescription)) 
		.then(() => remoteConnection.createAnswer())
		.then(answer => remoteConnection.setLocalDescription(answer))
		.then(() => localConnection.setRemoteDescription(remoteConnection.localDescription))
		.catch(handleCreateDescriptionError);
}
function handleAddCandidateError() {//handle errors
	console.log("PANIC, we cannot add a candidate");
}

function handleCreateDescriptionError() {//handle errors
	console.log("PANIC, we cannot create a description");
}

function handleLocalAddCandidateSuccess() {//while connecting ad while connected, disable connect button
	connectButton.disabled = true;
}
function handleRemoteAddCandidateSuccess() {//when remote connects to local enable disconnect button
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
	TextToSend = TextToSend.replace(new RegExp(String.fromCharCode(10), "g"), "<br />");
	sendChannel.send(TextToSend);
	messageInputBox.value = "";
	messageInputBox.focus();
}

function UserSend() {
	var TextToSend = messageInputBox.value;
	TextToSend = TextToSend.replace(RegExp(String.fromCharCode(10), "g"), "<br />");
	var element = document.createElement("div");
	element.className = "Sent";
	element.innerHTML = TextToSend;
	receiveBox.appendChild(element);
	messageInputBox.value = "";
	messageInputBox.focus();
}

function handleReceiveMessage(event) {
	var element = document.createElement("div");
	element.className = "Recieved";
	element.innerHTML = event.data;
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

/* from https://www.html5rocks.com/en/tutorials/webrtc/infrastructure/


var signalingChannel = new SignalingChannel();
var configuration = {
	'iceServers': [{
		'url': 'stun:stun.example.org'
	}]
};
var pc;

// call start() to initiate

function start() {
	pc = new RTCPeerConnection(configuration);

	// send any ice candidates to the other peer
	pc.onicecandidate = function (evt) {
		if (evt.candidate)
			signalingChannel.send(JSON.stringify({
				'candidate': evt.candidate
			}));
	};

	// let the 'negotiationneeded' event trigger offer generation
	pc.onnegotiationneeded = function () {
		pc.createOffer(localDescCreated, logError);
	}

	// once remote stream arrives, show it in the remote video element
	pc.onaddstream = function (evt) {
		remoteView.src = URL.createObjectURL(evt.stream);
	};

	// get a local stream, show it in a self-view and add it to be sent
	navigator.getUserMedia({
		'audio': true,
		'video': true
	}, function (stream) {
		selfView.src = URL.createObjectURL(stream);
		pc.addStream(stream);
	}, logError);
}

function localDescCreated(desc) {
	pc.setLocalDescription(desc, function () {
		signalingChannel.send(JSON.stringify({
			'sdp': pc.localDescription
		}));
	}, logError);
}

signalingChannel.onmessage = function (evt) {
	if (!pc)
		start();

	var message = JSON.parse(evt.data);
	if (message.sdp)
		pc.setRemoteDescription(new RTCSessionDescription(message.sdp), function () {
			// if we received an offer, we need to answer
			if (pc.remoteDescription.type == 'offer')
				pc.createAnswer(localDescCreated, logError);
		}, logError);
	else
		pc.addIceCandidate(new RTCIceCandidate(message.candidate));
};

function logError(error) {
	log(error.name + ': ' + error.message);
}


*/