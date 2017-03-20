var TextToSend;
function SaveData()
{
	TextToSend = document.getElementById("send").value;
	document.getElementById("send").value = "";
	document.getElementById("Reciever").innerHTML += TextToSend+"\n";
}



