'use strict';
var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc;
var remoteStream;
var turnReady;
var pcConfig = {
	'iceServers': [{
		'url': 'stun:stun.l.google.com:19302'
	}]
};
// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
	'mandatory': {
		'OfferToReceiveAudio': true,
		'OfferToReceiveVideo': true
	}
};
/////////////////////////////////////////////
var room = 'foo';
room = prompt('Enter room name:');
var socket = io.connect();
if (room !== '') {
	socket.emit('create or join', room);
	console.log('Attempted to create or	join room', room);
}
socket.on('created', function(room) {
	console.log('Created room ' + room);
	isInitiator = true;
});
socket.on('full', function(room) {
	console.log('Room ' + room + ' is full');
});
socket.on('join', function (room){
	console.log('Another peer made a request to join room ' + room);
	console.log('This peer is the initiator of room ' + room + '!');
	isChannelReady = true;
});
socket.on('joined', function(room) {
	console.log('joined: ' + room);
	isChannelReady = true;
});
socket.on('log', function(array) {
	console.log.apply(console, array);
});
////////////////////////////////////////////////
function sendMessage(message) {
	console.log('Client sending message: ', message);
	socket.emit('message', message);
}
// This client receives a message
socket.on('message', function(message) {
	console.log('Client received message:', message);
	if (message === 'got user media') {
		maybeStart();
	} else if (message.type === 'offer') {
		if (!isInitiator && !isStarted) {
			maybeStart();
		}
		pc.setRemoteDescription(new RTCSessionDescription(message));
		doAnswer();
	} else if (message.type === 'answer' && isStarted) {
		pc.setRemoteDescription(new RTCSessionDescription(message));
	} else if (message.type === 'candidate' && isStarted) {
		var candidate = new RTCIceCandidate({
			sdpMLineIndex: message.label,
			candidate: message.candidate
		});
		pc.addIceCandidate(candidate);
	} else if (message === 'bye' && isStarted) {
		handleRemoteHangup();
	}
});
////////////////////////////////////////////////////
var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');
navigator.mediaDevices.getUserMedia({
	audio: true,
	video: true
})
.then(gotStream)
.catch(function(e) {
	alert('getUserMedia() error: ' + e.name);
});
function gotStream(stream) {
	console.log('Adding local stream.');
	localVideo.src = window.URL.createObjectURL(stream);
	localStream = stream;
	sendMessage('got user media');
	if (isInitiator) {
		maybeStart();
	}
}
var constraints = {
	video: true,
	audio: true
};
console.log('Getting user media with constraints', constraints);
if (location.hostname !== 'localhost') {
	requestTurn(
		'https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913'
	);
}
else
{
	
}
function maybeStart() {
	console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
	if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
		console.log('>>>>>> creating peer connection');
		createPeerConnection();
		pc.addStream(localStream);
		isStarted = true;
		console.log('isInitiator', isInitiator);
		if (isInitiator) {
			doCall();
		}
		else
		{
			doCalls();
		}
	}
}
window.onbeforeunload = function() {
	sendMessage('bye');
};
/////////////////////////////////////////////////////////
function createPeerConnection() {
	try {
		pc = new RTCPeerConnection(null);
		pc.onicecandidate = handleIceCandidate;
		pc.onaddstream = handleRemoteStreamAdded;
		pc.onremovestream = handleRemoteStreamRemoved;
		console.log('Created RTCPeerConnnection');
	} catch (e) {
		console.log('Failed to create PeerConnection, exception: ' + e.message);
		alert('Cannot create RTCPeerConnection object.');
		return;
	}
}
function handleIceCandidate(event) {
	console.log('icecandidate event: ', event);
	if (event.candidate) {
		sendMessage({
			type: 'candidate',
			label: event.candidate.sdpMLineIndex,
			id: event.candidate.sdpMid,
			candidate: event.candidate.candidate
		});
	} else {
		console.log('End of candidates.');
	}
}
function handleRemoteStreamAdded(event) {
	console.log('Remote stream added.');
	remoteVideo.src = window.URL.createObjectURL(event.stream);
	remoteStream = event.stream;
}
function handleCreateOfferError(event) {
	console.log('createOffer() error: ', event);
}
function doCall() {
	console.log('Sending offer to peer');
	//create channel for chat
	var dataChannelParams = {
		reliable: true,
		ordered: true
	};
	var sendChannel = pc.createDataChannel("chat", dataChannelParams);
	pc.ondatachannel = function(event) {
		var receiveChannel = event.channel;
		receiveChannel.onmessage = function(event) {
			var received = event.data;
			console.log("received message: " + received);
			received = AesDecrypt(received);
			document.getElementById("receiveText").innerHTML += (event.data + "\n");
		};
	};
	document.getElementById("sendData").onclick = function() {
		var data = document.getElementById("inputText").value;
		if(data===""){}
		else{
			document.getElementById("inputText").value="";
			console.log("sent message: " + data);
			document.getElementById("sentText").innerHTML += (data + "\n");
			data = AesEncrypt(data);
			console.log("sent ciphertext " + data)
			sendChannel.send(data);
		}
	};
	var dataChannel = pc.createDataChannel("chat", dataChannelParams);
	pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}


