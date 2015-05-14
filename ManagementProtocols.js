//Creates/Finds the ManagementProtocol in the NodeType (->"toscaDoc")
function getManagementProtocol(toscaDoc) {
	var mProt = toscaDoc.getElementsByTagNameNS("http://di.unipi.it/~soldani/mprot","ManagementProtocol")[0];
	if (mProt == null) //Check if already created, but still not recognized as QName
		mProt = toscaDoc.getElementsByTagName("mprot:ManagementProtocol")[0];
	if (mProt == null) {
		toscaDoc.firstChild.setAttribute("xmlns:mprot","http://di.unipi.it/~soldani/mprot");
		mProt = toscaDoc.createElement("mprot:ManagementProtocol");
		toscaDoc.getElementsByTagNameNS("http://docs.oasis-open.org/tosca/ns/2011/12","NodeType")[0].appendChild(mProt);
	}
	return mProt;
};

//Sets the initial state of a management protocol
function setInitialState(mProt,state) {
	var iniState; 
	if (mProt.hasChildNodes()) {
		if (mProt.firstElementChild.localName == "InitialState" ||
		    mProt.firstElementChild.localName == "mprot:InitialState")
			iniState = mProt.firstElementChild;
		else {
			iniState = mProt.ownerDocument.createElement("mprot:InitialState");
			mProt.insertBefore(iniState,mProt.firstChild);
		}
	}
	else {
		iniState = mProt.ownerDocument.createElement("mprot:InitialState");
		mProt.appendChild(iniState);
	}
	iniState.setAttribute("state",state)
};

//Adds/replaces a transition to a management protocol
//Returns
// true if a new transition has been added
// false if a transition has been updated
function addTransition(mProt,sourceState,targetState,operationName,interfaceName,reliesOn) {
	var added = true;
	var transitions; //= mProt.getElementsByTagNameNS("http://di.unipi.it/~soldani/mprot","Transitions")[0];
	if (mProt.hasChildNodes() && 
		(mProt.lastChild.localName == "Transitions" ||
		 mProt.lastChild.localName == "mprot:Transitions"))
		transitions = mProt.lastChild;
	else {
		transitions = mProt.ownerDocument.createElement("mprot:Transitions");
		mProt.appendChild(transitions);
	}
	var transList = transitions.childNodes;
	var t = null;
	for(j=0; j<transList.length; j++) {
		if (transList[j].getAttribute("sourceState") == sourceState &&
			transList[j].getAttribute("operationName") == operationName &&
			transList[j].getAttribute("interfaceName") == interfaceName) {
			transitions.removeChild(transList[j]);
			added = false; 
		}
	}
	t = mProt.ownerDocument.createElement("mprot:Transition");
	t.setAttribute("sourceState",sourceState);
	t.setAttribute("targetState",targetState);
	t.setAttribute("operationName",operationName);
	t.setAttribute("interfaceName",interfaceName);
	if(reliesOn.length>0) {
		var rOn = mProt.ownerDocument.createElement("mprot:ReliesOn");
		t.appendChild(rOn);
		for(i=0; i<reliesOn.length; i++) {
			var req = mProt.ownerDocument.createElement("mprot:Requirement");
			req.setAttribute("name",reliesOn[i]);
			rOn.appendChild(req);
		}
	}
	transitions.appendChild(t);
	return t;
};

function removeTransition(mProt,t) {
	if (mProt.hasChildNodes() && 
		(mProt.lastElementChild.localName == "Transitions" ||
		 mProt.lastElementChild.localName == "mprot:Transitions")) {
		var transitions = mProt.lastElementChild;
		var transList = transitions.children;
		for(j=0; j<transList.length; j++) {
			if (transList[j].getAttribute("sourceState") == t.getAttribute("sourceState") &&
				transList[j].getAttribute("operationName") == t.getAttribute("operationName") &&
				transList[j].getAttribute("interfaceName") == t.getAttribute("interfaceName")) {
				transitions.removeChild(transList[j]);
			}
			if (transitions.children.length == 0)
				mProt.removeChild(mProt.lastElementChild);
		}
	}
}

//Returns the set of "state"'s outgoing transitions
function getOutgoingTransitions(mProt,state) {
	var outTrans = [];
	var transitions = []; 
	if (mProt.hasChildNodes() && 
		(mProt.lastChild.localName == "Transitions" ||
		 mProt.lastChild.localName == "mprot:Transitions"))
		transitions = mProt.lastChild.children;
	for(i=0;i<transitions.length;i++) {
		var sourceState = transitions[i].getAttribute("sourceState");
		if (sourceState == state)
			outTrans.push(transitions[i]);
	}
	return outTrans
}

