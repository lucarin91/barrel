var selected = null;
var mProt = null;
var csar = null;
var csarFileName = null;
var app = null;

Handlebars.registerHelper('get-state', function(node, options) {
    return options.fn(node.getState());
});

Handlebars.registerHelper('can-perform-op', function(app, nodeId, opId, options) {
    return app.canPerformOp(nodeId, opId);
});

var analyzerNodes = Handlebars.compile($("#analyzer-nodes").html());

var arrayRemove = function(a, x) {
    for (var i = 0; i < a.length; i++) {
	if (a[i] === x) {
	    a.splice(i, 1);
	    i--;
	}
    }
}

var fileInput = document.getElementById("file-input");

var nodeTypeSelectorCallback = function(doc, name) {
    var onend = function () {
	mProt = new ManagementProtocol.ManagementProtocolEditor(doc, name);
	drawEnvironment(mProt);
    };

    return function() {
	if (mProt != null)
	    mProt.save(onend);
	else
	    onend();
    };
}

var onCsarRead = function() {
    //Allow CSAR elaboration
    $(".hidden").removeClass("hidden");
    var nts = csar.get("NodeType");
    for (var i = 0; i < nts.length; i++) {
	var el = nts[i].element;
	var name = el.getAttribute("name");
	var item = document.createElement("li");
	item.innerHTML = item.id = name;
	$("#nodeTypeSelector").append(item);
	$("#" + name).click(nodeTypeSelectorCallback(nts[i].doc, name));
    }
}

var readCsar = function() {
    $("#nodeTypeSelector").html("");
    mProt = null;
    drawEnvironment(mProt);
    csarFileName = fileInput.files[0].name;
    csar = new Csar.Csar(fileInput.files[0], onCsarRead);
}

fileInput.addEventListener('change', readCsar, false);

