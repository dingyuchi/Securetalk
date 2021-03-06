var AEStalk;
var MyMsg;
var list;
var key;

function OnEvent_ChatWndSendMessage(ChatWnd, msgSendMessage)
{
	MyMsg = msgSendMessage;

	key = WSH.RegRead(MsgPlus.ScriptRegPath + "key");
	list = WSH.RegRead(MsgPlus.ScriptRegPath + "list");

	if (msgSendMessage == '/crypt on')
	{
		AEStalk = true;
		MsgPlus.DisplayToast("Notify", "Secure conversation enabled.");
		msgSendMessage='';
		
		return msgSendMessage; 
	} else if (msgSendMessage == '/crypt off') {
		AEStalk = false;
		MsgPlus.DisplayToast("Notify", "Secure conversation disabled.");
		msgSendMessage='';
				
		return msgSendMessage;
	} else if (msgSendMessage == '/crypt handshake') {
		buf = "[Handshake]," + Messenger.MyEmail + "," + key;
		msgSha256 = Sha256.hash(buf);
		msgSendMessage = msgSha256 + Aes.Ctr.encrypt(buf, msgSha256, 256);
		
		return msgSendMessage;	
	} else if (msgSendMessage == '/crypt newkey') {
		WSH = new ActiveXObject("WScript.Shell");
		WSH.RegWrite(MsgPlus.ScriptRegPath + "key",Sha256.hash(Math.random().toString()));
		key = WSH.RegRead(MsgPlus.ScriptRegPath + "key");	
		MsgPlus.DisplayToast("Notify", "KEY:" + key);
		msgSendMessage='';
		return msgSendMessage;			
	} else if (AEStalk == true) {
		/* find user's key in list and encrypt*/
		var userlist = list.split("|");
				
		for (i = 0; i < userlist.length; i++) {
			if (userlist[i].indexOf(GetCurrentChatEmail(ChatWnd)) != -1) {
				msgSha256 = Sha256.hash(msgSendMessage);
				msgSendMessage = msgSha256 + Aes.Ctr.encrypt(msgSendMessage, userlist[i].split(",")[1], 256);
			}
		}			
	}

	return msgSendMessage;
}

function OnEvent_ChatWndReceiveMessage(ChatWnd, msgSender, msgMessage, messageKind)
{
	key = WSH.RegRead(MsgPlus.ScriptRegPath + "key");
	list = WSH.RegRead(MsgPlus.ScriptRegPath + "list");
	
	var nowkey;

	if (msgSender != Messenger.MyName) {
		nowkey = key;
	} else {
		var userlist = list.split("|");
				
		for (i = 0; i < userlist.length; i++) {
			if (userlist[i].indexOf(GetCurrentChatEmail(ChatWnd)) != -1) {
				 nowkey = userlist[i].split(",")[1];
			}
		}	
	}

	msgDecrypt = Aes.Ctr.decrypt(msgMessage.substr(64,msgMessage.lenght), nowkey, 256);
	
	if( msgMessage.substr(0,64) == Sha256.hash(msgDecrypt) ) {
		if (msgSender == Messenger.MyName) 
			msgMessage = msgDecrypt;
		else
			msgMessage = "[c=3]" + msgDecrypt + "[/c]";	
	/* check handshake */
	} else if( msgMessage.substr(0,64) == Sha256.hash(Aes.Ctr.decrypt(msgMessage.substr(64,msgMessage.lenght), msgMessage.substr(0,64), 256)) ) {
		buf = Aes.Ctr.decrypt(msgMessage.substr(64,msgMessage.lenght), msgMessage.substr(0,64), 256);
		
		user_email = buf.split(",")[1];
		user_key = buf.split(",")[2];
		
		if( (buf.split(",")[0] == '[Handshake]')) {
			HandshakeChk = Addtolist(user_email,user_key)
		}
		
		if(HandshakeChk == true) {
			msgMessage = "[c=3]AESTalk Handshaking ... OK[/c]";
		} else {
			msgMessage = "[c=4]AESTalk Handshaking ... Failed[/c]";
		}
		
		return msgMessage;
	/* check encrypted from remote */
	}
	
	return msgMessage;
}

/* script initialize function */
function OnEvent_Initialize(MessengerStart) {
	WSH = new ActiveXObject("WScript.Shell");
	
	try	{
		key = WSH.RegRead(MsgPlus.ScriptRegPath + "key");
		list = WSH.RegRead(MsgPlus.ScriptRegPath + "list");
	} catch(err){	}
	 
	if(!key) {
		WSH.RegWrite(MsgPlus.ScriptRegPath + "key",Sha256.hash(Math.random().toString()));
		key = WSH.RegRead(MsgPlus.ScriptRegPath + "key");
	}

	if(!list) {
		WSH.RegWrite(MsgPlus.ScriptRegPath + "list","");
		list = WSH.RegRead(MsgPlus.ScriptRegPath + "list");
	}
}

function Addtolist(user_email, user_key)
{
	var AddOK = false;
	var WSH = new ActiveXObject("WScript.Shell");
	
	var buf = WSH.RegRead(MsgPlus.ScriptRegPath + "list");
	
	/* email not in list */
	if( buf.indexOf(user_email) == -1 ) { 
		buf = buf + user_email + "," + user_key + "|";
		
		AddOK = true;
	/* email in list, replace the key */
	} else {
		var userlist = buf.split("|");
		

		// replace		
		for (i = 0; i < userlist.length; i++) {
			if (userlist[i].indexOf(user_email) != -1) {
				userlist[i] = user_email + "," + user_key + "|";
			}
		}
		
		// write to buf
		buf = '';
		for (i = 0; i < userlist.length; i++) {
			buf = buf + userlist[i];
		}
		
		AddOK = true;
	}
	
	if(AddOK == true) { 
		WSH.RegWrite(MsgPlus.ScriptRegPath + "list",buf);
		return true;
	} else {
		return false;
	}
}

/* return user email */
function GetCurrentChatEmail(ChatWnd) 
{
	var Contacts = ChatWnd.Contacts;
	var e = new Enumerator(Contacts);
	for(; !e.atEnd(); e.moveNext()) {
		var Contact = e.item();
	}	
	
	return Contact.Email;
}

/* return user email */
function mytest(ChatWnd) 
{
	var Windows = Messenger.CurrentChats;
	var e = new Enumerator(Windows);
	for(; !e.atEnd(); e.moveNext())
	{
		var ChatWindow = e.item();
	}	
	
	return ChatWindow.Handle;
}