function doCalls() {
	console.log('Sending offer to peer');
	//create channel for chat
	var dataChannelParams = {
		reliable: true,
		ordered: true
	};
	var sendChannel = pc.createDataChannel("chat", dataChannelParams);
	pc.ondatachannel = function(event) {
		var receiveChannel = event.channel;
		receiveChannel.onmessage = function(event) {
			var received = event.data;
			console.log("received message: " + received);
			received = AesDecrypt(received);
			document.getElementById("receiveText").innerHTML += (received + "\n");
		};
	};
	document.getElementById("sendData").onclick = function() {
		var data = document.getElementById("inputText").value;
		if(data===""){}
		else{
			document.getElementById("inputText").value="";
			document.getElementById("sentText").innerHTML += (data + "\n");
			data = AesEncrypt(data);
			console.log("sent ciphertext " + data)
			sendChannel.send(data);
		}
	};
	var dataChannel = pc.createDataChannel("chat", dataChannelParams);
	pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}



sjcl.beware["CBC mode is dangerous because it doesn't protect message integrity."]();
var key = "654a1661a99a6b3abf52e52a4e951491";
var iv = "bfd3814678afe0036efa67ca8da44e2e";
//var key = [0xffffffff,0xffffffff,0xffffffff,0xffffffff,0xffffffff,0xffffffff,0xffffffff,0xffffffff];//256 bits
//block size should be 128
function AesEncrypt(plaintext)
{
	var aes_encrypter = new sjcl.cipher.aes(sjcl.codec.hex.toBits(key));
	iv = sjcl.codec.hex.toBits(iv);
	plaintext = sjcl.codec.utf8String.toBits(plaintext);
	var ciphertext = sjcl.mode.cbc.encrypt(aes_encrypter, plaintext, iv);
	return ciphertext;
}
function AesDecrypt(ciphertext)
{
	var aes_decrypter = new sjcl.cipher.aes(sjcl.codec.hex.toBits(key));
	iv = sjcl.codec.hex.toBits(iv);
	ciphertext = ciphertext.split(",");
	var plaintext = sjcl.mode.cbc.decrypt(aes_decrypter, ciphertext, iv);
	plaintext = sjcl.codec.utf8String.fromBits(plaintext);
	return plaintext;
}
function doAnswer() {
	console.log('Sending answer to peer.');
	pc.createAnswer().then(
		setLocalAndSendMessage,
		onCreateSessionDescriptionError
	);
}
function setLocalAndSendMessage(sessionDescription) {
	// Set Opus as the preferred codec in SDP if Opus is present.
	//	sessionDescription.sdp = preferOpus(sessionDescription.sdp);
	pc.setLocalDescription(sessionDescription);
	console.log('setLocalAndSendMessage sending message', sessionDescription);
	sendMessage(sessionDescription);
}
function onCreateSessionDescriptionError(error) {
	console.trace('Failed to create session description: ' + error.toString());
}
function requestTurn(turnURL) {
	var turnExists = false;
	for (var i in pcConfig.iceServers) {
		if (pcConfig.iceServers[i].url.substr(0, 5) === 'turn:') {
			turnExists = true;
			turnReady = true;
			break;
		}
	}
	if (!turnExists) {
		console.log('Getting TURN server from ', turnURL);
		// No TURN server. Get one from computeengineondemand.appspot.com:
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4 && xhr.status === 200) {
				var turnServer = JSON.parse(xhr.responseText);
				console.log('Got TURN server: ', turnServer);
				pcConfig.iceServers.push({
					'url': 'turn:' + turnServer.username + '@' + turnServer.turn,
					'credential': turnServer.password
				});
				turnReady = true;
			}
		};
		xhr.open('GET', turnURL, true);
		xhr.send();
	}
}
function handleRemoteStreamAdded(event) {
	console.log('Remote stream added.');
	remoteVideo.src = window.URL.createObjectURL(event.stream);
	remoteStream = event.stream;
}
function handleRemoteStreamRemoved(event) {
	console.log('Remote stream removed. Event: ', event);
}
function hangup() {
	console.log('Hanging up.');
	stop();
	sendMessage('bye');
}
function handleRemoteHangup() {
	console.log('Session terminated.');
	stop();
	isInitiator = false;
}
function stop() {
	isStarted = false;
	// isAudioMuted = false;
	// isVideoMuted = false;
	pc.close();
	pc = null;
}
///////////////////////////////////////////
// Set Opus as the default audio codec if it's present.
function preferOpus(sdp) {
	var sdpLines = sdp.split('\r\n');
	var mLineIndex;
	// Search for m line.
	for (var i = 0; i < sdpLines.length; i++) {
		if (sdpLines[i].search('m=audio') !== -1) {
			mLineIndex = i;
			break;
		}
	}
	if (mLineIndex === null) {
		return sdp;
	}
	// If Opus is available, set it as the default in m line.
	for (i = 0; i < sdpLines.length; i++) {
		if (sdpLines[i].search('opus/48000') !== -1) {
			var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
			if (opusPayload) {
				sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex],
				opusPayload);
			}
			break;
		}
	}
	// Remove CN in m line and sdp.
	sdpLines = removeCN(sdpLines, mLineIndex);
	sdp = sdpLines.join('\r\n');
	return sdp;
}
function extractSdp(sdpLine, pattern) {
	var result = sdpLine.match(pattern);
	return result && result.length === 2 ? result[1] : null;
}
// Set the selected codec to the first in m line.
function setDefaultCodec(mLine, payload) {
	var elements = mLine.split(' ');
	var newLine = [];
	var index = 0;
	for (var i = 0; i < elements.length; i++) {
		if (index === 3) { // Format of media starts from the fourth.
			newLine[index++] = payload; // Put target payload to the first.
		}
		if (elements[i] !== payload) {
			newLine[index++] = elements[i];
		}
	}
	return newLine.join(' ');
}
// Strip CN from sdp before CN constraints is ready.
function removeCN(sdpLines, mLineIndex) {
	var mLineElements = sdpLines[mLineIndex].split(' ');
	// Scan from end for the convenience of removing an item.
	for (var i = sdpLines.length - 1; i >= 0; i--) {
		var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
		if (payload) {
			var cnPos = mLineElements.indexOf(payload);
			if (cnPos !== -1) {
				// Remove CN payload from m line.
				mLineElements.splice(cnPos, 1);
			}
			// Remove CN line in sdp
			sdpLines.splice(i, 1);
		}
	}
	sdpLines[mLineIndex] = mLineElements.join(' ');
	return sdpLines;
}