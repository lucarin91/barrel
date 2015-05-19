var selected = null;
var mProt = null;
var csar = null;
var csarFileName = null;

var arrayRemove = function(a, x) {
    for (var i = 0; i < a.length; i++) {
	if (a[i] === x) {
	    a.splice(i, 1);
	    i--;
	}
    }
}

var fileInput = document.getElementById("file-input");

var readCsar = function() {
    $("#nodeTypeSelector").html("");
    var onend = function() {
	var nts = csar.get("NodeType");
	for (var i = 0; i < nts.length; i++) {
	    var el = nts[i].element;
	    var name = el.getAttribute("name");
	    var item = document.createElement("li");
	    item.innerHTML = item.id = name;
	    $("#nodeTypeSelector").append(item);
	    var closure = function(doc, name) {
		return function () {
		    mProt = new ManagementProtocol.ManagementProtocol(doc, name);
		    drawEnvironment(mProt);
		};
	    } (nts[i].doc, name);
	    $("#" + name).click(closure);
	}
    }
    csarFileName = fileInput.files[0].name;
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

function createState(divEnv,stateName) {
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

function drawTransition(source, target, operationName, interfaceName, reqs) {
    var sourceState = "state_" + source;
    var targetState = "state_" + target;
    var transLabel = operationName;
    
    if (reqs.length != 0)
	transLabel = "{" + reqs.join(", ") + "}" + transLabel;
    
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
    
    c.setParameter({ id: sourceState + "_" + operationName });

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
    $(".initial").remove("initial");
    $(".stateDiv").removeClass("initial");
    $("#state_" + newInitialState).addClass("initial");
}

function drawEnvironment(mProt) {
    //clear environment
    var divEnv = document.getElementById("divEnv");
    $("#toolbox").attr("style","display:none");
    selected = null;
    divEnv.innerHTML = "";
    jsPlumb.reset();
    
    var stateDivs = [];
    
    //instance states
    var instanceStates = mProt.getStates();
    if (instanceStates.length==0) {
	alert("The imported NodeType has no instance states");
	return;
    }

    for(i=0; i < instanceStates.length; i++) {
	var stateName = instanceStates[i];
	var state = mProt.getState(stateName);
	var divState = createState(divEnv, stateName);
	stateDivs.push(divState);
	
	var reqList = state.getReqs();
	for(var j=0; j<reqList.length; j++)
	    drawRequirementAssumption(stateName, reqList[j]);

	var capList = state.getCaps();
	for(var j=0; j<capList.length; j++)
	    drawCapabilityOffering(is,capList[j]);

	var iniState = mProt.getInitialState();
	if (iniState != null)
	    updateInitialState(iniState);

	var transitions = mProt.getTransitions();
	for (var j=0; j<transitions.length; j++) {
	    drawTransition(transitions[j].source,
			   transitions[j].target,
			   transitions[j].operation,
			   transitions[j].iface,
			   transitions[j].reqs);
	}
    }		
    
    initialPositioning(stateDivs);
    
    jsPlumb.repaintEverything();
    jsPlumb.repaintEverything();
};

function exportXMLDoc() {
    var url = URL.createObjectURL(mProt.getXML());
    window.open(url, "_blank", "");
}

function exportCsar() {
    csar.exportBlob(function (blob) {
	var url = URL.createObjectURL(blob);
	setTimeout(function () {
	    var a = document.createElement("a");
	    a.style = "display: none";
	    a.href = url;
	    a.download = csarFileName;
	    document.body.appendChild(a);
	    a.click();
	    setTimeout(function() {
		document.body.removeChild(a);
		window.URL.revokeObjectURL(url);
	    }, 0);
	}, 0);
    });
}

function about() {
    alert("This editor has been produced in scope of the research paper: \n <paper info> \n \n Copyright: \n \t Andrea Canciani and Jacopo Soldani \n \t CS Department, University of Pisa");
};

function toolbox_addReliesOn() {
    //setting the selector
    document.getElementById("popup_selector_label").innerHTML = 
	"Please select a requirement that must hold in state <em>"+selected.id.substring(6,selected.id.length)+"</em>";
    document.getElementById("popup_selector_OK").setAttribute("onClick","selector_addReliesOn()");
    
    var reqList = mProt.getReqs();
    var menu = document.getElementById("popup_selector_menu");
    for(var i = 0; i < reqList.length; i++) {
	var option = document.createElement("option");
	option.value = reqList[i];
	option.innerHTML = reqList[i];
	menu.appendChild(option);
    }
    
    //popping up the selector
    selector_open();
}

function selector_addReliesOn() {
    //var reqName = prompt("Requirement to be added?","xxxx");
    var reqName = document.getElementById("popup_selector_menu").value;
    var stateName = selected.id.substring(6,selected.id.length);
    var state = mProt.getState(stateName);
    var reqs = state.getReqs();
    if (reqs.indexOf(reqName) != -1) {
	alert("Specified requirement is already assumed");
    } else {
	reqs.push(reqName);
	state.setReqs(reqs);
	drawRequirementAssumption(stateName,reqName);
    }
    
    selector_close();
}

function toolbox_removeReliesOn() {
    //setting the selector
    document.getElementById("popup_selector_label").innerHTML = 
	"Please select the requirement that does not need to hold any more in state <em>"+selected.id.substring(6,selected.id.length)+"</em>";
    document.getElementById("popup_selector_OK").setAttribute("onClick","selector_removeReliesOn()");
    
    var stateName = selected.id.substring(6,selected.id.length);
    var state = mProt.getState(stateName);
    var reqs = state.getReqs();
    var menu = document.getElementById("popup_selector_menu");
    for (var j = 0; j < reqs.length; j++) {
	var option = document.createElement("option");
	option.value = reqs[j];
	option.innerHTML = reqs[j];
	menu.appendChild(option);
    }

    //popping up the selector
    selector_open();
}

function selector_removeReliesOn() {
    var reqName = document.getElementById("popup_selector_menu").value;
    var stateName = selected.id.substring(6,selected.id.length);
    var state = mProt.getState(stateName);
    var reqs = state.getReqs();
    arrayRemove(reqs, reqName);
    state.setReqs(reqs);
    deleteRequirementAssumption(stateName,reqName);
    
    selector_close();
}

function toolbox_addOffers() {
    //setting the selector
    document.getElementById("popup_selector_label").innerHTML = 
	"Please select a capability that is offered by state <em>"+selected.id.substring(6,selected.id.length)+"</em>";
    document.getElementById("popup_selector_OK").setAttribute("onClick","selector_addOffers()");
    
    var capList = mProt.getCaps();
    var menu = document.getElementById("popup_selector_menu");
    for(var i = 0; i < capList.length; i++) {
	var option = document.createElement("option");
	option.value = capList[i];
	option.innerHTML = capList[i];
	menu.appendChild(option);
    }

    //popping up the selector
    selector_open();
}

function selector_addOffers() {
    var capName = document.getElementById("popup_selector_menu").value;
    var stateName = selected.id.substring(6,selected.id.length);
    var state = mProt.getState(stateName);
    var caps = state.getCaps();
    if (caps.indexOf(capName) != -1) {
	alert("Specified requirement is already assumed");
    } else {
	caps.push(capName);
	state.setCaps(caps);
	drawCapabilityOffering(stateName,capName);
    }
    
    selector_close();
}

function toolbox_removeOffers() {
    //setting the selector
    document.getElementById("popup_selector_label").innerHTML = 
	"Please select a capability that is no more offered by state <em>"+selected.id.substring(6,selected.id.length)+"</em>";
    document.getElementById("popup_selector_OK").setAttribute("onClick","selector_removeOffers()");
    
    var stateName = selected.id.substring(6,selected.id.length);
    var state = mProt.getState(stateName);
    var caps = state.getCaps();
    var menu = document.getElementById("popup_selector_menu");
    for (var j = 0; j < caps.length; j++) {
	var option = document.createElement("option");
	option.value = caps[j];
	option.innerHTML = caps[j];
	menu.appendChild(option);
    }
    
    //popping up the selector
    selector_open();
}

function selector_removeOffers() {
    var capName = document.getElementById("popup_selector_menu").value;
    var stateName = selected.id.substring(6,selected.id.length);
    var state = mProt.getState(stateName);
    var caps = state.getCaps();
    arrayRemove(caps, capName);
    state.setCaps(caps);
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
    var stateName = selected.id.substring(6,selected.id.length);
    
    var operations = mProt.getOps();
    document.getElementById("transition_selector_OK").setAttribute("onClick","transition_addTransition()");
    
    //-add operations to operation menu (by excluding those already used for transitions)
    var opMenu = document.getElementById("popup_transition_operationMenu");
    var outTrans = mProt.getOutgoingTransitions(stateName);
    var outOps = {}
    for (var i=0; i < outTrans.length; i++)
	outOps[outTrans.operation] = true;

    for (var i=0; i < operations.length; i++) {
	var option = document.createElement("option");
	option.innerHTML = option.value = operations[i].iface + ":" + operations[i].operation;
	if (!(operations[i].operation in outOps))
	    opMenu.appendChild(option);
    }
    
    //-add states to targetSate menu
    var iStates = mProt.getStates();
    var targetMenu = document.getElementById("popup_transition_targetStateMenu");
    for (var i=0; i < iStates.length; i++) {
	var option = document.createElement("option");
	option.innerHTML = option.value = iStates[i];
	targetMenu.appendChild(option);
    }
    
    //-add requirements to requirement selector
    var reqSelector = document.getElementById("popup_transition_neededRequirements");
    var reqList = mProt.getReqs();
    if (reqList.length == 0) {
	reqSelector.innerHTML = "None";
    } else {
	for (var i=0; i<reqList.length; i++) {
	    var req = document.createElement("textbox");
	    req.className = "transition_unselectedReq";
	    req.innerHTML = reqList[i];
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
    var intOp = document.getElementById("popup_transition_operationMenu").value.split(":");
    var interfaceName = intOp[0];
    var operationName = intOp[1];
    var neededReqs = [];
    var selectedReqs = $(".transition_selectedReq");
    for (var i=0; i<selectedReqs.length; i++)
	neededReqs.push(selectedReqs[i].innerHTML);
    
    mProt.addTransition(sourceStateName,targetStateName,operationName,interfaceName,neededReqs);
    drawTransition(sourceStateName,targetStateName,operationName,interfaceName,neededReqs);
    
    transition_close();
}

function toolbox_removeTransition() {
    //setting the transition's menu
    document.getElementById("transition_selector_OK").setAttribute("onClick","transition_removeTransition()");
    var sourceStateName = selected.id.substring(6,selected.id.length);

    var opMenu = document.getElementById("popup_transition_operationMenu");
    var existingTransitions = mProt.getOutgoingTransitions(sourceStateName);
    for (var i = 0; i < existingTransitions.length; i++) {
	var option = document.createElement("option");
	option.innerHTML = option.value = existingTransitions[i].iface + ":" + existingTransitions[i].operation;
	opMenu.appendChild(option);
    }
    
    //popping up the transition's menu
    transition_open(false);
}

function transition_removeTransition() {
    var t = document.getElementById("popup_transition_operationMenu").value.split(":");
    var sourceStateName = selected.id.substring(6,selected.id.length);
    var interfaceName = t[0];
    var operationName = t[1];
    mProt.removeTransition(sourceStateName, operationName, interfaceName);
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
    var iniStateName = selected.id.substring(6,selected.length); // drop "state_"
    mProt.setInitialState(iniStateName);
    updateInitialState(iniStateName);
}
