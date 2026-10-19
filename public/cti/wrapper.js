// V1.3

var CIMCallback = {};
var dialogsIdArray = [];
var endedDialogsIdArray = [];
var callsResumedArray = [];
var callsFailoverData = [];
var isCallAlreadyEnded;

$(document).ready(function () {
    var logoutFlag = localStorage.getItem("logoutFlag");
    if (logoutFlag == "false") {
        var parameter = localStorage.getItem("wrapperClientCallback");
        CIMCallback.callbackFunction = window[parameter];
        dialogsIdArray = JSON.parse(localStorage.getItem("dialogsIdArray"));
        callsResumedArray = JSON.parse(localStorage.getItem("callsResumedArray"));
        callsFailoverData = JSON.parse(localStorage.getItem("callsFailoverData"));
    }
});

var wrapperCallbackFunction = function (event) {
    console.log(event);
    //CIMCallbackFunction(event);
    if (event.response.dialog && event.response.dialog.id) {

        isCallAlreadyEnded = wrapper_findEndedCallById(event.response.dialog.id);
        if (isCallAlreadyEnded == 1) return;
        event = wrapper_processDialog(event);
    }
        let shouldClearDialogsArray = wrapper_checkIfShouldClearDialogsArray(event);
        if (shouldClearDialogsArray)
            wrapper_clearDialogsArray(event);

        var publishevent = processNewEvent(event);
        if (publishevent == 1)

            CIMCallback.callbackFunction(event)
        //console.log(CIMCallback.callbackFunction)
    }

    function wrapper_checkIfShouldClearDialogsArray(event) {
        //new code condition added
        if ((event.event == "agentState" && event.response.state == "READY" && dialogsIdArray.length === 0) || (event.event == "agentState" && event.response.state == "LOGOUT") || (event.event == "dialogState" && event.response.dialog == null))
            return 1;
        return 0;
    }

    function storeCallback(param) {
        console.log(param);
        CIMCallback.callbackFunction = param.parameter.callbackFunction;
        localStorage.setItem("wrapperClientCallback", CIMCallback.callbackFunction.name);
    }

    function executeCommands(commandRequest) {
        switch (commandRequest.action) {
            case "registerCallback":
                console.log(commandRequest);
                storeCallback(commandRequest);
                break;
            case "login":
                commandRequest.parameter.clientCallbackFunction = wrapperCallbackFunction;
                login(commandRequest);
                break;
            case "getState":
                getState();
                break;
            case "getNotReadyLogoutReasons":
                getNotReadyLogoutReasons();
                break;
            case "makeNotReadyWithReason":
                makeNotReady(commandRequest);
                break;
            case "makeReady":
                makeReady(commandRequest);
                break;
            case "makeCall":
                makeCall(commandRequest);
                break;
            case "answerCall":
                dialogAction(commandRequest);
                break;
            case "releaseCall":
                dialogAction(commandRequest);
                break;
            case "holdCall":
                dialogAction(commandRequest);
                break;
            case "retrieveCall":
                dialogAction(commandRequest);
                break;
            case "acceptCall":
                dialogAction(commandRequest);
                break;
            case "closeCall":
                dialogAction(commandRequest);
                break;
            case "rejectCall":
                dialogAction(commandRequest);
                break;
            case "SST":
                transferCall(commandRequest);
                break;
            case "makeConsult":
                makeConsult(commandRequest);
                break;
            case "consultTransfer":
                transferCall(commandRequest);
                break;
            case "conferenceCall":
                dialogAction(commandRequest);
                break;
            case "getDialog":
                getDialogs(commandRequest);
                break;
            case "logout":
                logout(commandRequest);
                break;
            case "getWrapUpReasons":
                getWrapUpReasons(commandRequest);
                break;
            case "updateCallVariableData":
                updateCallVariableData(commandRequest);
                break;
            case "updateWrapupData":
                updateWrapupData(commandRequest);
                break;
            case "makeWorkReady":
                makeWorkReady(commandRequest);
                break;
            case "subscribeTeam":
                subscribeToTeam(commandRequest);
                break;
            case "unsubscribeTeam":
                unsubscribeToTeam(commandRequest);
                break;
            case "getTeamUsers":
                getTeamUsers(commandRequest);
                break;
            case "silentMonitor":
                silentMonitor(commandRequest);
                break;
            case "bargeIn":
                bargeIn(commandRequest);
                break;
            case "dropParticipant":
                dropParticipant(commandRequest);
                break;
            case "getQueues":
                getUserQueues(commandRequest);
                if ((config.getQueuesDelay > 0 && config.getQueuesDelay < 10000) && queueInterval == null) {
                    queueSubscribed = true;
                    queueInterval = setInterval(() => {
                        getUserQueues(commandRequest);
                    }, config.getQueuesDelay * 1000);
                }
                break;
            case "getUserPhoneBook":
                getUserPhoneBook(commandRequest);
                break;
            case "getSSOToken":
                getSSOToken(commandRequest);
                break;
            case "reclassifyDialog":
                reclassifyDialog(commandRequest);
                break;
            case "scheduleCallback":
                scheduleCallbackDialog(commandRequest);
                break;
        }
    }

    function wrapper_getCurrentCallVariableValue(callObj, configCallVariable) {
        try {
            for (var i = 0; i < callObj.callVariables.CallVariable.length; i++) {
                if (callObj.callVariables.CallVariable[i].name == configCallVariable)
                    return callObj.callVariables.CallVariable[i].value;
            }
            return "";
        }
        catch (exception) {
            console.error(exception);
        }
    }
    function wrapper_updateCallvariablesCommand(callEvent) {
        var ani = callEvent.ani;
        var dn = callEvent.dialedNumber ? callEvent.dialedNumber : "";
        if (dn)
            ani = ani + ":" + dn;
        var currentCallVariableValue = wrapper_getCurrentCallVariableValue(callEvent, config.callVariable);
        if (currentCallVariableValue == "") {
            var commandParams =
            {
                "action": "updateCallVariableData",
                "parameter":
                {
                    "dialogId": callEvent.id,
                    "callVariables":
                    {
                        "callVariable":
                            [
                                {
                                    "name": config.callVariable,
                                    "value": ani
                                }
                            ]
                    }
                }
            }
            executeCommands(commandParams);
        }
    }

    function wrapper_getCurrentParticipantState(participants) {
        var length;
        if (participants.Participant)
            length = participants.Participant.length;

        if (length) {
            for (var i = 0; i < length; i++) {
                if (participants.Participant[i].mediaAddress == params.extension)
                    return participants.Participant[i].state;
            }
        }
        else {
            if (participants.Participant.mediaAddress == params.extension)
                return participants.Participant.state;
        }
        return null;
    }


    function wrapper_processDialog(event) {
        try {
            //dialogResponseEvent = checkIfIgnoreable(dialogResponseEvent, loggedParticipantState);
            // if(loggedParticipantState == "DROPPED" || loggedParticipantState == "FAILED")
            //     dialogResponseEvent.response.dialog.dialogEndingReason = getDialogEndingReason(dialog.callType);
            let isCallExists = wrapper_checkIfCallResumedExist(event.response.dialog.id);
            if (isCallExists == 0)
                wrapper_addCallResumed(event.response.dialog.id);
            let callResumed = wrapper_findResumedCallById(event.response.dialog.id);
            let loggedParticipantState = wrapper_getCurrentParticipantState(event.response.dialog.participants);
            event.response.dialog.isCallAlreadyActive = wrapper_manageisCallResumedProperty(loggedParticipantState, callResumed);
            event.response.dialog.participants = wrapper_parseDialogParticipants(event.response.dialog.participants);
            console.log("Wrapper processing==");
            if (typeof event?.response?.dialog?.ani === 'string' && event.response.dialog.ani.includes('webrtc!')) {
                console.log(`webrtc!  exists in the ani. '${event.response.dialog.ani}'`);
                // Remove the substring and trim extra spaces
                event.response.dialog.ani = event.response.dialog.ani.replace('webrtc!', "").trim();
                event.response.dialog.channelType = "WEB_RTC";
                console.log(`Updated ani: "${event.response.dialog.ani}"`);
                event.response.dialog.serviceIdentifier = config.webrtcServiceIdentifier;
            } else {
                console.log(`webrtc! does not exists in the ani. '${event.response.dialog.ani}'`);
                event.response.dialog.channelType = "VOICE";
                event.response.dialog.serviceIdentifier = config.serviceIdentifier;
            }


            if (event.response.dialog.state == "ALERTING" || event.response.dialog.state == "ACTIVE" || (event.response.dialog.state == "INITIATED" && event.event != "consultCall"))
                wrapper_storeDialog(event);
            if (event.response.dialog.state == "ACTIVE" && loggedParticipantState == "ACTIVE")
                wrapper_updateCallvariablesCommand(event.response.dialog);
            let wrapper_callExist = wrapper_checkIfCallExist(event.response.dialog.id);

            if (event.response.dialog.state == "DROPPED" || event.response.dialog.state == "FAILED") {
                wrapper_removeDialog(event.response.dialog.id);
                wrapper_removeResumedCall(event.response.dialog.id);
                wrapper_removeDNCalls(event.response.dialog.id);
            }
            if (event.response.dialog && event.response.dialog.dialedNumber)
                wrapper_storeDN(event);

            var currentCallVariableValue = wrapper_getCurrentCallVariableValue(event.response.dialog, config.callVariable);
            if (currentCallVariableValue == "") {
                event.response.dialog.customerNumber = event.response.dialog.ani;
                event.response.dialog.primaryDN = event.response.dialog.dialedNumber;
               // event.response.dialog.serviceIdentifier = config.serviceIdentifier;
            }
            else {
                event.response.dialog.customerNumber = currentCallVariableValue.split(":")[0];
                let primaryDN = currentCallVariableValue.split(":")[1];
                //event.response.dialog.serviceIdentifier = config.serviceIdentifier;
                if (primaryDN)
                    event.response.dialog.primaryDN = primaryDN;
                else
                    event.response.dialog.primaryDN = event.response.dialog.dialedNumber;
            }

            if (config.finesseFlavor == "UCCX" && event.response.dialog.dialedNumber == "" && wrapper_checkIfCallDNExist(event.response.dialog.id) == true) {
                event.response.dialog.dialedNumber = wrapper_getDialogDataFailoverCase(event.response.dialog.id, "dialedNumber");
                event.response.dialog.queueName = wrapper_getDialogDataFailoverCase(event.response.dialog.id, "queueName");
                event.response.dialog.serviceIdentifier = config.serviceIdentifier;
                if (event.response.dialog.primaryDN == "")
                    event.response.dialog.primaryDN = event.response.dialog.dialedNumber;
            }
            event.response.dialog.isCallEnded = wrapper_checkIfCallEnded(event.response.dialog, loggedParticipantState);
            if (event.response.dialog.isCallEnded == 1 && event.event != "consultCall")
                event.response.dialog.ani = wrapper_getCurrentCallVariableValue(event.response.dialog, config.callVariable);

            //new code start
            if((loggedParticipantState == "DROPPED" && dialogsIdArray.length == 1) || (loggedParticipantState == "FAILED" && dialogsIdArray.length == 1)){
                wrapper_clearDialogsArray(event);
                localStorage.setItem("callsFailoverData", JSON.stringify(callsFailoverData));
            }
            //new code end
            if (wrapper_callExist){
                return event;
            }

        } catch (err) {
            console.error(err);
        }

    }

    function wrapper_checkIfCallEnded(dialog, loggedParticipantState) {
        try {
            if (dialog.state && dialog.state == "DROPPED")
                return 1;

            if (dialog.state && dialog.state == "ACTIVE") {
                let participants = dialog.participants;
                if (participants.length && participants.length == 2) {
                    for (participant of participants) {
                        if (participant.state == "DROPPED" && dialog.eventType == "DELETE")
                            return 1;
                    }
                    return 0;
                }
                else if (participants.length && participants.length == 3) { // Added for pcs configured with CCX
                    let customerTypeParticipantCounter = 0;
                    for (let participant of participants) {
                        if (participant.mediaAddressType == "NULL" || !participant.mediaAddressType)
                            customerTypeParticipantCounter++;
                    }
                    if (customerTypeParticipantCounter > 1 && loggedParticipantState == "DROPPED" && dialog.eventType == "DELETE")
                        return 1;
                    return 0;
                }
                else if (participants.length == undefined || participants.length && participants.length == 1) {
                    let participant = participants[0];
                    if (participant.state != "DROPPED")
                        return 0;
                    else
                        return 1;
                }
            }
            return 0;
        } catch (err) {
            console.error(err);
        }
    }

    function wrapper_checkIfCallDNExist(callId) {
        if (callsFailoverData) {
            for (let i = 0; i < callsFailoverData.length; i++) {
                if (callsFailoverData[i] && callsFailoverData[i].callId == callId) {
                    return true;
                }
            }
        }
        return false;
    }

    function wrapper_getDialogDataFailoverCase(callId, propertyToFetch) {
        if (callsFailoverData) {
            for (let i = 0; i < callsFailoverData.length; i++) {
                if (callsFailoverData[i] && callsFailoverData[i].callId == callId) {
                    return callsFailoverData[i].dialog[propertyToFetch];
                }
            }
        }
        return "";
    }

    function wrapper_storeDN(event) {
        //let DN = event.response.dialog.dialedNumber;
        let callId = event.response.dialog.id;
        let callObj = event.response.dialog;
        let isDNAlreadyPushed = wrapper_checkIfCallDNExist(callId);
        if (isDNAlreadyPushed == false) {
            callsFailoverData.push({ "dialog": callObj, "callId": callId })
            localStorage.setItem("callsFailoverData", JSON.stringify(callsFailoverData));
        }
    }

    function wrapper_clearDialogsArray(event) {
        dialogsIdArray = [];
        callsResumedArray = [];
        callsFailoverData = [];
        localStorage.setItem("dialogsIdArray", JSON.stringify(dialogsIdArray));
        localStorage.setItem("callsResumedArray", JSON.stringify(callsResumedArray));
        if (event.event == "agentState" && event.response.state == "READY")
            localStorage.setItem("callsFailoverData", JSON.stringify(callsFailoverData));
    }

    function wrapper_removeDialog(callid) {
        const index = dialogsIdArray.indexOf(callid);
        if (index > -1) {
            dialogsIdArray.splice(index, 1);
            localStorage.setItem("dialogsIdArray", JSON.stringify(dialogsIdArray));
            console.log("dialogsIdArray => ", dialogsIdArray)
        }
    }

    function wrapper_removeResumedCall(id) {
        try {
            var i = 0;
            var callsInList = callsResumedArray.length;
            for (var i = 0; i < callsResumedArray.length; i++) {
                if (callsResumedArray[i].id == id) {
                    callsResumedArray.splice(i, 1);
                    if (callsInList == 1) {
                        callsResumedArray = [];
                    }
                    localStorage.setItem("callsResumedArray", JSON.stringify(callsResumedArray));
                }
            }
        } catch (err) {
            console.error(err);
        }
    }

    function wrapper_removeDNCalls(id) {
        try {
            var i = 0;
            var callsInList = callsFailoverData.length;
            for (var i = 0; i < callsFailoverData.length; i++) {
                if (callsFailoverData[i].callId == id) {
                    callsFailoverData.splice(i, 1);
                    if (callsInList == 1) {
                        callsFailoverData = [];
                    }
                    localStorage.setItem("callsFailoverData", JSON.stringify(callsFailoverData));
                }
            }
        } catch (err) {
            console.error(err);
        }
    }

    function wrapper_storeDialog(event) {
        var iscallIdExists = wrapper_checkIfCallExist(event.response.dialog.id);
        if (!iscallIdExists) {
            dialogsIdArray.push(event.response.dialog.id);
            localStorage.setItem("dialogsIdArray", JSON.stringify(dialogsIdArray));
            console.log("dialogsIdArray => ", dialogsIdArray)
        }
    }

    function wrapper_addCallResumed(id) {
        let call = { id: id, isCallFirstActive: 0, isCallAlreadyActive: 0 };
        callsResumedArray.push(call);
        localStorage.setItem("callsResumedArray", JSON.stringify(callsResumedArray));
    }
    function wrapper_addCallEnded(id) {

        let call = { id: id };

        endedDialogsIdArray.push(call);

        //localStorage.setItem("callsEndedArray", JSON.stringify(endedDialogsIdArray));

    }
    function wrapper_manageisCallResumedProperty(loggedParticipantState, callResumedObj) {

        if (loggedParticipantState == "ACTIVE" && callResumedObj.isCallFirstActive == 1) {
            callResumedObj.isCallAlreadyActive = 1;
        }

        if (callResumedObj.isCallFirstActive == 0 && loggedParticipantState == "ACTIVE") {
            callResumedObj.isCallFirstActive = 1;
        }
        localStorage.setItem("callsResumedArray", JSON.stringify(callsResumedArray));
        return callResumedObj.isCallAlreadyActive;
    }

    function wrapper_findResumedCallById(callid) {
        var i = 0;
        if (callsResumedArray) {
            for (i; i < callsResumedArray.length; i++) {
                if (callsResumedArray[i].id && callsResumedArray[i].id == callid) {
                    return callsResumedArray[i];
                }
            }
        }
        return null;
    }
    function wrapper_findEndedCallById(callid) {

        var i = 0;

        if (endedDialogsIdArray) {

            for (i; i < endedDialogsIdArray.length; i++) {

                if (endedDialogsIdArray[i].id && endedDialogsIdArray[i].id == callid) {

                    console.log('Call Already Ended.');

                    return 1;

                }

            }

        }

        return 0;

    }

    function wrapper_checkIfCallResumedExist(callid) {
        if (callsResumedArray) {
            for (let i = 0; i < callsResumedArray.length; i++) {
                if (callsResumedArray[i] && callsResumedArray[i].id == callid) {
                    return 1;
                }
            }
        }
        return 0;
    }
    function wrapper_checkIfCallExist(callid) {
        if (dialogsIdArray) {
            for (let i = 0; i < dialogsIdArray.length; i++) {
                if (dialogsIdArray[i] && dialogsIdArray[i] == callid) {
                    return 1;
                }
            }
        }
        return 0;
    }

    function wrapper_parseDialogParticipants(participants) {
        participants = participants.Participant;
        let participantArray = [];
        if (participants.length) {
            for (participant of participants) {
                participantArray.push(participant);
            }
        }
        else {
            participantArray.push(participants);
        }
        return participantArray;
    }

    function checkIfIgnoreable(dialogResponseEvent, loggedParticipantState) {
        return;
    }

    let previousEvent = null; // To store the previous event (starts as null)



    function normalizeObject(obj) {

        // Recursively trim all string values and normalize objects

        if (typeof obj === 'string') {

            return obj.trim();

        }

        if (Array.isArray(obj)) {

            return obj.map(normalizeObject);

        }

        if (typeof obj === 'object' && obj !== null) {

            return Object.keys(obj).reduce((acc, key) => {

                acc[key] = normalizeObject(obj[key]);

                return acc;

            }, {});

        }

        return obj; // Return non-string types as-is

    }



    function deepEqual(obj1, obj2) {

        const normalizedObj1 = normalizeObject(obj1);

        const normalizedObj2 = normalizeObject(obj2);

        return JSON.stringify(normalizedObj1) === JSON.stringify(normalizedObj2);

    }



    function processNewEvent(newEvent) {

        if (previousEvent === null) {

            // First event scenario

            console.log("First event received, no previous event to compare.");

            previousEvent = newEvent; // Set the first event as the previous event for comparison

            return 1

        }
        else if (newEvent.event.toLowerCase() === "error" && newEvent.response.description === "CF_RESOURCE_BUSY") {
            console.log("CF_RESOURCE_BUSY Error event received.");

            previousEvent = newEvent; // Update the previous event to the current one

            return 1;
        }
        else if (deepEqual(previousEvent, newEvent)) {

            console.log("Duplicate event received.");

            return 0;

        } else {

            console.log("New event received.");

            previousEvent = newEvent; // Update the previous event to the current one

            return 1;

        }

    }

