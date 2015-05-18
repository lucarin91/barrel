var csar = null;

var toscaDoc = null;

var selected = null;
var initialState = null;

var fileInput = document.getElementById("file-input");

var readCsar = function() {
    var onend = function() {
	var nts = csar.get("NodeType");
	for (var i = 0; i < nts.length; i++) {
	    var el = nts[i].element;
	    var name = el.getAttribute("name");
	    var item = document.createElement("li");
	    item.innerHTML = item.id = name;
	    $("#nodeTypeSelector").append(item);
	    $("#" + name).click(function () {
		toscaDoc = el.ownerDocument;
		drawEnvironment();
	    });
	}
    }
    csar = new Csar.Csar(fileInput.files[0], onend);
}

fileInput.addEventListener('change', readCsar, false);

$(document).click(function(event) {
	if(selected != null) {
		if (selected.id.indexOf("state_") == 0) {
			document.getElementById("toolbox").setAttribute("style","display:block");
			console.log("DIV: " + selected.id);
			document.getElementById("toolbox_selected").innerHTML = selected.id.substring(6,selected.id.length);
		}
		if (selected.id.indexOf("con_") == 0) {
			console.log("CONN: " + selected.id);
			document.getElementById("toolbox").setAttribute("style","display:none");
		}
	}
});

function initialPositioning(divs) {
	var x = 20;
	var y = 20;
	var deltaX = ($(window).width()-200)/4;
	var deltaY = ($(window).height()-100)/2;
	for (i=0; i<divs.length; i++) {
		console.log("x:"+x+";y:"+y);
		divs[i].setAttribute("style","left:"+x+"px;top:"+y+"px");
		y = y + deltaY;
		if(i%2 == 1) {
			x = (x + deltaX);
			y = 20;
		}
	}
}

function createState(divEnv,state) {
	var stateName = state.getAttributeNode("state").value;
	
	//creating main state div
	//whose id is "state_<stateName>"
	var divState = document.createElement("div");
	divState.className = "stateDiv";
	divState.id = "state_" + stateName;
	divState.addEventListener("click", function() {selected = divState});
	divEnv.appendChild(divState);
	//creating sub-div for state name
	var divStateName = document.createElement("div");
	divStateName.id = divState.id + "_title";
	divStateName.innerHTML = stateName;
	divState.appendChild(divStateName);
	//creating sub-div for state's ReliesOn
	//whose id is "state_<stateName>_ReliesOn"
	var rOn = document.createElement("div");
	rOn.className = "reliesOnOffersDiv";
	rOn.id = divState.id + "_ReliesOn";
	rOn.innerHTML = "Relies on:";
	divState.appendChild(rOn);
	//creating sub-div for state's Offers
	//whose id is "state_<stateName>_Offers"
	var off = document.createElement("div");
	off.className = "reliesOnOffersDiv";
	off.id = divState.id + "_Offers";
	off.innerHTML = "Offers:";
	divState.appendChild(off);
	
	//attaching jsPlumb anchors
	jsPlumb.draggable(divState.id, {
		containment: "parent"
	});
	
	return divState;
};

function drawRequirementAssumption(isName,reqName) {
	var reqDiv = document.createElement("div");
	reqDiv.id = "state_"+isName+"_ReliesOn_"+reqName;
	reqDiv.innerHTML = "- " + reqName;
	document.getElementById("state_"+isName+"_ReliesOn").appendChild(reqDiv);
};

function drawCapabilityOffering(isName,capName) {
	var capDiv = document.createElement("div");
	capDiv.id = "state_"+isName+"_Offers_"+capName;
	capDiv.innerHTML = "- " + capName;
	document.getElementById("state_"+isName+"_Offers").appendChild(capDiv);
};

function deleteRequirementAssumption(isName,reqName) {
	var reqDiv = document.getElementById("state_"+isName+"_ReliesOn_"+reqName);
	reqDiv.parentNode.removeChild(reqDiv);
};

function deleteCapabilityOffering(isName,capName) {
	var capDiv = document.getElementById("state_"+isName+"_Offers_"+capName);
	capDiv.parentNode.removeChild(capDiv);
};