//Adds a requirement assumption to a state (if not already present)
//Returns
// 1 if the req. ass is added
// 0 if it is already present
// -1 in case of error
function addRequirementAssumption(mProt,state,requirement) {
	var instanceStates = getInstanceStates(mProt.ownerDocument);
	var iState = null;
	for(i=0; i<instanceStates.length; i++) {
		if (instanceStates[i].getAttribute("state") == state)
			iState = instanceStates[i];
	}
	if(iState != null) {
		var rOn = null;
		if(iState.hasChildNodes()) {
			if (iState.firstChild.localName == "mprot:ReliesOn" ||
				iState.firstChild.localName == "ReliesOn")
				rOn = iState.firstChild;
			else {
				rOn = mProt.ownerDocument.createElement("mprot:ReliesOn");
				iState.insertBefore(rOn,iState.firstChild);
			}
		}
		else {
			rOn = mProt.ownerDocument.createElement("mprot:ReliesOn");
			iState.appendChild(rOn);
		}
		var alreadyIn = false;
		for(i=0; i<rOn.childNodes.length; i++) {
			if (rOn.childNodes[i].getAttribute("name") == requirement)
				alreadyIn = true;
		}
		if(!alreadyIn) {
			var req = mProt.ownerDocument.createElement("mprot:Requirement");
			req.setAttribute("name",requirement);
			rOn.appendChild(req);
			return 1;
		}
		else
			return 0;
	}
	else
		return -1;
};

//Removes a requirement assumption from a state (if not already present)
function removeRequirementAssumption(mProt,state,requirement) {
	var instanceStates = getInstanceStates(mProt.ownerDocument);
	var iState = null;
	for(i=0; i<instanceStates.length; i++) {
		if (instanceStates[i].getAttribute("state") == state)
			iState = instanceStates[i];
	}
	if(iState != null) {
		var rOn = null;
		if(iState.hasChildNodes()) {
			if (iState.firstChild.localName == "mprot:ReliesOn" ||
				iState.firstChild.localName == "ReliesOn") {
				rOn = iState.firstChild;
				for(i=0; i<rOn.childNodes.length; i++) {
					if (rOn.childNodes[i].getAttribute("name") == requirement)
						rOn.removeChild(rOn.childNodes[i])
				}
				if(!rOn.hasChildNodes())
					iState.removeChild(rOn);
			}
		}
	}
};

//Adds a capability offering to a state (if not already present)
//Returns
// 1 if the req. ass is added
// 0 if it is already present
// -1 in case of error
function addCapabilityOffering(mProt,state,capability) {
	var instanceStates = getInstanceStates(mProt.ownerDocument);
	var iState = null;
	for(i=0; i<instanceStates.length; i++) {
		if (instanceStates[i].getAttribute("state") == state)
			iState = instanceStates[i];
	}
	if(iState != null) {
		var off = null;
		if (iState.hasChildNodes() && 
		    (iState.lastChild.localName == "mprot:Offers" ||
			 iState.lastChild.localName == "Offers"))
				off = iState.lastChild;
		else {
			off = mProt.ownerDocument.createElement("mprot:Offers");
			iState.appendChild(off);
		}
		var alreadyIn = false;
		for(i=0; i<off.childNodes.length; i++) {
			if (off.childNodes[i].getAttribute("name") == capability)
				alreadyIn = true;
		}
		if(!alreadyIn) {
			var cap = mProt.ownerDocument.createElement("mprot:Capability");
			cap.setAttribute("name",capability);
			off.appendChild(cap);
			return 1;
		}
		else
			return 0;
	}
	else
		return -1;
};

//Removes a capability offering from a state (if not already present)
function removeCapabilityOffering(mProt,state,capability) {
	var instanceStates = getInstanceStates(mProt.ownerDocument);
	var iState = null;
	for(i=0; i<instanceStates.length; i++) {
		if (instanceStates[i].getAttribute("state") == state)
			iState = instanceStates[i];
	}
	if(iState != null) {
		var off = null;
		if (iState.hasChildNodes() && 
		    (iState.lastChild.localName == "mprot:Offers" ||
			 iState.lastChild.localName == "Offers")) {
			off = iState.lastChild;
			for(i=0; i<off.childNodes.length; i++) {
				if (off.childNodes[i].getAttribute("name") == capability)
					off.removeChild(off.childNodes[i])
			}
			if(!off.hasChildNodes())
				iState.removeChild(off);
		}
	}
};

