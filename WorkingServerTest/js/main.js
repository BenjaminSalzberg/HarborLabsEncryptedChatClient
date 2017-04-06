'use strict';
var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc;
var remoteStream;
var turnReady;
var AESkeyencrypted;
var signature;
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
var aesencrypteddefined = false, signaturedefined = false, ecdsapubdefined = false;
socket.on('message', function(message) {
	if(typeof message === "string" && !isInitiator && message.substr(0,10)===("reg pub Is"))
	{
		serialized_public_recieved_key = message.substr(10);
		ecdsapubdefined = true;
		if(aesencrypteddefined && signaturedefined)
		{
			AESkey = verifyanddecryptAES();
		}
	}
	if(typeof message === "string" && !isInitiator && message.substr(0,10)===("The Key Is"))
	{
		AESkeyencrypted = message.substr(10);
		aesencrypteddefined = true;
		if(signaturedefined && ecdsapubdefined)
		{
			AESkey = verifyanddecryptAES();
		}
	}
	if(typeof message === "string" && !isInitiator && message.substr(0,10)===("The Sig Is"))
	{
		signature = message.substr(10).split(",");
		signaturedefined = true;
		if(aesencrypteddefined && ecdsapubdefined)
		{
			AESkey = verifyanddecryptAES();
		}
	}
	if(typeof message === "string" && isInitiator && message.substr(0,10)===("Elg pub Is"))
	{
		serialized_elg_recieved_key = message.substr(10);
		AESkeyencrypted = EncryptAESKey();
		sendMessage("The Key Is" + AESkeyencrypted);
		sendMessage("The Sig Is" + signature);
	}
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
			doCall();
		}
	}
}
window.onbeforeunload = function() {
	sendMessage('bye');
};
/////////////////////////////////////////////////////////
var AESkey;
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
	GenerateKeys();
	if(isInitiator)
	{
		AESkey = generateAESkey();
		sendMessage("reg pub Is"+serialized_public_key);
	}
	else
	{
		sendMessage("Elg pub Is"+serialized_elg_public_key);
	}
}
var private_key, public_key, recieved_key, elg_private_key, elg_public_key, elg_recieved_key, 
	serialized_public_key, serialized_elg_public_key, serialized_elg_recieved_key, serialized_public_recieved_key;
//both sides need to generate key pairs from elgamal
//public keys need to be shared

//to unserialize and get key on other side
var ecdsa_keys, elg_keys;
function GenerateKeys()
{
	ecdsa_keys = new sjcl.ecc.ecdsa.generateKeys(256);
	elg_keys = new sjcl.ecc.elGamal.generateKeys(256);
	private_key = ecdsa_keys.sec.get();
	public_key = ecdsa_keys.pub.get();
	elg_private_key = elg_keys.sec.get();
	elg_public_key = elg_keys.pub.get();
	serialized_public_key = sjcl.codec.base64.fromBits(public_key.x.concat(public_key.y));
	serialized_elg_public_key = sjcl.codec.base64.fromBits(elg_public_key.x.concat(elg_public_key.y));
}
function generateAESkey()
{
	var AESkey = "";
	var possible = "0a1b2c3d4f5e6789";
	for(var i=0; i < 32; i++)
		AESkey += possible.charAt(Math.floor(Math.random() * possible.length));
	return AESkey;
}
function EncryptAESKey()
{
	elg_recieved_key = new sjcl.ecc.elGamal.publicKey(
		sjcl.ecc.curves.c256, 
		sjcl.codec.base64.toBits(serialized_elg_recieved_key)
	);//get other elgamal public key
	//		https://github.com/bitwiseshiftleft/sjcl/wiki/Asymmetric-Crypto#serializing-key-pairs
	//Elg encrypt with AESkey and recieved elg key
	//ecdsa key sign encrypted AES key, ecdsa private key
	AESkeyencrypted = sjcl.encrypt(elg_recieved_key, AESkey);
	signature = ecdsa_keys.sec.sign(sjcl.hash.sha256.hash(AESkeyencrypted));
	var ok = ecdsa_keys.pub.verify(sjcl.hash.sha256.hash(AESkeyencrypted), signature);
	return AESkeyencrypted;
	//send key signature and encrypted AES key
	//decrypt AES key after verifying it on other side 
}
function verifyanddecryptAES()
{
	try{
		recieved_key = new sjcl.ecc.ecdsa.publicKey(
			sjcl.ecc.curves.c256, 
			sjcl.codec.base64.toBits(serialized_public_recieved_key)
		);
		var ok = recieved_key.verify(sjcl.hash.sha256.hash(AESkeyencrypted), signature);
		var pt = sjcl.decrypt(elg_keys.sec, AESkeyencrypted);
		return pt;
	}
	catch(e)
	{
		alert("signature wrong");
		console.log("signature wrong\nexception:" + e);
		//hangup();
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
function datasend()
{
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
}
var sendChannel;
function doCall() {
	console.log('Sending offer to peer');
	//create channel for chat
	var dataChannelParams = {
		reliable: true,
		ordered: true
	};
	sendChannel = pc.createDataChannel("chat", dataChannelParams);
	datasend();
	var dataChannel = pc.createDataChannel("chat", dataChannelParams);
	pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}
sjcl.beware["CBC mode is dangerous because it doesn't protect message integrity."]();//initializes cbc
//key = "654a1661a99a6b3abf52e52a4e951491";//must be in hexadecimal
var iv="";//must be in hexadecimal
function AesEncrypt(plaintext)
{
	iv = getiv();
	storeinsessionStorage(iv);
	var aes_encrypter = new sjcl.cipher.aes(sjcl.codec.hex.toBits(AESkey));//encrypter
	plaintext = sjcl.codec.utf8String.toBits(plaintext);
	var ciphertext = sjcl.mode.cbc.encrypt(aes_encrypter, plaintext, sjcl.codec.hex.toBits(iv));
	return iv+""+ciphertext;
}
function getiv()//128 bytes = 32 hex digits long 16^32 combinations
{
	var testiv = "";
	var possible = "0a1b2c3d4f5e6789";
	for( var i=0; i < 32; i++)
		testiv += possible.charAt(Math.floor(Math.random() * possible.length));
	//need to check the database
	var alreadyused = checksessionStorage(testiv);
	if(alreadyused)
		getiv();
	else
		return testiv;
}
function checksessionStorage(test)
{
	if(sessionStorage.getItem("IV")!==null)
	{
		var ivarr = sessionStorage.getItem("IV").split(",");
		for(var i=0;i<ivarr.length;i++)
			if(ivarr===test)
				return true;
	}
	return false;
}
function storeinsessionStorage(iv)
{
	if(sessionStorage.getItem("IV")!==null)
		sessionStorage.setItem("IV", sessionStorage.getItem("IV")+iv+",");
	else
		sessionStorage.setItem("IV", iv+",");
}
function AesDecrypt(ciphertext)
{
	var aes_decrypter = new sjcl.cipher.aes(sjcl.codec.hex.toBits(AESkey));//decrypter
	iv=ciphertext.substr(0,32);//get iv seperated from cphertext
	ciphertext = ciphertext.substr(32).split(",");//split into an array rather than a String also seperate from iv
	var plaintext = sjcl.mode.cbc.decrypt(aes_decrypter, ciphertext, sjcl.codec.hex.toBits(iv));
	plaintext = sjcl.codec.utf8String.fromBits(plaintext);//convert from the bits that decrypt gives to a String
	storeinsessionStorage(iv);
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