function drawTransition(transition) {
	var sourceState = "state_" + transition.getAttribute("sourceState");
	var targetState = "state_" + transition.getAttribute("targetState");
	var transLabel = transition.getAttribute("operationName");
	
	if (transition.hasChildNodes()) {
		if (transition.firstElementChild.localName == "ReliesOn" ||
			transition.firstElementChild.localName == "mprot:ReliesOn") {
			var reqLabel = "{";
			var reqList = transition.firstElementChild.childNodes;
			var i = 0;
			reqLabel += reqList[i].getAttribute("name");
			for(i=1;i<reqList.length;i++)
				reqLabel += reqList[i].getAttribute("name");
			reqLabel += "}";
			transLabel = reqLabel + " " + transLabel;
		}
	}
	
	var c = jsPlumb.connect({
		source: sourceState,
        target: targetState,
		anchor: "Continuous",
		endpoint: "Blank",
		paintStyle:{ strokeStyle:"#112835", lineWidth:2 },
		hoverPaintStyle:{ strokeStyle:"#3399FF" },
		overlays:[ 
			["Arrow" , { width:12, length:12, location:1 }], 
			["Label", { label:transLabel, id:"label", location: 0.25, cssClass: "transLabel" }]
		]
    });
	
	c.setParameter({id: sourceState + "_" + transition.getAttribute("operationName")});
	
	c.bind("click", function(conn) {selected = c});
};

function deleteTransition(sourceState,operationName){
	var sourceElement = "state_" + sourceState;
	var c = null;
	
	var connections = jsPlumb.getConnections();
	for (i=0; i<connections.length; i++) {
		var overlays = connections[i].getOverlays();
		for (j=0; j<overlays.length; j++) {
			if (overlays[j].type == "Label"
				&& overlays[j].label.indexOf(operationName)!=-1)
				c = connections[i];
		}
	}
	jsPlumb.detach(c);
}

function updateInitialState(newInitialState) {
	newInitialState = "state_" + newInitialState;
	if (initialState!=null) {
		var oldInitialState = document.getElementById(initialState);
		oldInitialState.className = oldInitialState.className.replace(" initial","");
	}
	document.getElementById(newInitialState).className += " initial";
	initialState=newInitialState;
}

function loadXMLDoc() {
	var url = prompt('Please enter the URL of TOSCA file', 'http://www.di.unipi.it/~soldani/MProt/UbuntuOSNodeType_WithMPROT.tosca');
	toscaDoc = parseToscaDefinitions(url);
	drawEnvironment();
}

function drawEnvironment() {		
	//clear environment
	var divEnv = document.getElementById("divEnv");
	divEnv.innerHTML = "";
	jsPlumb.reset();
	
	var stateDivs = [];
	
	//instance states
	var instanceStates = getInstanceStates(toscaDoc);
	for(i=0; i < instanceStates.length; i++) {
		var is = instanceStates[i];
		var divState = createState(divEnv,is);
		stateDivs.push(divState);
		if (is.hasChildNodes()) {
			if(is.firstElementChild.localName == "ReliesOn") {
				var reqList = is.firstElementChild.childNodes;
				for(j=0; j<reqList.length; j++)
					drawRequirementAssumption(is.getAttribute("state"),reqList[j].getAttribute("name"));
			}
			if(is.lastElementChild.localName == "Offers") {
				var capList = is.lastElementChild.childNodes;
				for(j=0; j<capList.length; j++)
					drawCapabilityOffering(is.getAttribute("state"),capList[j].getAttribute("name"));
			}
		}
	}
	if (instanceStates.length==0) {
		alert("The imported NodeType has no instance states");
		toscaDoc = null;
		return;
	}
	
	var mProt = getManagementProtocol(toscaDoc);
	if (mProt.hasChildNodes()) {
		if (mProt.firstElementChild.localName == "InitialState") {
			var iniState = mProt.firstElementChild.getAttribute("state");
			updateInitialState(iniState);
		}
		if (mProt.lastElementChild.localName == "Transitions") {
			var transitions = mProt.lastElementChild.childNodes;
			for (i=0; i<transitions.length; i++)
				drawTransition(transitions[i]);
		}		
	}
	
	initialPositioning(stateDivs);
	
	jsPlumb.repaintEverything();
	jsPlumb.repaintEverything();
};

function exportXMLDoc() {
	var xmlBlob = serializeToscaDefinitions(toscaDoc);
	var url = URL.createObjectURL(xmlBlob);
	window.open(url, "_blank", "");
}
	