// function getDialogEndingReason(callType){
//     let reason = null;
//     try{
//         switch (callType) {
//             case callTypes.directType:
//             case callTypes.inboundTypeCCE:
//             case callTypes.inboundTypeCCX:
//                 reason = 'Inbound';
//                 break;
//             case callTypes.outboundType:
//             case callTypes.outboundType2:
//                 reason = 'Outbound';
//                 break;
//             case callTypes.consultType:
//                 reason = 'Consult';
//                 break;
//             case callTypes.directTransferTypeCCE:
//             case callTypes.directTransferTypeCCX:
//             case callTypes.consultTransferTypeCCE:
//             case callTypes.consultTransferTypeCCX:
//                 if(finesseFlavor == "UCCE" && callType == callTypes.directTransferTypeCCE)
//                     reason = 'Direct Transfer';
//                 else if(finesseFlavor == "UCCX" && callType == callTypes.directTransferTypeCCX)
//                     reason = 'Direct Transfer';
//                 else if(finesseFlavor == "UCCE" && callType == callTypes.consultTransferTypeCCE)
//                     reason = 'Consult Transfer';
//                 else if(finesseFlavor == "UCCX" && callType == callTypes.consultTransferTypeCCX)
//                     reason = 'Consult Transfer';
//                 break;
//             case callTypes.conferenceType:
//                 reason = 'Conference';
//                 break;
//             case callTypes.outboundCampaignType:
//             case callTypes.outboundCampaignCallbackCCEType1:
//             case callTypes.outboundCampaignCallbackCCEType2:
//             case callTypes.outboundPreviewCampaignTypeCCX:
//             case callTypes.outboundPreviewCampaignTypeCCE:
//             case callTypes.outboundPreviewCampaignCallbackCCEType1:
//             case callTypes.outboundPreviewCampaignCallbackCCEType2:
//                 reason = 'Outbound Campaign';
//                 break;
//             case callTypes.silentMonitorType:
//                 reason = 'Silent Monitor';
//                 break;
//             case callTypes.bargeInTypeCCX:
//             case callTypes.bargeInTypeCCE:
//                 reason = 'Barge In';
//                 break;
//         }
//         return reason;
//     }catch(err){
//         console.error(err);
//     }
// }



// async function loadWrapper() {
//     let scriptPromise = new Promise((resolve, reject) => {
//         console.log('resolving promise...');
//         this.loadScript();
//     });
//     scriptPromise.then(console.log("Script loaded")).catch("Script loading failed")
// }

// function loadScript() {
//     console.log('preparing to load...')
//     let node = document.createElement('script');
//     node.src = config.wrapperFile;
//     node.type = 'text/javascript';
//     node.async = true;
//     node.charset = 'utf-8';
//     document.getElementsByTagName('head')[0].appendChild(node);
// }