$(document).click(function(event) {
    if(selected != null) {
	if (selected.id.indexOf("state_") == 0) {
	    $("#toolbox").attr("style","display:block");
	    console.log("DIV: " + selected.id);
	    $("#toolbox_selected").html(selected.id.substring(6,selected.id.length));
	}
	if (selected.id.indexOf("con_") == 0) {
	    console.log("CONN: " + selected.id);
	    $("#toolbox").attr("style","display:none");
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
    divEnv.append(divState);
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
    $("#state_"+isName+"_ReliesOn").append(reqDiv);
};

function drawCapabilityOffering(isName,capName) {
    var capDiv = document.createElement("div");
    capDiv.id = "state_"+isName+"_Offers_"+capName;
    capDiv.innerHTML = "- " + capName;
    $("#state_"+isName+"_Offers").append(capDiv);
};

function deleteRequirementAssumption(isName,reqName) {
    var reqDiv = $("#state_"+isName+"_ReliesOn_"+reqName);
    //reqDiv.parentNode.removeChild(reqDiv);
	reqDiv.remove();
};

function deleteCapabilityOffering(isName,capName) {
    var capDiv = $("#state_"+isName+"_Offers_"+capName);
    //capDiv.parentNode.removeChild(capDiv);
	capDiv.remove();
};

function drawTransition(source, target, operationName, interfaceName, reqs) {
    var sourceState = "state_" + source;
    var targetState = "state_" + target;
    var transLabel = "<b>" + interfaceName + ":" + operationName + "</b>";
    
    if (reqs.length != 0)
		transLabel += "<br> Relies on: {" + reqs.join(", ") + "}";
    
    var c = jsPlumb.connect({
		source: sourceState,
        target: targetState,
		anchor: "Continuous",
		connector: ["StateMachine", { curviness: 50 }],
		endpoint: "Dot",
		endpointStyle: { fillStyle:"#112835", radius:7 },
		paintStyle: { strokeStyle:"#112835", lineWidth:2 },
		hoverPaintStyle:{ strokeStyle:"#3399FF" },
		overlays:[ 
			["Arrow" , { width:12, length:12, location:1 }], 
			["Label", { label:transLabel, id:"label", location: 0.4, cssClass: "transLabel" }]
		]
    });
    
    c.setParameter({ id: sourceState + "_" + interfaceName + "_" + operationName });

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
    var divEnv = $("#divEnv");
    $("#toolbox").attr("style","display:none");
    selected = null;
    divEnv.html("");
    jsPlumb.reset();

    if (mProt == null)
	return;
    
    var stateDivs = [];
    
    //instance states
    var instanceStates = mProt.getStates();
    if (instanceStates.length==0) {
	alert("The imported NodeType has no instance states");
	return;
    }

    for(var i=0; i < instanceStates.length; i++) {
	var stateName = instanceStates[i];
	var state = mProt.getState(stateName);
	var divState = createState(divEnv, stateName);
	stateDivs.push(divState);
	
	var reqList = state.getReqs();
	for(var j=0; j<reqList.length; j++)
	    drawRequirementAssumption(stateName, reqList[j]);

	var capList = state.getCaps();
	for(var j=0; j<capList.length; j++)
	    drawCapabilityOffering(stateName,capList[j]);

	var iniState = mProt.getInitialState();
	if (iniState != null)
	    updateInitialState(iniState);
    }		
    
	var transitions = mProt.getTransitions();
	for (var i=0; i<transitions.length; i++) {
	    drawTransition(transitions[i].source,
			   transitions[i].target,
			   transitions[i].operation,
			   transitions[i].iface,
			   transitions[i].reqs);
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
    mProt.save(function () {
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
    });
}

function shadower_on() {
    $("#popup_shadower").attr("style","display:block");
};

function shadower_off() {
    $("#popup_shadower").attr("style","display:none");
};

function about_open() {
    $("#popup_about").attr("style","display:block");
	shadower_on();
};

function about_close() {
    $("#popup_about").attr("style","display:none");
	shadower_off();
};

function toolbox_addReliesOn() {
    var stateName = selected.id.substring(6,selected.id.length);
	var state = mProt.getState(stateName);
	var reqs = state.getReqs();
	
	//setting the selector
    $("#popup_selector_label").html("Please select a requirement that must hold in state <em>"+stateName+"</em>");
    $("#popup_selector_OK").attr("onClick","selector_addReliesOn()");
    		
    var reqList = mProt.getReqs();
    var menu = $("#popup_selector_menu");
    menu.html("");
    for(var i = 0; i < reqList.length; i++) {
		if (reqs.indexOf(reqList[i]) == -1) {
			var option = document.createElement("option");
			option.value = reqList[i];
			option.innerHTML = reqList[i];
			menu.append(option);
		}
    }
    
    //popping up the selector
    selector_open();
}

function selector_addReliesOn() {
    var reqName = $("#popup_selector_menu").val();
    if (reqName != null) {
		var stateName = selected.id.substring(6,selected.id.length);
		var state = mProt.getState(stateName);
		var reqs = state.getReqs();
		reqs.push(reqName);
		state.setReqs(reqs);
		drawRequirementAssumption(stateName,reqName);
	}
	
    selector_close();
}

function toolbox_removeReliesOn() {
    var stateName = selected.id.substring(6,selected.id.length);
    var state = mProt.getState(stateName);
    var reqs = state.getReqs();
    	
	//setting the selector
    $("#popup_selector_label").html("Please select the requirement that does not need to hold any more in state <em>"+stateName+"</em>");
    $("#popup_selector_OK").attr("onClick","selector_removeReliesOn()");
    
    var menu = $("#popup_selector_menu");
    menu.html("");
    for (var j = 0; j < reqs.length; j++) {
		var option = document.createElement("option");
		option.value = reqs[j];
		option.innerHTML = reqs[j];
		menu.append(option);
    }

    //popping up the selector
    selector_open();
}

function selector_removeReliesOn() {
    var reqName = $("#popup_selector_menu").val();
	if (reqName != null) {
		var stateName = selected.id.substring(6,selected.id.length);
		var state = mProt.getState(stateName);
		var reqs = state.getReqs();
		arrayRemove(reqs, reqName);
		state.setReqs(reqs);
		deleteRequirementAssumption(stateName,reqName);
	}
	
    selector_close();
}

function toolbox_addOffers() {
    var stateName = selected.id.substring(6,selected.id.length);
    var state = mProt.getState(stateName);
    var caps = state.getCaps();
    
	//setting the selector
    $("#popup_selector_label").html("Please select a capability that is offered by state <em>"+stateName+"</em>");
    $("#popup_selector_OK").attr("onClick","selector_addOffers()");
    
    var capList = mProt.getCaps();
    var menu = $("#popup_selector_menu");
	menu.html("");
    for(var i = 0; i < capList.length; i++) {
		if (caps.indexOf(capList[i]) == -1) {
			var option = document.createElement("option");
			option.value = capList[i];
			option.innerHTML = capList[i];
			menu.append(option);
		}
    }

    //popping up the selector
    selector_open();
}

function selector_addOffers() {
    var capName = $("#popup_selector_menu").val();
	if (capName != null) {
		var stateName = selected.id.substring(6,selected.id.length);
		var state = mProt.getState(stateName);
		var caps = state.getCaps();
		caps.push(capName);
		state.setCaps(caps);
		drawCapabilityOffering(stateName,capName);
    }
    
    selector_close();
}

function toolbox_removeOffers() {
    var stateName = selected.id.substring(6,selected.id.length);
    var state = mProt.getState(stateName);
    var caps = state.getCaps();

    //setting the selector
    $("#popup_selector_label").html("Please select a capability that is no more offered by state <em>"+stateName+"</em>");
    $("#popup_selector_OK").attr("onClick","selector_removeOffers()");
    
    var menu = $("#popup_selector_menu");
    menu.html("");
    for (var j = 0; j < caps.length; j++) {
		var option = document.createElement("option");
		option.value = caps[j];
		option.innerHTML = caps[j];
		menu.append(option);
    }
    
    //popping up the selector
    selector_open();
}

function selector_removeOffers() {
    var capName = $("#popup_selector_menu").val();
	if (capName != null) {
		var stateName = selected.id.substring(6,selected.id.length);
		var state = mProt.getState(stateName);
		var caps = state.getCaps();
		arrayRemove(caps, capName);
		state.setCaps(caps);
		deleteCapabilityOffering(stateName,capName);
	}
	
    selector_close();
}

function selector_open() {
    $("#popup_selector").attr("style","display:block;");
    shadower_on();
}

function selector_close() {
    $("#popup_selector").attr("style","display:none;");
    shadower_off();
    var menu = $("#popup_selector_menu");
    menu.innerHTML = "";
}

function toolbox_addTransition() {
    //setting the transition's menu
    var stateName = selected.id.substring(6,selected.id.length);
    
    var operations = mProt.getOps();
    $("#transition_selector_OK").attr("onClick","transition_addTransition()");
    
    //-add operations to operation menu (by excluding those already used for transitions)
    var opMenu = $("#popup_transition_operationMenu");
    var outTrans = mProt.getOutgoingTransitions(stateName);
    var outOps = {}
    for (var i=0; i < outTrans.length; i++)
		outOps[outTrans[i].iface + ":" + outTrans[i].operation] = true;

    for (var i=0; i < operations.length; i++) {
		var option = document.createElement("option");
		option.innerHTML = option.value = operations[i].iface + ":" + operations[i].operation;
		if (!(option.value in outOps))
			opMenu.append(option);
    }
    
    //-add states to targetSate menu
    var iStates = mProt.getStates();
    var targetMenu = $("#popup_transition_targetStateMenu");
    for (var i=0; i < iStates.length; i++) {
		var option = document.createElement("option");
		option.innerHTML = option.value = iStates[i];
		targetMenu.append(option);
    }
    
    //-add requirements to requirement selector
    var reqSelector = $("#popup_transition_neededRequirements");
    var reqList = mProt.getReqs();
	if (reqList.length == 0) {
		reqSelector.html("None");
    } else {
		for (var i=0; i<reqList.length; i++) {
			var req = document.createElement("textbox");
			req.className = "transition_unselectedReq";
			req.innerHTML = reqList[i];
			req.setAttribute("onClick","if(this.className=='transition_unselectedReq') this.className = 'transition_selectedReq'; else this.className = 'transition_unselectedReq';");
			reqSelector.append(req);
		}
    }
    
    //popping up the transition's menu
    transition_open(true);
}

function transition_addTransition() {
    var sourceStateName = selected.id.substring(6,selected.id.length);
    var targetStateName = $("#popup_transition_targetStateMenu").val();
    var intOp = $("#popup_transition_operationMenu").val().split(":");
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
    $("#transition_selector_OK").attr("onClick","transition_removeTransition()");
    var sourceStateName = selected.id.substring(6,selected.id.length);

    var opMenu = $("#popup_transition_operationMenu");
    var existingTransitions = mProt.getOutgoingTransitions(sourceStateName);
    for (var i = 0; i < existingTransitions.length; i++) {
		var option = document.createElement("option");
		option.innerHTML = option.value = existingTransitions[i].iface + ":" + existingTransitions[i].operation;
		opMenu.append(option);
    }
    
    //popping up the transition's menu
    transition_open(false);
}

function transition_removeTransition() {
    var t = $("#popup_transition_operationMenu").val().split(":");
    var sourceStateName = selected.id.substring(6,selected.id.length);
    var interfaceName = t[0];
    var operationName = t[1];
    mProt.removeTransition(sourceStateName, operationName, interfaceName);
    deleteTransition(sourceStateName,operationName);
    
    transition_close();
}

function transition_open(showAll) {
    $("#popup_transition").attr("style","display:block;");
    $("#popup_transition_opDiv").attr("style","display:block;");
    if (showAll) {
		$("#popup_transition_stateDiv").attr("style","display:block;");
		$("#popup_transition_reqDiv").attr("style","display:block;");
    }

    shadower_on();
}

function transition_close() {
    $("#popup_transition").attr("style","display:none;");
    shadower_off();
    //hiding and clearing operation menu
    $("#popup_transition_opDiv").attr("style","display:none;");
    $("#popup_transition_operationMenu").html("");
    //hiding and clearing targetState menu
    $("#popup_transition_stateDiv").attr("style","display:none;");
    $("#popup_transition_targetStateMenu").html("");
    //hiding and clearing requirement selector
    $("#popup_transition_reqDiv").attr("style","display:none;");
    $("#popup_transition_neededRequirements").html("");
}

function toolbox_setAsInitialState() {
    var iniStateName = selected.id.substring(6,selected.length); // drop "state_"
    mProt.setInitialState(iniStateName);
    updateInitialState(iniStateName);
}

function analyzer_update() {
    $("#analyzerDiv").html(analyzerNodes(app));
}

function analyzer_open() {
    $("#popup_analyzer").attr("style","display:block;");
    shadower_on();
    app = TOSCAAnalysis.serviceTemplateToApplication(csar.get("ServiceTemplate")[0].element, csar.getTypes());
    analyzer_update();
}

function analyzer_close() {
	$("#popup_analyzer").attr("style","display:none;");
	shadower_off();
}