function about() {
	alert("This editor has been produced in scope of the research paper: \n <paper info> \n \n Copyright: \n \t Andrea Canciani and Jacopo Soldani \n \t CS Department, University of Pisa");
};

function toolbox_addReliesOn() {
	//setting the selector
	document.getElementById("popup_selector_label").innerHTML = 
		"Please select a requirement that must hold in state <em>"+selected.id.substring(6,selected.id.length)+"</em>";
	document.getElementById("popup_selector_OK").setAttribute("onClick","selector_addReliesOn()");
	
	var reqList = getRequirementDefinitions(toscaDoc);
	if (reqList.length == 0) {
		alert("No more requirements can be added");
		return;
	}
	
	var menu = document.getElementById("popup_selector_menu");
	for(i=0; i<reqList.length; i++) {
		var option = document.createElement("option");
		option.value = reqList[i].getAttribute("name");
		option.innerHTML = reqList[i].getAttribute("name");
		menu.appendChild(option);
	}
	
	//popping up the selector
	selector_open();
}

function selector_addReliesOn() {
	//var reqName = prompt("Requirement to be added?","xxxx");
	var reqName = document.getElementById("popup_selector_menu").value;
	var mProt = getManagementProtocol(toscaDoc);
	var stateName = selected.id.substring(6,selected.id.length);
	var added = addRequirementAssumption(mProt,stateName,reqName);
	if (added==1) 
		drawRequirementAssumption(stateName,reqName);
	else if(added==0)
		alert("Specified requirement is already assumed");
	
	selector_close();
}

function toolbox_removeReliesOn() {
	//setting the selector
	document.getElementById("popup_selector_label").innerHTML = 
		"Please select the requirement that does not need to hold any more in state <em>"+selected.id.substring(6,selected.id.length)+"</em>";
	document.getElementById("popup_selector_OK").setAttribute("onClick","selector_removeReliesOn()");
	
	var stateName = selected.id.substring(6,selected.id.length);
	var iStates = getInstanceStates(toscaDoc);
	var menu = document.getElementById("popup_selector_menu");
	for (i=0; i < iStates.length; i++) {
		var is = iStates[i];
		if (is.getAttribute("state") == stateName) {
			if (is.hasChildNodes()) {
				if(is.firstElementChild.localName == "ReliesOn" ||
				   is.firstElementChild.localName == "mprot:ReliesOn") {
					var rOn = is.firstElementChild.childNodes;
					for (j=0; j<rOn.length; j++) {
						var option = document.createElement("option");
						option.value = rOn[j].getAttribute("name");
						option.innerHTML = rOn[j].getAttribute("name");
						menu.appendChild(option);
					}
				}
			}
		}
	}
	//checking if there is nothing to remove
	if(!menu.hasChildNodes()){
		alert("No requirements to be removed!");
		return;
	}
	
	//popping up the selector
	selector_open();
}

function selector_removeReliesOn() {
	var reqName = document.getElementById("popup_selector_menu").value;
	var mProt = getManagementProtocol(toscaDoc);
	var stateName = selected.id.substring(6,selected.id.length);
	removeRequirementAssumption(mProt,stateName,reqName);
	deleteRequirementAssumption(stateName,reqName);
	
	selector_close();
}

function toolbox_addOffers() {
	//setting the selector
	document.getElementById("popup_selector_label").innerHTML = 
		"Please select a capability that is offered by state <em>"+selected.id.substring(6,selected.id.length)+"</em>";
	document.getElementById("popup_selector_OK").setAttribute("onClick","selector_addOffers()");
	
	var capList = getCapabilityDefinitions(toscaDoc);
	if (capList.length == 0) {
		alert("No more capability can be added");
		return;
	}
	
	var menu = document.getElementById("popup_selector_menu");
	for(i=0; i<capList.length; i++) {
		var option = document.createElement("option");
		option.value = capList[i].getAttribute("name");
		option.innerHTML = capList[i].getAttribute("name");
		menu.appendChild(option);
	}
	
	//popping up the selector
	selector_open();
}

function selector_addOffers() {
	var capName = document.getElementById("popup_selector_menu").value;
	var mProt = getManagementProtocol(toscaDoc);
	var stateName = selected.id.substring(6,selected.id.length);
	var added = addCapabilityOffering(mProt,stateName,capName);
	if (added==1) 
		drawCapabilityOffering(stateName,capName);
	else if(added==0)
		alert("Specified capability is already offered");
	
	selector_close();
}

