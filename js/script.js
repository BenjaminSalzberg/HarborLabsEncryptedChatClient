var TextToSend;
function SaveData()
{
	TextToSend = document.getElementById("send").value;
	document.getElementById("send").value = "";
	if(TextToSend!=="")
		document.getElementById("Reciever").innerHTML += TextToSend+"\n";
}



