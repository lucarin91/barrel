/// <reference path="lib/jquery/jquery.d.ts" />
/// <reference path="Analysis.ts" />
/// <reference path="ManagementProtocols.ts" />
/// <reference path="TOSCA.ts" />
/// <reference path="TOSCAAnalysis.ts" />

module Simulator {
    export function build(table: Element, app: Analysis.Application, uiNames: TOSCAAnalysis.UINames) {
        // Clear table
        table.innerHTML = "";
        // For each node in "app"
        for (var id in app.nodes) {
            // Create the corresponding row
            var row: Element = document.createElement("tr");
            table.appendChild(row);
            // Create a row-field for displaying the node name
            var nameField: Element = document.createElement("td");
            nameField.id = "sim-name-" + id;
            nameField.setAttribute("style", "font-weight:bold");
            nameField.innerHTML = uiNames[id];
            row.appendChild(nameField);
            // Create a row-field for displaying the node state
            var stateField: Element = document.createElement("td");
            stateField.id = "sim-state-" + id;
            row.appendChild(stateField);
            // Create a row-field for displaying the (currently) offered capabilities
            var capsField: Element = document.createElement("td");
            capsField.id = "sim-caps-" + id;
            row.appendChild(capsField);
            // Create a row-field for displaying the (currently) assumed requirements
            var reqsField: Element = document.createElement("td");
            reqsField.id = "sim-reqs-" + id;
            row.appendChild(reqsField);
            // Create a row-field for displaying the operations that can be performed
            var opsField: Element = document.createElement("td");
            opsField.id = "sim-ops-" + id;
            row.appendChild(opsField);
        }
        update(table, app, uiNames);
    }

    export function update(table: Element, app: Analysis.Application, uiNames: TOSCAAnalysis.UINames) {
        // For each node in app
        for (var id in app.nodes) {
            var node: Analysis.Node = app.nodes[id];
            var state: Analysis.State = node.getState();
            // Display the node state
            var stateField: Element = table.querySelector("#sim-state-" + id);
            stateField.innerHTML = node.stateId;
            // Display the offered capabilities
            var capsField: Element = table.querySelector("#sim-caps-" + id);
            capsField.innerHTML = "";
            for (var c in state.caps) {
                var capBtn: Element = document.createElement("div");
                capBtn.id = "sim-cap-" + c;
                capBtn.className = "btn btn-xs btn-success disabled";
                capBtn.innerHTML = uiNames[c];
                capsField.appendChild(capBtn);
            }
            // Display the assumed requirements
            var reqsField: Element = table.querySelector("#sim-reqs-" + id);
            reqsField.innerHTML = "";
            for (var r in state.reqs) {
                var reqBtn: Element = document.createElement("div");
                reqBtn.id = "sim-req-" + r;
                reqBtn.className = "btn btn-xs sim-req";
                if (app.caps[app.binding[r]])
                    reqBtn.className += " btn-success disabled";
                else {
                    reqBtn.className += " btn-danger";
                    reqBtn.setAttribute("onclick", "alert('TODO - requires handlers!')");
                }
                reqBtn.innerHTML = uiNames[r];
                reqsField.appendChild(reqBtn);
            }
            // Display the operations
            var opsField: Element = table.querySelector("#sim-ops-" + id);
            opsField.innerHTML = "";
            for (var o in state.ops) {
                var opBtn: Element = document.createElement("div");
                opBtn.id = "sim-op-" + o;
                opBtn.className = "btn btn-xs sim-op";
                if (app.isConsistent()) {
                    // If no fault has been issued, permit interacting with available operations
                    if (app.canPerformOp(id, o)) {
                        opBtn.className += " btn-success";
                        opBtn.setAttribute("onclick", "app.performOp('" + id + "','" + o + "');updateSimulator();");
                    }
                    else
                        opBtn.className += " btn-warning disabled";
                }
                else
                    //Otherwise, disable all operations.
                    opBtn.className += " btn-default disabled";
                opBtn.innerHTML = o;
                opsField.appendChild(opBtn);
            }
        }
    }
}