function toolbox_removeOffers() {
	//setting the selector
	document.getElementById("popup_selector_label").innerHTML = 
		"Please select a capability that is no more offered by state <em>"+selected.id.substring(6,selected.id.length)+"</em>";
	document.getElementById("popup_selector_OK").setAttribute("onClick","selector_removeOffers()");
	
	var stateName = selected.id.substring(6,selected.id.length);
	var iStates = getInstanceStates(toscaDoc);
	var menu = document.getElementById("popup_selector_menu");
	for (i=0; i < iStates.length; i++) {
		var is = iStates[i];
		if (is.getAttribute("state") == stateName) {
			if (is.hasChildNodes()) {
				if(is.lastElementChild.localName == "Offers" ||
				   is.lastElementChild.localName == "mprot:Offers") {
					var off = is.lastElementChild.childNodes;
					for (j=0; j<off.length; j++) {
						var option = document.createElement("option");
						option.value = off[j].getAttribute("name");
						option.innerHTML = off[j].getAttribute("name");
						menu.appendChild(option);
					}
				}
			}
		}
	}
	//checking if there is nothing to remove
	if(!menu.hasChildNodes()){
		alert("No offerings to be removed!");
		return;
	}
	
	//popping up the selector
	selector_open();
}

function selector_removeOffers() {
	var capName = document.getElementById("popup_selector_menu").value;
	var mProt = getManagementProtocol(toscaDoc);
	var stateName = selected.id.substring(6,selected.id.length);
	removeCapabilityOffering(mProt,stateName,capName);
	deleteCapabilityOffering(stateName,capName);
	
	selector_close();
}

function selector_open() {
	document.getElementById("popup_selector").setAttribute("style","display:block;");
	document.getElementById("popup_shadower").setAttribute("style","display:block;");
}

function selector_close() {
	document.getElementById("popup_selector").setAttribute("style","display:none;");
	document.getElementById("popup_shadower").setAttribute("style","display:none;");
	var menu = document.getElementById("popup_selector_menu");
	menu.innerHTML = "";
}

function toolbox_addTransition() {
	//setting the transition's menu
	var mProt = getManagementProtocol(toscaDoc);
	var stateName = selected.id.substring(6,selected.id.length);
	var operations = getOperations(toscaDoc);
	document.getElementById("transition_selector_OK").setAttribute("onClick","transition_addTransition()");
	
	//-add operations to operation menu (by excluding those already used for transitions)
	var opMenu = document.getElementById("popup_transition_operationMenu");
	var existingTransitions = getOutgoingTransitions(mProt,stateName);
	var unavailableIntOps = [];
	for (i=0; i < existingTransitions.length; i++)
		unavailableIntOps.push(existingTransitions[i].getAttribute("interfaceName") + ":" + existingTransitions[i].getAttribute("operationName"));
	for (i=0; i < operations.length; i++) {
		var option = document.createElement("option");
		option.value = operations[i].parentNode.getAttribute("name") + ":" + operations[i].getAttribute("name");
		option.innerHTML = operations[i].parentNode.getAttribute("name") + ":" + operations[i].getAttribute("name");
		if (unavailableIntOps.indexOf(option.value)==-1)
			opMenu.appendChild(option);
	}
	
	//-add states to targetSate menu
	var iStates = getInstanceStates(toscaDoc);
	var targetMenu = document.getElementById("popup_transition_targetStateMenu");
	for (i=0; i < iStates.length; i++) {
		var option = document.createElement("option");
		option.value = iStates[i].getAttribute("state");
		option.innerHTML = iStates[i].getAttribute("state");
		targetMenu.appendChild(option);
	}
	
	//-add requirements to requirement selector
	var reqSelector = document.getElementById("popup_transition_neededRequirements");
	var reqList = getRequirementDefinitions(toscaDoc);
	if (reqList.length == 0)
		reqSelector.innerHTML = "None";
	else {
		for (i=0; i<reqList.length; i++) {
			var req = document.createElement("textbox");
			req.className = "transition_unselectedReq";
			req.innerHTML = reqList[i].getAttribute("name");
			req.setAttribute("onClick","if(this.className=='transition_unselectedReq') this.className = 'transition_selectedReq'; else this.className = 'transition_unselectedReq';");
			reqSelector.appendChild(req);
		}
	}
	
	
	//popping up the transition's menu
	transition_open(true);
}

function transition_addTransition() {
	var sourceStateName = selected.id.substring(6,selected.id.length);
	var targetStateName = document.getElementById("popup_transition_targetStateMenu").value;
	var intOp = document.getElementById("popup_transition_operationMenu").value;
	var interfaceName = intOp.substring(0,intOp.indexOf(":"));
	var operationName = intOp.substring(intOp.indexOf(":")+1,intOp.length);
	var neededReqs = [];
	var selectedReqs = document.getElementById("popup_transition_neededRequirements").children;
	for (i=0; i<selectedReqs.length; i++)
		if (selectedReqs[i].className == "transition_selectedReq")
			neededReqs.push(selectedReqs[i].innerHTML);
		
	var mProt = getManagementProtocol(toscaDoc);
	
	var t = addTransition(mProt,sourceStateName,targetStateName,operationName,interfaceName,neededReqs);
	drawTransition(t);
	
	transition_close();
}

function toolbox_removeTransition() {
	//setting the transition's menu
	document.getElementById("transition_selector_OK").setAttribute("onClick","transition_removeTransition()");
	var sourceStateName = selected.id.substring(6,selected.id.length);
	
	var opMenu = document.getElementById("popup_transition_operationMenu");
	var mProt = getManagementProtocol(toscaDoc);
	var existingTransitions = getOutgoingTransitions(mProt,sourceStateName);
	for (i=0; i < existingTransitions.length; i++) {
		var option = document.createElement("option");
		option.value = existingTransitions[i].getAttribute("interfaceName") + ":" + existingTransitions[i].getAttribute("operationName");
		option.innerHTML = existingTransitions[i].getAttribute("interfaceName") + ":" + existingTransitions[i].getAttribute("operationName");
		opMenu.appendChild(option);
	}
	
	//popping up the transition's menu
	transition_open(false);
}

function transition_removeTransition() {
	var t = document.getElementById("popup_transition_operationMenu").value;
	var mProt = getManagementProtocol(toscaDoc);
	var sourceStateName = selected.id.substring(6,selected.id.length);
	var interfaceName = t.substring(0,t.indexOf(":"));
	var operationName = t.substring(t.indexOf(":")+1,t.length);
	var existingTransitions = getOutgoingTransitions(mProt,sourceStateName);
	
	for (i=0; i < existingTransitions.length; i++) {
		if (existingTransitions[i].getAttribute("interfaceName") == interfaceName && existingTransitions[i].getAttribute("operationName") == operationName)
			removeTransition(mProt,existingTransitions[i]);		
	}
	deleteTransition(sourceStateName,operationName);
	
	transition_close();
}

function transition_open(showAll) {
	document.getElementById("popup_transition").setAttribute("style","display:block;");;
	document.getElementById("popup_transition_opDiv").setAttribute("style","display:block;");;
	if (showAll) {
		document.getElementById("popup_transition_stateDiv").setAttribute("style","display:block;");;
		document.getElementById("popup_transition_reqDiv").setAttribute("style","display:block;");;
	}
	document.getElementById("popup_shadower").setAttribute("style","display:block;");;
}

function transition_close() {
	document.getElementById("popup_transition").setAttribute("style","display:none;");
	document.getElementById("popup_shadower").setAttribute("style","display:none;");
	//hiding and clearing operation menu
	document.getElementById("popup_transition_opDiv").setAttribute("style","display:none;");
	document.getElementById("popup_transition_operationMenu").innerHTML = "";
	//hiding and clearing targetState menu
	document.getElementById("popup_transition_stateDiv").setAttribute("style","display:none;");
	document.getElementById("popup_transition_targetStateMenu").innerHTML = "";
	//hiding and clearing requirement selector
	document.getElementById("popup_transition_reqDiv").setAttribute("style","display:none;");
	document.getElementById("popup_transition_neededRequirements").innerHTML = "";
}

function toolbox_setAsInitialState() {
	var iniStateName = selected.id.substring(6,selected.length);
	var mProt = getManagementProtocol(toscaDoc);
	setInitialState(mProt,iniStateName);
	updateInitialState(iniStateName);
}
