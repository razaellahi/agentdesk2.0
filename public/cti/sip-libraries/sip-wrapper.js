// FS_JS Version 3.7_f-CCC-1864        // 3.9 (Tag)
//Sip.js Version 0.21.2

// Initialize an object to keep track of function locks
const functionLocks = {};
let canCallFunction = true;
let callendDialogId;
// var endcal = false;
let calls = [];
let consultSessioin;
let userAgent;
let registerer;
let again_register = false;
let sessionall = null;
let remotesession = null;
let loginid = null;
// var wrapupenabler = null;
let agentInfo = false;
let callbackFunction = null;
let remote_stream;
let local_stream;
let call_variable_array = {};
let dialogStatedata = null;
let invitedata = null;
let outboundDialingdata = null;
let consultCalldata = null;
let sipconfig = sipConfig;
let mySessionDescriptionHandlerFactory = null
let globalEventCallback = null
let pendingEventNotification = null
let isPendingEventNotification = false;
let dummyAudioErrorReason = null
let dummyVideoErrorReason = null


// var remoteVideo = document.getElementById('remoteVideo');
// var localVideo = document.getElementById('localVideo');

const dialogStatedata1 = {
    "event": "dialogState",
    "response": {
        "loginId": null,
        "dialog": {
            "id": null,
            "fromAddress": null,
            "dialedNumber": null,
            "customerNumber": null,
            "dnis": null,
            "serviceIdentifier": null,
            "callType": null,
            "ani": null,
            "wrapUpReason": null,
            "wrapUpItems": null,
            "callEndReason": null,
            "queueName": null,
            "queueType": null,
            "associatedDialogUri": null,
            "secondaryId": null,
            "participants": [
                {
                    "actions": {
                        "action": [
                            "TRANSFER_SST",
                            "HOLD",
                            "SEND_DTMF",
                            "DROP"
                        ]
                    },
                    "mediaAddress": null,
                    "mediaAddressType": "SIP.js/0.21.2-CTI/Expertflow",
                    "startTime": null,
                    "alertingTime" : null,
                    "state": null,
                    "stateCause": null,
                    "stateChangeTime": null,
                    'mute': false

                },
            ],
            "callVariables": {
                "CallVariable": []
            },
            "state": null,
            "isCallAlreadyActive": false,
            "callbackNumber": null,
            "outboundClassification": null,
            "scheduledCallbackInfo": null,
            "isCallEnded": 0,
            "eventType": "PUT",
            "mediaType": null,
            "channelType": "WEB_RTC",
            "primaryDN": null

        }
    }
}
const outboundDialingdata12 = {
    "event": "outboundDialing",
    "response": {
        "loginId": null,
        "dialog": {
            "id": null,
            "ani": null,
            "customerNumber": null,
            "associatedDialogUri": null,
            "callbackNumber": null,
            "outboundClassification": null,
            "scheduledCallbackInfo": null,
            "isCallEnded": 0,
            "eventType": "PUT",
            "callType": null,
            "queueName": null,
            "queueType": null,
            "dialedNumber": null,
            "dnis": null,
            "serviceIdentifier": null,
            "secondaryId": null,
            "state": "INITIATING",
            "isCallAlreadyActive": false,
            "wrapUpReason": null,
            "wrapUpItems": null,
            "callEndReason": null,
            "fromAddress": null,
            "callVariables": {
                "CallVariable": []
            },
            "participants": [
                {
                    "actions": {
                        "action": [
                            "TRANSFER_SST",
                            "HOLD",
                            "SEND_DTMF",
                            "DROP"
                        ]
                    },
                    "mediaAddress": null,
                    "mediaAddressType": "SIP.js/0.21.2-CTI/Expertflow",
                    "startTime": null,
                    "alertingTime" : null,
                    "state": null,
                    "stateCause": null,
                    "stateChangeTime": null,
                    'mute': false
                },
            ],
            "mediaType": null,
            "channelType": "WEB_RTC",
            "primaryDN": null
        }
    }
}
const ConsultCalldata1 = {
    "event": "ConsultCall",
    "response": {
        "loginId": null,
        "dialog": {
            "id": null,
            "ani": null,
            "customerNumber": null,
            "associatedDialogUri": null,
            "callbackNumber": null,
            "outboundClassification": null,
            "scheduledCallbackInfo": null,
            "isCallEnded": 0,
            "eventType": "PUT",
            "callType": null,
            "queueName": null,
            "queueType": null,
            "dialedNumber": null,
            "dnis": null,
            "serviceIdentifier": null,
            "secondaryId": null,
            "state": "INITIATING",
            "isCallAlreadyActive": false,
            "wrapUpReason": null,
            "wrapUpItems": null,
            "callEndReason": null,
            "fromAddress": null,
            "callVariables": {
                "CallVariable": []
            },
            "participants": [
                {
                    "actions": {
                        "action": [
                            "TRANSFER_SST",
                            "HOLD",
                            "SEND_DTMF",
                            "DROP"
                        ]
                    },
                    "mediaAddress": null,
                    "mediaAddressType": "SIP.js/0.21.2-CTI/Expertflow",
                    "startTime": null,
                    "alertingTime" : null,
                    "state": null,
                    "stateCause": null,
                    "stateChangeTime": null,
                    'mute': false
                },
            ],
            "mediaType": null,
            "channelType": "WEB_RTC",
            "primaryDN": null
        }
    }
}
const invitedata1 = {
    "event": "newInboundCall",
    "response": {
        "loginId": null,
        "dialog": {
            "id": null,
            "ani": null,
            "customerNumber": null,
            "associatedDialogUri": null,
            "callbackNumber": null,
            "outboundClassification": null,
            "scheduledCallbackInfo": null,
            "isCallEnded": 0,
            "eventType": "PUT",
            "callType": null,
            "queueName": null,
            "queueType": null,
            "dialedNumber": null,
            "dnis": null,
            "serviceIdentifier": null,
            "secondaryId": null,
            "state": "ALERTING",
            "isCallAlreadyActive": false,
            "wrapUpReason": null,
            "wrapUpItems": null,
            "callEndReason": null,
            "fromAddress": null,
            "callVariables": {
                "CallVariable": []
            },
            "participants": [
                {
                    "actions": {
                        "action": [
                            "ANSWER",
                        ]
                    },
                    "mediaAddress": null,
                    "mediaAddressType": "SIP.js/0.21.2-CTI/Expertflow",
                    "startTime": null,
                    "alertingTime" : null,
                    "state": null,
                    "stateCause": null,
                    "stateChangeTime": null,
                    'mute': false
                },
            ],
            "mediaType": null,
            "channelType": "WEB_RTC",
            "primaryDN": null
        }
    }
}


const Custompermissions = Promise.all([
    navigator.permissions.query({ name: 'microphone' }),
    navigator.permissions.query({ name: 'camera' })
]).then(async (permissions) => {
    const [microphonePermission, cameraPermission] = permissions;

    // Function to Replace Audio tracks
    const replaceAudioTrackInCalls = async (action) => {
        if (calls?.length > 0) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            for (const call of calls) {
                if (call?.session?.state === SIP.SessionState.Established) {
                    const senders = call.session.sessionDescriptionHandler.peerConnection.getSenders();
                    senders.forEach(async (sender) => {
                        if (sender?.track?.kind === "audio") {
                            console.log("==>> SIPJS CONSOLE => Track Found, replacing it")
                            await sender.replaceTrack(stream.getAudioTracks()[0]);

                            if ((call.response.dialog.participants) && action == "videoPermissionChange") {
                                console.log("==>> SIPJS CONSOLE => Mute the Track")
                                if (call.response.dialog.participants[0].mute) {
                                    phone_mute(globalEventCallback, call.response.dialog.id);
                                } else {
                                    phone_unmute(globalEventCallback, call.response.dialog.id);
                                }
                            }

                            if (action == "audioPermissionChange") {
                                console.log("==>> SIPJS CONSOLE => Mute the Track")
                                if (typeof globalEventCallback === "function") {
                                    phone_mute(globalEventCallback, call.response.dialog.id);
                                }
                            }
                        }
                    });
                }
            }
        }
    };

    // Handler for microphone permission changes
    microphonePermission.onchange = async (e) => {
        console.log("==>> SIPJS CONSOLE => AUDIO PERMISSION CHANGED -> ", e);
        if (e.target.state === "granted") {
            //If Permission is Granted then replace the Track but mute them the Track to make Video & Camera Symmetric
            if (calls?.length > 0) {
                for (const call of calls) {
                    if (call?.session?.state === SIP.SessionState.Established) {
                        let _mediaPermissionStatus = createMediaPermissionStatusUpdateEvent(call.response.dialog.id, "microphone", "granted", null);
                        globalEventCallback(_mediaPermissionStatus);
                    }
                }
            }
            await replaceAudioTrackInCalls("audioPermissionChange");
        }
        // else if (e.target.state === 'denied' && calls?.[0]?.session?.state === SIP.SessionState.Established) {
        else if (e.target.state === 'denied' || e.target.state === 'prompt') {
            console.error("==>> SIPJS CONSOLE => ERROR: Microphone permission denied. Please enable.");
            if (typeof globalEventCallback === "function") {
                error("generalError", loginid, checkErrorReason("Microphone_denied"), globalEventCallback);
                if (calls?.length > 0) {
                    for (const call of calls) {
                        if (call?.session?.state === SIP.SessionState.Established) {
                            let _mediaPermissionStatus = createMediaPermissionStatusUpdateEvent(call.response.dialog.id, "microphone", "denied", checkErrorReason("Microphone_denied"));
                            globalEventCallback(_mediaPermissionStatus);
                        }
                    }
                }
            }
        }
    };

    // Handler for camera permission changes
    cameraPermission.onchange = async (e) => {
        console.log("==>> SIPJS CONSOLE => VIDEO PERMISSION CHANGED -> ", e);
        if (e.target.state === 'granted') {
            //If Permission is Granted then replace the Track but mute them the Track to make Video & Camera Symmetric
            if (typeof globalEventCallback === "function") {
                if (calls?.length > 0) {
                    for (const call of calls) {
                        if (call?.session?.state === SIP.SessionState.Established) {
                            var _mediaPermissionStatus = createMediaPermissionStatusUpdateEvent(call.response.dialog.id, "video", "granted", null);
                            globalEventCallback(_mediaPermissionStatus);
                        }
                    }
                }
            }
        }
        // || e.target.state === 'prompt'
        if (e.target.state === 'denied') {
            console.error("==>> SIPJS CONSOLE => ERROR: Camera permission denied. Please enable.");
            if (typeof globalEventCallback === "function") {
                error("generalError", loginid, checkErrorReason("Camera_denied"), globalEventCallback);
                if (calls?.length > 0) {
                    for (const call of calls) {
                        if (call?.session?.state === SIP.SessionState.Established) {

                            if (call.additionalDetail.localMediaType != "audio") {
                                publishMediaStreamUpdateEvent(call.response.dialog.id, call.additionalDetail.localMediaType, "off", globalEventCallback)
                            }
                            var _mediaPermissionStatus = createMediaPermissionStatusUpdateEvent(call.response.dialog.id, "video", "denied", checkErrorReason("Camera_denied"));
                            globalEventCallback(_mediaPermissionStatus);
                        }
                    }
                }
            }
        }
        if (microphonePermission.state === "granted") {
            // if permission is provided then check current call state, if muted then mute it else dont mute it.
            await replaceAudioTrackInCalls("videoPermissionChange");
        }
    };
});




/**
 * Custom Media Stream Factory
 * This factory function is used by the UserAgent to fetch audio, video, or screen sharing streams from the browser.
 *
 * @param {Object} constraints - The media constraints specifying what kind of media stream is required.
 * @param {Object} sessionDescriptionHandler - The session description handler for the media session.
 * @returns {Promise<MediaStream>} - A promise that resolves to the requested media stream.
 */
const myMediaStreamFactory = async (constraints, sessionDescriptionHandler) => {
    // Set default values for constraints
    constraints.audio = constraints.audio ?? true;
    constraints.video = constraints.video ?? false;

    // Validate required constraints
    if (!constraints.action) {
        return handleConstraintsError("Constraint action is not defined.");
    }
    if (!constraints.mediaType) {
        return handleConstraintsError("Constraint mediaType is not defined.");
    }

    let mediaStream = new MediaStream();

    // Handle different actions and media types
    switch (constraints.action) {
        case "CALL_INITIATE":
            mediaStream = await handleCallInitiate(constraints);
            break;

        case "CALL_ANSWER":
            mediaStream = await handleCallAnswer(constraints);
            break;

        default:
            console.error("==>> SIPJS CONSOLE => Unknown action type.");
            return Promise.reject(new Error("Unknown action type."));
    }

    return Promise.resolve(mediaStream);
};

/**
 * Event object for media conversion
 * This event is received when the UserAgent turns video/screen share stream on or off.
 */
let mediaStreamUpdate = {
    "event": "mediaStreamUpdate",
    "status": null,
    "loginId": "",
    "dialog": {
        "id": null,
        "eventRequest" : null,
        "stream" : null,
        "streamStatus" :null,
        "errorReason" : null,
        "timeStamp" : null
    }
}

let mediaPermissionStatus = {
    "event": "mediaPermissionStatus",
    "loginId": "",
    "dialog": {
        "errorReason": "",
        "permissionType": "microphone",  // microphone / video
        "permissionStatus": "granted",   // granted / denied
        "timeStamp": null
    }
}

let inviteDelegate = {
    onAck(ack) {
        console.log("==>> SIPJS CONSOLE => onAck MESSAGE : ", ack)
    },
    onBye(bye) {
        console.log("==>> SIPJS CONSOLE => onBye MESSAGE : ", bye)

        var _session = calls[0]
        if (_session && _session.event && _session.response && _session.response.dialog.callEndReason != "EXTERNAL_ATTENDED_TRANSFER") {
            if (bye.incomingByeRequest.message.headers["X-Call-Dropped-Custom-Reason"] != undefined) {
                _session.response.dialog.callEndReason = bye.incomingByeRequest.message.headers["X-Call-Dropped-Custom-Reason"][0]['raw'];
            }
            else {
                const match = bye.incomingByeRequest.message.data.match(/text="([^"]+)"/);
                if (match && match[1]) {
                    _session.response.dialog.callEndReason = match[1];
                }
            }

            // Special Case of External Consult Transfer
            // This will fail if Consult is Ended before Inbound Call.
            const tempConsultCall = calls[1]?.response?.dialog;

            if (_session.response.dialog.callEndReason === "ATTENDED_TRANSFER" && tempConsultCall?.callType === "EXTERNAL-CONSULT") {
                _session.response.dialog.callEndReason = "EXTERNAL_ATTENDED_TRANSFER";
            }

        }
    },
    // onCancel(cancel ){console.log("onCancel MESSAGE  ********  ", cancel)},
    // onInfo(info ) {console.log("onInfo MESSAGE  ********  ", info)},
    // onInvite(reqeust , response , statusCode ){console.log("onInvite MESSAGE  ********  ", reqeust,response,statusCode)},
    // onMessage(message ){console.log("onMessage MESSAGE  ********  ", message)},
    // onRefer(referral){console.log("onRefer MESSAGE  ********  ", referral)},
    // onNotify(notification){console.log("onNotify MESSAGE  ********  ", notification)}
}

let registrationDelegate = {
    onAccept(response) {
        console.log("==>> SIPJS CONSOLE => User Ext Registration onAccept ->", response)
    },
    onProgress(response) {
        console.log("==>> SIPJS CONSOLE => User Ext Registration onProgress ->", response)
    },
    onRedirect(response) {
        console.log("==>> SIPJS CONSOLE => User Ext Registration onRedirect ->", response)
    },
    onReject(response) {
        console.log("==>> SIPJS CONSOLE => User Ext Registration onReject ->", response)
        registrationFailed(response)
    },
    onTrying(response) {
        console.log("==>> SIPJS CONSOLE => User Ext Registration onTrying ->", response)
    }

}


function postMessages(obj, callback) {
    console.log("==>> SIPJS CONSOLE => Object received in postMessages : ", obj);
    if (Object.keys(sipconfig).length === 0) sipconfig = sipConfig;
    switch (obj.action) {
        case 'login':
            // if a callback function has been passed then we add the refereance to the EventEmitter class
            if (typeof obj.parameter.clientCallbackFunction === 'function') {
                if (sipconfig.uri !== null && sipconfig.uri !== undefined) {
                    if (obj.parameter.domain && obj.parameter.domain != null && obj.parameter.domain != undefined && obj.parameter.domain != "") {
                        sipconfig.uri = obj.parameter.domain
                    }
                    if (obj.parameter.wssUrl && obj.parameter.wssUrl != null && obj.parameter.wssUrl != undefined && obj.parameter.wssUrl != "") {
                        sipconfig.wss = obj.parameter.wssUrl
                    }
                    connect_useragent(obj.parameter.extension, sipconfig.uri, sipconfig.agentStaticPassword, sipconfig.wss, sipconfig.enable_sip_log, obj.parameter.clientCallbackFunction);
                    callbackFunction = obj.parameter.clientCallbackFunction;
                    globalEventCallback = obj.parameter.clientCallbackFunction;
                } else {
                    error("generalerror", obj.parameter.extension, checkErrorReason('Uri_Error'), obj.parameter.clientCallbackFunction);
                }
            }
            break;
        case 'logout':
            return loader3(obj.parameter.clientCallbackFunction);
        case 'makeCall':  //CustomerWidget
            initiate_call(obj.parameter.calledNumber, obj.parameter.Destination_Number, obj.parameter.callType, obj.parameter.clientCallbackFunction, "OUT", "0000");
            break;
        case 'makeOBCall':  //Manual OB
            initiate_call(obj.parameter.calledNumber, obj.parameter.Destination_Number, obj.parameter.callType, obj.parameter.clientCallbackFunction, "MANUAL_OUT", "0000");
            break;
        case 'SST':
            blind_transfer(obj.parameter.numberToTransfer, obj.parameter.clientCallbackFunction, obj.parameter.dialogId);
            break;
        case 'SST_Queue':
            blind_transfer_queue(obj.parameter.numberToTransfer, obj.parameter.queue, obj.parameter.queueType, obj.parameter.clientCallbackFunction, obj.parameter.dialogId);
            break;
        case 'makeConsult':
            makeConsultCall(obj.parameter.numberToConsult, obj.parameter.clientCallbackFunction);
            break;
        case 'makeConsultQueue':
            makeConsultCall_queue(obj.parameter.numberToTransfer, obj.parameter.queue, obj.parameter.queueType, obj.parameter.clientCallbackFunction);
            break;
        case 'consultTransfer':
            makeConsultTransferCall(obj.parameter.clientCallbackFunction);
            break;
        case 'silentMonitor':
            initiate_call(obj.parameter.calledNumber, obj.parameter.Destination_Number, obj.parameter.callType, obj.parameter.clientCallbackFunction, "MONITORING", obj.parameter.service_Identifier);
            break;
        case 'answerCall':
            respond_call(obj.parameter.clientCallbackFunction, obj.parameter.dialogId, obj.parameter.answerCalltype);
            break;
        case 'releaseCall':
            terminate_call(obj.parameter.dialogId);
            break;
        case 'rejectCall':
            // Preview Reject → SIP 603 / CALL_REJECTED → dialer AGENT_REJECTED
            // Preview Skip   → SIP 606 / INCOMPATIBLE_DESTINATION → dialer AGENT_SKIP
            reject_call(obj.parameter.dialogId, obj.parameter.reason);
            break;
        case 'closeCall':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED closeCall !!');
            break;
        case 'end_call':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED end_call !!');
            break;
        case 'holdCall':
            phone_hold(obj.parameter.clientCallbackFunction, obj.parameter.dialogId);
            break;
        case 'retrieveCall':
            phone_unhold(obj.parameter.clientCallbackFunction, obj.parameter.dialogId);
            break;
        case 'mute_call':
            phone_mute(obj.parameter.clientCallbackFunction, obj.parameter.dialogId);
            break;
        case 'unmute_call':
            phone_unmute(obj.parameter.clientCallbackFunction, obj.parameter.dialogId);
            break;
        case 'pauseRecording':
            pauseOrResumeRecording('pause', obj.parameter, obj.parameter.clientCallbackFunction);
            break;
        case 'resumeRecording':
            pauseOrResumeRecording('resume', obj.parameter, obj.parameter.clientCallbackFunction);
            break;
        case 'conferenceCall':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED conferenceCall !!');
            break;
        case 'makeNotReadyWithReason':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED makeNotReadyWithReason !!');
            break;
        case 'makeReady':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED makeReady !!');
            break;
        case 'makeWorkReady':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED makeWorkReady !!');
            break;
        case 'getDialog':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED getDialog !!');
            break;
        case 'getWrapUpReasons':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED getWrapUpReasons !!');
            break;
        case 'updateCallVariableData':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED updateCallVariableData !!');
            break;
        case 'updateWrapupData':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED updateWrapupData !!');
            break;
        case 'acceptCall':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED acceptCall !!');
            break;
        case 'dropParticipant':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED dropParticipant !!');
            break;
        case 'bargeIn':
            initiate_BargeIn(obj.parameter.dialogId, obj.parameter.clientCallbackFunction)
            break;
        case 'SendDtmf':
            sendDtmf(obj.parameter.message, obj.parameter.dialogId, obj.parameter.clientCallbackFunction);
            break;
        case 'team_agent_update_status':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED team_agent_update_status !!');
            break;
        case 'team_agent_update_state':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED team_agent_update_state !!');
            break;
        case 'team_agent_update_reg':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED team_agent_update_reg !!');
            break;
        case 'getState':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED getState !!');
            break;
        case 'getNotReadyLogoutReasons':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED getNotReadyLogoutReasons !!');
            break;
        case 'getTeamUsers':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED getTeamUsers !!');
            break;
        case 'getQueues':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED getQueues !!');
            break;
        case 'getUserPhoneBook':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED getUserPhoneBook !!');
            break;
        case 'scheduleCallback':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED scheduleCallback !!');
            break;
        case 'unsubscribeTeam':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED unsubscribeTeam !!');
            break;
        case 'getSSOToken':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED getSSOToken !!');
            break;
        case 'reclassifyDialog':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED reclassifyDialog !!');
            break;
        case 'registerCallback':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED registerCallback !!');
            break;
        case 'agentState':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED agentState !!');
            break;
        case 'notReadyLogoutReasonCode':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED notReadyLogoutReasonCode !!');
            break;
        case 'wrapupReasons':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED wrapupReasons !!');
            break;
        case 'teamUsersList':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED teamUsersList !!');
            break;
        case 'teamEvent':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED teamEvent !!');
            break;
        case 'queueList':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED queueList !!');
            break;
        case 'phoneBookList':
            console.warn('==>> SIPJS CONSOLE => NOT SUPPORTED phoneBookList !!');
            break;
        case 'convertCall':
            callConvert(obj.parameter.dialogId, obj.parameter.clientCallbackFunction, obj.parameter.streamType, obj.parameter.streamStatus)
            break
        case 'conference_consult' :
            initiate_consult_Conference(obj.parameter.dialogId, obj.parameter.clientCallbackFunction)
            break
        default:
            console.error(`==>> SIPJS CONSOLE => NOT SUPPORTED ${obj.action} !!`);
            break;

    }
}



/**
 * Establish a SIP connection for the user agent.
 * This function sets up the SIP configuration and initiates the connection process.
 *
 * @param {string} extension - The user's extension number.
 * @param {string} sip_uri - The URI for the SIP server.
 * @param {string} sip_password - The password for the SIP account.
 * @param {string} wss - The WebSocket Secure URL for the SIP connection.
 * @param {function} sip_log - A logging flag or function for SIP events.
 * @param {function} callback - A callback function to execute after attempting the connection.
 * @returns {void}
 */
function connect_useragent(extension, sip_uri, sip_password, wss, sip_log, callback) {
    //


    var res = lockFunction("connect_useragent", 500); // --- seconds cooldown
    if (!res) return;
    const undefinedParams = checkUndefinedParams(connect_useragent, [extension, sip_uri, sip_password, wss, sip_log, callback]);

    if (undefinedParams.length > 0) {
        // console.log(`Error: The following parameter(s) are undefined or null: ${undefinedParams.join(', ')}`);
        error("generalError", extension, `Error: The following parameter(s) are undefined or null or empty: ${undefinedParams.join(', ')}`, callback);
        return;
    }
    const uri = SIP.UserAgent.makeURI("sip:" + extension + "@" + sip_uri);
    if (!uri) {
        // Failed to create URI
    }
    mySessionDescriptionHandlerFactory = SIP.Web.defaultSessionDescriptionHandlerFactory(myMediaStreamFactory);
    // if (!ua) {
    var config = {
        uri: uri,
        authorizationUsername: extension,
        authorizationPassword: sip_password,
        sessionDescriptionHandlerFactory: mySessionDescriptionHandlerFactory,    // for Custom Media Stream Factory i.e for Screen Sharing
        transportOptions: {
            server: wss, // wss Protocol
        },
        extraContactHeaderParams: ['X-Referred-By-Someone: Username'],
        extraHeaders: ['X-Referred-By-Someone12: Username12'],
        contactParams: { transport: "wss" },
        contactName: extension,
        /**
* If true, a first provisional response after the 100 Trying will be sent automatically if UAC does not
* require reliable provisional responses.
* defaultValue `true`
*/
        sendInitialProvisionalResponse: true,
        refreshFrequency: 5000,
        delegate: {
            onTransportMessage: (message) => {
                console.log("==>> SIPJS CONSOLE => SIP Transport message received: ", message);
                // Handle the SIP transport message here
                // You can access the message content and headers
            },
            onConnect: () => {
                console.log("==>> SIPJS CONSOLE => Network connectivity established");
                var event = {
                    "event": "xmppEvent",
                    "response": {
                        "loginId": extension,
                        "type": "IN_SERVICE",
                        "description": "Connected"
                    }
                };
                const eventCopy = JSON.parse(JSON.stringify(event));
                callback(eventCopy);
                SendPostMessage(eventCopy);
                if (again_register) {
                    // setupRemoteMedia(sessionall);
                    //    if(dialogStatedata.response.dialog.state=="ACTIVE")
                    //    terminate_call();
                    registerer.register({
                        requestDelegate: registrationDelegate
                    })
                        .then((request) => {
                            console.log("==>> SIPJS CONSOLE => Successfully sent REGISTER request : ", request);
                            // if(dialogStatedata.response.dialog.state=="ACTIVE")
                            // terminate_call();
                            again_register = false
                        })
                        .catch((error) => {
                            console.error("==>> SIPJS CONSOLE => Failed to send REGISTER ->", error);
                        });
                }
            },
            onDisconnect: (errorr) => {
                again_register = true;
                console.log("==>> SIPJS CONSOLE => Network connectivity lost -> ", errorr);
                // Intentional UserAgent.stop() (Agent Desk logout) has no error.
                if (!errorr) {
                    console.log("==>> SIPJS CONSOLE => User agent stopped");
                    var event = {
                        "event": "agentInfo",
                        "response": {
                            "loginId": extension,
                            "extension": extension,
                            "state": "LOGOUT",
                            "cause": null
                        }
                    };
                    const eventCopy = JSON.parse(JSON.stringify(event));
                    callback(eventCopy);
                    SendPostMessage(eventCopy);
                    return;
                }
                // Network/server drop only — do NOT un-REGISTER here.
                // SIP registration must stay until Agent Desk logout (loader3).
                console.log('==>> SIPJS CONSOLE => Only attempt to reconnect if network/server dropped the connection', errorr);
                var outOfServiceEvent = {
                    "event": "xmppEvent",
                    "response": {
                        "loginId": extension,
                        "type": "OUT_OF_SERVICE",
                        "description": errorr.message
                    }
                };
                const outOfServiceCopy = JSON.parse(JSON.stringify(outOfServiceEvent));
                callback(outOfServiceCopy);
                SendPostMessage(outOfServiceCopy);
                attemptReconnection();
            },
            onInvite: (invitation) => {
                console.log("==>> SIPJS CONSOLE => INVITE received", invitation);

                // check to make sure its the only incomnig call
                if (calls[0] != undefined) {
                    console.log("==>> SIPJS CONSOLE => CALL ALREADY EXISTS, so Dropping the Incoming call")
                    terminateIncomingCall(invitation)
                    return
                }

                invitedata = JSON.parse(JSON.stringify(invitedata1));

                var sip_from = invitation.incomingInviteRequest.message.headers.From[0].raw.split(" <")
                var variablelist = sip_from[0].substring(1, sip_from[0].length - 1).split("|")
                const sysdate = new Date();
                var datetime = sysdate.toISOString();

                var dnis = sip_from[1].split(">;")[0]


                dialedNumber = invitation.incomingInviteRequest.message.headers["X-Destination-Number"];
                dialedNumber = dialedNumber != undefined ? dialedNumber[0].raw : loginid;

                /***
                 * Fetching MediaType from an incoming Request
                 * normal = Call coming from anywhere except Customer SDK
                 * webrtc = Call coming from Customer SDK
                 *
                 * Incase of Consult incomingCallSource = normal
                 */

                var incomingCallSource = ""
                var incomingMediaType = invitation.incomingInviteRequest.message.headers["X-Media-Type"];
                if (incomingMediaType != undefined) {
                    incomingMediaType = incomingMediaType[0].raw;
                    incomingCallSource = "WEB_RTC"
                }
                else {
                    var sdp = invitation.incomingInviteRequest.message.body;
                    if ((/\r\nm=audio /).test(sdp)) {
                        incomingMediaType = "audio";
                    }

                    // if ((/\r\nm=video /).test(sdp)) {
                    //     incomingMediaType = "video";
                    //     }
                    incomingCallSource = "VOICE"
                }

                call_variable_array = [];
                // Code for call variables
                // if (variablelist.length === 1) {
                //     if (variablelist[0].replace(/['"]+/g, '') == 'conference') {

                //         call_variable_array.push({
                //             "name": 'callVariable0',
                //             "value": ''
                //         })
                //         for (let index = 1; index < 10; index++) {
                //             if (invitation.incomingInviteRequest.message.headers['X-Call-Variable' + index]) {
                //                 call_variable_array.push({
                //                     "name": 'callVariable' + index,
                //                     "value": invitation.incomingInviteRequest.message.headers['X-Call-Variable' + index][0]['raw']
                //                 })
                //                 // call_variable_array['call_variable'+index]=session.request.headers['X-Call-Variable'+index][0]['raw']
                //             }
                //         }
                //     } else if (/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(variablelist[0].replace(/['"]+/g, ''))) {
                //         // call_variable_array['call_variable0'] = variablelist[0].replace(/['"]+/g, '');
                //         call_variable_array.push({
                //             "name": 'callVariable0',
                //             "value": variablelist[0].replace(/['"]+/g, '')
                //         })
                //         wrapupenabler = true;
                //     } else {
                //         // call_variable_array['call_variable0'] = session.request.headers['X-Call-Variable0'][0]['raw'];
                //         call_variable_array.push({
                //             "name": 'callVariable0',
                //             "value": invitation.incomingInviteRequest.message.headers['X-Call-Variable0'][0]['raw']
                //         })
                //         for (let index = 1; index < 10; index++) {
                //             if (invitation.incomingInviteRequest.message.headers['X-Call-Variable' + index]) {
                //                 call_variable_array.push({
                //                     "name": 'callVariable' + index,
                //                     "value": invitation.incomingInviteRequest.message.headers['X-Call-Variable' + index][0]['raw']
                //                 })
                //                 // call_variable_array['call_variable'+index]=session.request.headers['X-Call-Variable'+index][0]['raw']
                //             }
                //         }
                //     }
                // } else {
                //     if (/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(variablelist[0].replace(/['"]+/g, ''))) {
                //         // call_variable_array['call_variable0'] = variablelist[0].replace(/['"]+/g, '');
                //         call_variable_array.push({
                //             "name": 'callVariable0',
                //             "value": variablelist[0].replace(/['"]+/g, '')
                //         })
                //         wrapupenabler = true;
                //     }
                //     for (let index = 1; index < variablelist.length; index++) {
                //         call_variable_array.push({
                //             "name": 'callVariable' + index,
                //             "value": variablelist[index]
                //         })
                //     }

                // }
                dialogStatedata = JSON.parse(JSON.stringify(dialogStatedata1))
                if (invitation.incomingInviteRequest) {
                    dialogStatedata.event = "dialogState";
                    invitedata.event = "newInboundCall";
                    if (invitation.incomingInviteRequest.message.from._displayName === 'conference') {
                        dialogStatedata.response.dialog.callType = 'conference';
                        invitedata.response.dialog.callType = 'conference';

                    } else if (invitation.incomingInviteRequest.message.headers["X-Calltype"] !== undefined) {
                        var calltype = invitation.incomingInviteRequest.message.headers["X-Calltype"][0].raw;
                        if (calltype == "PROGRESSIVE" || calltype == "PREDICTIVE") {
                            dialogStatedata.response.dialog.callType = "OUTBOUND";
                            invitedata.response.dialog.callType = "OUTBOUND";
                            dialogStatedata.event = "campaignCall";
                            invitedata.event = "campaignCall";
                            if (calltype == "PREDICTIVE") {
                                dialogStatedata.response.dialog.dialMode = "PREDICTIVE";
                                invitedata.response.dialog.dialMode = "PREDICTIVE";
                            }
                            setTimeout(() => {
                                respond_call(callback, dialogStatedata.response.dialog.id, incomingMediaType)
                            }, sipconfig.autoCallAnswer * 1000);
                        }
                        else if (calltype == "PREVIEW") {
                            dialogStatedata.response.dialog.callType = "OUTBOUND";
                            invitedata.response.dialog.callType = "OUTBOUND";
                            dialogStatedata.event = "campaignCall";
                            invitedata.event = "campaignCall";
                            dialogStatedata.response.dialog.dialMode = "PREVIEW";
                            invitedata.response.dialog.dialMode = "PREVIEW";
                            // no auto-answer: the agent accepts the call manually
                        }
                        else if (calltype == "CONSULT") {
                            dialogStatedata.response.dialog.callType = "CONSULT";
                            invitedata.response.dialog.callType = "CONSULT";
                            dialogStatedata.event = "ConsultCall";
                            invitedata.event = "ConsultCall";
                        }
                        else if (calltype == "MONITORING") {
                            dialogStatedata.response.dialog.callType = "MONITORING";
                            invitedata.response.dialog.callType = "MONITORING";
                            dialogStatedata.event = "MONITORING";
                            invitedata.event = "MONITORING";
                        }
                        else if (calltype == "OUT") {
                            dialogStatedata.response.dialog.callType = 'OTHER_IN'
                            invitedata.response.dialog.callType = 'OTHER_IN';
                        }
                        else {
                            // unrecognised X-Calltype, fall back rather than leaving callType null
                            dialogStatedata.response.dialog.callType = 'OTHER_IN'
                            invitedata.response.dialog.callType = 'OTHER_IN';
                        }
                    }
                    else {
                        dialogStatedata.response.dialog.callType = 'OTHER_IN'
                        invitedata.response.dialog.callType = 'OTHER_IN';

                    }
                }
                var queuenameval = invitation.incomingInviteRequest.message.headers["X-Queue"] != undefined ? invitation.incomingInviteRequest.message.headers["X-Queue"][0]['raw'] : "Nil";
                var queuetypeval = invitation.incomingInviteRequest.message.headers["X-Queuetype"] != undefined ? invitation.incomingInviteRequest.message.headers["X-Queuetype"][0]['raw'] : "Nil";
                dialogStatedata.response.dialog.callVariables.CallVariable = call_variable_array;
                dialogStatedata.response.loginId = loginid;
                dialogStatedata.response.dialog.id = invitation.incomingInviteRequest.message.headers["X-Call-Id"] != undefined ? invitation.incomingInviteRequest.message.headers["X-Call-Id"][0]['raw'] : invitation.incomingInviteRequest.message.headers["Call-ID"][0]['raw'];
                dialogStatedata.response.dialog.ani = dnis.split('sip:')[1].split('@')[0];
                dialogStatedata.response.dialog.fromAddress = dnis.split('sip:')[1].split('@')[0];
                dialogStatedata.response.dialog.customerNumber = dnis.split('sip:')[1].split('@')[0];
                dialogStatedata.response.dialog.participants[0].mediaAddress = loginid;
                dialogStatedata.response.dialog.dnis = dialedNumber;
                dialogStatedata.response.dialog.serviceIdentifier = dialedNumber;
                //dialogStatedata.response.dialog.participants[0].startTime = datetime;
                dialogStatedata.response.dialog.participants[0].stateChangeTime = datetime;
                dialogStatedata.response.dialog.participants[0].alertingTime = datetime;
                dialogStatedata.response.dialog.participants[0].state = "ALERTING";
                dialogStatedata.response.dialog.state = "ALERTING";
                dialogStatedata.response.dialog.dialedNumber = dialedNumber;
                dialogStatedata.response.dialog.queueName = queuenameval == "Nil" ? null : queuenameval;
                dialogStatedata.response.dialog.queueType = queuetypeval == "Nil" ? null : queuetypeval;

                dialogStatedata.response.dialog.mediaType = incomingMediaType
                dialogStatedata.response.dialog.channelType = incomingCallSource

                invitedata.response.dialog.callVariables.CallVariable = call_variable_array;
                invitedata.response.loginId = loginid;
                invitedata.response.dialog.dnis = dialedNumber;
                invitedata.response.dialog.serviceIdentifier = dialedNumber;
                invitedata.response.dialog.id = invitation.incomingInviteRequest.message.headers["X-Call-Id"] != undefined ? invitation.incomingInviteRequest.message.headers["X-Call-Id"][0]['raw'] : invitation.incomingInviteRequest.message.headers["Call-ID"][0]['raw'];
                invitedata.response.dialog.ani = dnis.split('sip:')[1].split('@')[0];
                invitedata.response.dialog.fromAddress = dnis.split('sip:')[1].split('@')[0];
                invitedata.response.dialog.customerNumber = dnis.split('sip:')[1].split('@')[0];
                invitedata.response.dialog.participants[0].mediaAddress = loginid;
                // invitedata.response.dialog.participants[0].startTime = datetime;
                invitedata.response.dialog.participants[0].alertingTime = datetime;
                invitedata.response.dialog.participants[0].stateChangeTime = datetime;
                invitedata.response.dialog.participants[0].state = "ALERTING";
                invitedata.response.dialog.state = "ALERTING";
                invitedata.response.dialog.dialedNumber = dialedNumber;
                invitedata.response.dialog.queueName = queuenameval == "Nil" ? null : queuenameval;
                invitedata.response.dialog.queueType = queuetypeval == "Nil" ? null : queuetypeval;

                invitedata.response.dialog.mediaType = incomingMediaType
                invitedata.response.dialog.channelType = incomingCallSource

                if (invitedata.additionalDetail) {
                    invitedata.additionalDetail.remoteVideoDisplay = incomingMediaType == "audio" ? false : true
                    if (incomingCallSource == "VOICE") {
                        invitedata.additionalDetail.remoteMediaType = "audio"
                    }
                    else {
                        invitedata.additionalDetail.remoteMediaType = incomingMediaType
                    }
                    invitedata.additionalDetail.localMediaType = incomingMediaType
                }
                else {
                    var _remoteVideoType = ""
                    if (incomingCallSource == "VOICE") {
                        _remoteVideoType = "audio"
                    }
                    else {
                        _remoteVideoType = incomingMediaType
                    }
                    invitedata.additionalDetail = {
                        remoteVideoDisplay: incomingMediaType == "audio" ? false : true,
                        remoteMediaType: _remoteVideoType,
                        localMediaType: incomingMediaType
                    }
                }

                if (dialogStatedata.response.dialog.callType == "CONSULT") {
                    dialogStatedata.response.dialog.customerNumber = invitation.incomingInviteRequest.message.headers["X-Customernumber"] != undefined ? invitation.incomingInviteRequest.message.headers["X-Customernumber"][0]['raw'] : "0000";
                    dialogStatedata.response.dialog.serviceIdentifier = invitation.incomingInviteRequest.message.headers["X-Destination-Number"] != undefined ? invitation.incomingInviteRequest.message.headers["X-Destination-Number"][0]['raw'] : "0000";
                    dialogStatedata.response.dialog.dialedNumber = invitation.incomingInviteRequest.message.headers["X-Destination-Number"] != undefined ? invitation.incomingInviteRequest.message.headers["X-Destination-Number"][0]['raw'] : "0000";
                    dialogStatedata.response.dialog.channelType = "VOICE"
                    dialogStatedata.response.dialog.mediaType = "audio"

                    invitedata.response.dialog.customerNumber = invitation.incomingInviteRequest.message.headers["X-Customernumber"] != undefined ? invitation.incomingInviteRequest.message.headers["X-Customernumber"][0]['raw'] : "0000";
                    invitedata.response.dialog.serviceIdentifier = invitation.incomingInviteRequest.message.headers["X-Destination-Number"] != undefined ? invitation.incomingInviteRequest.message.headers["X-Destination-Number"][0]['raw'] : "0000";
                    invitedata.response.dialog.dialedNumber = invitation.incomingInviteRequest.message.headers["X-Destination-Number"] != undefined ? invitation.incomingInviteRequest.message.headers["X-Destination-Number"][0]['raw'] : "0000";
                    invitedata.response.dialog.channelType = "VOICE"
                    invitedata.response.dialog.mediaType = "audio"
                }

                if (dialogStatedata.response.dialog.channelType == "WEB_RTC") {
                    // for webrtc call replacing ANI with the Number provided by Customer
                    dialogStatedata.response.dialog.customerNumber = invitation.incomingInviteRequest.message.headers["X-Customer-Number"] != undefined ? invitation.incomingInviteRequest.message.headers["X-Customer-Number"][0]['raw'] : dnis.split('sip:')[1].split('@')[0];
                    invitedata.response.dialog.customerNumber = invitation.incomingInviteRequest.message.headers["X-Customer-Number"] != undefined ? invitation.incomingInviteRequest.message.headers["X-Customer-Number"][0]['raw'] : dnis.split('sip:')[1].split('@')[0];
                    // X-Customer-Name
                    // X-Customer-Number
                }

                // Preview only: dialer may send customer display name and campaign name on the agent A-leg INVITE.
                // Do not apply to inbound / progressive / consult — avoids regressions on those paths.
                if (dialogStatedata.response.dialog.dialMode === "PREVIEW") {
                    var previewNameHeader = invitation.incomingInviteRequest.message.headers["X-Customer-Name"]
                        || invitation.incomingInviteRequest.message.headers["X-CustomerName"];
                    if (previewNameHeader && previewNameHeader[0] && previewNameHeader[0].raw) {
                        var previewCustomerName = previewNameHeader[0].raw;
                        try {
                            previewCustomerName = decodeURIComponent(previewCustomerName);
                        } catch (e) {
                            // keep raw value if not URI-encoded
                        }
                        previewCustomerName = (previewCustomerName || "").toString().trim().replace(/^'|'$/g, "");
                        if (previewCustomerName) {
                            dialogStatedata.response.dialog.customerName = previewCustomerName;
                            invitedata.response.dialog.customerName = previewCustomerName;
                        }
                    }

                    var campaignNameHeader = invitation.incomingInviteRequest.message.headers["X-Campaign-Name"]
                        || invitation.incomingInviteRequest.message.headers["X-CampaignName"];
                    if (campaignNameHeader && campaignNameHeader[0] && campaignNameHeader[0].raw) {
                        var previewCampaignName = campaignNameHeader[0].raw;
                        try {
                            previewCampaignName = decodeURIComponent(previewCampaignName);
                        } catch (e) {
                            // keep raw value if not URI-encoded
                        }
                        previewCampaignName = (previewCampaignName || "").toString().trim().replace(/^'|'$/g, "");
                        if (previewCampaignName) {
                            dialogStatedata.response.dialog.campaignName = previewCampaignName;
                            invitedata.response.dialog.campaignName = previewCampaignName;
                        }
                    }
                }

                const data = {}
                data.response = invitedata.response
                data.event = invitedata.event
                const invitedataCopy = JSON.parse(JSON.stringify(data));
                callback(invitedataCopy);
                SendPostMessage(invitedataCopy);
                callendDialogId = invitedata.response.dialog.id;
                var index = getCallIndex(invitedata.response.dialog.id);
                if (index == -1) {
                    invitedata.session = invitation;
                    // making dialogState & InviteData Event same
                    invitedata.event = dialogStatedata.event;
                    calls.push(invitedata);
                }

                remotesession = invitation;
                sessionall = invitation;
                addsipcallback(invitation, 'inbound', callback);
            },
            onAck: (onACk) => {
                console.log("==>> SIPJS CONSOLE => onACk received", onACk);
                //invitation.accept();
            },
            onMessage: (message) => {
                let someMessage = JSON.parse(message.request.body)
                console.log("==>> SIPJS CONSOLE => someMessage RECEIVED : ", someMessage)
                if (someMessage.event && someMessage.dialog && someMessage.dialog.id) {
                    // RECORDING_STATE is informational and may reference a parent dialog id
                    // that is not in this agent's local calls[] (consulted / conference cases).
                    // Forward it regardless of session lookup so the desk can update REC UI.
                    if (someMessage.event === "RECORDING_STATE") {
                        recordingStateEvent(someMessage, callback);
                    } else {
                    var index = getCallIndex(someMessage.dialog.id);
                    var someSession;
                    if (index !== -1) {
                        someSession = calls[index].session;
                    }
                    if (!someSession) {
                        message.accept();
                        return;
                    }
                    // console.log("THIS SESSION EXISTS")
                    // console.log("MESSAGE RECEIVED" , message)
                    switch (someMessage.event) {
                        case "mediaStreamUpdate":
                            someMessage.loginId = loginid
                            mediaStreamUpdateEvent(someMessage, callback)
                            break
                        case "agentDetails":
                            updateAgentDetails(someMessage)
                            break
                        case "MONITORED":
                            callMonitored(someMessage, callback)
                            break
                        case "MONITORING_ENDED":
                            callMonitoringEnded(someMessage, callback)
                            break
                        case "CONFERENCE":
                            conferenceChange(someMessage, callback)
                            break
                        case "CONSULT_TRANSFER":
                            attendedTransferEvent(someMessage, callback)
                            break
                        case "CONSULT_TRANSFER_FAILED":
                            consultTransferFailed(someMessage, callback)
                            break
                        case "CONSULT_CONFERENCE_FAILED":
                            conferenceFailed(someMessage, callback)
                            break
                        case "BARGE_FAILED":
                            conferenceFailed(someMessage, callback)
                            break
                        case "MONITORING_FAILED":
                            monitoringFailed(someMessage, callback)
                            break
                        case "CONFERENCE_MEMBER_HOLD":
                            conferenceMemberHold(someMessage, callback)
                            break
                        case "CONFERENCE_MEMBER_UNHOLD":
                            conferenceMemberUnHold(someMessage, callback)
                            break
                        case "CONFERENCE_MEMBER_MUTE":
                            conferenceMemberMute(someMessage, callback)
                            break
                        case "CONFERENCE_MEMBER_UNMUTE":
                            conferenceMemberUnMute(someMessage, callback)
                            break
                        case "MEDIA_SERVER_CALL_END":
                            customerLeftEndCall(someMessage)
                            break
                        case "USER_BUSY":
                            agentBusyError(someMessage, callback)
                            break
                        default:
                            break
                    }
                    }
                }
                message.accept()
            },
            onNotify: (notification) => {
                console.log("==>> SIPJS CONSOLE => NOTIFY received", notification);
                //notification.accept();
            },
            onRefer: (referral) => {
                console.log("==>> SIPJS CONSOLE => REFER onRefer received");
                //referral.accept();
            },
            onSubscribe: (subscription) => {
                console.log("==>> SIPJS CONSOLE => SUBSCRIBE received");
            },
            onReject: (response) => {
                console.log("==>> SIPJS CONSOLE => onReject response = ", response);
                // error("generalError",loginid,response.message.reasonPhrase,callback);
            },
        },
        logLevel: sipconfig.loglevel,
        logBuiltinEnabled: sip_log

    };
    console.log("test config SipJS==>", config)
    userAgent = new SIP.UserAgent(config)
    userAgent.start()
        .then(() => {
            console.log("==>> SIPJS CONSOLE => User-agent Connected");
            registerer = new SIP.Registerer(userAgent);
            // Setup registerer state change handler
            registerer.stateChange.addListener((newState) => {
                console.log('==>> SIPJS CONSOLE => Registerer newState:', newState);
                switch (newState) {
                    case SIP.RegistererState.Registered:
                        console.log("==>> SIPJS Console => SIP.RegistererState.Registered")
                        if (dialogStatedata == null)
                            dialogStatedata = JSON.parse(JSON.stringify(dialogStatedata1));
                        // if (dialogStatedata.response.dialog.state == "ACTIVE" && endcal == true) {
                        //     //need to setup for loop here .
                        //     setTimeout(terminateAllCalls, 5000);
                        //     endcal = false;
                        // }

                        //there can be 2 Calls active at the same Time
                        //First call can be Webrtc
                        console.log("==>> SIPJS Console => Trying to send ReInvite, Calls array length is =>", calls.length)
                        for (var k = 0; k < calls.length; k++) {
                            var _tempDialogState = calls[k]
                            if (_tempDialogState.response.dialog.state && _tempDialogState.response.dialog.state !== "DROPPED") {
                                var currentCallStatus = ""
                                if (_tempDialogState.response.dialog.callType == "CONSULT_CONFERENCE" ||
                                    _tempDialogState.response.dialog.callType == "BARGE_CONFERENCE" ||
                                    _tempDialogState.response.dialog.callType == "ATTENDED_CONFERENCE" ||
                                    _tempDialogState.response.dialog.callType == "EXTERNAL_CONSULT_CONFERENCE"
                                ) {
                                    var _members = _tempDialogState.response.dialog.participants
                                    var member = _members.find(member => member.mediaAddress === loginid);
                                    currentCallStatus = member.state;

                                    _members.forEach(member => {
                                        if (member.mediaAddress !== loginid && member.mediaAddress !== _tempDialogState.response.dialog.customerNumber) {
                                            if (currentCallStatus === "HELD") {
                                                generateConferenceEvent("CONFERENCE_MEMBER_HOLD", member.mediaAddress, loginid, _tempDialogState.additionalDetail.conference_name, _tempDialogState.response.dialog.id)
                                            }
                                        }
                                        else {
                                            let data = {
                                                event: _tempDialogState.event,
                                                response: _tempDialogState.response
                                            };
                                            let _tempData = JSON.parse(JSON.stringify(data));
                                            callback(_tempData);
                                            SendPostMessage(_tempData);
                                        }
                                    });
                                }
                                else {
                                    let data = {
                                        event: _tempDialogState.event,
                                        response: _tempDialogState.response
                                    };
                                    var _tempData = JSON.parse(JSON.stringify(data))
                                    callback(_tempData)
                                    SendPostMessage(_tempData)
                                }

                                // adding logic to check if call is still there or not
                                var index = getCallIndex(_tempDialogState.response.dialog.id)
                                var sessionToestablish = calls[index].session;
                                const tempSessionResponse = calls[index].response

                                const options = {
                                    sessionDescriptionHandlerOptions: {
                                        offerOptions: {
                                            iceRestart: true,
                                        },
                                        iceGatheringTimeout: sipconfig.iceGatheringTimeout
                                    },
                                    requestDelegate: {
                                        onAccept: (response) => {
                                            console.log("==>> SIPJS Console => ReInvite After Reconnect onAccept of Dialogid ", tempSessionResponse.dialog.id);
                                            console.log("==>> SIPJS Console => ReInvite After Reconnect onAccept response = ", response);
                                            EnableVoiceTrack(sessionToestablish)
                                        },
                                        onReject: (response) => {
                                            console.log("==>> SIPJS Console => ReInvite After Reconnect onReject of Dialogid ", tempSessionResponse.dialog.id);
                                            console.log("==>> SIPJS Console => ReInvite After Reconnect onReject response = ", response);
                                            if (response.message.reasonPhrase == "Call Does Not Exist" || response.message.reasonPhrase == "Call is being terminated") {
                                                error("generalError", loginid, checkErrorReason("customer_left"), callback);
                                                var index = getCallIndex(tempSessionResponse.dialog.id)
                                                calls[index].response.dialog.callEndReason = "customer_left"
                                                terminate_call(tempSessionResponse.dialog.id)
                                            }
                                            else if (response.message.reasonPhrase == "Not Acceptable Here") {
                                                sessionToestablish.dialog.signalingStateRollback();
                                                sessionToestablish.sessionDescriptionHandler.peerConnection.setLocalDescription({ type: "rollback" })
                                                EnableVoiceTrack(sessionToestablish)
                                            }
                                            else {
                                                EnableVoiceTrack(sessionToestablish)
                                            }
                                        },
                                    }
                                };

                                // first one checks simple calls, second one check conference calls
                                if (_tempDialogState.response.dialog.state === 'HELD' || currentCallStatus == "HELD") {
                                    options.sessionDescriptionHandlerOptions.hold = true;
                                } else if (_tempDialogState.response.dialog.state === 'ACTIVE') {
                                    if (_tempDialogState.response.dialog.channelType === "WEB_RTC") {
                                        // Call from Customer Widget
                                        const remoteVideo = _tempDialogState.additionalDetail?.remoteVideoDisplay;
                                        options.sessionDescriptionHandlerOptions.constraints = {
                                            audio: true,
                                            video: remoteVideo === true, // If true, enable video; otherwise, disable
                                            action: "CALL_ANSWER",
                                            mediaType: remoteVideo ? "video" : "audio"
                                        };
                                    } else {
                                        // Call from elsewhere, so only audio call
                                        options.sessionDescriptionHandlerOptions.constraints = {
                                            audio: true,
                                            video: false,
                                            action: "CALL_ANSWER",
                                            mediaType: "audio"


                                        };
                                    }
                                }
                                console.log("==>> SIPJS CONSOLE => Reinvite OPTIONS => ", options)
                                sessionToestablish.invite(options)
                                    .catch((error) => {
                                        console.error("==>> SIPJS CONSOLE => Failed to send ReInvite after Reconnect of Dialogid  ", tempSessionResponse.dialog.id);
                                        console.error("==>> SIPJS CONSOLE => Failed to send ReInvite after Reconnect ->", error);
                                    })
                            }
                        }


                        loginid = extension;
                        dialogStatedata.response.loginId = extension;
                        console.log('==>> SIPJS CONSOLE => connected registered', registerer);
                        var event = {
                            "event": "agentInfo",
                            "response": {
                                "loginId": extension,
                                "extension": extension,
                                "state": "LOGIN",
                                cause: null
                            }
                        };
                        if (!agentInfo) {
                            const eventCopy = JSON.parse(JSON.stringify(event));
                            callback(eventCopy);
                            SendPostMessage(eventCopy);
                            callback(JSON.parse(JSON.stringify({
                                "event": "dialogState",
                                "response": {
                                    "loginId": extension,
                                    "dialog": null
                                }
                            })));
                            SendPostMessage(JSON.parse(JSON.stringify({
                                "event": "dialogState",
                                "response": {
                                    "loginId": extension,
                                    "dialog": null
                                }
                            })));
                            agentInfo = true;
                        }
                        break;
                    case SIP.RegistererState.Unregistered:
                        console.log("==>> SIPJS CONSOLE => RegistererState Unregistered : ", registerer);
                        if (!again_register) {
                            var event = {
                                "event": "agentInfo",
                                "response": {
                                    "loginId": extension,
                                    "extension": extension,
                                    "state": "LOGOUT",
                                    "cause": null
                                }
                            };
                            const eventCopy = JSON.parse(JSON.stringify(event));
                            callback(eventCopy);
                            SendPostMessage(eventCopy);
                            dialogStatedata = null;
                            loginid = null;
                            agentInfo = false;
                            userAgent.delegate = null;
                            userAgent = null;
                            sessionall = null;

                        }
                        break;
                    case SIP.RegistererState.Terminated:
                        console.log("==>> SIPJS CONSOLE => RegistererState Terminated");
                        break;
                }
            });
            // Send REGISTER
            registerer.register({
                requestDelegate: registrationDelegate
            })
                .then((request) => {
                    console.log("==>> SIPJS CONSOLE => Successfully sent REGISTER request = ", request);
                    // request.delegate={
                    //     onReject: (response) => {
                    //     },
                    //     onAccept: (response) => {

                    //         //error("generalError",loginid,response.message.reasonPhrase,callback);
                    //     },
                    //     onProgress: (response) => {
                    //         console.log("onProgress response = ", response);
                    //         //error("generalError",loginid,response.message.reasonPhrase,callback);
                    //     },
                    //     onRedirect: (response) => {
                    //         console.log("onRedirect response = ", response);
                    //         //error("generalError",loginid,response.message.reasonPhrase,callback);
                    //     },
                    //     onTrying: (response) => {
                    //         console.log("onTrying response = ", response);
                    //         //error("generalError",loginid,response.message.reasonPhrase,callback);
                    //     },
                    // }
                })
                .catch((error) => {
                    console.error("==>> SIPJS CONSOLE => Failed to send REGISTER ->", error);
                    error("subscriptionFailed", extension, checkErrorReason(error.message), callback);
                });
        })
        .catch((errorr) => {
            console.error("==>> SIPJS CONSOLE => Failed to connect -> ", errorr);
            error("subscriptionFailed", extension, checkErrorReason(errorr.message), callback);
        });



    // Allow the function to be called again after 5 seconds
    setTimeout(() => {
        canCallFunction = true;
    }, 1000); // 5000 milliseconds = 5 seconds

    //


}
/**
 * Initiate an outbound call.
 * This function is used to start an outbound call with the specified parameters.
 *
 * @param {string} calledNumber - The destination number to call.
 * @param {string} DN - The destination number to call.
 * @param {string} mediaType - The type of media for the call (Audio, Video, Screen Share).
 * @param {function} callback - A callback function to execute after attempting the call.
 * @param {string} callType - The type of call (OUT for Webrtc, MANUAL_OUT for outbound, MONITORING for monitoring).
 * @returns {void}
 */
function initiate_call(calledNumber, DN, mediaType, callback, callType, serviceIdentifier) {
    var res = lockFunction("initiate_call", 500); // --- seconds cooldown
    if (!res) return;
    const undefinedParams = checkUndefinedParams(initiate_call, [calledNumber, DN, mediaType, callback, callType, serviceIdentifier]);

    if (undefinedParams.length > 0) {
        // console.log(`Error: The following parameter(s) are undefined or null: ${undefinedParams.join(', ')}`);
        error("generalError", loginid, `Error: The following parameter(s) are undefined or null or empty: ${undefinedParams.join(', ')}`, callback);
        return;
    }

    globalEventCallback = callback
    var _monitoringServiceIdentifier = ""
    if (userAgent !== null && userAgent !== undefined && userAgent.transport.isConnected()) {

        if(callType == "MONITORING"){
            calledNumber = sipconfig.monitoringDn + calledNumber
            DN = sipconfig.monitoringDn + DN
            _monitoringServiceIdentifier = serviceIdentifier
        }
        // Target URI
        var sip_uri = SIP.UserAgent.makeURI('sip:' + calledNumber + "@" + sipconfig.uri);
        if (!sip_uri) {
            // console.error("Failed to create target URI.");
            error("generalError", loginid, checkErrorReason("Invalid_URI"), callback);
            return;
        }
        // Create new Session instance in "initial" state
        var tempOptions = {
            earlyMedia: true,
        }
        sessionall = new SIP.Inviter(userAgent, sip_uri, tempOptions);
        const request = sessionall.request;

        request.extraHeaders.push('X-Destination-Number:' + DN);
        if (callType != "MANUAL_OUT") {
            request.extraHeaders.push('X-Media-Type:' + mediaType)
        }
        // if(callType == "MONITORING"){
        let _callType = callType == "MONITORING" ? "MONITORING" : "OUT"
        request.extraHeaders.push('X-Calltype: ' + _callType)
        // request.extraHeaders.push('Another-Header: Value2');

        var constraintVideo = false
        var offerToReceiveAVideo = false   // if audio
        if(mediaType == "video") {constraintVideo = true; offerToReceiveAVideo=true}
        else if(mediaType == "screenshare") {constraintVideo = "screenshare"; offerToReceiveAVideo=true}


        // Options including delegate to capture response messages
        const inviteOptions = {
            requestDelegate: {
                onAccept: (response) => {
                    console.log("==>> SIPJS CONSOLE => onAccept response = ", response);
                    calls[0].session.delegate.onBye = (bye) => {
                        console.log("==>> SIPJS CONSOLE => onBye MESSAGE = ", bye)
                        var _session = calls[0]
                        if (_session && _session.event && _session.response && _session.response.dialog.callEndReason != "EXTERNAL_ATTENDED_TRANSFER") {
                            if (bye.incomingByeRequest.message.headers["X-Call-Dropped-Custom-Reason"] != undefined) {
                                _session.response.dialog.callEndReason = bye.incomingByeRequest.message.headers["X-Call-Dropped-Custom-Reason"][0]['raw'];
                            }
                            else {
                                const match = bye.incomingByeRequest.message.data.match(/text="([^"]+)"/);
                                if (match && match[1]) {
                                    _session.response.dialog.callEndReason = match[1];
                                }
                            }

                            // Special Case of External Consult Transfer
                            // This will Fail if Consulted call is Ended before OB call
                            const tempConsultCall = calls[1]?.response?.dialog;

                            if (_session.response.dialog.callEndReason === "ATTENDED_TRANSFER" && tempConsultCall?.callType === "EXTERNAL-CONSULT") {
                                _session.response.dialog.callEndReason = "EXTERNAL_ATTENDED_TRANSFER";
                            }

                        }
                    }
                },
                onReject: (response) => {
                    console.log("==>> SIPJS CONSOLE => onReject response = ", response);

                    const message = response?.message;
                    const transactionErrorKey = callType === "MONITORING"
                        ? "Silent_Transaction_Error"
                        : "OB_Transaction_Error";
                    const { displayMessage, callEndReason: resolvedReason } = resolveSipRejectError(
                        response,
                        transactionErrorKey
                    );

                    const hasCustomReason = !!message?.headers?.["X-Call-Dropped-Custom-Reason"]?.[0]?.raw;
                    const reasonFromBody = message?.data?.match(/text="([^"]+)"/)?.[1];
                    const hasBodyReason = !!reasonFromBody && reasonFromBody !== "NORMAL_CLEARING";
                    const isTransactionTimeout = ["Service Unavailable", "Request Timeout"].includes(message?.reasonPhrase);

                    // Monitoring keeps snackbar silent except custom/body reasons and transaction timeouts.
                    if (callType !== "MONITORING" || hasCustomReason || hasBodyReason || isTransactionTimeout) {
                        error("generalError", loginid, displayMessage, callback);
                    }

                    if (calls[0]?.response?.dialog) {
                        calls[0].response.dialog.callEndReason = resolvedReason;
                    }
                },
                onCancel: (response) => {
                    console.log("==>> SIPJS CONSOLE => onCancel response = ", response);
                    // Normal cancel/hangup is handled by SessionState.Terminated (AGENT-HANDLED).
                },
                onBye: (response) => {
                    console.log("==>> SIPJS CONSOLE => onBye response = ", response);
                    // Normal hangup is handled by SessionState.Terminated (AGENT-HANDLED).
                },
                onTerminate: (response) => {
                    console.log("==>> SIPJS CONSOLE => onTerminate response = ", response);
                    // Normal hangup is handled by SessionState.Terminated (AGENT-HANDLED).
                },
                onProgress: (response) => {
                    console.log("==>> SIPJS CONSOLE => INITIATED response = onProgress", response);

                    outboundDialingdata = null;
                    outboundDialingdata = calls[0]

                    dialogStatedata = null
                    dialogStatedata = calls[0]

                    const sysdate = new Date();
                    var datetime = sysdate.toISOString();
                    dialogStatedata.response.dialog.participants[0].state = "INITIATED";
                    dialogStatedata.response.dialog.state = "INITIATED";
                    // outboundDialingdata.response.dialog.participants[0].startTime = datetime;
                    outboundDialingdata.response.dialog.participants[0].state = "INITIATED";
                    outboundDialingdata.response.dialog.state = "INITIATED";
                    outboundDialingdata.response.dialog.isCallEnded = 0;
                    var { session, ...dataToPass } = outboundDialingdata;
                    var data = {}
                    data.event = dataToPass.event
                    data.response = dataToPass.response
                    const dataToPassCopy = JSON.parse(JSON.stringify(data));
                    callback(dataToPassCopy);
                    SendPostMessage(dataToPassCopy);
                },
                onTrying: (response) => {
                    console.log("==>> SIPJS CONSOLE => INITIATING response = onTrying", response);
                    if (response.message) {
                        outboundDialingdata = null;
                        outboundDialingdata = JSON.parse(JSON.stringify(outboundDialingdata12));

                        dialogStatedata = null
                        dialogStatedata = JSON.parse(JSON.stringify(dialogStatedata1))

                        const sysdate = new Date();
                        var datetime = sysdate.toISOString();
                        dialedNumber = response.message.to.uri.raw.user;
                        // For Monitoring Call, removing *44 if exists
                        if (dialedNumber.startsWith(sipconfig.monitoringDn)) {
                            dialedNumber = dialedNumber.replace(sipconfig.monitoringDn, "")
                        }
                        dialogStatedata.response.loginId = loginid;
                        dialogStatedata.response.dialog.fromAddress = loginid;
                        dialogStatedata.response.dialog.callType = callType == "MONITORING" ? "MONITORING" : "OUT";
                        dialogStatedata.response.dialog.ani = dialedNumber;
                        dialogStatedata.response.dialog.id = response.message.callId;
                        dialogStatedata.response.dialog.dialedNumber = dialedNumber;
                        dialogStatedata.response.dialog.fromAddress = loginid;
                        dialogStatedata.response.dialog.customerNumber = dialedNumber;
                        dialogStatedata.response.dialog.participants[0].stateChangeTime = datetime;

                        //change dialogStatedata.response.dialog.participants[0].mediaAddress = agentlogindata.agent_contact.split('/')[1].split('@')[0];

                        outboundDialingdata.response.loginId = loginid;
                        outboundDialingdata.response.dialog.fromAddress = loginid;
                        outboundDialingdata.response.dialog.callType = callType == "MONITORING" ? "MONITORING" : "OUT";
                        outboundDialingdata.response.dialog.ani = dialedNumber;
                        outboundDialingdata.response.dialog.dnis = dialedNumber;
                        outboundDialingdata.response.dialog.serviceIdentifier = callType == "MONITORING" ? _monitoringServiceIdentifier : DN;
                        outboundDialingdata.response.dialog.id = response.message.callId;
                        outboundDialingdata.response.dialog.dialedNumber = dialedNumber;
                        outboundDialingdata.response.dialog.customerNumber = dialedNumber;
                        outboundDialingdata.response.dialog.participants[0].mediaAddress = loginid;
                        // outboundDialingdata.response.dialog.participants[0].startTime = datetime;
                        outboundDialingdata.response.dialog.participants[0].alertingTime = datetime;
                        outboundDialingdata.response.dialog.participants[0].stateChangeTime = datetime;
                        outboundDialingdata.response.dialog.participants[0].state = "INITIATING";
                        outboundDialingdata.response.dialog.state = "INITIATING";
                        outboundDialingdata.response.dialog.isCallEnded = 0;

                        // dialogStatedata.response.dialog.participants[0].startTime = datetime;
                        dialogStatedata.response.dialog.participants[0].alertingTime = datetime;
                        dialogStatedata.response.dialog.participants[0].state = "INITIATING";
                        dialogStatedata.response.dialog.state = "INITIATING";
                        outboundDialingdata.event = "outboundDialing";
                        sessionall.request.extraHeaders.push('X-Call-Unique-ID:' + DN);

                        outboundDialingdata.response.dialog.mediaType = mediaType
                        var _channelType = ""
                        if (callType == "OUT") {
                            _channelType = "WEB_RTC"
                        }
                        else {
                            _channelType = "VOICE"
                        }
                        outboundDialingdata.response.dialog.channelType = _channelType;

                        dialogStatedata.response.dialog.mediaType = mediaType
                        dialogStatedata.response.dialog.channelType = _channelType;
                        var data = {}
                        data.event = outboundDialingdata.event
                        data.response = outboundDialingdata.response

                        if (outboundDialingdata.additionalDetail) {
                            outboundDialingdata.additionalDetail.remoteVideoDisplay = mediaType == "audio" ? false : true
                            outboundDialingdata.additionalDetail.localMediaType = mediaType
                            outboundDialingdata.additionalDetail.remoteMediaType = mediaType == "screenshare" ? "onlyviewscreenshare" : mediaType
                        }
                        else {
                            outboundDialingdata.additionalDetail = {
                                remoteVideoDisplay: mediaType == "audio" ? false : true,
                                remoteMediaType: mediaType == "screenshare" ? "onlyviewscreenshare" : mediaType,
                                localMediaType: mediaType
                            }
                        }

                        const outboundDialingdataCopy = JSON.parse(JSON.stringify(data));
                        callback(outboundDialingdataCopy);
                        SendPostMessage(outboundDialingdataCopy);

                        var index = getCallIndex(outboundDialingdata.response.dialog.id);
                        if (index == -1) {
                            outboundDialingdata.session = sessionall;
                            // making dialogState & outboundDialingdata Event same
                            outboundDialingdata.event = "dialogState"
                            calls.push(outboundDialingdata);
                        }
                        setupRemoteMedia(outboundDialingdata.session, callback, outboundDialingdata.response.dialog.id)
                    }

                },
                onRedirect: (response) => {
                    console.log("==>> SIPJS CONSOLE => Negative response = onRedirect" + response);
                },
                onRefer: (response) => {
                    console.log("==>> SIPJS CONSOLE => onRefer response = onRefer" + response);
                }
            },
            sessionDescriptionHandlerOptions: {
                constraints: {
                    audio: true,
                    video: constraintVideo,
                    action: "CALL_INITIATE",
                    mediaType: mediaType.toUpperCase()
                },
                offerOptions: {
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: offerToReceiveAVideo
                },
                iceGatheringTimeout: sipconfig.iceGatheringTimeout
            },
            // earlyMedia: true,
            requestOptions: {
                extraHeaders: [
                    'X-Referred-By-Someone: Username'
                ]
            },
        };

        // Send initial INVITE
        sessionall.invite(inviteOptions)
            .then((request) => {
                console.log("==>> SIPJS CONSOLE => Successfully sent INVITE request = ", request);
            })
            .catch((errorr) => {
                console.error("==>> SIPJS CONSOLE => Failed to send INVITE -> ", errorr.message);
                error("generalError", loginid, checkErrorReason(errorr.message), callback);

            });
        addsipcallback(sessionall, 'outbound', callback);
    } else {
        error('generalError', loginid, checkErrorReason("User_Not_Registered"), callback);
    }
}
/**
 * Terminate an active call.
 * This function is used to terminate an ongoing call identified by the dialog ID.
 *
 * @param {string} dialogId - The identifier for the call dialog to be terminated.
 * @returns {void}
 */
function terminate_call(dialogId) {
    var res = lockFunction("terminate_call", 500); // --- seconds cooldown
    if (!res) return;
    var index = getCallIndex(dialogId);
    var sessionToEnd = null;
    if (index !== -1) {
        sessionToEnd = calls[index].session;
    }
    if (!sessionToEnd) {
        if (typeof callbackFunction === "function")
            error('invalidState', loginid, "invalid action releaseCall", callbackFunction);
        return;
    }
    console.log('==>> SIPJS CONSOLE => Call Current state Before Terminating: ', sessionToEnd.state);
    switch (sessionToEnd.state) {
        case SIP.SessionState.Initial:
        case SIP.SessionState.Establishing:
            if (sessionToEnd instanceof SIP.Inviter) {
                // An unestablished outgoing session
                sessionToEnd.cancel();
            } else {
                // An unestablished incoming session
                dialogStatedata.response.dialog.callEndReason = "Rejected";
                sessionToEnd.reject();
            }
            break;
        case SIP.SessionState.Established:
            // An established session
            sessionToEnd.bye();
            break;
        case SIP.SessionState.Terminating:
        case SIP.SessionState.Terminated:
            // Cannot terminate a session that is already terminated
            break;
    }
    sessionall = null;
}

/**
 * Reject an early (ringing) incoming INVITE.
 * Preview Reject: SIP 603 → FreeSWITCH CALL_REJECTED → dialer AGENT_REJECTED.
 * Preview Skip:   SIP 606 → FreeSWITCH INCOMPATIBLE_DESTINATION → dialer AGENT_SKIP.
 *
 * @param {string} dialogId - Dialog / call id of the ringing invitation.
 * @param {string} [reason] - "SKIP" or "REJECTED" (default).
 * @returns {void}
 */
function reject_call(dialogId, reason) {
    var res = lockFunction("reject_call", 500);
    if (!res) return;

    var index = getCallIndex(dialogId);
    if (index === -1 || !calls[index] || !calls[index].session) {
        if (typeof callbackFunction === "function")
            error('invalidState', loginid, "invalid action rejectCall", callbackFunction);
        return;
    }

    var callEntry = calls[index];
    var sessionToEnd = callEntry.session;
    var rejectReason = (reason || "REJECTED").toString().toUpperCase();
    var isSkip = rejectReason === "SKIP";

    console.log('==>> SIPJS CONSOLE => Call Current state Before Rejecting: ', sessionToEnd.state, 'reason=', rejectReason);

    if (sessionToEnd.state !== SIP.SessionState.Initial && sessionToEnd.state !== SIP.SessionState.Establishing) {
        console.warn('==>> SIPJS CONSOLE => rejectCall only supported for early (ringing) sessions');
        if (typeof callbackFunction === "function")
            error('invalidState', loginid, "invalid action rejectCall", callbackFunction);
        return;
    }

    if (sessionToEnd instanceof SIP.Inviter) {
        console.warn('==>> SIPJS CONSOLE => rejectCall is not supported for outgoing sessions');
        return;
    }

    var callEndReason = isSkip ? "SKIP" : "Rejected";
    if (callEntry.response && callEntry.response.dialog) {
        callEntry.response.dialog.callEndReason = callEndReason;
    }
    if (dialogStatedata && dialogStatedata.response && dialogStatedata.response.dialog
        && dialogStatedata.response.dialog.id === dialogId) {
        dialogStatedata.response.dialog.callEndReason = callEndReason;
    }

    // Distinct SIP status codes so FreeSWITCH hangup causes differ (visible in FS logs + ESL).
    // Skip 606 → INCOMPATIBLE_DESTINATION → AGENT_SKIP
    // Reject 603 → CALL_REJECTED → AGENT_REJECTED
    var rejectOptions = isSkip
        ? {
            statusCode: 606,
            reasonPhrase: "SKIP",
            extraHeaders: ["X-Call-Dropped-Custom-Reason: SKIP"]
        }
        : {
            statusCode: 603
        };

    sessionToEnd.reject(rejectOptions);

    sessionall = null;
}

/**
 * Transfer a call to a new extension.
 * This function is used to transfer an ongoing call to a specified extension.
 *
 * @param {string} numberToTransfer - The extension number to which the call will be transferred.
 * @param {function} callback - The callback function to execute after the transfer.
 * @param {string} dialogId - The identifier for the call dialog to be transferred.
 * @returns {void}
 */
function blind_transfer(numberToTransfer, callback, dialogId) {
    var res = lockFunction("blind_transfer", 500); // --- seconds cooldown
    if (!res) return;
    const undefinedParams = checkUndefinedParams(blind_transfer, [numberToTransfer, callback, dialogId]);

    if (undefinedParams.length > 0) {
        // console.log(`Error: The following parameter(s) are undefined or null: ${undefinedParams.join(', ')}`);
        error("generalError", loginid, `Error: The following parameter(s) are undefined or null or empty: ${undefinedParams.join(', ')}`, callback);
        return;
    }
    var index = getCallIndex(dialogId);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }
    if (!sessionall) {
        error("invalidState", loginid, `invalid action SST`, callback);
        return;
    }

    for (var i = 0; i < calls.length; i++) {
        if (calls && calls[i] && calls[i].response && calls[i].response.dialog && (
            calls[i].response.dialog.callType == "CONSULT" ||
            calls[i].response.dialog.callType == "EXTERNAL-CONSULT" ||
            calls[i].response.dialog.callType == "CONSULT_CONFERENCE" ||
            calls[i].response.dialog.callType == "BARGE_CONFERENCE" ||
            calls[i].response.dialog.callType == "ATTENDED_CONFERENCE" ||
            calls[i].response.dialog.callType == "EXTERNAL_CONSULT_CONFERENCE"
        )) {
            error("generalError", loginid, checkErrorReason("Blind_Transfer_Error_" + calls[i].response.dialog.callType), callback);
            return;
        }
    }
    // Target URI
    var target = SIP.UserAgent.makeURI('sip:' + numberToTransfer + "@" + sipconfig.uri);
    if (!target) {
        // console.error("Failed to create target URI.");
        error("generalError", loginid, checkErrorReason("Invalid_URI"), callback);
        return;
    }
    const options = {
        eventHandlers: {
            accepted: () => {
                console.log('==>> SIPJS CONSOLE => REFER request accepted');
            },
            failed: (response) => {
                console.log('==>> SIPJS CONSOLE => REFER request failed:', response.statusCode);
            }
        },
        requestDelegate: {
            onAccept: (request) => {
                console.log('==>> SIPJS Console => blind_transfer (Session Refer) onAccept -> ', request);

                var tempCallType = ""
                var tempCalledNumberParts = numberToTransfer.split('-');
                if (tempCalledNumberParts[0] && tempCalledNumberParts[0] == sipconfig.staticExternalDn) tempCallType = "External_"

                dialogStatedata.response.dialog.callEndReason = tempCallType + "direct_transfered";
                sessionall.response.dialog.callEndReason = tempCallType + "direct_transfered";
            },
            onReject: (request) => {
                console.log('==>> SIPJS Console => blind_transfer (Session Refer) onReject -> ', request);
                error("generalError", loginid, checkErrorReason("Blind_Transfer_Transaction_Error"), callback);
                sessionall.session.delegate = inviteDelegate
            }
        },
    };
    var _tempDelegate = {
        onBye(bye) {
            console.log("==>> SIPJS Console => RECEIVED ON BYE when doing blind Transfer =>", bye)
        }
    }
    sessionall.session.delegate = _tempDelegate
    // if(DN){
    //     options.requestOptions ={
    //         extraHeaders: [
    //             'X-DN: ' + DN, // Replace with your desired header and value
    //         ]
    //     }
    // }
    sessionall.session.refer(target, options).then((res) => {
        console.log('==>> SIPJS Console => Request success blind_transfer', res);
    }).catch((e) => {
        console.error('==>> SIPJS Console => blind_transfer Request error ', e);
        error("generalError", loginid, checkErrorReason(e.message), callback);
        sessionall.session.delegate = inviteDelegate
    })
}
/**
 * Transfer a call to a queue.
 * This function is used to transfer an ongoing call to a specified queue.
 *
 * @param {string} numberToTransfer - The destination number or extension to which the call will be transferred (99887766).
 * @param {string} queue - The queue to which the call will be transferred.
 * @param {string} queuetype - The type of the queue.
 * @param {function} callback - The callback function to execute after the transfer.
 * @param {string} dialogId - The identifier for the call dialog to be transferred.
 * @returns {void}
 */
function blind_transfer_queue(numberToTransfer, queue, queuetype, callback, dialogId) {
    var res = lockFunction("blind_transfer_queue", 500); // --- seconds cooldown
    if (!res) return;
    const undefinedParams = checkUndefinedParams(blind_transfer_queue, [numberToTransfer, queue, queuetype, callback, dialogId]);

    if (undefinedParams.length > 0) {
        // console.log(`Error: The following parameter(s) are undefined or null: ${undefinedParams.join(', ')}`);
        error("generalError", loginid, `Error: The following parameter(s) are undefined or null or empty: ${undefinedParams.join(', ')}`, callback);
        return;
    }
    var index = getCallIndex(dialogId);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }

    if (!sessionall) {
        error("invalidState", loginid, `invalid action SST_Queue`, callback);
        return;
    }

    for(var i=0 ; i<calls.length ; i ++){
        if (calls && calls[i] && calls[i].response && calls[i].response.dialog && (
            calls[i].response.dialog.callType == "CONSULT" ||
            calls[i].response.dialog.callType == "EXTERNAL-CONSULT" ||
            calls[i].response.dialog.callType == "CONSULT_CONFERENCE" ||
            calls[i].response.dialog.callType == "BARGE_CONFERENCE" ||
            calls[i].response.dialog.callType == "ATTENDED_CONFERENCE" ||
            calls[i].response.dialog.callType == "EXTERNAL_CONSULT_CONFERENCE")) {
            error("generalError", loginid, checkErrorReason("Blind_Transfer_Error_" + calls[i].response.dialog.callType), callback);
            return;
        }
    }
    // Target URI
    var target = SIP.UserAgent.makeURI('sip:' + numberToTransfer + "-" + queue + "@" + sipconfig.uri);
    if (!target) {
        error("generalError", loginid, checkErrorReason("Invalid_URI"), callback);
        return;
    }
    const options = {
        eventHandlers: {
            accepted: () => {
                // console.log('REFER request accepted');
            },
            failed: (response) => {
                // console.log('REFER request failed:', response.statusCode);
            }
        },
        requestOptions: {
            extraHeaders: [
                'X-queueTransfer: ' + queue, // Replace with your desired header and value
                'X-queueTypeTransfer: ' + queuetype,
            ]
        },
        requestDelegate: {
            onAccept: (request) => {
                console.log('==>>  SIPJS Console => blind_transfer_queue (Session Refer) onAccept -> ', request);
                dialogStatedata.response.dialog.callEndReason = "direct_transfered";
                sessionall.response.dialog.callEndReason = "direct_transfered";
            },
            onReject: (request) => {
                console.log('==>>  SIPJS Console => blind_transfer_queue (Session Refer) onReject -> ', request);
                error("generalError", loginid, checkErrorReason("Blind_Transfer_Queue_Transaction_Error"), callback);
                sessionall.session.delegate = inviteDelegate
            }
        },
    };

    var _tempDelegate = {
        onBye(bye) {
            console.log("==>> SIPJS Console => RECEIVED ON BYE when doing blind Transfer using Queue=>", bye)
        }
    }

    sessionall.session.delegate = _tempDelegate
    sessionall.session.refer(target, options).then((res) => {
        console.log('==>>  SIPJS Console => Request success blind_transfer_queue', res);
    }).catch((e) => {
        console.error('==>>  SIPJS Console => blind_transfer_queue Request error ', e);
        error("generalError", loginid, checkErrorReason(e.message), callback);
        sessionall.session.delegate = inviteDelegate
    })

}
/**
 * Hold an active call.
 * This function is used to put an ongoing call on hold.
 *
 * @param {function} callback - The callback function to execute after the call is put on hold.
 * @param {string} dialogId - The identifier for the call dialog to be put on hold.
 * @returns {void}
 */
function phone_hold(callback, dialogId) {
    var res = lockFunction("phone_hold", 1500); // --- seconds cooldown
    if (!res) return;
    var res = lockFunction("phone_unhold", 1500); // --- seconds cooldown
    if (!res) return
    var index = getCallIndex(dialogId);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }
    if (!sessionall) {
        error('invalidState', loginid, "invalid action holdCall", callback);
        return;
    }
    //for mute/unmute
    let peer = sessionall.session.sessionDescriptionHandler.peerConnection;
    let senders = peer.getSenders();

    if (!senders.length) return;

    //let that = this;
    //Commented this because it was causing localstream to stop, while only remotestream needed to be stoped
    // senders.forEach(function (sender) {
    //     if (sender.track) sender.track.enabled = false;
    // });

    // Hold the session by sending a re-INVITE with hold session description
    const holdOptions = {
        sessionDescriptionHandlerOptions: {
            hold: true,
        },
        requestDelegate: {
            onAccept: (response) => {
                console.log("==>> SIPJS Console => HOLD onAccept response = ", response);
                console.log("==>> SIPJS Console => Session held successfully.");
                const sysdate = new Date();
                var datetime = sysdate.toISOString();

                if (sessionall.response.dialog.callType == "CONSULT_CONFERENCE" ||
                    sessionall.response.dialog.callType == "BARGE_CONFERENCE" ||
                    sessionall.response.dialog.callType == "ATTENDED_CONFERENCE" ||
                    sessionall.response.dialog.callType == "EXTERNAL_CONSULT_CONFERENCE") {
                    var _members = sessionall.response.dialog.participants
                    for (var i = 0; i < _members.length; i++) {
                        if (_members[i].mediaAddress != loginid && _members[i].mediaAddress !== sessionall.response.dialog.customerNumber) {
                            generateConferenceEvent("CONFERENCE_MEMBER_HOLD", _members[i].mediaAddress, loginid, sessionall.additionalDetail.conference_name, dialogId)
                        }
                        if (_members[i].mediaAddress == loginid) {
                            _members[i].state = "HELD"
                            _members[i].stateChangeTime = datetime;
                        }
                    }
                }
                else {
                    var data = {}
                    data.response = calls[index].response;
                    data.event = calls[index].event;
                    data.response.dialog.participants[0].stateChangeTime = datetime;
                    data.response.dialog.participants[0].state = "HELD";
                    data.response.dialog.state = "HELD";
                    data.response.dialog.isCallAlreadyActive = true;
                }
                if (typeof callback === 'function') {
                    var _sessionDialog = {}
                    _sessionDialog.response = sessionall.response;
                    _sessionDialog.event = sessionall.event;
                    const eventCopy = JSON.parse(JSON.stringify(_sessionDialog))
                    callback(eventCopy)
                    SendPostMessage(eventCopy);

                    // Case => Customer Call & Consult call on Hold , Wifi off for 30 sec Press Unhold Consult Call Reconnect Wifi.... no A2 Voice to A1
                    var selectedCall = (index === 0) ? calls[1] : calls[0];
                    if (selectedCall && selectedCall.session) {
                        setupRemoteMedia(selectedCall.session, callback, selectedCall.response.dialog.id);
                    }

                }
            },
            onReject: (response) => {
                console.log("==>> SIPJS Console => HOLD onReject response = ", response);
                console.log("==>> SIPJS Console => HOLD onReject response Reason = ", response.message.reasonPhrase, " so call is getting hold");

                sessionall.session.dialog.signalingStateRollback();
                sessionall.session.sessionDescriptionHandler.peerConnection.setLocalDescription({ type: "rollback" }).then(() => {
                    ReEstablishVoiceCall(sessionall.session, "HOLD", "", callback, dialogId)
                })

            }
        }
    };

    sessionall.session.invite(holdOptions)
        .catch((errorr) => {
            console.error("==>> SIPJS Console => Failed to hold the session -> ", errorr);
            error("generalError", loginid, checkErrorReason(errorr.message), callback);
        });
}
/**
 * Unhold a held call.
 * This function is used to take a held call off hold and resume it.
 *
 * @param {function} callback - The callback function to execute after the call is taken off hold.
 * @param {string} dialogId - The identifier for the call dialog to be taken off hold.
 * @returns {void}
 */
function phone_unhold(callback, dialogId) {
    var res = lockFunction("phone_unhold", 1500); // --- seconds cooldown
    if (!res) return;
    var res = lockFunction("phone_hold", 1500); // --- seconds cooldown
    if (!res) return;
    var index = getCallIndex(dialogId);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }
    if (!sessionall) {
        error('invalidState', loginid, "invalid action unholdCall", callback);
        return;
    }
    //for mute/unmute
    let peer = sessionall.session.sessionDescriptionHandler.peerConnection;
    let senders = peer.getSenders();

    if (!senders.length) return;

    //let that = this;
    senders.forEach(function (sender) {
        if (sender.track) sender.track.enabled = true;
    });

    // Hold the session by sending a re-INVITE with hold session description
    const holdOptions = {
        sessionDescriptionHandlerOptions: {
            hold: false,
        },
        requestDelegate: {
            onAccept: (response) => {
                console.log("==>> SIPJS Console => UNHOLD onAccept response = ", response);
                const sysdate = new Date();
                var datetime = sysdate.toISOString();
                if (sessionall.response.dialog.callType == "CONSULT_CONFERENCE" ||
                    sessionall.response.dialog.callType == "BARGE_CONFERENCE" ||
                    sessionall.response.dialog.callType == "ATTENDED_CONFERENCE" ||
                    sessionall.response.dialog.callType == "EXTERNAL_CONSULT_CONFERENCE") {
                    var _members = sessionall.response.dialog.participants
                    for (var i = 0; i < _members.length; i++) {
                        if (_members[i].mediaAddress != loginid && _members[i].mediaAddress !== sessionall.response.dialog.customerNumber) {
                            generateConferenceEvent("CONFERENCE_MEMBER_UNHOLD", _members[i].mediaAddress, loginid, sessionall.additionalDetail.conference_name, dialogId)
                        }
                        if (_members[i].mediaAddress == loginid) {
                            _members[i].state = "ACTIVE"
                            _members[i].stateChangeTime = datetime;
                            _members[i].mute = false
                        }
                    }
                    sessionall.response.dialog.state = "ACTIVE";
                }
                else {
                    var data = {}
                    data.response = calls[index].response;
                    data.event = calls[index].event;
                    data.response.dialog.participants[0].stateChangeTime = datetime;
                    data.response.dialog.participants[0].state = "ACTIVE";
                    data.response.dialog.participants[0].mute = false
                    data.response.dialog.state = "ACTIVE";
                    data.response.dialog.isCallAlreadyActive = true;
                }
                if (typeof callback === 'function') {
                    var _sessionDialog = {}
                    _sessionDialog.response = sessionall.response;
                    _sessionDialog.event = sessionall.event;
                    const eventCopy = JSON.parse(JSON.stringify(_sessionDialog))
                    callback(eventCopy)
                    SendPostMessage(eventCopy);
                    setupRemoteMedia(sessionall.session, callback, dialogId)
                }
                EnableVoiceTrack(sessionall.session)
            },
            onReject: (response) => {
                console.log("==>> SIPJS Console => UNHOLD onReject response = ", response);
                if (response.message.reasonPhrase == "Not Acceptable Here") {
                    console.log("==>> SIPJS Console => UNHOLD onReject response Reason = ", response.message.reasonPhrase, " so call is unhold, putting it back on Hold");
                    sessionall.session.dialog.signalingStateRollback();
                    sessionall.session.sessionDescriptionHandler.peerConnection.setLocalDescription({ type: "rollback" }).then(() => {
                        ReEstablishVoiceCall(sessionall.session, "HOLD", "websocketissue_unhold", callback, dialogId)
                    })
                }
                else {
                    console.log("==>> SIPJS Console => UNHOLD onReject Reason UNKNOWN ->", response.message.reasonPhrase);
                    sessionall.session.dialog.signalingStateRollback();
                    sessionall.session.sessionDescriptionHandler.peerConnection.setLocalDescription({ type: "rollback" }).then(() => {
                        ReEstablishVoiceCall(sessionall.session, "ACTIVE", "", callback, dialogId)
                    })
                }
            }
        }
    };

    sessionall.session.invite(holdOptions)
        .catch((errorr) => {
            console.error("==>> SIPJS Console => Failed to unhold the session -> ", errorr);
            error("generalError", loginid, checkErrorReason(errorr.message), callback);
        });
}
/**
 * Mute audio of a call.
 * This function is used to mute the audio of an ongoing call.
 *
 * @param {function} callback - The callback function to execute after muting the call audio.
 * @param {string} dialogId - The identifier for the call dialog to mute audio.
 * @returns {void}
 */
function phone_mute(callback, dialogId) {
    // var res = lockFunction("phone_mute", 500); // --- seconds cooldown
    // if (!res) return;
    var index = getCallIndex(dialogId);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }
    if (!sessionall) {
        //console.warn("No session to toggle mute");
        error('invalidState', loginid, "invalid action mute_call", callback);
        return;
    }
    //for mute/unmute
    let peer = sessionall.session.sessionDescriptionHandler.peerConnection;
    let senders = peer.getSenders();

    if (!senders.length) return;

    //let that = this;
    // This will only disable the Audio Track
    senders.forEach(sender => {
        if (sender.track && sender.track.kind === "audio") {
            sender.track.enabled = false;
        }
    });
    const sysdate = new Date();
    var datetime = sysdate.toISOString();
    if (sessionall.response.dialog.callType == "CONSULT_CONFERENCE" ||
        sessionall.response.dialog.callType == "BARGE_CONFERENCE" ||
        sessionall.response.dialog.callType == "ATTENDED_CONFERENCE" ||
        sessionall.response.dialog.callType == "EXTERNAL_CONSULT_CONFERENCE") {
        var _members = sessionall.response.dialog.participants
        for (var i = 0; i < _members.length; i++) {
            if (_members[i].mediaAddress != loginid && _members[i].mediaAddress !== sessionall.response.dialog.customerNumber) {
                generateConferenceEvent("CONFERENCE_MEMBER_MUTE", _members[i].mediaAddress, loginid, sessionall.additionalDetail.conference_name, dialogId)
            }
            if (_members[i].mediaAddress == loginid) {
                _members[i].mute = true
                _members[i].stateChangeTime = datetime;
            }
        }
    }
    else {
        var data = {}
        data.response = calls[index].response;
        data.event = calls[index].event;
        data.response.dialog.participants[0].stateChangeTime = datetime;
        data.response.dialog.participants[0].mute = true;
    }
    if (typeof callback === 'function') {
        var _sessionDialog = {}
        _sessionDialog.response = sessionall.response;
        _sessionDialog.event = sessionall.event;
        const eventCopy = JSON.parse(JSON.stringify(_sessionDialog))
        callback(eventCopy);
        SendPostMessage(eventCopy);
    }
}
/**
 * Unmute audio of a call.
 * This function is used to unmute the audio of an ongoing call.
 *
 * @param {function} callback - The callback function to execute after unmuting the call audio.
 * @param {string} dialogId - The identifier for the call dialog to unmute audio.
 * @returns {void}
 */
function phone_unmute(callback, dialogId) {
    // var res = lockFunction("phone_unmute", 500); // --- seconds cooldown
    // if (!res) return;
    var index = getCallIndex(dialogId);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }
    if (!sessionall) {
        error('invalidState', loginid, "invalid action unmute_call", callback);
        return;
    }

    //for mute/unmute
    let peer = sessionall.session.sessionDescriptionHandler.peerConnection;
    let senders = peer.getSenders();

    if (!senders.length) return;

    //let that = this;
    // This will only enable the Audio Track
    senders.forEach(sender => {
        if (sender.track && sender.track.kind === "audio") {
            sender.track.enabled = true;
        }
    });

    const sysdate = new Date();
    var datetime = sysdate.toISOString();
    if (sessionall.response.dialog.callType == "CONSULT_CONFERENCE" ||
        sessionall.response.dialog.callType == "BARGE_CONFERENCE" ||
        sessionall.response.dialog.callType == "ATTENDED_CONFERENCE" ||
        sessionall.response.dialog.callType == "EXTERNAL_CONSULT_CONFERENCE") {
        var _members = sessionall.response.dialog.participants
        for (var i = 0; i < _members.length; i++) {
            if (_members[i].mediaAddress != loginid && _members[i].mediaAddress !== sessionall.response.dialog.customerNumber) {
                generateConferenceEvent("CONFERENCE_MEMBER_UNMUTE", _members[i].mediaAddress, loginid, sessionall.additionalDetail.conference_name, dialogId)
            }
            if (_members[i].mediaAddress == loginid) {
                _members[i].mute = false
                _members[i].stateChangeTime = datetime;
            }
        }
    }
    else {
        var data = {}
        data.response = calls[index].response;
        data.event = calls[index].event;
        data.response.dialog.participants[0].stateChangeTime = datetime;
        data.response.dialog.participants[0].mute = false;
    }
    if (typeof callback === 'function') {
        var _sessionDialog = {}
        _sessionDialog.response = sessionall.response;
        _sessionDialog.event = sessionall.event;
        const eventCopy = JSON.parse(JSON.stringify(_sessionDialog))
        callback(eventCopy)
        SendPostMessage(eventCopy);    // consult Jazeb on this
    }
}
/**
 * Respond to an incoming call.
 * This function is used to answer an incoming call or perform specific actions based on the call type.
 *
 * @param {function} callback - The callback function to execute after responding to the call.
 * @param {string} dialogId - The identifier for the incoming call dialog.
 * @param {string} type - Type of response: "audio", "video", "onlyviewscreenshare", or "screenshare".
 * @returns {void}
 */
function respond_call(callback, dialogId, type) {
    var res = lockFunction("respond_call", 500); // --- seconds cooldown
    if (!res) return;
    var index = getCallIndex(dialogId);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index].session;
    }
    if (!sessionall || sessionall.state === SIP.SessionState.Established) {
        if (typeof callback === "function")
            error('invalidState', loginid, "invalid action answerCall", callback);
        return;
    }

    globalEventCallback = callback

    // answer a call
    if (sessionall.status === SIP.SessionState.Established) {
        console.log('==>> SIPJS CONSOLE => Call already answered');
    } else {
        // var sdp = sessionall.request.body;
        // var offeredAudio = false, offeredVideo = false;

        // if ((/\r\nm=audio /).test(sdp)) {
        //     offeredAudio = true;
        // }

        // if ((/\r\nm=video /).test(sdp)) {
        //     offeredVideo = true;
        // }
        sessionall.delegate = inviteDelegate
        let sessionDescriptionHandlerOption = {
            constraints: {
                audio: true,
                video: false,
                action : "",
                mediaType : ""
              },
              offerOptions : {
                offerToReceiveAudio : true,
                offerToReceiveVideo : false
              },
              iceGatheringTimeout : sipconfig.iceGatheringTimeout
        }
        if (type === "audio") {
            sessionDescriptionHandlerOption.constraints.audio = true
            sessionDescriptionHandlerOption.constraints.video = false
            sessionDescriptionHandlerOption.constraints.action = "CALL_ANSWER"
            sessionDescriptionHandlerOption.constraints.mediaType = "AUDIO"
            sessionDescriptionHandlerOption.offerOptions.offerToReceiveAudio = true
            sessionDescriptionHandlerOption.offerOptions.offerToReceiveVideo = false
        }
        else if (type === "video") {
            sessionDescriptionHandlerOption.constraints.audio = true
            sessionDescriptionHandlerOption.constraints.video = true
            sessionDescriptionHandlerOption.constraints.action = "CALL_ANSWER"
            sessionDescriptionHandlerOption.constraints.mediaType = "VIDEO"
            sessionDescriptionHandlerOption.offerOptions.offerToReceiveAudio = true
            sessionDescriptionHandlerOption.offerOptions.offerToReceiveVideo = true
        }
        else if (type === "screenshare") {
            sessionDescriptionHandlerOption.constraints.audio = true
            sessionDescriptionHandlerOption.constraints.video = "screenshare"
            sessionDescriptionHandlerOption.constraints.action = "CALL_ANSWER"
            sessionDescriptionHandlerOption.constraints.mediaType = "SCREENSHARE"
            sessionDescriptionHandlerOption.offerOptions.offerToReceiveAudio = true
            sessionDescriptionHandlerOption.offerOptions.offerToReceiveVideo = true
        }
        else if (type === "onlyviewscreenshare") {
            sessionDescriptionHandlerOption.constraints.audio = true
            sessionDescriptionHandlerOption.constraints.video = true
            sessionDescriptionHandlerOption.constraints.action = "CALL_ANSWER"
            sessionDescriptionHandlerOption.constraints.mediaType = "ONLYVIEWSCREENSHARE"
            sessionDescriptionHandlerOption.offerOptions.offerToReceiveAudio = true
            sessionDescriptionHandlerOption.offerOptions.offerToReceiveVideo = true
        }

        var temp_session = null
        if (index !== -1) {
            temp_session = calls[index];
        }
        if (temp_session.additionalDetail) {
            temp_session.additionalDetail.localMediaType = type
        }
        else {
            temp_session.additionalDetail = {
                localMediaType: type
            }
        }

        sessionall.accept({
            sessionDescriptionHandlerOptions: sessionDescriptionHandlerOption
        }).then((res) => {
            console.log('==>> SIPJS CONSOLE => Call Accepted : ', type)
            dialogStatedata.response.dialog.mediaType = type

            if(type === "onlyviewscreenshare"){
                let peer = sessionall.sessionDescriptionHandler.peerConnection;
                let senders = peer.getSenders();
                senders.forEach(async sender => {
                    if (sender && sender.track && sender.track.kind === "video") {
                        sender.track.stop()
                    }
                })
            }

             // Send Message to Customer / Agent about agent Extention
             agentDetailsToOtherParticiapnt (dialogId)
        }).catch((e) => {
            console.error("==>> SIPJS CONSOLE => respond_call FAILED -> ", e)
            error("generalError", loginid, checkErrorReason(e.message), callback);
        });
        video = true;
        sessionall = sessionall;

    }
}
/**
 * Initiate a consult call.
 * This function allows an agent to initiate a consult call with the specified destination number.
 *
 * @param {string} calledNumber - The number to which the consult call is initiated.
 * @param {function} callback - The callback function to execute after initiating the consult call.
 * @returns {void}
 */
function makeConsultCall(calledNumber, callback) {
    var res = lockFunction("makeConsultCall", 500); // --- seconds cooldown
    if (!res) return;
    const undefinedParams = checkUndefinedParams(makeConsultCall, [calledNumber, callback]);

    if (undefinedParams.length > 0) {
        // console.log(`Error: The following parameter(s) are undefined or null: ${undefinedParams.join(', ')}`);
        error("generalError", loginid, `Error: The following parameter(s) are undefined or null or empty: ${undefinedParams.join(', ')}`, callback);
        return;
    }

    if (calls && calls[0] && calls[0].session && calls[0].session.state !== SIP.SessionState.Established) {
        error('generalError', loginid, checkErrorReason("Consult_Customer_left"), callback);
        return;
    }

    var _mainSessionCallType = calls[0].response.dialog.callType
    if (_mainSessionCallType == "CONSULT_CONFERENCE" ||
        _mainSessionCallType == "BARGE_CONFERENCE" ||
        _mainSessionCallType == "CONSULT" ||
        _mainSessionCallType == "EXTERNAL-CONSULT" ||
        _mainSessionCallType == "ATTENDED_CONFERENCE" ||
        _mainSessionCallType == "EXTERNAL_CONSULT_CONFERENCE") {
        error('generalError', loginid, checkErrorReason("Consult_" + _mainSessionCallType), callback);
        return
    }
    if (calls && calls[1] && calls[1].session && calls[1].session.state != SIP.SessionState.Terminated) {
        error('generalError', loginid, checkErrorReason("Consult_Exist"), callback);
        return;
    }

    if (userAgent !== null && userAgent !== undefined && userAgent.transport.isConnected()) {
        // Target URI
        var sip_uri = SIP.UserAgent.makeURI('sip:' + calledNumber + "@" + sipconfig.uri);
        if (!sip_uri) {
            // console.error("Failed to create target URI.");
            error("generalError", loginid, checkErrorReason("Invalid_URI"), callback);
            return;
        }
        // Create new Session instance in "initial" state
        var tempOptions = {
            earlyMedia: true,
        }
        consultSessioin = new SIP.Inviter(userAgent, sip_uri, tempOptions);
        const request = consultSessioin.request;

        var tempCallType = ""
        var tempCalledNumberParts = calledNumber.split('-');
        if (tempCalledNumberParts[0] && tempCalledNumberParts[0] == sipconfig.staticExternalDn) tempCallType = "EXTERNAL-"

        request.extraHeaders.push('X-Calltype: ' + tempCallType + 'CONSULT');

        let firstsession = calls[0].response
        let customerNumber = ""
        // if (typeof firstsession.incomingInviteRequest !== 'undefined'){
        //     customerNumber = firstsession.incomingInviteRequest.message.from.uri.normal.user
        // }
        customerNumber = firstsession.dialog.customerNumber

        // let destinationNumber = firstsession.incomingInviteRequest.message.headers["X-Destination-Number"];
        // destinationNumber = destinationNumber != undefined ? destinationNumber[0].raw : "0000";

        let destinationNumber = firstsession.dialog.serviceIdentifier

        request.extraHeaders.push('X-CustomerNumber: ' + customerNumber);
        request.extraHeaders.push('X-Destination-Number: ' + destinationNumber);
        request.extraHeaders.push('X-Media-Type:' + "audio")


        // Options including delegate to capture response messages
        const inviteOptions1 = {
            requestDelegate: {
                onAccept: (response) => {
                    console.log("==>> SIPJS CONSOLE => Consult Call onAccept response = ", response);
                },
                onReject: (response) => {
                    console.log("==>> SIPJS CONSOLE => onReject response = ", response);

                    const { displayMessage, callEndReason } = resolveSipRejectError(
                        response,
                        "Consult_Transaction_Error"
                    );
                    error("generalError", loginid, displayMessage, callback);

                    if (calls[1]) {
                        calls[1].response.dialog.callEndReason = callEndReason;
                    } else if (
                        calls[0] && ["CONSULT", "EXTERNAL-CONSULT"].includes(calls[0].response.dialog.callType)) {
                        calls[0].response.dialog.callEndReason = callEndReason;
                    }
                },
                onCancel: (response) => {
                    console.log("==>> SIPJS CONSOLE => onCancel response = ", response);
                    // Normal cancel/hangup is handled by SessionState.Terminated (AGENT-HANDLED).
                },
                onBye: (response) => {
                    console.log("==>> SIPJS CONSOLE => onBye response = ", response);
                    // Normal hangup is handled by SessionState.Terminated (AGENT-HANDLED).
                },
                onTerminate: (response) => {
                    console.log("==>> SIPJS CONSOLE => onTerminate response = ", response);
                    // Normal hangup is handled by SessionState.Terminated (AGENT-HANDLED).
                },
                onProgress: (response) => {
                    console.log("==>> SIPJS CONSOLE => Consult Call INITIATED response = onProgress", response);

                    // checking if Index 0 Call exist and its callType should not be Consult
                    if (!calls || !calls[0] || !calls[0].response || !calls[0].response.dialog?.callType || calls[0].response.dialog.callType === "CONSULT" || calls[0].response.dialog.callType === "EXTERNAL-CONSULT") {
                        //if callType is Consult, terminating it beacase at Index 0 it should never be Consult.
                        console.log("==>> SIPJS CONSOLE => Terminating Call because Calltype is Consult at Index 0, which is not Allowed")
                        terminate_call(calls[0].response.dialog.id);
                        return
                    }

                    consultCalldata = null;
                    consultCalldata = calls[1];

                    const sysdate = new Date();
                    var datetime = sysdate.toISOString();
                    consultCalldata.response.dialog.participants[0].state = "INITIATED";
                    consultCalldata.response.dialog.state = "INITIATED";
                    consultCalldata.response.dialog.participants[0].startTime = datetime;
                    consultCalldata.response.dialog.participants[0].state = "INITIATED";
                    consultCalldata.response.dialog.state = "INITIATED";
                    // var { session, ...dataToPass } = consultCalldata;
                    // callback(dataToPass);
                    var data = {}
                    data.response = consultCalldata.response
                    data.event = consultCalldata.event
                    const consultCalldataCopy = JSON.parse(JSON.stringify(data));
                    callback(consultCalldataCopy);
                    SendPostMessage(consultCalldataCopy)

                },
                onTrying: (response) => {
                    console.log("==>> SIPJS CONSOLE => Consult Call INITIATING response = onTrying", response);
                    if (response.message) {
                        consultCalldata = null;
                        consultCalldata = JSON.parse(JSON.stringify(ConsultCalldata1));

                        const sysdate = new Date();
                        var datetime = sysdate.toISOString();

                        var dialedNumber = response.message.to.uri.raw.user;
                        // incase of External Consult Remove the Prefix.
                        if (tempCalledNumberParts[0] && tempCalledNumberParts[0] == sipconfig.staticExternalDn) dialedNumber = tempCalledNumberParts[1]
                        consultCalldata.response.loginId = loginid;
                        consultCalldata.response.dialog.fromAddress = loginid;
                        consultCalldata.response.dialog.callType = tempCallType + 'CONSULT';
                        consultCalldata.response.dialog.ani = dialedNumber;
                        consultCalldata.response.dialog.dnis = dialedNumber;
                        consultCalldata.response.dialog.serviceIdentifier = destinationNumber;
                        consultCalldata.response.dialog.id = response.message.callId;
                        consultCalldata.response.dialog.dialedNumber = dialedNumber;
                        consultCalldata.response.dialog.customerNumber = dialedNumber;
                        consultCalldata.response.dialog.participants[0].mediaAddress = loginid;
                        // consultCalldata.response.dialog.participants[0].startTime = datetime;
                        consultCalldata.response.dialog.participants[0].alertingTime = datetime;
                        consultCalldata.response.dialog.participants[0].stateChangeTime = datetime;
                        consultCalldata.response.dialog.participants[0].state = "INITIATING";
                        consultCalldata.response.dialog.state = "INITIATING";
                        consultCalldata.response.dialog.mediaType = "audio"
                        consultCalldata.response.dialog.channelType = "VOICE"
                        // var { session, ...dataToPass } = consultCalldata;
                        // callback(dataToPass);
                        var data = {}
                        data.response = consultCalldata.response
                        data.event = consultCalldata.event
                        const consultCalldataCopy = JSON.parse(JSON.stringify(data));
                        callback(consultCalldataCopy);
                        SendPostMessage(consultCalldataCopy);

                        if (consultCalldata.additionalDetail) {
                            consultCalldata.additionalDetail.localMediaType = "audio"
                            consultCalldata.additionalDetail.remoteMediaType = "audio"

                        }
                        else {
                            consultCalldata.additionalDetail = {
                                localMediaType: "audio",
                                remoteMediaType: "audio"
                            }
                        }

                        var index = getCallIndex(consultCalldata.response.dialog.id);
                        if (index == -1) {
                            consultCalldata.session = consultSessioin;
                            calls.push(consultCalldata);
                        }

                        console.log("==>> SIPJS CONSOLE => calls[0].response.dialog.callType ->", calls[0].response.dialog.callType)
                        console.log("==>> SIPJS CONSOLE => If Calltype is CONSULT, TerminatingCall")

                        // checking if Index 0 Call exist and its callType should not be Consult
                        if (!calls || !calls[0] || !calls[0].response || !calls[0].response.dialog?.callType || calls[0].response.dialog.callType === "CONSULT" || calls[0].response.dialog.callType === "EXTERNAL-CONSULT") {
                            //if callType is Consult, terminating it beacase at Index 0 it should never be Consult.
                            console.log("==>> SIPJS CONSOLE => Terminating Call because Calltype is Consult at Index 0, which is not Allowed")
                            terminate_call(calls[0].response.dialog.id);
                            return
                        }
                        // setupRemoteMedia is already called on Hold Request
                        phone_hold(callback, calls[0].response.dialog.id);
                    }
                },
                onRedirect: (response) => {
                    console.log("==>> SIPJS CONSOLE => Negative response = onRedirect" + response);
                },
                onRefer: (response) => {
                    console.log("==>> SIPJS CONSOLE => onRefer response = onRefer" + response);
                }
            },
            sessionDescriptionHandlerOptions: {
                constraints: {
                    audio: true,
                    video: false,
                    action: "CALL_INITIATE",
                    mediaType: "AUDIO"
                },
                iceGatheringTimeout: sipconfig.iceGatheringTimeout
            },
            // earlyMedia: true,
            requestOptions: {
                extraHeaders: [
                    'X-Referred-By-Someone: Username'
                ]
            },
        };
        if (calls && calls[0] && calls[0].session && calls[0].session.state == SIP.SessionState.Established) {
            // Send initial INVITE
            consultSessioin.invite(inviteOptions1)
                .then((request) => {
                    console.log("==>> SIPJS CONSOLE => Successfully sent INVITE request = ", request);
                })
                .catch((errorr) => {
                    console.error("==>> SIPJS CONSOLE => Failed to send INVITE", errorr.message);
                    error("generalError", loginid, checkErrorReason(errorr.message), callback);
                });
        }
        else { console.log("==>> SIPJS CONSOLE => Call doesnt Exist at Index 0, So not Intiating Consult Call") }

        consultSessioin.delegate = {
            onBye: (bye) => {
                console.log("==>> SIPJS Console => Consult Call onBye ->", bye)
                consultCalldata = null
                consultCalldata = calls[1]
                if (bye.incomingByeRequest.message.headers["X-Call-Dropped-Custom-Reason"] != undefined) {
                    consultCalldata.response.dialog.callEndReason = bye.incomingByeRequest.message.headers["X-Call-Dropped-Custom-Reason"][0]['raw'];
                }
                else {
                    const match = bye.incomingByeRequest.message.data.match(/text="([^"]+)"/);
                    if (match && match[1]) {
                        // if(consultCalldata.response.dialog.callEndReason != "consult-transfer"){
                        consultCalldata.response.dialog.callEndReason = match[1];
                        // }
                    }
                }

                // Special Case of External Consult Transfer
                if (consultCalldata.response.dialog.callEndReason === "ATTENDED_TRANSFER" && consultCalldata.response.dialog.callType === "EXTERNAL-CONSULT") {
                    consultCalldata.response.dialog.callEndReason = "EXTERNAL_ATTENDED_TRANSFER";
                    // Manually setting CallEndReason for index 0 call incase of Consult Transfer on External Number
                    calls[0].response.dialog.callEndReason = "EXTERNAL_ATTENDED_TRANSFER";
                }

                    console.log("==>> SIPJS CONSOLE => Consult Call EndReason : ",consultCalldata.response.dialog.callEndReason)

                },
                onCancel: (invitation) => {
                    console.log("==>> SIPJS CONSOLE => we received a onCancel", invitation);

                },
            };

        consultSessioin.stateChange.addListener((newState) => {
            console.log(newState);
            var dialogId;
            if (consultSessioin.incomingInviteRequest) {
                dialogId = consultSessioin.incomingInviteRequest.message.headers["X-Call-Id"] != undefined ? consultSessioin.incomingInviteRequest.message.headers["X-Call-Id"][0]['raw'] : consultSessioin.incomingInviteRequest.message.headers["Call-ID"][0]['raw'];
            } else {
                dialogId = consultSessioin.outgoingRequestMessage.headers["X-Call-Id"] != undefined ? consultSessioin.outgoingRequestMessage.headers["X-Call-Id"][0]['raw'] : consultSessioin.outgoingRequestMessage.headers["Call-ID"][0];
            }
            var index = getCallIndex(dialogId);
            switch (newState) {
                case SIP.SessionState.Establishing:
                    console.log("==>> SIPJS CONSOLE => Ringing");

                    break;
                case SIP.SessionState.Established:
                    console.log("==>> SIPJS CONSOLE => consult call Answered");

                    consultSessioin = null
                    consultSessioin = calls[1].session

                    consultCalldata = null
                    consultCalldata = calls[1]

                    setupRemoteMedia(consultSessioin, callback, dialogId);


                    var call_type1;
                    if (consultSessioin.incomingInviteRequest) {

                        if (consultSessioin.incomingInviteRequest.message.from._displayName === 'conference') {
                            call_type1 = 'conference'
                        } else {
                            call_type1 = 'incoming'
                        }
                    } else {
                        call_type1 = 'outbound'
                    }
                    const sysdate = new Date();
                    var datetime = sysdate.toISOString();
                    consultSessioin.startTime = datetime;

                    // console.log(event);
                    if (call_type1 != 'inbound') {
                        call_variable_array = [];
                        if (consultSessioin.outgoingRequestMessage.headers['X-Call-Variable0']) {
                            call_variable_array.push({
                                "name": 'callVariable0',
                                "value": data.headers['X-Call-Variable0'][0]['raw']
                            })
                        } else {
                            call_variable_array.push({
                                "name": 'callVariable0',
                                "value": ''
                            })
                        }
                        for (let index = 1; index < 10; index++) {
                            if (consultSessioin.outgoingRequestMessage.headers['X-Call-Variable' + index]) {
                                call_variable_array.push({
                                    "name": 'callVariable' + index,
                                    "value": data.headers['X-Call-Variable' + index]
                                })
                            }
                        }
                        consultCalldata.response.dialog.callVariables.CallVariable = call_variable_array;
                    }
                    consultCalldata.response.dialog.participants[0].stateChangeTime = datetime;
                    consultCalldata.response.dialog.participants[0].startTime = datetime;
                    consultCalldata.response.dialog.participants[0].state = "ACTIVE";
                    consultCalldata.response.dialog.state = "ACTIVE";
                    consultCalldata.response.dialog.isCallEnded = 0;
                    consultCalldata.response.dialog.participants[0].mute = false;
                    var { session, ...dataToPass } = consultCalldata;
                    var data = {}
                    data.response = consultCalldata.response
                    data.event = consultCalldata.event
                    const dataToPassCopy = JSON.parse(JSON.stringify(data));
                    callback(dataToPassCopy);
                    SendPostMessage(dataToPassCopy);
                    if (index != -1) {
                        calls[index].response = consultCalldata.response;
                    }
                    break;
                case SIP.SessionState.Terminated:
                    console.log("==>> SIPJS CONSOLE => Consult Call Ended");

                    consultCalldata = null
                    consultCalldata = calls[1]

                    if (consultCalldata == null) {
                        console.log("==>> SIPJS Console => NO RECORD FOUND at index 1")
                        console.log("==>> SIPJS Console => Checking if Index 0 calltype is CONSULT")
                        if (calls?.[0]?.response?.dialog?.callType === "CONSULT" || calls?.[0]?.response?.dialog?.callType === "EXTERNAL-CONSULT") {
                            console.log("==>> SIPJS Console => Index 0 calltype is CONSULT, so splicing it")
                            consultCalldata = calls[0]
                        }
                        else {
                            return
                        }
                    }

                    var sysdate1 = new Date();
                    var datetime = sysdate1.toISOString();
                    if (consultCalldata != null) {
                        consultCalldata.response.dialog.participants[0].mute = false;
                        consultCalldata.response.dialog.participants[0].stateChangeTime = datetime;
                        consultCalldata.response.dialog.participants[0].state = "DROPPED";
                        if (consultCalldata.response.dialog.callEndReason == "direct_transfered" || consultCalldata.response.dialog.callEndReason == "ATTENDED_TRANSFER" || consultCalldata.response.dialog.callEndReason == "EXTERNAL_ATTENDED_TRANSFER") {
                            consultCalldata.response.dialog.isCallEnded = 0;
                        } else {
                            consultCalldata.response.dialog.isCallEnded = 1;
                        }
                        consultCalldata.response.dialog.callEndReason = consultCalldata.response.dialog.callEndReason == null ? "AGENT-HANDLED" : consultCalldata.response.dialog.callEndReason;
                        consultCalldata.response.dialog.state = "DROPPED";
                        consultCalldata.response.dialog.isCallAlreadyActive = false;
                        var data = {}
                        data.response = consultCalldata.response
                        data.event = consultCalldata.event
                        const consultCalldataCopy = JSON.parse(JSON.stringify(data));
                        callback(consultCalldataCopy);
                        SendPostMessage(consultCalldataCopy);
                        if (consultCalldata.response.dialog.callEndReason === "PRE_EMPTED") {
                            setTimeout(() => {
                                phone_unhold(callback, calls[0].response.dialog.id)
                            }, 500); // 5000 milliseconds = 5 seconds
                        }
                        consultCalldata.response.dialog.callEndReason = null;
                        consultCalldata = null;
                        // clearTimeout(myTimeout);
                    }
                    var index = getCallIndex(dialogId);
                    calls.splice(index, 1);
                    if (calls.length != 0) {
                        setupRemoteMedia(calls[0].session, callback, calls[0].response.dialog.id);
                    }
                    break;
            }
        });

        //addsipcallback(sessionall, 'outbound', callback);
    } else {
        error('generalError', loginid, checkErrorReason("User_Not_Registered"), callback);
        // error('invalidState', loginid, "invalid action makeConsultCall", callback);
    }

    //sessionall.refer(consultSessioin);
}
/**
 * Initiate a consult call with queue.
 * This function allows an agent to initiate a consult call with the specified destination number and queue.
 *
 * @param {string} numberToTransfer - The number or extension to which the consult call is initiated (99887766).
 * @param {string} queue - The queue to which the call will be transferred.
 * @param {string} queuetype - The type of the queue.
 * @param {function} callback - The callback function to execute after initiating the consult call.
 * @returns {void}
 */
function makeConsultCall_queue(numberToTransfer, queue, queuetype, callback) {
    var res = lockFunction("makeConsultCall_queue", 500); // --- seconds cooldown
    if (!res) return;
    const undefinedParams = checkUndefinedParams(makeConsultCall_queue, [numberToTransfer, queue, queuetype, callback]);

    if (undefinedParams.length > 0) {
        // console.log(`Error: The following parameter(s) are undefined or null: ${undefinedParams.join(', ')}`);
        error("generalError", loginid, `Error: The following parameter(s) are undefined or null or empty: ${undefinedParams.join(', ')}`, callback);
        return;
    }

    if (calls && calls[0] && calls[0].session && calls[0].session.state !== SIP.SessionState.Established) {
        error('generalError', loginid, checkErrorReason("Consult_Customer_left"), callback);
        return;
    }

    var _mainSessionCallType = calls[0].response.dialog.callType
    if (_mainSessionCallType == "CONSULT_CONFERENCE" ||
        _mainSessionCallType == "BARGE_CONFERENCE" ||
        _mainSessionCallType == "CONSULT" ||
        _mainSessionCallType == "EXTERNAL-CONSULT" ||
        _mainSessionCallType == "ATTENDED_CONFERENCE" ||
        _mainSessionCallType == "EXTERNAL_CONSULT_CONFERENCE") {
        error('generalError', loginid, checkErrorReason("Consult_" + _mainSessionCallType), callback);
        return
    }
    if (calls && calls[1] && calls[1].session && calls[1].session.state != SIP.SessionState.Terminated) {
        error('generalError', loginid, checkErrorReason("Consult_Exist"), callback);
        return;
    }

    if (userAgent !== null && userAgent !== undefined && userAgent.transport.isConnected()) {
        // Target URI
        var sip_uri = SIP.UserAgent.makeURI('sip:' + numberToTransfer + "-" + queue + "@" + sipconfig.uri);
        // var sip_uri = SIP.UserAgent.makeURI('sip:' + calledNumber + "@" + sipconfig.uri);
        if (!sip_uri) {
            // console.error("Failed to create target URI.");
            error("generalError", loginid, checkErrorReason("Invalid_URI") + sip_id, callback);
            return;
        }
        // Create new Session instance in "initial" state
        var tempOptions = {
            earlyMedia: true,
        }
        consultSessioin = new SIP.Inviter(userAgent, sip_uri, tempOptions);
        const request = consultSessioin.request;

        request.extraHeaders.push('X-Calltype: CONSULT');


        let firstsesion = calls[0].response
        let customerNumber = ""
        // if (typeof firstsession.incomingInviteRequest !== 'undefined'){
        //     customerNumber = firstsession.incomingInviteRequest.message.from.uri.normal.user
        // }
        customerNumber = firstsesion.dialog.customerNumber

        // let destinationNumber = firstsession.incomingInviteRequest.message.headers["X-Destination-Number"];
        // destinationNumber = destinationNumber != undefined ? destinationNumber[0].raw : "0000";

        let destinationNumber = firstsesion.dialog.serviceIdentifier

        request.extraHeaders.push('X-CustomerNumber: ' + customerNumber);
        request.extraHeaders.push('X-Destination-Number: ' + destinationNumber);
        request.extraHeaders.push('X-Media-Type:' + "audio")
        // Options including delegate to capture response messages
        const inviteOptions1 = {
            requestDelegate: {
                onAccept: (response) => {
                    console.log("==>> SIPJS CONSOLE => Consult Call onAccept response = ", response);
                },
                onReject: (response) => {
                    console.log("==>> SIPJS CONSOLE => onReject response = ", response);

                    const { displayMessage, callEndReason } = resolveSipRejectError(
                        response,
                        "Consult_Queue_Transaction_Error"
                    );
                    error("generalError", loginid, displayMessage, callback);

                    if (calls[1]) {
                        calls[1].response.dialog.callEndReason = callEndReason;
                    } else if (
                        calls[0] && ["CONSULT", "EXTERNAL-CONSULT"].includes(calls[0].response.dialog.callType)) {
                        calls[0].response.dialog.callEndReason = callEndReason;
                    }
                },

                onCancel: (response) => {
                    console.log("==>> SIPJS CONSOLE => onCancel response = ", response);
                    // Normal cancel/hangup is handled by SessionState.Terminated (AGENT-HANDLED).
                },
                onBye: (response) => {
                    console.log("==>> SIPJS CONSOLE => onBye response = ", response);
                    // Normal hangup is handled by SessionState.Terminated (AGENT-HANDLED).
                },
                onTerminate: (response) => {
                    console.log("==>> SIPJS CONSOLE => onTerminate response = ", response);
                    // Normal hangup is handled by SessionState.Terminated (AGENT-HANDLED).
                },
                onProgress: (response) => {
                    console.log("==>> SIPJS CONSOLE => Consult Call INITIATED response = onProgress", response);

                    // checking if Index 0 Call exist and its callType should not be Consult
                    if (!calls || !calls[0] || !calls[0].response || !calls[0].response.dialog?.callType || calls[0].response.dialog.callType === "CONSULT" || calls[0].response.dialog.callType === "EXTERNAL-CONSULT") {
                        //if callType is Consult, terminating it beacase at Index 0 it should never be Consult.
                        console.log("==>> SIPJS CONSOLE => Terminating Call because Calltype is Consult at Index 0, which is not Allowed")
                        terminate_call(calls[0].response.dialog.id);
                        return
                    }

                    consultCalldata = null;
                    consultCalldata = calls[1];

                    const sysdate = new Date();
                    var datetime = sysdate.toISOString();
                    consultCalldata.response.dialog.participants[0].state = "INITIATED";
                    consultCalldata.response.dialog.state = "INITIATED";
                    // consultCalldata.response.dialog.participants[0].startTime = datetime;
                    consultCalldata.response.dialog.participants[0].state = "INITIATED";
                    consultCalldata.response.dialog.state = "INITIATED";
                    // var { session, ...dataToPass } = consultCalldata;
                    // callback(dataToPass);
                    var data = {}
                    data.response = consultCalldata.response
                    data.event = consultCalldata.event
                    const consultCalldataCopy = JSON.parse(JSON.stringify(data));
                    callback(consultCalldataCopy);
                    SendPostMessage(consultCalldataCopy);
                },
                onTrying: (response) => {
                    console.log("==>> SIPJS CONSOLE => Consult Call INITIATING response = onTrying", response);
                    if (response.message) {
                        consultCalldata = null;
                        consultCalldata = JSON.parse(JSON.stringify(ConsultCalldata1));
                        const sysdate = new Date();
                        var datetime = sysdate.toISOString();
                        var dialedNumber = response.message.to.uri.raw.user;
                        consultCalldata.response.loginId = loginid;
                        consultCalldata.response.dialog.fromAddress = loginid;
                        consultCalldata.response.dialog.callType = 'CONSULT';
                        consultCalldata.response.dialog.ani = dialedNumber;
                        consultCalldata.response.dialog.dnis = dialedNumber;
                        consultCalldata.response.dialog.serviceIdentifier = destinationNumber;
                        consultCalldata.response.dialog.id = response.message.callId;
                        consultCalldata.response.dialog.dialedNumber = dialedNumber;
                        consultCalldata.response.dialog.customerNumber = dialedNumber;
                        consultCalldata.response.dialog.participants[0].mediaAddress = loginid;
                        // consultCalldata.response.dialog.participants[0].startTime = datetime;
                        consultCalldata.response.dialog.participants[0].alertingTime = datetime;
                        consultCalldata.response.dialog.participants[0].stateChangeTime = datetime;
                        consultCalldata.response.dialog.participants[0].startTime = datetime;
                        consultCalldata.response.dialog.participants[0].state = "INITIATING";
                        consultCalldata.response.dialog.state = "INITIATING";
                        consultCalldata.response.dialog.mediaType = "audio"
                        consultCalldata.response.dialog.channelType = "VOICE"
                        // var { session, ...dataToPass } = consultCalldata;
                        // callback(dataToPass);
                        var data = {}
                        data.response = consultCalldata.response
                        data.event = consultCalldata.event
                        const consultCalldataCopy = JSON.parse(JSON.stringify(data));
                        callback(consultCalldataCopy);
                        SendPostMessage(consultCalldataCopy)

                        if (consultCalldata.additionalDetail) {
                            consultCalldata.additionalDetail.localMediaType = "audio"
                            consultCalldata.additionalDetail.remoteMediaType = "audio"

                        }
                        else {
                            consultCalldata.additionalDetail = {
                                localMediaType: "audio",
                                remoteMediaType: "audio"
                            }
                        }

                        var index = getCallIndex(consultCalldata.response.dialog.id);
                        if (index == -1) {
                            consultCalldata.session = consultSessioin;
                            calls.push(consultCalldata);
                        }

                        console.log("==>> SIPJS CONSOLE => calls[0].response.dialog.callType ->", calls[0].response.dialog.callType)
                        console.log("==>> SIPJS CONSOLE => If Calltype is CONSULT, TerminatingCall")

                        // checking if Index 0 Call exist and its callType should not be Consult
                        if (!calls || !calls[0] || !calls[0].response || !calls[0].response.dialog?.callType || calls[0].response.dialog.callType === "CONSULT" || calls[0].response.dialog.callType === "EXTERNAL-CONSULT") {
                            //if callType is Consult, terminating it beacase at Index 0 it should never be Consult.
                            console.log("==>> SIPJS CONSOLE => Terminating Call because Calltype is Consult at Index 0, which is not Allowed")
                            terminate_call(calls[0].response.dialog.id);
                            return
                        }
                        // setupRemoteMedia is already called on Hold Request
                        phone_hold(callback, calls[0].response.dialog.id);
                        setTimeout(() => {
                            //locking Phone_hold for another 1500ms becasue call is answered by MediaSever way to Fast.
                            lockFunction("phone_hold", 1500)
                        }, 1500)
                    }
                },
                onRedirect: (response) => {
                    console.log("==>> SIPJS CONSOLE => Negative response = onRedirect" + response);
                },
                onRefer: (response) => {
                    console.log("==>> SIPJS CONSOLE => onRefer response = onRefer" + response);
                }
            },
            sessionDescriptionHandlerOptions: {
                constraints: {
                    audio: true,
                    video: false,
                    action: "CALL_INITIATE",
                    mediaType: "AUDIO"
                },
                iceGatheringTimeout: sipconfig.iceGatheringTimeout
            },
            // earlyMedia: true,
            requestOptions: {
                extraHeaders: [
                    'X-Referred-By-Someone: Username'
                ]
            },
        };

        if (calls && calls[0] && calls[0].session && calls[0].session.state == SIP.SessionState.Established) {
            // Send initial INVITE
            consultSessioin.invite(inviteOptions1)
                .then((request) => {
                    console.log("==>> SIPJS CONSOLE => Successfully sent INVITE request = ", request);

                    if (consultSessioin.outgoingRequestMessage) {

                    }
                })
                .catch((errorr) => {
                    console.error("==>> SIPJS CONSOLE => Failed to send INVITE", errorr.message);
                    error("generalError", loginid, checkErrorReason(errorr.message), callback);

                });
        }
        else { console.log("==>> SIPJS CONSOLE => Call doesnt Exist at Index 0, So not Intiating Consult Call") }

        consultSessioin.delegate = {
            onBye(bye) {
                console.log("==>> SIPJS Console => Consult Call Queue onBye ->", bye)
                consultCalldata = null
                consultCalldata = calls[1]
                if (bye.incomingByeRequest.message.headers["X-Call-Dropped-Custom-Reason"] != undefined) {
                    consultCalldata.response.dialog.callEndReason = bye.incomingByeRequest.message.headers["X-Call-Dropped-Custom-Reason"][0]['raw'];
                }
                else {
                    const match = bye.incomingByeRequest.message.data.match(/text="([^"]+)"/);
                    if (match && match[1]) {
                        // if(consultCalldata.response.dialog.callEndReason != "consult-transfer"){
                        consultCalldata.response.dialog.callEndReason = match[1];
                        // }
                    }
                }

                // Special Case of External Consult Transfer
                if (consultCalldata.response.dialog.callEndReason === "ATTENDED_TRANSFER" && consultCalldata.response.dialog.callType === "EXTERNAL-CONSULT") {
                    consultCalldata.response.dialog.callEndReason = "EXTERNAL_ATTENDED_TRANSFER";
                    // Manually setting CallEndReason for index 0 call incase of Consult Transfer on External Number
                    calls[0].response.dialog.callEndReason = "EXTERNAL_ATTENDED_TRANSFER";
                }
                console.log("==>> SIPJS CONSOLE => Consult Call EndReason : ", consultCalldata.response.dialog.callEndReason)
            },
            onCancel: (invitation) => {
                console.log("==>> SIPJS CONSOLE => we received a onCancel received", invitation);
                //invitation.accept();
            },
        };

        consultSessioin.stateChange.addListener((newState) => {
            console.log(newState);
            var dialogId;
            if (consultSessioin.incomingInviteRequest) {
                dialogId = consultSessioin.incomingInviteRequest.message.headers["X-Call-Id"] != undefined ? consultSessioin.incomingInviteRequest.message.headers["X-Call-Id"][0]['raw'] : consultSessioin.incomingInviteRequest.message.headers["Call-ID"][0]['raw'];
            } else {
                dialogId = consultSessioin.outgoingRequestMessage.headers["X-Call-Id"] != undefined ? consultSessioin.outgoingRequestMessage.headers["X-Call-Id"][0]['raw'] : consultSessioin.outgoingRequestMessage.headers["Call-ID"][0];
            }
            var index = getCallIndex(dialogId);
            switch (newState) {
                case SIP.SessionState.Establishing:
                    console.log("==>> SIPJS CONSOLE => Ringing");

                    break;
                case SIP.SessionState.Established:
                    console.log("==>> SIPJS CONSOLE => consult call Answered");

                    consultSessioin = null
                    consultSessioin = calls[1].session

                    consultCalldata = null
                    consultCalldata = calls[1]

                    setupRemoteMedia(consultSessioin, callback, dialogId);


                    var call_type1;
                    if (consultSessioin.incomingInviteRequest) {

                        if (consultSessioin.incomingInviteRequest.message.from._displayName === 'conference') {
                            call_type1 = 'conference'
                        } else {
                            call_type1 = 'incoming'
                        }
                    } else {
                        call_type1 = 'outbound'
                    }
                    const sysdate = new Date();
                    var datetime = sysdate.toISOString();
                    consultSessioin.startTime = datetime;

                    // console.log(event);
                    if (call_type1 != 'inbound') {
                        call_variable_array = [];
                        if (consultSessioin.outgoingRequestMessage.headers['X-Call-Variable0']) {
                            call_variable_array.push({
                                "name": 'callVariable0',
                                "value": data.headers['X-Call-Variable0'][0]['raw']
                            })
                        } else {
                            call_variable_array.push({
                                "name": 'callVariable0',
                                "value": ''
                            })
                        }
                        for (let index = 1; index < 10; index++) {
                            if (consultSessioin.outgoingRequestMessage.headers['X-Call-Variable' + index]) {
                                call_variable_array.push({
                                    "name": 'callVariable' + index,
                                    "value": data.headers['X-Call-Variable' + index]
                                })
                            }
                        }
                        consultCalldata.response.dialog.callVariables.CallVariable = call_variable_array;
                    }
                    consultCalldata.response.dialog.participants[0].stateChangeTime = datetime;
                    consultCalldata.response.dialog.participants[0].startTime = datetime;
                    consultCalldata.response.dialog.participants[0].state = "ACTIVE";
                    consultCalldata.response.dialog.state = "ACTIVE";
                    consultCalldata.response.dialog.isCallEnded = 0;
                    consultCalldata.response.dialog.participants[0].mute = false;
                    var { session, ...dataToPass } = consultCalldata;
                    var data = {}
                    data.response = consultCalldata.response
                    data.event = consultCalldata.event
                    const dataToPassCopy = JSON.parse(JSON.stringify(data));
                    callback(dataToPassCopy);
                    SendPostMessage(dataToPassCopy);
                    if (index != -1) {
                        calls[index].response = consultCalldata.response;
                    }
                    break;
                case SIP.SessionState.Terminated:
                    console.log("==>> SIPJS CONSOLE => Consult Call Ended");

                    consultCalldata = null
                    consultCalldata = calls[1]

                    if (consultCalldata == null) {
                        console.log("==>> SIPJS Console => NO RECORD FOUND at index 1")
                        console.log("==>> SIPJS Console => Checking if Index 0 calltype is CONSULT")
                        if (calls?.[0]?.response?.dialog?.callType === "CONSULT" || calls?.[0]?.response?.dialog?.callType === "EXTERNAL-CONSULT") {
                            console.log("==>> SIPJS Console => Index 0 calltype is CONSULT, so splicing it")
                            consultCalldata = calls[0]
                        }
                        else {
                            return
                        }
                    }

                    var sysdate1 = new Date();
                    var datetime = sysdate1.toISOString();
                    if (consultCalldata != null) {
                        consultCalldata.response.dialog.participants[0].mute = false;
                        consultCalldata.response.dialog.participants[0].stateChangeTime = datetime;
                        consultCalldata.response.dialog.participants[0].state = "DROPPED";
                        if (consultCalldata.response.dialog.callEndReason == "direct_transfered" || consultCalldata.response.dialog.callEndReason == "ATTENDED_TRANSFER" || consultCalldata.response.dialog.callEndReason == "EXTERNAL_ATTENDED_TRANSFER") {
                            consultCalldata.response.dialog.isCallEnded = 0;
                        } else {
                            consultCalldata.response.dialog.isCallEnded = 1;
                        }
                        consultCalldata.response.dialog.state = "DROPPED";
                        consultCalldata.response.dialog.isCallAlreadyActive = false;
                        console.log("==>> SIPJS CONSOLE => Consult Call EndReason : "+ consultCalldata.response.dialog.callEndReason)
                        consultCalldata.response.dialog.callEndReason = consultCalldata.response.dialog.callEndReason == null ? "AGENT-HANDLED" : consultCalldata.response.dialog.callEndReason;
                        var data = {}
                        data.response = consultCalldata.response
                        data.event = consultCalldata.event
                        const consultCalldataCopy = JSON.parse(JSON.stringify(data));
                        callback(consultCalldataCopy);
                        SendPostMessage(consultCalldataCopy);
                        if (consultCalldata.response.dialog.callEndReason === "PRE_EMPTED") {
                            setTimeout(() => {
                                phone_unhold(callback, calls[0].response.dialog.id)
                            }, 500); // 5000 milliseconds = 5 seconds
                        }
                        consultCalldata.response.dialog.callEndReason = null;
                        consultCalldata = null;
                        // clearTimeout(myTimeout);
                    }
                    calls.splice(index, 1);
                    if (calls.length != 0) {
                        setupRemoteMedia(calls[0].session, callback, calls[0].response.dialog.id);
                    }
                    break;
            }
        });

        //addsipcallback(sessionall, 'outbound', callback);
    } else {
        error('generalError', loginid, checkErrorReason("User_Not_Registered"), callback);
    }
}
/**
 * Initiate a consult transfer call.
 * This function allows an agent to transfer a customer call to a consulted agent.
 *
 * @param {function} callback - The callback function to execute after initiating the consult transfer call.
 * @returns {void}
 */
function makeConsultTransferCall(callback) {
    //Consult call end reason = ATTENDED_TRANSFER

    var res = lockFunction("makeConsultTransferCall", 500); // --- seconds cooldown
    if (!res) return;
    sessionall = calls[0].session;
    consultSessioin = calls[1].session;
    if (!sessionall || !consultSessioin) {

        const errorMsg = !sessionall
            ? "Consult_Transfer_Customer_Left"
            : "Consult_Transfer_Consult_End";

        error('generalError', loginid, checkErrorReason(errorMsg), callback);
        return
    }
    if (sessionall.state === SIP.SessionState.Terminated) {
        console.log("==>> SIPJS CONSOLE => C1 and A1 sesison is terminated so we cannot initiate Consult Trasfer")
        error('generalError', loginid, checkErrorReason("Consult_Transfer_Customer_Left"), callback);
        return
    }
    if (consultSessioin.state === SIP.SessionState.Terminated) {
        console.log("==>> SIPJS CONSOLE => A2 and A1 sesison is terminated so we cannot initiate Consult Trasfer")
        error('generalError', loginid, checkErrorReason("Consult_Transfer_Consult_End"), callback);
        return
    }
    if (consultSessioin.state !== SIP.SessionState.Established) {
        console.log("==>> SIPJS CONSOLE => Assisted Agent hasn't picked up the call. Please try again after the agent has accepted the consult call") //Consult_Transfer_Consult_Not_Answered
        error('generalError', loginid, checkErrorReason("Consult_Transfer_Consult_Not_Answered"), callback);
        return
    }

    var members = []
    for (var i = 0; i < calls[0].response.dialog.participants.length; i++) {
        var _member = calls[0].response.dialog.participants[i].mediaAddress
        members.push(_member)
    }
    for (var i = 0; i < calls[1].response.dialog.participants.length; i++) {
        var _member = calls[1].response.dialog.participants[i].mediaAddress
        members.push(_member)
    }


    let uniqueMembers = [...new Set(members)];
    if (uniqueMembers.length > 4) {
        error('generalError', loginid, checkConsultTransferErrorReason("LIMIT_REACHED"), callback);
        return
    }

    // unhold consult session if already on hold
    if (calls[1].response.dialog.state == "HELD") {
        var index = getCallIndex(calls[1].response.dialog.id);
        var newsessionall = null
        if (index !== -1) {
            newsessionall = calls[index];
        }
        newsessionall.session.invite({
            sessionDescriptionHandlerOptions: {
                hold: false,
                // offerOptions: {
                //     iceRestart: true
                // }
            },
            requestDelegate: {
                onAccept: (response) => {
                    console.log("==>> SIPJS Console => makeConsultTransferCall onAccept, Consult Call was on hold, so unholding before Consult Transfer")
                    var dialogId = calls[1].response.dialog.id
                    // sendDtmf("*", dialogId, callback, "makeConsultTransferCall")
                    // sendDtmf("A", dialogId, callback, "makeConsultTransferCall")

                    internalDtmfSend(["*", "A"], dialogId, callback, "Consult_Transfer")
                },
                onReject: (response) => {
                    console.log("==>> SIPJS Console => makeConsultTransferCall (UNHOLD onReject) -> ", response)
                    newsessionall.session.dialog.signalingStateRollback();
                    newsessionall.session.sessionDescriptionHandler.peerConnection.setLocalDescription({ type: "rollback" })
                }
            }
        })
    }
    else {
        var dialogId = calls[1].response.dialog.id
        // sendDtmf("*", dialogId, callback, "makeConsultTransferCall")
        // sendDtmf("A", dialogId, callback, "makeConsultTransferCall")

        internalDtmfSend(["*", "A"], dialogId, callback, "Consult_Transfer")
    }
}
/**
 * Toggle stream on/off for a given dialog.
 *
 * @param {string} dialogId - The ID of the dialog for which stream conversion is performed.
 * @param {function} callback - The callback function to execute after stream conversion.
 * @param {string} streamType - The type of stream to convert (video / screen-share).
 * @param {string} streamStatus - The status to set for the stream (on / off).
 * @returns {void}
 */
function callConvert(dialogId, callback, streamType, streamStatus) {
    var res = lockFunction("callConvert", 500); // --- seconds cooldown
    if (!res) return;
    const undefinedParams = checkUndefinedParams(callConvert, [streamType, streamStatus, callback, dialogId]);

    if (undefinedParams.length > 0) {
        // console.log(`Error: The following parameter(s) are undefined or null: ${undefinedParams.join(', ')}`);
        error("generalError", loginid, `Error: The following parameter(s) are undefined or null or empty: ${undefinedParams.join(', ')}`, callback);
        return;
    }
    var index = getCallIndex(dialogId);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index].session;
    }

    if (!sessionall) {
        error('invalidState', loginid, "invalid action ConvertCall", callback);
        return;
    }

    /****/
    var _tempSession = calls[index]
    if (_tempSession.response.dialog.callType == "CONSULT" ||
        _tempSession.response.dialog.callType == "EXTERNAL-CONSULT" ||
        _tempSession.response.dialog.callType == "CONSULT_CONFERENCE" ||
        _tempSession.response.dialog.callType == "EXTERNAL_CONSULT_CONFERENCE" ||
        _tempSession.response.dialog.callType == "BARGE_CONFERENCE" ||
        _tempSession.response.dialog.callType == "ATTENDED_CONFERENCE" ||
        _tempSession.response.dialog.callType == "CONSULT_TRANSFER") {
        error("generalError", loginid, checkErrorReason("Stream_" + _tempSession.response.dialog.callType), callback);
        return;
    }
    /****/

    let peer = sessionall.sessionDescriptionHandler.peerConnection;
    let senders = peer.getSenders();
    if (!senders.length) return;

    var videoTrackcheck = false
    const sysdate = new Date();

    if (streamStatus === "off") {
        senders.forEach(sender => {
            if (sender.track && sender.track.kind === "video") {
                sender.track.stop()
            }
        });
        _tempSession.additionalDetail.localMediaType = "audio"
        setupRemoteMedia(sessionall, callback, dialogId)
        publishMediaStreamUpdateEvent(dialogId, streamType, streamStatus, callback)
        return
    }

    senders.forEach(async sender => {
        if (sender && sender.track && sender.track.kind && sender.track.kind === "video") {
            videoTrackcheck = true
            if (sender.track.readyState === "live") {
                sender.track.stop()
            }

            var sysdate1 = new Date();
            var datetime = sysdate1.toISOString();

            if (streamType === "video") {
                await navigator.mediaDevices.getUserMedia({ video: true }).then(async (videoStream) => {
                    let videoTrack = videoStream.getVideoTracks()[0]
                    await sender.replaceTrack(videoTrack)
                    _tempSession.additionalDetail.localMediaType = "video"
                    setupRemoteMedia(sessionall, callback, dialogId)
                    }).catch(async (errors) => {
                        var customResponse = await mediaDeviceErrors(errors.name, "video")
                        console.error("==>> SIPJS CONSOLE => callConvert Turing on Camera Failed -> ",customResponse)
                        error('generalError', loginid, `${customResponse.alert}`, callback);

                        const _mediaStreamUpdate = createMediaStreamUpdateEvent(
                            {
                                loginId: loginid,
                                status: "error",
                                dialogId: dialogId,
                                eventRequest: "local",
                                stream: streamType,
                                streamStatus: streamStatus,
                                errorReason: customResponse.reason
                            });

                    callback(_mediaStreamUpdate);
                    SendPostMessage(_mediaStreamUpdate);

                        const mediaPermissionStatus = createMediaPermissionStatusUpdateEvent(dialogId,"video","denied",customResponse.alert)
                        callback(mediaPermissionStatus);
                        SendPostMessage(mediaPermissionStatus);

                        return Promise.reject(customResponse.alert)
                    })
            }
            else if (streamType === "screenshare") {
                await navigator.mediaDevices.getDisplayMedia({ video: true }).then(async (videoStream) => {
                    let videoTrack = videoStream.getVideoTracks()[0]
                    await sender.replaceTrack(videoTrack);
                    _tempSession.additionalDetail.localMediaType = "screenshare"
                    setupRemoteMedia(sessionall, callback, dialogId)
                }).catch(async (errors) => {
                    var customResponse = await displayDeviceErrors(errors.name)
                    console.error("==>> SIPJS CONSOLE => callConvert Turing on Screen-share Failed -> ", customResponse)
                    error('generalError', loginid, `${customResponse.alert}`, callback);

                    const _mediaStreamUpdate = createMediaStreamUpdateEvent(
                        {
                            loginId: loginid,
                            status: "error",
                            dialogId: dialogId,
                            eventRequest: "local",
                            stream: streamType,
                            streamStatus: streamStatus,
                            errorReason: customResponse.reason
                        });

                    callback(_mediaStreamUpdate);
                    SendPostMessage(_mediaStreamUpdate);

                    return Promise.reject(customResponse.alert)
                })
            }

            publishMediaStreamUpdateEvent(dialogId,streamType ,streamStatus, callback)

        }
    })

    if (!videoTrackcheck) {
        _tempSession.additionalDetail.localMediaType = streamType
        sendingReInvite(dialogId, callback, streamType)
    }
}

function addsipcallback(temp_session, call_type, callback) {
    try {
        //
        remotesession = temp_session;
        temp_session.stateChange.addListener(async (newState) => {
            console.log(newState);
            var dialogId;
            if (temp_session.incomingInviteRequest) {
                dialogId = temp_session.incomingInviteRequest.message.headers["X-Call-Id"] != undefined ? temp_session.incomingInviteRequest.message.headers["X-Call-Id"][0]['raw'] : temp_session.incomingInviteRequest.message.headers["Call-ID"][0]['raw'];
            } else {
                dialogId = temp_session.outgoingRequestMessage.headers["X-Call-Id"] != undefined ? temp_session.outgoingRequestMessage.headers["X-Call-Id"][0]['raw'] : temp_session.outgoingRequestMessage.headers["Call-ID"][0];
            }
            var index = getCallIndex(dialogId);
            var sessionall = null
            if (index != -1) {
                dialogStatedata.response = calls[index].response;
            }
            switch (newState) {
                case SIP.SessionState.Establishing:
                    console.log("==>> SIPJS CONSOLE => Ringing");

                    break;
                case SIP.SessionState.Established:
                    console.log("==>> SIPJS CONSOLE => Answered");

                    dialogStatedata = null
                    dialogStatedata = calls[0]

                    temp_session = null
                    temp_session = calls[0].session

                    setupRemoteMedia(temp_session, callback, dialogId);


                    var call_type1;
                    if (temp_session.incomingInviteRequest) {

                        if (temp_session.incomingInviteRequest.message.from._displayName === 'conference') {
                            call_type1 = 'conference'
                        } else {
                            call_type1 = 'incoming'
                        }
                    } else {
                        call_type1 = 'outbound'
                    }
                    const sysdate = new Date();
                    var datetime = sysdate.toISOString();
                    temp_session.startTime = datetime;

                    // console.log(event);
                    if (call_type != 'inbound') {
                        call_variable_array = [];
                        if (temp_session.outgoingRequestMessage.headers['X-Call-Variable0']) {
                            call_variable_array.push({
                                "name": 'callVariable0',
                                "value": data.headers['X-Call-Variable0'][0]['raw']
                            })
                        } else {
                            call_variable_array.push({
                                "name": 'callVariable0',
                                "value": ''
                            })
                        }
                        for (let index = 1; index < 10; index++) {
                            if (temp_session.outgoingRequestMessage.headers['X-Call-Variable' + index]) {
                                call_variable_array.push({
                                    "name": 'callVariable' + index,
                                    "value": data.headers['X-Call-Variable' + index]
                                })
                            }
                        }
                        dialogStatedata.response.dialog.callVariables.CallVariable = call_variable_array;
                        dialogStatedata.response.dialog.participants[0].stateChangeTime = datetime;
                        dialogStatedata.response.dialog.participants[0].startTime = datetime;
                        // dialogStatedata.response.dialog.participants[0].alertingTime = datetime;
                        dialogStatedata.response.dialog.participants[0].state = "ACTIVE";
                        dialogStatedata.response.dialog.state = "ACTIVE";
                        dialogStatedata.response.dialog.isCallEnded = 0;
                    } else {
                        dialogStatedata.response.dialog.participants[0].stateChangeTime = datetime;
                        dialogStatedata.response.dialog.participants[0].startTime = datetime;
                        // dialogStatedata.response.dialog.participants[0].alertingTime = datetime;
                        dialogStatedata.response.dialog.participants[0].state = "ACTIVE";
                        dialogStatedata.response.dialog.state = "ACTIVE";
                        dialogStatedata.response.dialog.isCallEnded = 0;

                    }
                    var data = {}
                    data.event = dialogStatedata.event
                    data.response = dialogStatedata.response
                    var dialogstatemedia = JSON.parse(JSON.stringify(data));
                    dialogstatemedia.response.dialog.participants[0].mute = false;
                    callback(dialogstatemedia);
                    SendPostMessage(dialogstatemedia);
                    if (index != -1) {
                        calls[index].response = dialogStatedata.response;
                        if (dialogStatedata.response.dialog.callType == "OUT" || dialogStatedata.response.dialog.callType == "OTHER_IN" || dialogStatedata.response.dialog.callType == "MONITORING") {
                            calls[index].event = "dialogState";
                        }
                        // removing Dummy Video & Publish Event
                        removeDummyTracks(dialogStatedata.response.dialog.id, callback)
                    }

                    break;
                case SIP.SessionState.Terminated:
                    console.log("==>> SIPJS CONSOLE => Ended");

                    dialogStatedata = null
                    dialogStatedata = calls[0]

                    var sysdate1 = new Date();
                    var datetime = sysdate1.toISOString();
                    if (dialogStatedata != null) {
                        dialogStatedata.response.dialog.participants[0].mute = false;
                        dialogStatedata.response.dialog.participants[0].stateChangeTime = datetime;
                        dialogStatedata.response.dialog.participants[0].state = "DROPPED";
                        if (dialogStatedata.response.dialog.callEndReason == "direct_transfered" ||
                            dialogStatedata.response.dialog.callEndReason == "External_direct_transfered" ||
                            dialogStatedata.response.dialog.callEndReason == "EXTERNAL_ATTENDED_TRANSFER" ||
                            dialogStatedata.response.dialog.callEndReason == "ATTENDED_TRANSFER" ||
                            dialogStatedata.response.dialog.callEndReason == "CONSULT_CONFERENCE" ||
                            dialogStatedata.response.dialog.callEndReason == "ATTENDED_CONFERENCE" ||
                            dialogStatedata.response.dialog.callEndReason == "BARGE_CONFERENCE" ||
                            dialogStatedata.response.dialog.callEndReason == "EXTERNAL_CONSULT_CONFERENCE") {
                            //  dialogStatedata.response.dialog.callEndReason = "transfered";
                            dialogStatedata.response.dialog.isCallEnded = 0;
                            if (calls[1]?.response?.dialog?.callEndReason == null && dialogStatedata?.response?.dialog?.callEndReason === "ATTENDED_TRANSFER") {
                                calls[1].response.dialog.callEndReason = dialogStatedata.response.dialog.callEndReason;
                            }
                        } else {
                            // dialogStatedata.response.dialog.callEndReason = null;
                            dialogStatedata.response.dialog.isCallEnded = 1;
                        }
                        dialogStatedata.response.dialog.callEndReason = dialogStatedata.response.dialog.callEndReason == null ? "AGENT-HANDLED" : dialogStatedata.response.dialog.callEndReason;
                        dialogStatedata.response.dialog.state = "DROPPED";
                        dialogStatedata.response.dialog.isCallAlreadyActive = false;
                        var data = {}
                        data.event = dialogStatedata.event
                        data.response = dialogStatedata.response
                        const dialogStatedataCopy = JSON.parse(JSON.stringify(data));
                        callback(dialogStatedataCopy);
                        console.log('==>> SIPJS CONSOLE -> Call EndReason :', dialogStatedata.response.dialog.callEndReason);
                        SendPostMessage(dialogStatedataCopy);
                        dialogStatedata.response.dialog.callEndReason = null;
                        // clearTimeout(myTimeout);
                    }
                     // End All Calls if C1 Leaves
                    dialogId = dialogStatedata.response.dialog.id
                    await terminateAllRemainingCalls().then(() => {
                        calls.splice(index, 1)
                    })
                    break;
            }
        });
        temp_session.delegate = {
            onCancel: (invitation) => {
                console.log("==>> SIPJS CONSOLE => onCancel received", invitation);
                var dialogId;
                if (temp_session.incomingInviteRequest) {
                    dialogId = temp_session.incomingInviteRequest.message.headers["X-Call-Id"] != undefined ? temp_session.incomingInviteRequest.message.headers["X-Call-Id"][0]['raw'] : temp_session.incomingInviteRequest.message.headers["Call-ID"][0]['raw'];
                } else {
                    dialogId = temp_session.outgoingRequestMessage.message.headers["X-Call-Id"] != undefined ? temp_session.outgoingRequestMessage.message.headers["X-Call-Id"][0]['raw'] : temp_session.outgoingRequestMessage.message.headers["Call-ID"][0]['raw'];
                }
                var index = getCallIndex(dialogId);
                var sessionall = null
                if (index != -1) {
                    sessionall = calls[index]
                }
                const match = invitation.incomingCancelRequest.data.match(/text="([^"]+)"/);

                if (match && match[1]) {
                    sessionall.response.dialog.callEndReason = match[1];
                } else {
                    sessionall.response.dialog.callEndReason = "Canceled";
                }
                //invitation.accept();
            },
            onFailed: (invitation) => {
                console.log("==>> SIPJS CONSOLE => onFailed received", invitation);
                //invitation.accept();
            },
            onAccepted: (invitation) => {
                console.log("==>> SIPJS CONSOLE => onAccepted received", invitation);
                //invitation.accept();
            },
            onrejectionhandled: (invitation) => {
                console.log("==>> SIPJS CONSOLE => onrejectionhandled received", invitation);
                //invitation.accept();
            },
            onunhandledrejection: (invitation) => {
                console.log("==>> SIPJS CONSOLE => onunhandledrejection received", invitation);
                //invitation.accept();
            },
            onTerminated: (invitation) => {
                console.log("==>> SIPJS CONSOLE => onTerminated received", invitation);
                //invitation.accept();
            },
            onTerminate: (invitation) => {
                console.log("==>> SIPJS CONSOLE => onTerminate received", invitation);
                //invitation.accept();
            },
            onRefer: (refer) => {
                console.log('==>> SIPJS CONSOLE => onRefer received : ', refer)
            }

        };
        //

    } catch (e) {
        console.error("==>> SIPJS CONSOLE => Error on addSipCallback : ", e);
        error('generalError', loginid, checkErrorReason("CUSTOM_UNKNOWN_ERROR"), callback);
    }
}
/**
 * Send DTMF tones in a session.
 *
 * @param {string} message - The DTMF message to send.
 * @param {string} dialogId - The ID of the dialog where DTMF tones will be sent.
 * @param {function} callback - The callback function to execute after sending DTMF.
 * @returns {void}
 */
function sendDtmf(message, dialogId, callback) {
    var index = getCallIndex(dialogId);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
        if (sessionall.session.state !== SIP.SessionState.Established) {
            if (typeof callback === "function")
                error('invalidState', loginid, "invalid action SendDtmf", callback);
            return;
        }
        if (sessionall.response.dialog.state == "HELD") {
            console.log("==>> SIPJS CONSOLE => Blocking DTMF during Hold !")
            return
        }
        const options = {
            requestOptions: {
                body: {
                    contentDisposition: "render",
                    contentType: "application/dtmf-relay",
                    content: "Signal=" + message + "\r\nDuration=150"
                }
            },
            requestDelegate: {
                onAccept: (response) => {
                    console.log("==>> SIPJS Console => DTMF onAccept")
                    var event = {
                        "event": "DTMF",
                        "response":
                        {
                            "loginId": loginid,
                            "type": 1,
                            "description": "Success",
                        }
                    }
                    const eventCopy = JSON.parse(JSON.stringify(event));
                    callback(eventCopy);
                    SendPostMessage(eventCopy);
                },
                onReject: (response) => {
                    console.log("==>> SIPJS Console => DTMF onReject", response)
                    error("generalError", loginid, checkErrorReason("DTMF_Transaction_Error"), callback);
                }
            }
        };
        sessionall.session.info(options)
            .catch((error) => {
                // Actions when DTMF fails
                console.error("==>> SIPJS CONSOLE => Error Sending Dtmf :", error);
                var event = {
                    "event": "DTMF",
                    "response":
                    {
                        "loginId": loginid,
                        "type": 0,
                        "description": "Failed " + error,
                    }
                }
                const eventCopy = JSON.parse(JSON.stringify(event));
                callback(eventCopy);
                SendPostMessage(eventCopy);
            });;
    }
}
window.addEventListener('beforeunload', (event) => {
    //need to check here.
    shouldBeConnected = false;
    again_register = false;
    var droppedReason = loginid + "_REFRESH"
    terminateAllCalls(droppedReason);
    call_variable_array = {};
    dialogStatedata = null;
    invitedata = null;
    outboundDialingdata = null;
    if (userAgent) userAgent.stop()
});
if (window.addEventListener)
    window.addEventListener("message", function (e) {
        if (e.data.SourceType == 'CTI' && e.data.calledNumber) {
            initiate_call(e.data.calledNumber, e.data.Destination_Number, "audio", callbackFunction, e.data.callType, "0000");
        }
    });

/**
 * Clean SIP logout: end calls → UNREGISTER → stop UserAgent.
 * Returns a Promise so Agent Desk can wait before navigating/reloading.
 */
function loader3(callback) {
    if (!userAgent && !registerer) {
        console.log("==>> SIPJS CONSOLE => Logout skipped, no active SIP session");
        return Promise.resolve();
    }

    // Stop reconnect loops while we intentionally tear down.
    shouldBeConnected = false;
    again_register = false;

    var droppedReason = (loginid || "agent") + "_FORCE-LOGOUT";
    terminateAllCalls(droppedReason);

    // Allow BYE/CANCEL to leave before UNREGISTER when calls were active.
    const settleDelayMs = (Array.isArray(calls) && calls.length > 0) ? 500 : 0;

    return new Promise((resolve) => {
        setTimeout(async () => {
            try {
                console.log("==>> SIPJS CONSOLE => Logout Current Agent");
                if (registerer) {
                    try {
                        const request = await registerer.unregister();
                        console.log("==>> SIPJS CONSOLE => Successfully Sent UN-Register request = ", request);
                    } catch (err) {
                        console.error("==>> SIPJS CONSOLE => Failed to send un-REGISTER", err);
                    }
                }

                if (userAgent) {
                    try {
                        await userAgent.stop();
                        console.log("==>> SIPJS CONSOLE => UserAgent stopped after logout");
                    } catch (err) {
                        console.error("==>> SIPJS CONSOLE => Failed to stop UserAgent", err);
                    }
                }
            } finally {
                registerer = null;
                userAgent = null;
                resolve();
            }
        }, settleDelayMs);
    });
}


function error(type, loginid, cause, callback) {
    if (typeof callback !== 'function') {
        console.error("invalid call back function");
        return;
    }
    const sysdate = new Date();
    let datetime = sysdate.getFullYear() + '-' + (sysdate.getMonth() + 1) + '-' + sysdate.getDate() + ' ' + sysdate.getHours() + ':' + sysdate.getMinutes() + ':' + sysdate.getSeconds() + '.' + sysdate.getMilliseconds()
    let event = {
        "event": "Error",
        "response":
        {
            "type": type,
            "loginId": loginid,
            "description": cause,
            'event_time': datetime
        }
    };
    const eventCopy = JSON.parse(JSON.stringify(event));
    callback(eventCopy);
    SendPostMessage(eventCopy);
}
var Errors = {
    errorMediaDevice: {
        "NotAllowedError": {
            "reason": "",
            "alert": ""
        },
        "PermissionDeniedError": {
            "reason": "",
            "alert": ""
        },
        "NotFoundError": {
            "reason": "Audio/Video Device Not Found. Please make sure your Audio/Video Device are working",
            "alert": "Audio/Video Device Not Found. Please make sure your Audio/Video Device are working"
        },
        "NotReadableError": {
            "reason": "Audio/Video Device is being used by Someother Party",
            "alert": "Audio/Video Device is being used by Someother Party"
        },
        "OverconstrainedError": {
            "reason": "The specified constraints cannot be satisfied by any of the available devices.",
            "alert": "Requested media constraints cannot be met. Please adjust the constraints and try again."
        },
        "SecurityError": {
            "reason": "The user agent blocked access to the media devices for security reasons.",
            "alert": "Access to media devices is blocked due to security reasons. Ensure the page is served over HTTPS and try again."
        },
        "AbortError": {
            "reason": "The operation was aborted, possibly due to user intervention or other interruptions.",
            "alert": "The operation was aborted. Please try again."
        },
        "TypeError": {
            "reason": "The constraints object passed to getUserMedia is not valid.",
            "alert": "Invalid constraints provided. Please check the constraints and try again."
        }
    },
    errorsList: {
        "Forbidden": "Invalid Credentials. Please provide valid credentials.",
        "websocketissue_unhold": "websocketissue_unhold",  //unHold Failed due to Network Issue
        "customer_left": "customer_left",                  //When Customer Leave during Network Disconnection
        "Microphone_denied": "Microphone permission denied. Please enable.",
        "Camera_denied": "Camera permission denied. Please enable.",
        "Screen_denied": "Screen Share permission denied. Please allow it.",
        "Microphone permission denied. Please enable.": "Microphone permission denied. Please enable.",
        "Camera permission denied. Please enable.": "Camera permission denied. Please enable.",
        "Screen Share permission denied. Please allow it.": "Screen Share permission denied. Please allow it.",
        "Uri_Error": "sipconfig.uri is null & undefined",
        "Invalid_URI": "Invalid URI",
        "NO-DIALPLAN-FOUND": "No Dialplan Found",
        "ON-ANOTHER-CALL": "User is on Another Call",
        "INVALID_GATEWAY": "Something Wrong with SIP trunk / Gateway",
        "Address Incomplete": "Something Wrong with SIP trunk / Gateway",
        "GATEWAY_DOWN": "Something Wrong with SIP trunk / Gateway",
        "Not Found": "Something Wrong with SIP trunk / Gateway",
        "Silent_Transaction_Error": "Silent_Transaction_Error",
        "OB_Transaction_Error": "OB_Transaction_Error",
        "Consult_Transaction_Error": "Consult_Transaction_Error",
        "Consult_Queue_Transaction_Error": "Consult_Queue_Transaction_Error",
        "Consult_Transfer_Transaction_Error": "Consult_Transfer_Transaction_Error",
        "Blind_Transfer_Transaction_Error": "Blind_Transfer_Transaction_Error",
        "Blind_Transfer_Queue_Transaction_Error": "Blind_Transfer_Queue_Transaction_Error",
        "DTMF_Transaction_Error": "DTMF_Transaction_Error",
        "Stream_Transaction_Error": "Stream_Transaction_Error",
        "Consult_Conference_Transaction_Error": "Consult_Conference_Transaction_Error",
        "Barge_Conference_Transaction_Error": "Barge_Conference_Transaction_Error",
        "Stream_Request_Error": "Something went wrong while turing on Video/Screen-share",
        "Session.getOffer unknown error.": "Session.getOffer unknown error.",
        "Session.setOfferAndGetAnswer unknown error.": "Session.setOfferAndGetAnswer unknown error.",
        "User_Not_Registered": "User is not Registered",
        "Blind_Transfer_Error_CONSULT": "Cannot trigger Blind Transfer when Call type is Consult",
        "Blind_Transfer_Error_EXTERNAL-CONSULT": "Cannot trigger Blind Transfer when Call type is Consult",
        "Blind_Transfer_Error_CONSULT_CONFERENCE": "Cannot trigger Blind Transfer when Call type is Consult Conference",
        "Blind_Transfer_Error_EXTERNAL_CONSULT_CONFERENCE": "Cannot trigger Blind Transfer when Call type is Consult Conference",
        "Blind_Transfer_Error_BARGE_CONFERENCE": "Cannot trigger Blind Transfer when Call type is Barge Conference",
        "Blind_Transfer_Error_ATTENDED_CONFERENCE": "Cannot trigger Blind Transfer when Call type is Attended Conference",
        "Reinvite in progress. Please wait until complete, then try again.": "Please Wait until Previous action is Completed",
        "Consult_Customer_left": "Cannot consult when Customer Call doesn't Exists",
        "Consult_Exist": "Cannot consult when Consult Call already Exists",
        "Consult_CONSULT": "Cannot consult on Consult",
        "Consult_EXTERNAL-CONSULT": "Cannot consult on Consult",
        "Consult_BARGE_CONFERENCE": "Cannot consult on Barge Conference",
        "Consult_CONSULT_CONFERENCE": "Cannot consult on Consult Conference",
        "Consult_EXTERNAL_CONSULT_CONFERENCE": "Cannot consult on Consult Conference",
        "Consult_ATTENDED_CONFERENCE": "Cannot consult on Attended Conference",
        "Consult_Transfer_Customer_Left": "Cannot transfer when customer call doesn't exist",
        "Consult_Transfer_Consult_End": "Cannot transfer when consult call doesn't exist",
        "Consult_Transfer_Consult_Not_Answered": "Assisted Agent hasn't picked up the call. Please try again after the agent has accepted the consult call",
        "Stream_CONSULT": "Cannot turn stream on/off when call is Consult",
        "Stream_EXTERNAL-CONSULT": "Cannot turn stream on/off when call is Consult",
        "Stream_CONSULT_CONFERENCE": "Cannot turn stream on/off when call is Consult Conference",
        "Stream_EXTERNAL_CONSULT_CONFERENCE": "Cannot turn stream on/off when call is Consult Conference",
        "Stream_BARGE_CONFERENCE": "Cannot turn stream on/off when call is Barge Conference",
        "Stream_ATTENDED_CONFERENCE": "Cannot turn stream on/off when call is Attended Conference",
        "Stream_CONSULT_TRANSFER": "Cannot turn stream on/off when call is Transfer",
        "Unknown": "Something went wrong",    // addsicallback function error
        "USER_BUSY": "USER BUSY",
        "Busy Here": "Call Not Connected",
        "Decline": "Call Not Connected",
        "Temporarily Unavailable": "Call Not Connected",
        "Request Terminated": "Request Terminated",
        "Invalid signaling state have-local-offer": "Something Went wrong with Signalling State, Please Contact your Supervisor",
        "Invalid signaling state have-local-pranswer": "Something Went wrong with Signalling State, Please Contact your Supervisor",
        "Invalid signaling state have-remote-offer": "Something Went wrong with Signalling State, Please Contact your Supervisor",
        "Invalid signaling state have-remote-pranswer": "Something Went wrong with Signalling State, Please Contact your Supervisor",
        "Invalid signaling state closed": "Something Went wrong with Signalling State, Please Contact your Supervisor",
        "CUSTOM_UNKNOWN_ERROR": "Reason unknown",
        "AGENT-HANDLED": "AGENT-HANDLED",
        "NORMAL_CLEARING": "NORMAL_CLEARING",
        "ORIGINATOR_CANCEL": "ORIGINATOR_CANCEL",
        "Rejected": "Rejected",
        "SKIP": "SKIP",
        "MANAGER_REQUEST": "MANAGER_REQUEST",
        "Call completed elsewhere": "Call completed elsewhere",
        "LOSE_RACE": "Call Not Connected",
        "SYSTEM_SHUTDOWN": "SYSTEM_SHUTDOWN",
        "CALL_REJECTED": "Call Not Connected",
        "INCOMPATIBLE_DESTINATION": "Call Not Connected",
        "NORMAL_TEMPORARY_FAILURE": "Call Not Connected",
        "RECOVERY_ON_TIMER_EXPIRE": "Call Not Connected",
        "604": "User does not exist",
        "Does Not Exist Anywhere": "User does not exist",


        // "Busy": "Device is busy",
        // "Redirected": "Redirected",
        // "Unavailable": "Unavailable",
        // "Not Found": "Not Found",
        // "Address Incomplete": "Address Incomplete",
        // "Incompatible SDP": "Incompatible SDP",
        // "Authentication Error": "Authentication Error",
        // "Request Timeout": "The timeout expired for the client transaction before a response was received.",
        // "Connection Error": "WebSocket connection error occurred.",
        // "Invalid target": "The specified target can not be parsed as a valid SIP.URI",
        // "SIP Failure Code": "A negative SIP response was received which is not part of any of the groups defined in the table below.",
        // "Terminated": "Session terminated normally by local or remote peer.",
        // "Canceled": "Session canceled by local or remote peer",
        // "No Answer": "Incoming call was not answered in the time given in the configuration no_answer_timeout parameter.",
        // "Expires": "Incoming call contains an Expires header and the local user did not answer within the time given in the header",
        // "No ACK": "An incoming INVITE was replied to with a 2XX status code, but no ACK was received.",
        // "No PRACK": "An incoming iNVITE was replied to with a reliable provisional response, but no PRACK was received",
        // "User Denied Media Access": "Local user denied media access when prompted for audio/video devices.",
        // "WebRTC not supported": "The browser or device does not support the WebRTC specification.",
        // "RTP Timeout": "There was an error involving the PeerConnection associated with the call.",
        // "Bad Media Description": "Received SDP is wrong.",
        // "Dialog Error": "An in-dialog request received a 408 or 481 SIP error."
    },
    conferenceErrors: {
        "BARGE_LIMIT_REACHED": "Bargein Failed due to limit reached of 4 unique members",
        "BARGE_ON_HOLD": "Bargein Failed due to call is on hold",
        "BARGE_CUSTOMER_LEFT": "Bargein Failed due to customer left",
        "CONSULT_CONF_LIMIT_REACHED": "Consult Conference Failed due to limit reached of 4 unique members",
        "CONSULT_CONF_ON_HOLD": "Consult Conference Failed due to call is on hold",
        "CONSULT_CONF_CUSTOMER_LEFT": "Consult Conference Failed due to customer left",
        "CONSULT_CONF_CONSULT_ENDED": "Consult Conference Failed due to consult call ended",
        "CONSULT_CONF_NO_CONSULT_YET": "Assisted Agent hasn't picked up the call. Please try again after the agent has accepted the consult call"
    },
    consultTransferErrors: {
        "LIMIT_REACHED": "Consult Transfer Failed due to limit reached of 4 unique members",
        "NO_CONSULT_YET": "Assisted Agent hasn't picked up the call. Please try again after the agent has accepted the consult call",
    },
    monitoringErrors: {
        "ON_HOLD": "Call Monitoring Failed due to call is on hold",
    }
};



// Number of times to attempt reconnection before giving up
const reconnectionAttempts = 20;
// Number of seconds to wait between reconnection attempts
const reconnectionDelay = 5;

// Used to guard against overlapping reconnection attempts
let attemptingReconnection = false;
// If false, reconnection attempts will be discontinued or otherwise prevented
let shouldBeConnected = true;

// Function which recursively attempts reconnection
const attemptReconnection = (reconnectionAttempt = 1) => {
    // If not intentionally connected, don't reconnect.
    if (!shouldBeConnected) {
        return;
    }

    // Reconnection attempt already in progress
    if (attemptingReconnection) {
        return;
    }

    // Reconnection maximum attempts reached
    if (reconnectionAttempt > reconnectionAttempts) {
        // maximum reconnect reached, logout Agent
        console.log("==>> SIPJS Console => Maximum Reconnected Reached. ")
        return;
    }

    // We're attempting a reconnection
    attemptingReconnection = true;

    setTimeout(() => {
        // If not intentionally connected, don't reconnect.
        if (!shouldBeConnected) {
            attemptingReconnection = false;
            return;
        }
        // Attempt reconnect
        userAgent.reconnect()
            .then(() => {
                // Reconnect attempt succeeded
                attemptingReconnection = false;
            })
            .catch((error) => {
                // Reconnect attempt failed
                console.error("==>> SIPJS Console => Reconnection Attempt Failed, trying again : ", error)
                var event = {
                    event: "xmppEvent",
                    response: {
                        loginId: loginid,
                        type: "OUT_OF_SERVICE",
                        description: error.message
                    }
                };
                // console.log("==>> SIPJS Console => EVENT ->",event)
                if (typeof globalEventCallback === "function") globalEventCallback(event)

                attemptingReconnection = false;
                attemptReconnection(++reconnectionAttempt);
            });
    }, reconnectionAttempt === 1 ? 0 : reconnectionDelay * 1000);
};

/**
 * Set up remote stream and local stream to UI Element after the call is in Established state.
 *
 * @param {Object} session - The session in Established state.
 * @param {Function} callback - The callback function to execute after setting up media.
 */
function setupRemoteMedia(session, callback, dialogId) {

    var pc = session.sessionDescriptionHandler.peerConnection;
    var remoteStream;
    remoteStream = new MediaStream();
    var sendersize = pc.getSenders().length;
    console.log('==>>  SIPJS CONSOLE => Sender RTPSenders size is ', sendersize);
    var receiversize = pc.getReceivers().length;
    console.log('==>>  SIPJS CONSOLE => Receivers RTPReceivers size is ', receiversize);
    var receiver = pc.getReceivers()[0];
    var receivervideo = pc.getReceivers()[1];
    remoteStream.addTrack(receiver.track);

    var index = getCallIndex(dialogId)
    var _sessionall = null
    if (index !== -1) {
        _sessionall = calls[index]
    }
    if (!_sessionall) {
        return
    }

    // audio, video and screenshare
    if (_sessionall.additionalDetail.remoteMediaType == "video" || _sessionall.additionalDetail.remoteMediaType == "screenshare") {
        if (receivervideo) {
            console.log('==>> SIPJS CONSOLE => video found');
            remoteStream.addTrack(receivervideo.track);
        }
    }
    remote_stream = remoteStream;

    var remoteVideo = document.getElementById('remoteVideo');
    if (remoteVideo) remoteVideo.srcObject = remoteStream;


    // session.sessionDescriptionHandler.peerConnection.getReceivers().forEach((receiver) => {
    //     if (receiver.track) {
    //       remoteStream.addTrack(receiver.track);
    //     }
    //   });
    //   remoteVideo.srcObject = remoteStream;

    var localStream_1;
    if (pc.getSenders) {
        localStream_1 = new window.MediaStream();
        pc.getSenders().forEach(function (sender) {
            var track = sender.track;
            // audio, video and screenshare
            if (_sessionall.additionalDetail.localMediaType == "video" || _sessionall.additionalDetail.localMediaType == "screenshare") {

                if (track && track.kind === "video") {
                    localStream_1.addTrack(track);

                    //trigger when user press browser button of Stop Sharing
                    track.addEventListener('ended', (e) => {
                        console.log("==>> SIPJS CONSOLE -> Screen Sharing / Video is Tured off -> ", e)
                        _sessionall.additionalDetail.localMediaType = "audio"
                        if (typeof session.incomingInviteRequest !== 'undefined') {
                            let _dialogId = session.incomingInviteRequest.message.headers["X-Call-Id"] != undefined ? session.incomingInviteRequest.message.headers["X-Call-Id"][0]['raw'] : session.incomingInviteRequest.message.headers["Call-ID"][0]['raw'];
                            setupRemoteMedia(session, callback, _dialogId)
                            publishMediaStreamUpdateEvent(_dialogId, "screenshare", "off", callback)
                        }
                        else if (typeof session.outgoingInviteRequest !== 'undefined') {
                            let _dialogId = session.outgoingInviteRequest.message.headers["Call-ID"][0]
                            setupRemoteMedia(session, callback, _dialogId)
                            publishMediaStreamUpdateEvent(_dialogId, "screenshare", "off", callback)
                        }
                    });
                }
            }
        });
    }
    else {
        localStream_1 = pc.getLocalStreams()[0];
    }
    var localVideo = document.getElementById('localVideo');
    if (localVideo) localVideo.srcObject = localStream_1;
    local_stream = localStream_1;
}
function registrationFailed(response) {
    //console.log('helo ',msg);
    error("subscriptionFailed", loginid, checkErrorReason(response.message.reasonPhrase), callbackFunction);
}
function getCallIndex(dialogId) {
    for (let index = 0; index < calls.length; index++) {
        var element = calls[index];
        if (element.response.dialog.id == dialogId) {
            return index;
        }
    }
    return -1;
}
function checkUndefinedParams(func, params) {
    const paramNames = getParameterNames(func);
    const undefinedParams = [];

    paramNames.forEach((paramName, index) => {
        const paramValue = params[index];
        if (paramValue === undefined || paramValue === null || paramValue === "") {
            undefinedParams.push(paramName);
        }
    });

    return undefinedParams;
}

function getParameterNames(func) {
    const functionString = func.toString();
    const parameterRegex = /function\s*\w*\s*\(([\s\S]*?)\)/;
    const match = parameterRegex.exec(functionString);
    if (match && match[1]) {
        return match[1].split(',').map(param => param.trim());
    }
    return [];
}
function SendPostMessage(data) {
    try {
        if (sipconfig.voicePostMessageSending == true) {
            var obj = JSON.stringify(data, getCircularReplacer());
            window.parent.postMessage(obj, "*"); // "*" means sending to all origins
            console.log("==>> SIPJS CONSOLE => SendPostMessage Sent !!")
        }
    } catch (e) {
        console.error("==>> SIPJS CONSOLE => Exception: ", e);
    }
}

const getCircularReplacer = () => {
    const seen = new WeakSet();
    return (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return;
            }
            seen.add(value);
        }
        return value;
    };
};

function terminateAllCalls(reason) {
    if (calls.length > 0) {
        for (let index = calls.length - 1; index >= 0; index--) {
            const sessionToEnd = calls[index];
            if (sessionToEnd.response.dialog.id) {
                if (!sessionToEnd) {
                    console.log("==>> SIPJS CONSOLE => terminateAllCalls -> Session doesn't Exist")
                    return;
                }
                var options = {
                    requestOptions: {
                        body : [],
                        extraHeaders :  [`X-Call-Dropped-Custom-Reason : ${reason}`]
                    }
                }

                console.log('==>> SIPJS CONSOLE => Call State before Termination : ', sessionToEnd.session.state);
                switch (sessionToEnd.session.state) {
                    case SIP.SessionState.Initial:
                    case SIP.SessionState.Establishing:
                        if (sessionToEnd.session instanceof SIP.Inviter) {
                            sessionToEnd.session.cancel();
                        } else {
                            sessionToEnd.response.dialog.callEndReason = "Rejected";
                            sessionToEnd.session.reject();
                        }
                        break;
                    case SIP.SessionState.Established:
                        sessionToEnd.response.dialog.callEndReason = reason;
                        sessionToEnd.session.bye(options);
                        break;
                    case SIP.SessionState.Terminating:
                    case SIP.SessionState.Terminated:
                        break;
                }
            }
        }
    }
}
// Reusable function to check and set the lock state for a specific function
function lockFunction(funcName, delay) {
    if (!functionLocks[funcName]) {
        // If the function is not locked, lock it and allow execution
        functionLocks[funcName] = true;

        setTimeout(() => {
            // After the specified delay, unlock the function
            functionLocks[funcName] = false;
        }, delay);
        return true;
    } else {
        console.log(`${funcName} is not allowed to be called yet`);
        return false;
    }
}

// For Agent 2, Consulted Call
function attendedTransferEvent(someMessage , callback){
    var index = getCallIndex(someMessage.dialog.id);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }

    if (!sessionall) {
        error('invalidState', loginid, "invalid action attendedTransferEvent", callback);
        return;
    }

    // unhold consult session if already on hold
    if (sessionall.response.dialog.state == "HELD") {
        var index = getCallIndex(someMessage.dialog.id);
        var newsessionall = null
        if (index !== -1) {
            newsessionall = calls[index];
        }
        newsessionall.session.invite({
            sessionDescriptionHandlerOptions: {
                hold: false,
                // offerOptions: {
                //     iceRestart: true
                // }
            },
            requestDelegate: {
                onAccept: () => {
                    console.log("==>> SIPJS Console => attendedTransferEvent onAccept")

                    newsessionall.response.dialog.state = "ACTIVE"
                    newsessionall.response.dialog.participants[0].state = "ACTIVE";

                    droppedCallEvent(someMessage.dialog.id, callback, "ATTENDED_TRANSFER")
                    activeCallEvent(someMessage.dialog.id, callback, "CONSULT_TRANSFER", someMessage.dialog.customerDialogId, someMessage.dialog.customerDestinationNumber)

                },
                onReject: (response) => {
                    console.log("==>> SIPJS Console => attendedTransferEvent (UNHOLD onReject) -> ", response)
                    newsessionall.session.dialog.signalingStateRollback();
                    newsessionall.session.sessionDescriptionHandler.peerConnection.setLocalDescription({ type: "rollback" })
                }
            }
        })
    }
    else {
        droppedCallEvent(someMessage.dialog.id, callback, "ATTENDED_TRANSFER")
        activeCallEvent(someMessage.dialog.id, callback, "CONSULT_TRANSFER", someMessage.dialog.customerDialogId, someMessage.dialog.customerDestinationNumber)
        index = getCallIndex(someMessage.dialog.customerDialogId);
        EnableVoiceTrack(calls[index].session)
    }
}

function droppedCallEvent(dialogId, callback, callEndReason) {
    var index = getCallIndex(dialogId);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }

    if (!sessionall) {
        error('invalidState', loginid, "invalid action droppedCallEvent", callback);
        return;
    }
    dialogStatedata = sessionall

    // only if Customer and that to from WEBRTC CALL
    // this fails if we allow Barge or Conference ot Consult Tranfer on webrtc Calls

    if (sessionall.response && sessionall.response.dialog && sessionall.response.dialog.callType == "OUT" && sessionall.response.dialog.channelType == "WEB_RTC") {
        return
    }
    if (sessionall.response && sessionall.response.dialog && sessionall.response.dialog.callType == "OUT" && callEndReason == "BARGE_CONFERENCE") {return}
    console.log(`${dialogStatedata.event} Ended`);

    var sysdate1 = new Date();
    var datetime = sysdate1.toISOString();
    if (dialogStatedata && dialogStatedata.response && dialogStatedata.response.dialog) {
        dialogStatedata.response.dialog.callEndReason = callEndReason //"ATTENDED_TRANSFER" ;
        dialogStatedata.response.dialog.participants[0].mute = false;
        dialogStatedata.response.dialog.participants[0].stateChangeTime = datetime;

        if (dialogStatedata.response.dialog.participants[0].state != "HELD") {
            dialogStatedata.response.dialog.participants[0].state = "DROPPED";
            dialogStatedata.response.dialog.state = "DROPPED";
        }
        else {
            // for A2 only incase of Attended Conference & Consult Conference when A2 hold the consult call
            dialogStatedata.additionalDetail.consult_on_hold = dialogStatedata.response.dialog.callType == "CONSULT" ? true : false;
            if (dialogStatedata.additionalDetail.consult_on_hold == true) {
                // for A2 incase of Consult Conference
                dialogStatedata.response.dialog.participants[0].state = "DROPPED";
                dialogStatedata.response.dialog.state = "DROPPED";
            }
        }



        // dialogStatedata.response.dialog.participants[0].state = "DROPPED";
        if (dialogStatedata.response.dialog.callEndReason == "direct_transfered" ||
            // dialogStatedata.response.dialog.callEndReason == "ATTENDED_TRANSFER" ||
            dialogStatedata.response.dialog.callEndReason == "CONSULT_CONFERENCE" ||
            dialogStatedata.response.dialog.callEndReason == "EXTERNAL_CONSULT_CONFERENCE" ||
            dialogStatedata.response.dialog.callEndReason == "ATTENDED_CONFERENCE" ||
            dialogStatedata.response.dialog.callEndReason == "BARGE_CONFERENCE") {
            dialogStatedata.response.dialog.isCallEnded = 0;
        } else {
            dialogStatedata.response.dialog.isCallEnded = 1;
        }
        // dialogStatedata.response.dialog.state = "DROPPED";
        dialogStatedata.response.dialog.isCallAlreadyActive = false;

        // For A1 in Consult Conference & BargeIn No event of Dropped
        if(dialogStatedata.event == "dialogState" && dialogStatedata.response.dialog.callType == "OTHER_IN" && (
            dialogStatedata.response.dialog.callEndReason == "CONSULT_CONFERENCE" ||
            dialogStatedata.response.dialog.callEndReason == "EXTERNAL_CONSULT_CONFERENCE" ||
            dialogStatedata.response.dialog.callEndReason == "BARGE_CONFERENCE" ||
            dialogStatedata.response.dialog.callEndReason == "ATTENDED_CONFERENCE"))
            {
                dialogStatedata.response.dialog.callEndReason = null;
                return
            }

        var data = {}
        data.response = dialogStatedata.response
        data.event = dialogStatedata.event
        const dialogStatedataCopy = JSON.parse(JSON.stringify(data));
        callback(dialogStatedataCopy);
        SendPostMessage(dialogStatedataCopy);
        dialogStatedata.response.dialog.callEndReason = null;
    }

}

function activeCallEvent(dialogId, callback, callType, customerDialogId, customerDestinationNumber) {
    var index = getCallIndex(dialogId);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }

    if (!sessionall) {
        error('invalidState', loginid, "invalid action activeCallEvent", callback);
        return;
    }
    dialogStatedata = sessionall

    // only if Customer and that to from WEBRTC CALL
    // this fails if we allow Barge or Conference ot Consult Tranfer on webrtc Calls

    if (sessionall.response && sessionall.response.dialog && sessionall.response.dialog.callType == "OUT" && sessionall.response.dialog.channelType == "WEB_RTC") {
        return
    }
    dialogStatedata.event = "dialogState"

    console.log(`${dialogStatedata.event} Active`);

    dialogStatedata.response.dialog.id = customerDialogId
    var sysdate1 = new Date();
    var datetime = sysdate1.toISOString();
    if (dialogStatedata && dialogStatedata.response && dialogStatedata.response.dialog) {

        if(dialogStatedata.response.dialog.callType == "MONITORING" || dialogStatedata.response.dialog.callType == "CONSULT"){
            dialogStatedata.response.dialog.participants[0].startTime = datetime;
            dialogStatedata.response.dialog.participants[0].alertingTime = datetime;
        }

        dialogStatedata.response.dialog.callType = callType //"OTHER_IN"
        dialogStatedata.response.dialog.participants[0].mute = false;
        dialogStatedata.response.dialog.participants[0].stateChangeTime = datetime;

        if (dialogStatedata.response.dialog.participants[0].state != 'HELD') {
            dialogStatedata.response.dialog.participants[0].state = "ACTIVE";
            dialogStatedata.response.dialog.state = "ACTIVE";
        }

        // dialogStatedata.response.dialog.participants[0].startTime = datetime;
        // dialogStatedata.response.dialog.participants[0].alertingTime = datetime;

        // dialogStatedata.response.dialog.participants[0].state = "ACTIVE";
        // dialogStatedata.response.dialog.state = "ACTIVE";

        // if(callType == "CONSULT_TRANSFER"){
        //     dialogStatedata.response.dialog.participants[0].startTime = datetime;
        // }

        dialogStatedata.response.dialog.isCallAlreadyActive = true;
        dialogStatedata.response.dialog.customerNumber = dialogStatedata.response.dialog.customerNumber
        dialogStatedata.response.dialog.fromAddress = dialogStatedata.response.dialog.customerNumber
        dialogStatedata.response.dialog.serviceIdentifier = customerDestinationNumber
        var data = {}
        data.response = dialogStatedata.response
        data.event = dialogStatedata.event
        const dialogStatedataCopy = JSON.parse(JSON.stringify(data));
        callback(dialogStatedataCopy);
        SendPostMessage(dialogStatedataCopy);

        if (dialogStatedata.additionalDetail.consult_on_hold == true) {
            data.response.dialog.participants[0].state = "HELD";
            const dialogStatedataCopy = JSON.parse(JSON.stringify(data));
            callback(dialogStatedataCopy);
            SendPostMessage(dialogStatedataCopy);
            dialogStatedata.additionalDetail.consult_on_hold = false
            DisableVoiceTrack(dialogStatedata.session)
        }
    }
}

// function attendedTransferMessage(dialogId){
//     let message = {
//         event : "Transfer",
//         dialog : {
//             id : dialogId,
//             message : "A1 has initiated Attended Transfer (Consult Transfer) between C1 and A2",
//             call1 : calls[0].response.dialog.id,
//             call2 : calls[1].response.dialog.id,
//         }
//     }
//     createMessage(message , dialogId)
// }

function createMessage(message, dialogId) {
    var destination = 0
    var index = getCallIndex(dialogId);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }
    if (!sessionall) {
        return
    }
    // callType = "OUT" means Call Initaited by Either Agent or Customer
    // by Customer means Call is from WebRTC
    // by Agent means Call is from SIP/OUTBOUND
    if (sessionall.response.dialog.callType == "OUT") {
        // if (dialogStatedata && dialogStatedata.response && dialogStatedata.response.dialog) {
        if (sessionall.additionalDetail.agentExt) destination = sessionall.additionalDetail.agentExt
        else {
            console.log("==>> SIPJS Console => createMessage -> Agent Extension is not defined")
            pendingEventNotification = message
            isPendingEventNotification = true
            return
        }

        // }
    }
    else {
        if (typeof sessionall.session.incomingInviteRequest !== 'undefined') {
            destination = sessionall.session.incomingInviteRequest.message.from.uri.normal.user
        }
        else if (typeof sessionall.session.outgoingInviteRequest !== 'undefined') {
            destination = sessionall.session.outgoingInviteRequest.message.to.uri.normal.user
        }
    }

    // if(sessionall.response.dialog.callType !== "OUT"){
    //     if (typeof sessionall.session.incomingInviteRequest !== 'undefined'){
    //         destination = sessionall.session.incomingInviteRequest.message.from.uri.normal.user
    //     }
    //     else if (typeof sessionall.session.outgoingInviteRequest !== 'undefined'){
    //         destination = sessionall.session.outgoingInviteRequest.message.to.uri.normal.user
    //     }
    // }

    // else if(sessionall.response.dialog.callType == "OUT"){

    // }

    const message_targetUri_value = new SIP.URI("sip",destination, sipconfig.uri)
    sendMessage(message_targetUri_value,message)
    // messager = new SIP.Messager(userAgent,message_targetUri_value,JSON.stringify(message));
    // var messageOptions = {
    //     requestDelegate : {
    //         onAccept : (response) => {
    //             console.log("==>>SIPJS Console => sendMesage onAccept ->",response)
    //         },
    //         onReject : (response) => {
    //             console.log("==>>SIPJS Console => sendMesage onReject ->",response)
    //         }
    //     }
    // }
    // messager.message(messageOptions);

}

/**
 * Internal function used to convert an audio call to a video call by sending a re-INVITE.
 *
 * @param {string} dialogId - The ID of the dialog/call.
 * @param {Function} callback - The callback function to be executed after sending the re-INVITE.
 * @param {string} streamType - The type of stream to be added ('audio' or 'video').
 */
function sendingReInvite(dialogId, callback, streamType) {

    var res = lockFunction("sendingReInvite", 1000); // --- seconds cooldown
    if (!res) return;
    var index = getCallIndex(dialogId);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index].session;
    }

    if (!sessionall) {
        console.log("==>> SIPJS CONSOLE => Sending ReInvite -> No Session Found / invalid action sendingReInvite")
        return;
    }

    var _functionCallerName = arguments.callee.caller.name


    let peer = sessionall.sessionDescriptionHandler.peerConnection;
    let senders = peer.getSenders();
    if (!senders.length) return;


    let sessionDescriptionHandlerOption = {
        constraints: {
            audio: true,
            video: false
        },
        offerOptions: {
            iceRestart: true,
            offerToReceiveAudio: true,
            offerToReceiveVideo: false

        },
        iceGatheringTimeout: sipconfig.iceGatheringTimeout
    }

    if (streamType === "video") {


        sessionDescriptionHandlerOption.constraints.audio = true
        sessionDescriptionHandlerOption.constraints.video = true
        sessionDescriptionHandlerOption.offerOptions.offerToReceiveAudio = true
        sessionDescriptionHandlerOption.offerOptions.offerToReceiveVideo = true

    }
    else if (streamType === "screenshare") {

        sessionDescriptionHandlerOption.constraints.audio = true
        sessionDescriptionHandlerOption.constraints.video = "screenshare"
        sessionDescriptionHandlerOption.offerOptions.offerToReceiveAudio = true
        sessionDescriptionHandlerOption.offerOptions.offerToReceiveVideo = true

    }

    const updateCallOptions = {
        sessionDescriptionHandlerOptions: sessionDescriptionHandlerOption,
        requestDelegate: {
            onAccept: () => {
                console.log("==>> SIPJS Console => sendingReInvite onAccept")
                console.log("==>> SIPJS Console => Session converted successfully.");
                const sysdate = new Date();
                var datetime = sysdate.toISOString();
                if (_functionCallerName !== "mediaStreamUpdateEvent") {
                    console.log("==>> SIPJS Console => Call is converting, Manually triggered")
                    var data = {}
                    data.response = calls[index].response;
                    data.event = calls[index].event;
                    data.response.dialog.participants[0].stateChangeTime = datetime;
                    data.response.dialog.isCallAlreadyActive = true;

                    calls[index].additionalDetail.localMediaType = streamType

                    if (typeof callback === 'function') {
                        const dataCopy = JSON.parse(JSON.stringify(data));
                        callback(dataCopy);
                        SendPostMessage(dataCopy);
                    }

                    publishMediaStreamUpdateEvent(dialogId, streamType, "on", callback)
                }
                else {
                    console.log("==>> SIPJS Console => Call is converting, Automatic triggered")
                    // remove video Tag
                    let peer = sessionall.sessionDescriptionHandler.peerConnection;
                    let senders = peer.getSenders();
                    console.log(senders)
                    senders.forEach(async sender => {
                        if (sender && sender.track && sender.track.kind === "video") {
                            sender.track.stop()
                        }
                    })
                }
                var _tempSession = calls[index]
                _tempSession.additionalDetail.remoteVideoDisplay = true
                setupRemoteMedia(sessionall, callback, dialogId)

            },
            onReject: async (response) => {
                console.log("==>> SIPJS Console => sendingReInvites onReject -> ", response)

                sessionall.dialog.signalingStateRollback();
                sessionall.sessionDescriptionHandler.peerConnection.setLocalDescription({ type: "rollback" })

                calls[index].additionalDetail.localMediaType = "audio"
                // for some reason SDP is updated
                calls[index].additionalDetail.remoteVideoDisplay = true
                DisableVideoTrack(sessionall)

                if (response.message.reasonPhrase == "Service Unavailable" || response.message.reasonPhrase == "Request Timeout") {
                    error("generalError", loginid, checkErrorReason("Stream_Transaction_Error"), callback);
                    return
                }
            }
        }
    };
    sessionall.invite(updateCallOptions)
        .catch(async (errorr) => {
            console.error("==>> SIPJS CONSOLE => Failed to Convert the session -> ", errorr);
            calls[index].additionalDetail.localMediaType = "audio"
            error('generalError', loginid, checkErrorReason("Stream_Request_Error"), callback);
            // there can be any reason for this, update the local Media stream back to audio
            sessionall.sessionDescriptionHandler.localMediaStreamConstraints.video = false
        });
}

/**
 * Initiates a barge-in on a silently monitored call.
 *
 * @param {string} dialogId - The dialog ID associated with the silently monitored call.
 * @param {Function} callback - Callback function to handle the initiation of the barge-in.
 */
async function initiate_BargeIn(dialogId, callback) {
    var res = lockFunction("initiate_BargeIn", 500); // --- seconds cooldown
    if (!res) return;
    const undefinedParams = checkUndefinedParams(initiate_BargeIn, [dialogId, callback]);

    if (undefinedParams.length > 0) {
        // console.log(`Error: The following parameter(s) are undefined or null: ${undefinedParams.join(', ')}`);
        error("generalError", loginid, `Error: The following parameter(s) are undefined or null or empty: ${undefinedParams.join(', ')}`, callback);
        return;
    }

    var index = getCallIndex(dialogId);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }
    if (!sessionall) {
        error('invalidState', loginid, "invalid action initiate_BargeIn", callback);
        return;
    }

    if (sessionall.response.dialog.callType == "BARGE_CONFERENCE") {
        console.log("==>> SIPJS CONSOLE => Calltype BARGE_CONFERNECE, so not initiating Barge Conference")
        return
    }

    // sendDtmf("*" , dialogId , callback)
    // sendDtmf("B" , dialogId , callback)

    //Check Mic Permission here, if not granted then Throw Error.

    const hasPermission = await checkingMicroPhonePermission(); // Wait for the result of the permission check
    if (hasPermission) {
        internalDtmfSend(["*", "B"], dialogId, callback, "Barge_Conference")
    } else {
        console.error("==>> SIPJS CONSOLE => Microphone permission denied. Barge Conference cannot proceed.");
    }

}

function agentDetailsToOtherParticiapnt(dialogId) {
    var index = getCallIndex(dialogId);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }
    if (!sessionall) {
        // error('invalidState', loginid, "invalid action agentDetailsToOtherParticiapnt", callback);
        console.log('==>> SIPJS CONSOLE => invalidState invalid action agentDetailsToOtherParticiapnt -> No Session FOUND');
        return;
    }
    if (sessionall.response && sessionall.response.dialog && (sessionall.response.dialog.callType == "OTHER_IN" /*|| sessionall.response.dialog.callType == "CONSULT" */) && sessionall.response.dialog.channelType == "WEB_RTC") {
        let customEvent = {
            "event" : "agentDetails",
            "dialog" : {
                "id" : dialogId,
                "agentExt" : loginid,
                "callType" :  sessionall.response.dialog.callType == "OTHER_IN" ? "OUT" : "CONSULT"
            }
        }
        createMessage(customEvent, dialogId)
    }
}

function updateAgentDetails(message) {
    var index = getCallIndex(message.dialog.id);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }
    if (!sessionall) {
        // error('invalidState', loginid, "invalid action updateAgentDetails", callback);
        console.log('==>> SIPJS CONSOLE => invalidState invalid action updateAgentDetails -> No Session FOUND');
        return;
    }
    if (message.dialog.callType == "OUT") {
        // if (dialogStatedata && dialogStatedata.response && dialogStatedata.response.dialog) {
        if (sessionall.additionalDetail) {
            sessionall.additionalDetail.agentExt = message.dialog.agentExt;
        } else {
            sessionall.additionalDetail = {
                agentExt: message.dialog.agentExt
            };
        }

            // Publish Event if there was any Pending Event
            if (isPendingEventNotification) {
                console.log("==>> SIPJS CONSOLE => Pending Event Notification -> ", pendingEventNotification)
                createMessage(pendingEventNotification, message.dialog.id)
                pendingEventNotification = null
                isPendingEventNotification = false

            }
            // console.log("==>> SIPJS CONSOLE => DIALOG STATE : ", dialogStatedata)
        // }
    }
}

/**
 * Generates a conversion event indicating changes in media stream status.
 *
 * @param {string} dialogId - The dialog ID associated with the conversation.
 * @param {string} streamType - Type of stream (e.g., "video", "screen-share").
 * @param {string} streamStatus - The status of the stream ("on" or "off").
 * @param {Function} callback - Callback function to handle the event generation.
 */
function publishMediaStreamUpdateEvent(dialogId, streamType, streamStatus, callback) {
    const sysdate = new Date();
    const datetime = sysdate.toISOString();

    // Local media conversion
    const _mediaStreamUpdate = createMediaStreamUpdateEvent(
        {
            loginId: loginid,
            status: "success",
            dialogId: dialogId,
            eventRequest: "local",
            stream: streamType,
            streamStatus: streamStatus,
            errorReason: ""
        });

    // const mediaConversionCopy = JSON.parse(JSON.stringify(_mediaStreamUpdate));
    callback(_mediaStreamUpdate);
    SendPostMessage(_mediaStreamUpdate)

    // Remote media conversion
    const __mediaStreamUpdate = createMediaStreamUpdateEvent(
        {
            loginId: loginid,
            status: "success",
            dialogId: dialogId,
            eventRequest: "remote",
            stream: streamType,
            streamStatus: streamStatus,
            errorReason: ""
        });

    createMessage(__mediaStreamUpdate, dialogId);
}


/**
 * Terminates all remaining calls when an agent or customer leaves the call.
 *
 * @returns {Promise} - A promise that resolves after all remaining calls are terminated.
 */
async function terminateAllRemainingCalls() {
    console.log("==>> SIPJS CONSOLE => TERMINATING ALL REMAINING CALLS")
    console.log("==>> SIPJS CONSOLE => TERMINATING Index 1 Call")
    terminateIndexOneCall()
}

function terminateIndexOneCall() {
    if (calls && calls[1] && calls[1].session && calls[1].session.state !== SIP.SessionState.Terminating && calls[1].session.state !== SIP.SessionState.Terminated) {
        var terminate_session_id = calls[1].response.dialog.id
        if (functionLocks['terminate_call']) {
            setTimeout(() => {
                terminate_call(terminate_session_id);
            }, 1000);
        } else {
            terminate_call(terminate_session_id);
        }
    }
}
function terminateIndexZeroCall() {
    if (calls && calls[0] && calls[0].session && calls[0].session.state !== SIP.SessionState.Terminating && calls[0].session.state !== SIP.SessionState.Terminated) {
        var terminate_session_id = calls[0].response.dialog.id
        if (functionLocks['terminate_call']) {
            setTimeout(() => {
                terminate_call(terminate_session_id);
            }, 1000);
        } else {
            terminate_call(terminate_session_id);
        }
    }
}



/**
 * Function used to identify what kind of media device error occurred.
 *
 * @param {string} errorName - The name of the media device error.
 * @param {Object} constraints - The constraints related to the media device.
 * @returns {Promise<void>} - A promise that resolves once the error is handled.
 */
async function mediaDeviceErrors(errorName, mediaType){
    if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError'){
            const permissions = await Promise.all([
                navigator.permissions.query({ name: 'camera' }),
                navigator.permissions.query({ name: 'microphone' })
            ]);
            var _alert = ""

            let denied_component = ""
            permissions.forEach((permission) => {
                // console.log(permission)
                if (permission.state === 'denied' || permission.state === 'prompt') {
                    if (permission.name === "audio_capture" && mediaType == "audio") { denied_component = "Microphone" }
                    if (permission.name === "video_capture" && mediaType == "video") { denied_component = "Camera"}
                    _alert =`${denied_component} permission denied. Please enable.`;
                }
                // if (permission.state === 'prompt' && permission.name === "video_capture") {
                //     denied_component = "Screen-share"
                //     _alert = `Access to ${denied_component} is denied. Please enable it in your browser settings.`;
                // }
            });
            return {
                reason: "Permisssion Deined !!",
                alert: _alert
            };
    }
    else {
        if (Errors.errorMediaDevice.hasOwnProperty(errorName)) {
            return Errors.errorMediaDevice[errorName];
        } else {
            return {
                reason: checkErrorReason("CUSTOM_UNKNOWN_ERROR"),
                alert: checkErrorReason("CUSTOM_UNKNOWN_ERROR")
            };
        }
    }
}

async function displayDeviceErrors(errorName) {
    if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        var _alert = ""
        _alert = `Screen Share permission denied. Please allow it.`;
        return {
            reason: "Permisssion Deined !!",
            alert: _alert
        };
    }
    else {
        if (Errors.errorMediaDevice.hasOwnProperty(errorName)) {
            return Errors.errorMediaDevice[errorName];
        } else {
            return {
                reason: checkErrorReason("CUSTOM_UNKNOWN_ERROR"),
                alert: checkErrorReason("CUSTOM_UNKNOWN_ERROR")
            };
        }
    }
}


/**
 * Handles mediaConversion event received by the user.
 *
 * @param {Object} eventData - Data associated with the mediaConversion event.
 * @param {Function} callback - Callback function to execute after handling the event.
 */
function mediaStreamUpdateEvent(someMessage, callback) {

    const _event = { ...someMessage };
    // _event.event="mediaStreamUpdate"
    if (_event.status !== "success" || _event.dialog.eventRequest !== "remote") {
        return; // Exit early if conditions are not met
    }


    const index = getCallIndex(_event.dialog.id);
    if (index === -1) {
        console.log("==>> SIPJS CONSOLE => Media Conversion Event -> No Session Found / invalid action mediaStreamUpdateEvent");
        return;
    }

    const sessionall = calls[index];
    if (!sessionall) {
        console.log("==>> SIPJS CONSOLE => Media Conversion Event -> No Session Found / invalid action mediaStreamUpdateEvent");
        return;
    }

    // Set the remote media type based on stream status
    sessionall.additionalDetail.remoteMediaType = _event.dialog.streamStatus === "on" ? _event.dialog.stream : "audio";

    // Handle audio to video conversion
    if (sessionall.response.dialog.mediaType === "audio" && sessionall.additionalDetail && !sessionall.additionalDetail.remoteVideoDisplay) {
        sendingReInvite(_event.dialog.id, callback, "video");
        // setupRemoteMedia(sessionall.session, callback, _event.dialog.id);
        callback(_event);
        SendPostMessage(_event);
        return;
    }
    // Handle general media setup
    setupRemoteMedia(sessionall.session, callback, _event.dialog.id);
    callback(_event);
    SendPostMessage(_event);


}



/**
 * Initiates a consult conference for the given dialog.
 *
 * @param {string} dialogId - The dialog ID associated with the consult call.
 * @param {Function} callback - Callback function to handle the initiation of the consult conference.
 */
async function initiate_consult_Conference(dialogId, callback) {
    var res = lockFunction("initiate_consult_Conference", 500); // --- seconds cooldown
    if (!res) return;
    const undefinedParams = checkUndefinedParams(initiate_consult_Conference, [dialogId, callback]);

    if (undefinedParams.length > 0) {
        // console.log(`Error: The following parameter(s) are undefined or null: ${undefinedParams.join(', ')}`);
        error("generalError", loginid, `Error: The following parameter(s) are undefined or null or empty: ${undefinedParams.join(', ')}`, callback);
        return;
    }

    sessionall = calls[0].session;
    consultSessioin = calls[1].session;
    if (!sessionall || !consultSessioin) {

        const errorMsg = !sessionall
            ? "CONSULT_CONF_CUSTOMER_LEFT"
            : "CONSULT_CONF_CONSULT_ENDED";

        error('generalError', loginid, checkConferenceErrorReason(errorMsg), callback);
        return
    }

    if (sessionall.state === SIP.SessionState.Terminated) {
        console.log("C1 and A1 sesison is terminated so we cannot initiate Consult Conference")
        error('generalError', loginid, checkConferenceErrorReason("CONSULT_CONF_CUSTOMER_LEFT"), callback);
        return
    }
    if (consultSessioin.state === SIP.SessionState.Terminated) {
        console.log("A2 and A1 sesison is terminated so we cannot initiate Consult Conference")
        error('generalError', loginid, checkConferenceErrorReason("CONSULT_CONF_CONSULT_ENDED"), callback);
        return
    }
    if (consultSessioin.state !== SIP.SessionState.Established) {
        console.log("Assisted Agent hasn't picked up the call. Please try again after the agent has accepted the consult call") //Consult_Transfer_Consult_Not_Answered
        error('generalError', loginid, checkConferenceErrorReason("CONSULT_CONF_NO_CONSULT_YET"), callback);
        return
    }


    // sessionall = calls[0].session;
    // consultSessioin = calls[1].session;
    // if(!sessionall || !consultSessioin){

    //     const errorMsg = !sessionall
    //         ? "CONSULT_CONF_CUSTOMER_LEFT"
    //         : "CONSULT_CONF_CUSTOMER_LEFT";

    //     error('generalError', loginid, Errors.conferenceErrors[errorMsg], callback);
    //     return
    // }

    // if(sessionall.state === SIP.SessionState.Terminated){
    //     console.log("C1 and A1 sesison is terminated so we cannot initiate Consult Conference")
    //     error('generalError', loginid, Errors.errorsList["CONSULT_CONF_CUSTOMER_LEFT"], callback);
    //     return
    // }
    // if(consultSessioin.state === SIP.SessionState.Terminated){
    //     console.log("A2 and A1 sesison is terminated so we cannot initiate Consult Conference")
    //     error('generalError', loginid, Errors.errorsList["cfCONSULT_CONF_CUSTOMER_LEFT"], callback);
    //     return
    // }
    // if(consultSessioin.state !== SIP.SessionState.Established){
    //     console.log("Assisted Agent hasn't picked up the call. Please try again after the agent has accepted the consult call") //Consult_Transfer_Consult_Not_Answered
    //     error('generalError', loginid, Errors.errorsList["CONSULT_CONF_CUSTOMER_LEFT"], callback);
    //     return
    // }


    var index = getCallIndex(dialogId);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }
    if (!sessionall) {
        error('invalidState', loginid, "invalid action initiate_consult_Conference", callback);
        return;
    }

    // consultSessioin = calls[1].session;
    // if (consultSessioin.state !== SIP.SessionState.Established) {
    //     console.log("==>> SIPJS CONSOLE => Assisted Agent hasn't picked up the call. Please try again after the agent has accepted the consult call") //Consult_Transfer_Consult_Not_Answered
    //     error('generalError', loginid, Errors.conferenceErrors["CONSULT_CONF_NO_CONSULT_YET"], callback);
    //     return
    // }

    var members = []
    for (var i = 0; i < calls[0].response.dialog.participants.length; i++) {
        var _member = calls[0].response.dialog.participants[i].mediaAddress
        members.push(_member)
    }
    for (var i = 0; i < calls[1].response.dialog.participants.length; i++) {
        var _member = calls[1].response.dialog.participants[i].mediaAddress
        members.push(_member)
    }


    let uniqueMembers = [...new Set(members)];
    if (uniqueMembers.length > 4) {
        error('generalError', loginid, checkConferenceErrorReason("CONSULT_CONF_LIMIT_REACHED"), callback);
        // alert(`Consult Conference Failed due to LIMIT REACHED of 4 unique members`)
        return
    }

    // unhold consult session if already on hold
    if (sessionall.response.dialog.state == "HELD") {
        sessionall.session.invite({
            sessionDescriptionHandlerOptions: {
                hold: false,
                // offerOptions: {
                //     iceRestart: true
                // }
            },
            requestDelegate: {
                onAccept: async (response) => {
                    console.log("==> SIPJS Console => initiate_consult_Conference onAccept, Consult Call was on hold, so unholding before Consult Conference")
                    const hasPermission = await checkingMicroPhonePermission(); // Wait for the result of the permission check
                    if (hasPermission) {
                        internalDtmfSend(["*", "C"], dialogId, callback, "Consult_Conference");
                    } else {
                        console.error("==>> SIPJS CONSOLE => Microphone permission denied. Consult Conference cannot proceed.");
                    }

                },
                onReject: (response) => {
                    console.log("==> SIPJS Console => initiate_consult_Conference (UNHOLD onReject) -> ", response)
                    sessionall.session.dialog.signalingStateRollback();
                    sessionall.session.sessionDescriptionHandler.peerConnection.setLocalDescription({ type: "rollback" })
                }
            }
        })
    }
    else {
        const hasPermission = await checkingMicroPhonePermission(); // Wait for the result of the permission check
        if (hasPermission) {
            internalDtmfSend(["*", "C"], dialogId, callback, "Consult_Conference");
        } else {
            console.error("==>> SIPJS CONSOLE => Microphone permission denied. Consult Conference cannot proceed.");
        }
    }
}

/**
 * Generates a conference event like CONFERENCE_MEMBER_HOLD, CONFERENCE_MEMBER_UNHOLD,
 * CONFERENCE_MEMBER_MUTE, CONFERENCE_MEMBER_UNMUTE.
 *
 * @param {string} Eventname - The name of the conference event.
 * @param {string} to - The destination number of the event.
 * @param {string} from - The source number of the event.
 * @param {string} conferenceName - The name of the conference.
 * @returns {Object} - The generated conference event object.
 */

function generateConferenceEvent(Eventname, to, from, conferenceName, dialogId) {
    var _conferenceEvent = JSON.parse(JSON.stringify(conferenceEvent))
    _conferenceEvent.event = Eventname
    _conferenceEvent.additionalAttributes.members[0].ext = from
    _conferenceEvent.additionalAttributes.conference.name = conferenceName
    _conferenceEvent.dialog.id = dialogId
    _conferenceEvent.reasonCode = ""


    const message_targetUri_value = new SIP.URI("sip",to, sipconfig.uri)
    sendMessage(message_targetUri_value,_conferenceEvent)
    // messager = new SIP.Messager(userAgent,message_targetUri_value,JSON.stringify(_conferenceEvent));
    // messager.message();
}

/**
* Handles conference change events, such as a call being converted to a conference,
* member being added or left, or when there are only two members left in the conference.
*
* @param {object} someMessage - The message containing details about the conference change event.
* @param {Function} callback - Callback function to execute after handling the event.
*/
function conferenceChange(someMessage, callback) {
    var index = getCallIndex(someMessage.dialog.id);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }
    if (!sessionall) {
        error('invalidState', loginid, "invalid action conferenceChange", callback);
        return;
    }

    var _members = someMessage.additionalAttributes.members
    if (_members.length <= 2) {
        conferenceToCall(someMessage, callback)
    }
    else {
        if (sessionall.response.dialog.callType == "CONSULT" || sessionall.response.dialog.callType == "OTHER_IN" || sessionall.response.dialog.callType == "OUT" || sessionall.response.dialog.callType == "CONSULT_TRANSFER") {
            conferenceCreated(someMessage, callback)
        }
        else if (sessionall.response.dialog.callType == "CONSULT_CONFERENCE" ||
            sessionall.response.dialog.callType == "BARGE_CONFERENCE" ||
            sessionall.response.dialog.callType == "ATTENDED_CONFERENCE" ||
            sessionall.response.dialog.callType == "EXTERNAL_CONSULT_CONFERENCE") {
            conferenceUpdated(someMessage, callback)
        }
        else if (sessionall.response.dialog.callType == "MONITORING") {
            conferenceCreated(someMessage, callback)
        }
        else {
            console.log("==>> SIPJS CONSOLE => ERROR : unknown call type.")
            return
        }
    }
}

/**
 * Handles the conferenceCreated event when a conference is created.
 *
 * @param {object} someMessage - The message containing details about the created conference.
 * @param {Function} callback - Callback function to execute after handling the event.
 */
function conferenceCreated(someMessage, callback) {
    var index = getCallIndex(someMessage.dialog.id);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }
    if (!sessionall) {
        error('invalidState', loginid, "invalid action conferenceCreated", callback);
        return;
    }
    const sysdate = new Date();
    var datetime = sysdate.toISOString();
    var _customerInConference = false

    /** if sessionall.event = dialogState or ConsultCall, end that
     * then new dialogstate with State Active and CallType Conference
     * */
    droppedCallEvent(someMessage.dialog.id, callback, someMessage.reasonCode)

    // sessionall.response.dialog.callType = "CONFERENCE"
    if (sessionall.additionalDetail) {
        sessionall.additionalDetail.conference_name = someMessage.additionalAttributes.conference.name;
    } else {
        sessionall.additionalDetail = {
            conference_name: someMessage.additionalAttributes.conference.name
        };
    }
    var _members = someMessage.additionalAttributes.members
    for (var i = 0; i < someMessage.additionalAttributes.members.length; i++) {
        if (_members[i].ext !== loginid) {
            var newMember = {
                actions: {
                    action: [
                        "TRANSFER_SST",
                        "HOLD",
                        "SEND_DTMF",
                        "DROP"
                    ]
                },
                "alertingTime" : datetime,
                "mediaAddress": _members[i].ext,
                "mediaAddressType": "SIP.js/0.21.2-CTI/Expertflow",
                "startTime": datetime,
                "state": "ACTIVE",
                "stateCause": null,
                "stateChangeTime": datetime,
                'mute': false
            }
            sessionall.response.dialog.participants.push(newMember)
        // }else{
        //     sessionall.response.dialog.participants[0].alertingTime = datetime;
        //     sessionall.response.dialog.participants[0].startTime = datetime;
        }

        if (_members[i].ext == sessionall.response.dialog.customerNumber) {
            _customerInConference = true
        }
    }

    if (sessionall.additionalDetail) {
        sessionall.additionalDetail.customerInConference = _customerInConference;
    } else {
        sessionall.additionalDetail = {
            customerInConference: _customerInConference
        };
    }
    let newCalltype = (someMessage.event === "CONFERENCE" && someMessage.reasonCode === "CONSULT_TRANSFER") ? "ATTENDED_CONFERENCE" : someMessage.reasonCode;
    activeCallEvent(sessionall.response.dialog.id, callback, newCalltype, someMessage.dialog.customerDialogId, someMessage.dialog.customerDestinationNumber)
}
/**
 * Handles the conferenceUpdated event when there is any change in a conference (member added or member left).
 *
 * @param {object} someMessage - The message containing details about the conference update.
 * @param {Function} callback - Callback function to execute after handling the event.
 */
function conferenceUpdated(someMessage, callback) {
    var index = getCallIndex(someMessage.dialog.id);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }
    if (!sessionall) {
        error('invalidState', loginid, "invalid action conferenceUpdated", callback);
        return;
    }

    const sysdate = new Date();
    var datetime = sysdate.toISOString();

    let currentActiveMembers = someMessage.additionalAttributes.members;
    let lastActiveMembers = sessionall.response.dialog.participants

    let currentExts = currentActiveMembers.map(member => member.ext);
    let lastExts = lastActiveMembers.map(member => member.mediaAddress);

    console.log("==>> SIPJS CONSOLE => CURRENT EXTS",currentExts)
    console.log("==>> SIPJS CONSOLE => LAST EXTS",lastExts)
    // Check for active members and new members
    currentActiveMembers.forEach(member => {
        if (lastExts.includes(member.ext)) {
            console.log(`Agent with ext ${member.ext} is Active.`);
        } else {
            console.log(`Agent with ext ${member.ext} is a New Member and is Active.`);
            conferenceMemberAdded(someMessage.dialog.id, member.ext, callback)
        }
    });

    // Check for dropped members
    lastActiveMembers.forEach(member => {
        if (!currentExts.includes(member.mediaAddress)) {
            console.log(`Agent with ext ${member.mediaAddress} is a Dropped Member.`);
            conferenceMemberLeft(someMessage.dialog.id, member.mediaAddress, callback)
        }
    });
}
/**
 * Handles the conferenceMemberAdded event when a participant is added to a conference.
 *
 * @param {string} dialogId - The ID of the conference dialog.
 * @param {string} ext - The extension of the participant who joined the conference.
 * @param {Function} callback - Callback function to execute after handling the event.
 */
function conferenceMemberAdded(dialogId, ext, callback) {
    var index = getCallIndex(dialogId);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }
    if (!sessionall) {
        error('invalidState', loginid, "invalid action conferenceMemberAdded", callback);
        return;
    }

    const sysdate = new Date();
    var datetime = sysdate.toISOString();

    // var _memberadded = someMessage.additionalAttributes.conference.members[0]
    var newMember = {
        actions: {
            action: [
                "TRANSFER_SST",
                "HOLD",
                "SEND_DTMF",
                "DROP"
            ]
        },
        "alertingTime": datetime,
        "mediaAddress":ext,
        "mediaAddressType": "SIP.js/0.21.2-CTI/Expertflow",
        "startTime": datetime,
        "state": "ACTIVE",
        "stateCause": null,
        "stateChangeTime": datetime,
        'mute': false
    }
    sessionall.response.dialog.participants.push(newMember)

    if (ext == sessionall.response.dialog.customerNumber) {
        sessionall.additionalDetail.customerInConference = true
    }

    var _sessionDialog = {}
    _sessionDialog.response = sessionall.response;
    _sessionDialog.event = sessionall.event;
    const eventCopy = JSON.parse(JSON.stringify(_sessionDialog))
    callback(eventCopy)
    SendPostMessage(eventCopy)
}
/**
 * Handles the conferenceMemberLeft event when a participant leaves a conference.
 *
 * @param {string} dialogId - The ID of the conference dialog.
 * @param {string} ext - The extension of the participant who left the conference.
 * @param {Function} callback - Callback function to execute after handling the event.
 */
function conferenceMemberLeft(dialogId, ext, callback) {
    var index = getCallIndex(dialogId);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }
    if (!sessionall) {
        error('invalidState', loginid, "invalid action conferenceMemberLeft", callback);
        return;
    }
    const sysdate = new Date();
    var datetime = sysdate.toISOString();

    var _customerInConference = true

    var _localMembers = sessionall.response.dialog.participants
    // var _memberleft = someMessage.additionalAttributes.conference.members[0]
    for (var i = 0; i < _localMembers.length; i++) {
        if (ext == _localMembers[i].mediaAddress) {
            _localMembers[i].state = "DROPPED"
            _localMembers[i].stateChangeTime = datetime

            if (ext === sessionall.response.dialog.customerNumber) {
                console.log("==>> SIPJS CONSOLE => The Member that left is Customer")
                _customerInConference = false
            }
            else {
                console.log("==>> SIPJS CONSOLE => The Member that left is not Customer")
            }
        }
    }

    var _sessionDialog = {}
    _sessionDialog.response = sessionall.response;
    _sessionDialog.event = sessionall.event;
    const eventCopy = JSON.parse(JSON.stringify(_sessionDialog))
    callback(eventCopy)
    SendPostMessage(eventCopy)


    // removing participant whose state = Dropped
    var _localMembers = sessionall.response.dialog.participants
    for (var i = 0; i < _localMembers.length; i++) {
        if (_localMembers[i].state == "DROPPED") {
            sessionall.response.dialog.participants.splice(i, 1);
        }
    }

    var _sessionDialog = {}
    _sessionDialog.response = sessionall.response;
    _sessionDialog.event = sessionall.event;
    const _eventCopy = JSON.parse(JSON.stringify(_sessionDialog))
    callback(_eventCopy)
    SendPostMessage(_eventCopy)

    if(!_customerInConference){
        console.log("==>> SIPJS CONSOLE => Customer Left, so ending all Calls")
        if (calls && calls[0] && calls[0].response && calls[0].response.dialog) calls[0].response.dialog.callEndReason = "CONFERENCE_CUSTOMER_LEFT"
        if (calls && calls[1] && calls[1].response && calls[1].response.dialog) calls[1].response.dialog.callEndReason = "CONFERENCE_CUSTOMER_LEFT"
        terminateIndexZeroCall()  // should have just called terminateAllCalls    ............... Fix this
        terminateIndexOneCall()   // should have just called terminateAllCalls    ............... Fix this
    }

}
/**
 * Handles the conferenceMemberMute event when a user mutes their conference call.
 *
 * @param {Object} someMessage - Data associated with the conferenceMemberMute event.
 * @param {Function} callback - Callback function to execute after handling the event.
 */
function conferenceMemberMute(someMessage,callback){

    var index = getCallIndex(someMessage.dialog.id);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }
    if (!sessionall) {
        error('invalidState', loginid, "invalid action conferenceMemberMute", callback);
        return;
    }
    const sysdate = new Date();
    var datetime = sysdate.toISOString();

    var _localMembers = sessionall.response.dialog.participants
    var _muteMember = someMessage.additionalAttributes.members[0].ext
    for (var i = 0; i < _localMembers.length; i++) {
        if (_localMembers[i].mediaAddress == _muteMember) {
            _localMembers[i].mute = true
            _localMembers[i].stateChangeTime = datetime
        }
    }

    var _sessionDialog = {}
    _sessionDialog.response = sessionall.response;
    _sessionDialog.event = sessionall.event;
    const _eventCopy = JSON.parse(JSON.stringify(_sessionDialog))
    callback(_eventCopy)
    SendPostMessage(_eventCopy)
}
/**
 * Handles the conferenceMemberUnMute event when a user unmutes their conference call.
 *
 * @param {Object} someMessage - Data associated with the conferenceMemberUnMute event.
 * @param {Function} callback - Callback function to execute after handling the event.
 */
function conferenceMemberUnMute(someMessage,callback){

    var index = getCallIndex(someMessage.dialog.id);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }
    if (!sessionall) {
        error('invalidState', loginid, "invalid action conferenceMemberUnMute", callback);
        return;
    }
    const sysdate = new Date();
    var datetime = sysdate.toISOString();

    var _localMembers = sessionall.response.dialog.participants
    var _unMuteMember = someMessage.additionalAttributes.members[0].ext
    for (var i = 0; i < _localMembers.length; i++) {
        if (_localMembers[i].mediaAddress == _unMuteMember) {
            _localMembers[i].mute = false
            _localMembers[i].stateChangeTime = datetime
        }
    }

    var _sessionDialog = {}
    _sessionDialog.response = sessionall.response;
    _sessionDialog.event = sessionall.event;
    const _eventCopy = JSON.parse(JSON.stringify(_sessionDialog))
    callback(_eventCopy)
    SendPostMessage(_eventCopy)
}
/**
 * Handles the conferenceMemberHold event when a user puts their conference call on hold.
 *
 * @param {Object} someMessage - Data associated with the conferenceMemberHold event.
 * @param {Function} callback - Callback function to execute after handling the event.
 */
function conferenceMemberHold(someMessage,callback){


    var index = getCallIndex(someMessage.dialog.id);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }
    if (!sessionall) {
        error('invalidState', loginid, "invalid action conferenceMemberHold", callback);
        return;
    }

    const sysdate = new Date();
    var datetime = sysdate.toISOString();

    var _localMembers = sessionall.response.dialog.participants
    var _holdMember = someMessage.additionalAttributes.members[0].ext
    for (var i = 0; i < _localMembers.length; i++) {
        if (_localMembers[i].mediaAddress == _holdMember) {
            _localMembers[i].state = "HELD"
            _localMembers[i].stateChangeTime = datetime
        }
    }

    var _sessionDialog = {}
    _sessionDialog.response = sessionall.response;
    _sessionDialog.event = sessionall.event;
    const _eventCopy = JSON.parse(JSON.stringify(_sessionDialog))
    callback(_eventCopy)
    SendPostMessage(_eventCopy)
}
/**
 * Handles the conferenceMemberUnHold event when a user removes their conference call from hold.
 *
 * @param {Object} someMessage - Data associated with the conferenceMemberUnHold event.
 * @param {Function} callback - Callback function to execute after handling the event.
 */
function conferenceMemberUnHold(someMessage,callback){

    var index = getCallIndex(someMessage.dialog.id);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }
    if (!sessionall) {
        error('invalidState', loginid, "invalid action conferenceMemberUnHold", callback);
        return;
    }
    const sysdate = new Date();
    var datetime = sysdate.toISOString();

    var _localMembers = sessionall.response.dialog.participants
    var _holdMember = someMessage.additionalAttributes.members[0].ext
    for (var i = 0; i < _localMembers.length; i++) {
        if (_localMembers[i].mediaAddress == _holdMember) {
            _localMembers[i].state = "ACTIVE"
            _localMembers[i].stateChangeTime = datetime
        }
    }

    var _sessionDialog = {}
    _sessionDialog.response = sessionall.response;
    _sessionDialog.event = sessionall.event;
    const _eventCopy = JSON.parse(JSON.stringify(_sessionDialog))
    callback(_eventCopy)
    SendPostMessage(_eventCopy)
}

function conferenceToCall(someMessage, callback) {
    console.log(someMessage)
    var index = getCallIndex(someMessage.dialog.id);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }
    if (!sessionall) {
        error('invalidState', loginid, "invalid action conferenceToCall", callback);
        return;
    }


    let currentActiveMembers = someMessage.additionalAttributes.members;
    let lastActiveMembers = sessionall.response.dialog.participants

    let currentExts = currentActiveMembers.map(member => member.ext);
    let lastExts = lastActiveMembers.map(member => member.mediaAddress);

    // Check for active members and new members
    currentActiveMembers.forEach(member => {
        if (lastExts.includes(member.ext)) {
            console.log(`Agent with ext ${member.ext} is Active.`);
        } else {
            console.log(`Agent with ext ${member.ext} is a New Member and is Active.`);
            conferenceMemberAdded(someMessage.dialog.id, member.ext, callback)
        }
    });

    // Check for dropped members
    lastActiveMembers.forEach(member => {
        if (!currentExts.includes(member.mediaAddress)) {
            console.log(`Agent with ext ${member.mediaAddress} is a Dropped Member.`);
            conferenceMemberLeft(someMessage.dialog.id, member.mediaAddress, callback)
        }
    });

    // checking if call is Dropped or not
    if (sessionall.response.dialog.state === "DROPPED") {
        console.log("==>> SIPJS CONSOLE => conferenceToCall is now Dropped, so not emitting further Events")
        return
    }

    var _members = sessionall.response.dialog.participants
    _members.forEach(member => {
        if (member.mediaAddress === sessionall.response.dialog.customerNumber) {
            sessionall.response.dialog.callType = "OTHER_IN"
        }
    })

    for (var i = 0; i < _members.length; i++) {
        if (_members[i].mediaAddress != loginid) {
            sessionall.response.dialog.participants.splice(i, 1)
        }
        else {
            // if the Agent itself is on hold. for that
            if (_members[i].state == "HELD") {
                sessionall.response.dialog.state = "HELD"
                sessionall.session.sessionDescriptionHandler.peerConnection.getSenders()[0].track.enabled = false;
            }
        }
    }

    var data = {}
    data.event = sessionall.event
    data.response = sessionall.response
    const dataCopy = JSON.parse(JSON.stringify(data))
    callback(dataCopy)
    SendPostMessage(dataCopy)
}
/**
 * Handles the conferenceEnded event when there are only two users left in the conference.
 *
 * @param {Object} someMessage - Data associated with the conferenceEnded event.
 * @param {Function} callback - Callback function to execute after handling the event.
 */
function conferenceEnded(someMessage,callback){
    var index = getCallIndex(someMessage.dialog.id);
    var sessionall = null
    if (index !== -1) {
        sessionall = calls[index];
    }
    if (!sessionall) {
        error('invalidState', loginid, "invalid action conferenceEnded", callback);
        return;
    }

    const sysdate = new Date();
    var datetime = sysdate.toISOString();


    var _members = sessionall.response.dialog.participants
    for (var i = 0; i < _members.length; i++) {
        _members[i].state = "DROPPED"
        _members[i].stateChangeTime = datetime
    }
    sessionall.response.dialog.isCallEnded = 0
    sessionall.additionalDetail.conference_name = null

    var _sessionDialog = {}
    _sessionDialog.response = sessionall.response;
    _sessionDialog.event = sessionall.event;
    const eventCopy = JSON.parse(JSON.stringify(_sessionDialog))
    callback(eventCopy)
    SendPostMessage(eventCopy)
}


/**
 * Handles the conferenceFailed event when converting to conference fails, either by barge-in or consult conference.
 *
 * @param {Object} someMessage - Data associated with the conferenceFailed event.
 * @param {Function} callback - Callback function to execute after handling the event.
 */
function conferenceFailed(someMessage, callback) {

    // var _errorMessage = ""
    var reasonCode = ""
    if (someMessage.event == "BARGE_FAILED") reasonCode = "BARGE_"
    if (someMessage.event == "CONSULT_CONFERENCE_FAILED") reasonCode = "CONSULT_CONF_"


    // if (Errors.conferenceErrors.hasOwnProperty(reasonCode + someMessage.reasonCode)) {
    //     _errorMessage = Errors.conferenceErrors[reasonCode + someMessage.reasonCode];
    // } else {
    //    // _errorMessage = "ERROR : Unknown EVENT"
    //    _errorMessage = checkErrorReason("CUSTOM_UNKNOWN_ERROR")
    // }
    error('generalError', loginid, `${checkConferenceErrorReason(reasonCode + someMessage.reasonCode)}`, callback);
}

function consultTransferFailed(someMessage,callback){

    // var _errorMessage = ""
    // if (Errors.consultTransferErrors.hasOwnProperty(someMessage.reasonCode)) {
    //     _errorMessage = Errors.consultTransferErrors[someMessage.reasonCode];
    // } else {
    //     // _errorMessage = "ERROR : Unknown EVENT"
    //     _errorMessage = checkErrorReason("CUSTOM_UNKNOWN_ERROR")
    // }
    error('generalError', loginid, `${checkConsultTransferErrorReason(someMessage.reasonCode)}`, callback);
}

function monitoringFailed(someMessage,callback){

    // var _errorMessage = ""
    // if (Errors.monitoringErrors.hasOwnProperty(someMessage.reasonCode)) {
    //     _errorMessage = Errors.monitoringErrors[someMessage.reasonCode];
    // } else {
    //     // _errorMessage = "ERROR : Unknown EVENT"
    //     _errorMessage = checkErrorReason("CUSTOM_UNKNOWN_ERROR")
    // }
    error('generalError', loginid, `${checkMonitoringErrorReason(someMessage.reasonCode)}`, callback);
}

var conferenceEvent = {
    event: "",
    reasonCode: "",
    dialog: {
        id: null,
        message: null,
        call1: null,
        call2: null
    },
    additionalAttributes: {
        conference: {
            name: null,

        },
        members: [
            {
                ext: null,
            }
        ],
        callType: ""
    }
}


function ReEstablishVoiceCall(currentSession, currentState, errorType, callback, dialogId) {
    console.log("==>> SIPJS Console => Re-establishing VoiceCall")
    console.log("==>> SIPJS Console => Re-establishing VoiceCall currentState ", currentState)
    console.log("==>> SIPJS Console => Re-establishing VoiceCall errorType ", errorType)


    const callDelegate = {
        onAccept: (response) => {
            console.log("==>> SIPJS Console => Re-establishing onAccept -> ", response)
            if (errorType != null && errorType != undefined && errorType != "") {
                error("generalError", loginid, checkErrorReason(errorType), callback);
            } else {

                var index = getCallIndex(dialogId);
                var sessionall = null
                var sessionall = calls[index];

                const sysdate = new Date();
                var datetime = sysdate.toISOString();

                if (sessionall.response.dialog.callType == "CONSULT_CONFERENCE" ||
                    sessionall.response.dialog.callType == "BARGE_CONFERENCE" ||
                    sessionall.response.dialog.callType == "ATTENDED_CONFERENCE" ||
                    sessionall.response.dialog.callType == "EXTERNAL_CONSULT_CONFERENCE") {
                    var _members = sessionall.response.dialog.participants
                    for (var i = 0; i < _members.length; i++) {
                        if (_members[i].mediaAddress != loginid && _members[i].mediaAddress !== sessionall.response.dialog.customerNumber) {
                            if (currentState == "HOLD") {
                                generateConferenceEvent("CONFERENCE_MEMBER_HOLD", _members[i].mediaAddress, loginid, sessionall.additionalDetail.conference_name, dialogId)
                            }
                            else {
                                generateConferenceEvent("CONFERENCE_MEMBER_UNHOLD", _members[i].mediaAddress, loginid, sessionall.additionalDetail.conference_name, dialogId)
                            }
                        }
                        if (_members[i].mediaAddress == loginid) {
                            _members[i].state = currentState == "HOLD" ? "HELD" : "ACTIVE";
                            _members[i].stateChangeTime = datetime;
                        }
                    }
                }
                else {
                    var data = {}
                    data.response = calls[index].response;
                    data.event = calls[index].event;
                    data.response.dialog.participants[0].stateChangeTime = datetime;
                    data.response.dialog.participants[0].state = currentState == "HOLD" ? "HELD" : "ACTIVE";
                    data.response.dialog.state = currentState == "HOLD" ? "HELD" : "ACTIVE";
                    data.response.dialog.isCallAlreadyActive = true;
                }
                if (typeof callback === 'function') {
                    var _sessionDialog = {}
                    _sessionDialog.response = sessionall.response;
                    _sessionDialog.event = sessionall.event;
                    const eventCopy = JSON.parse(JSON.stringify(_sessionDialog))
                    callback(eventCopy)
                    SendPostMessage(eventCopy);
                }
                if (currentState == "ACTIVE") {
                    EnableVoiceTrack(currentSession)
                }
            }
        },
        onReject: (response) => {
            console.log("==>> SIPJS Console => Re-establishing onReject -> ", response)
            currentSession.dialog.signalingStateRollback();
            currentSession.sessionDescriptionHandler.peerConnection.setLocalDescription({ type: "rollback" }).then(() => {
                if (response.message.reasonPhrase == "Call Does Not Exist" || response.message.reasonPhrase == "Call is being terminated") {
                    // display error that customer left the call
                    error("generalError", loginid, checkErrorReason("customer_left"), callback);
                    var index = getCallIndex(dialogId)
                    calls[index].response.dialog.callEndReason = "customer_left"
                    terminate_call(dialogId)
                }
                else {
                    ReEstablishVoiceCall(currentSession, currentState, errorType, callback, dialogId)
                }

            })
        }
    }

    if (currentSession.userAgent.transport.isConnected()) {
        console.log("==>> SIPJS Console => Re-establishing VoiceCall Websocket is Connected")
        if (currentState == "HOLD") {
            currentSession.invite({
                sessionDescriptionHandlerOptions: {
                    hold: true,
                },
                requestDelegate: callDelegate
            })
        }
        if (currentState == "ACTIVE") {
            currentSession.invite({
                sessionDescriptionHandlerOptions: {
                    constraints: {
                        audio: true,
                        video: false
                    },
                    iceGatheringTimeout: sipconfig.iceGatheringTimeout
                },
                requestDelegate: callDelegate
            })
        }
    }
    else {
        //Websocket is not Connected
        console.log("==>> SIPJS Console => Re-establishing VoiceCall Websocket is Not Connected")
        const sysdate = new Date();
        var datetime = sysdate.toISOString();
        var index = getCallIndex(dialogId);
        var data = calls[index];


        if (data.response.dialog.callType !== "CONSULT_CONFERENCE" &&
            data.response.dialog.callType !== "BARGE_CONFERENCE" &&
            data.response.dialog.callType !== "ATTENDED_CONFERENCE" &&
            data.response.dialog.callType !== "EXTERNAL_CONSULT_CONFERENCE") {
            data.response.dialog.participants[0].stateChangeTime = datetime;
            data.response.dialog.participants[0].state = currentState == "HOLD" ? "HELD" : "ACTIVE";
            data.response.dialog.state = currentState == "HOLD" ? "HELD" : "ACTIVE";
        }
        else {
            var _members = data.response.dialog.participants
            for (var i = 0; i < _members.length; i++) {
                if (_members[i].mediaAddress == loginid) {
                    _members[i].state = currentState == "HOLD" ? "HELD" : "ACTIVE";
                    _members[i].stateChangeTime = datetime;
                }
            }
        }
        data.response.dialog.isCallAlreadyActive = true;
        console.log("==>> SIPJS Console => Will wait for UserAgent To Register & then Re-establish Call")
    }
}

function EnableVoiceTrack(currentSession) {
    console.log("==>> SIPJS Console => ENABLE VOICE TRACK GET CALLED")
    var _peer = currentSession.sessionDescriptionHandler.peerConnection;
    let _senders = _peer.getSenders();

    if (!_senders.length) return;
    _senders.forEach(function (sender) {
        if (sender.track && sender.track.kind == "audio") {
            sender.track.enabled = false;
            sender.track.enabled = true;
        }
    });
}

function DisableVoiceTrack(currentSession) {
    console.log("==> SIPJS Console => DISABLE VOICE TRACK GET CALLED")
    var _peer = currentSession.sessionDescriptionHandler.peerConnection;
    let _senders = _peer.getSenders();

    if (!_senders.length) return;
    _senders.forEach(function (sender) {
        if (sender.track && sender.track.kind == "audio") {
            sender.track.enabled = false;
        }
    });
}

function DisableVideoTrack(currentSession) {
    console.log("==>> SIPJS Console => DISABLE VIDEO TRACK GET CALLED")
    var _peer = currentSession.sessionDescriptionHandler.peerConnection;
    let _senders = _peer.getSenders();

    if (!_senders.length) return;
    _senders.forEach(function (sender) {
        if (sender.track && sender.track.kind == "video") {
            sender.track.stop()
        }
    });
}

function customerLeftEndCall(message) {
    var index = getCallIndex(message.dialog.id);
    var someSession;
    if (index !== -1) {
        someSession = calls[index];
    }
    if (!someSession) {
        return;
    }

    // Updating callEndReason
    const callEndReason = someSession.response.dialog.callEndReason;
    if (!callEndReason || (!callEndReason.includes("direct_transfered") && callEndReason !== "EXTERNAL_ATTENDED_TRANSFER")) {
        someSession.response.dialog.callEndReason = message.reasonCode;
    }

    // Check for External Consult Call in case of Attended Transfer
    // this will fail  if No consult call is found
    if (someSession.response.dialog.callEndReason === "ATTENDED_TRANSFER") {
        const isExternalConsult = calls.some(call => call?.response?.dialog?.callType === "EXTERNAL-CONSULT");

        if (isExternalConsult) {
            someSession.response.dialog.callEndReason = "EXTERNAL_ATTENDED_TRANSFER";
            // as it was External Consult which ended wih Reason EXTERNAL_ATTENDED_TRANSFER
            if (calls[0]?.response?.dialog) {
                calls[0].response.dialog.callEndReason = "EXTERNAL_ATTENDED_TRANSFER";
            }
        }
    }

    switch (someSession.session.state) {
        case SIP.SessionState.Initial:
        case SIP.SessionState.Establishing:
            if (someSession.session instanceof SIP.Inviter) {
                // An unestablished outgoing session
                someSession.session.cancel();
            } else {
                // An unestablished incoming session
                someSession.session.reject();
            }
            break;
        case SIP.SessionState.Established:
            // An established session
            someSession.session.bye();
            break;
        case SIP.SessionState.Terminating:
        case SIP.SessionState.Terminated:
            // Cannot terminate a session that is already terminated
            break;
    }
}

function internalDtmfSend(dtmfs, dialogId, callback, action) {

    var index = getCallIndex(dialogId);
    var sessionall = null
    sessionall = calls[index].session;

    var failed = false

    const options = {
        requestOptions: {
            body: {
                contentDisposition: "render",
                contentType: "application/dtmf-relay",
                content: ""
            }
        },
        requestDelegate: {
            onAccept: (response) => {
                console.log("==>> SIPJS Console => DTMF onAccept")
            },
            onReject: (response) => {
                console.log("==>> SIPJS Console => DTMF onReject", response)
                if (!failed) {
                    error("generalError", loginid, checkErrorReason(action + "_Transaction_Error"), callback);
                    failed = true
                }
            }
        }
    };
    for (var i = 0; i < dtmfs.length; i++) {
        options.requestOptions.body.content = "Signal=" + dtmfs[i] + "\r\nDuration=150"
        sessionall.info(options)
            .catch((error) => {
                error("generalError", loginid, checkErrorReason(action + "_Transaction_Error"), callback);
                failed = true
            });
    }

}

function createMediaStreamUpdateEvent({ loginId, status, dialogId, eventRequest, stream, streamStatus, errorReason }) {

    const sysdate = new Date();
    var datetime = sysdate.toISOString();

    return {
        ...mediaStreamUpdate,
        loginId: loginId,
        status: status,
        dialog: {
            ...mediaStreamUpdate.dialog,
            id: dialogId,
            eventRequest: eventRequest,
            stream: stream,
            streamStatus: streamStatus,
            timeStamp: datetime,
            errorReason: errorReason
        }
    };
}

function sendMessage(message_targetUri_value,message){
    messager = new SIP.Messager(userAgent,message_targetUri_value,JSON.stringify(message));
    var messageOptions = {
        requestDelegate: {
            onAccept: (response) => {
                console.log("==>> SIPJS Console => sendMesage onAccept ->", response)
            },
            onReject: (response) => {
                console.log("==>> SIPJS Console => sendMesage onReject ->", response)
            }
        }
    }
    messager.message(messageOptions);
}

function terminateIncomingCall(session, options = {}) {
    let dest = ""

    if (session.incomingInviteRequest.message.headers["From"][0].parsed.uri.normal.user) {
        dest = session.incomingInviteRequest.message.headers["From"][0].parsed.uri.normal.user
    }
    if (dest == undefined || dest == "" || dest == null) {
        console.log("==>> SIPJS CONSOLE => terminateIncomingCall Dest Not Found");
        return
    }

    dest = new SIP.URI("sip", dest, sipconfig.uri)

    let id = session.incomingInviteRequest.message.headers["X-Call-Id"] != undefined ? session.incomingInviteRequest.message.headers["X-Call-Id"][0]['raw'] : session.incomingInviteRequest.message.headers["Call-ID"][0]['raw'];
    var message = {}
    message.event = "USER_BUSY"
    message.dialog = {}
    message.dialog.id = id


    sendMessage(dest, message)
    var options = {
        extraHeaders: [`X-Call-Dropped-Custom-Reason : ON-ANOTHER-CALL`],
        statusCode: 486,
    }
    session.reject(options)
}

function agentBusyError(message, callback) {
    // message.event = "USER_BUSY"
    error("generalError", loginid, checkErrorReason(message.event), callback);
}

/**
 * Forwards RECORDING_STATE events from media server to the agent desk callback.
 * Expected payload:
 * {
 *   event: "RECORDING_STATE",
 *   dialog: { id },
 *   recording: { recording: "enabled"|"disabled", status: "started"|"paused"|"stopped" }
 * }
 */
function recordingStateEvent(someMessage, callback) {
    try {
        console.log("==>> SIPJS CONSOLE => RECORDING_STATE : ", someMessage);
        const _event = JSON.parse(JSON.stringify(someMessage));
        if (typeof callback === "function") {
            callback(_event);
        }
        SendPostMessage(_event);
    } catch (e) {
        console.error("==>> SIPJS CONSOLE => RECORDING_STATE Error : ", e);
    }
}

/**
 * Pause/resume call recording via voice-connector HTTP API.
 * Expected parameter: { dialogId, extension, domain, eslHost, voiceConnectorUrl }
 * voiceConnectorUrl comes from tenant mediaServer.voiceConnectorUrl, or falls back to https://{host} from wssUrl
 * Header: tenantid = domain
 */
function pauseOrResumeRecording(action, parameter, callback) {
    try {
        const dialogId = parameter?.dialogId;
        const extension = parameter?.extension;
        const domain = parameter?.domain;
        const eslHost = parameter?.eslHost;
        const voiceConnectorUrl = parameter?.voiceConnectorUrl;
        const missing = [];
        if (!action) missing.push("action");
        if (!dialogId) missing.push("dialogId");
        if (!extension) missing.push("extension");
        if (!domain) missing.push("domain");
        if (!eslHost) missing.push("eslHost");
        if (!voiceConnectorUrl) missing.push("voiceConnectorUrl");
        if (typeof callback !== "function") missing.push("callback");
        if (missing.length > 0) {
            error("generalError", loginid, `Error: The following parameter(s) are undefined or null or empty: ${missing.join(', ')}`, callback);
            return;
        }

        if (Object.keys(sipconfig).length === 0) sipconfig = sipConfig;
        const baseUrl = String(voiceConnectorUrl).replace(/\/$/, "");

        const endpoint = action === "pause" ? "/recording/pause" : "/recording/resume";
        const url = `${baseUrl}${endpoint}`;
        const payload = {
            dialogId: dialogId,
            extension: extension,
            domain: domain,
            eslHost: eslHost
        };

        console.log("==>> SIPJS CONSOLE => pauseOrResumeRecording request : ", url, payload);

        fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "tenantid": domain
            },
            body: JSON.stringify(payload)
        })
            .then(async (response) => {
                if (!response.ok) {
                    const errorText = await response.text().catch(() => "");
                    console.error("==>> SIPJS CONSOLE => pauseOrResumeRecording HTTP error : ", response.status, errorText);
                    error("generalError", loginid, `Recording ${action} failed (${response.status})`, callback);
                    return;
                }
                console.log("==>> SIPJS CONSOLE => pauseOrResumeRecording success : ", action);
            })
            .catch((err) => {
                console.error("==>> SIPJS CONSOLE => pauseOrResumeRecording fetch error : ", err);
                error("generalError", loginid, `Recording ${action} request failed`, callback);
            });
    } catch (e) {
        console.error("==>> SIPJS CONSOLE => pauseOrResumeRecording Error : ", e);
        error("generalError", loginid, "Recording control request failed", callback);
    }
}

function checkErrorReasonGeneric(errorObject, errorKey) {
    if (errorObject.hasOwnProperty(errorKey)) {
        return errorObject[errorKey];
    } else {
        return Errors.errorsList["CUSTOM_UNKNOWN_ERROR"];
    }
}


function checkErrorReason(errorKey) {
    return checkErrorReasonGeneric(Errors.errorsList, errorKey);
}

/**
 * Resolve outbound/consult SIP reject into a UI message + callEndReason.
 * Prefer mapped codes (e.g. 604 → User does not exist); otherwise surface the real SIP status/phrase.
 */
function resolveSipRejectError(response, transactionErrorKey) {
    const message = response?.message;
    if (!message) {
        return {
            displayMessage: Errors.errorsList["CUSTOM_UNKNOWN_ERROR"],
            callEndReason: "CUSTOM_UNKNOWN_ERROR"
        };
    }

    const statusCode = message.statusCode ?? response.statusCode;
    const reasonPhrase = message.reasonPhrase;
    const statusKey = statusCode != null ? String(statusCode) : null;

    const customReasonHeader = message.headers?.["X-Call-Dropped-Custom-Reason"];
    if (customReasonHeader?.[0]?.raw) {
        const raw = customReasonHeader[0].raw;
        if (Errors.errorsList.hasOwnProperty(raw)) {
            return { displayMessage: Errors.errorsList[raw], callEndReason: raw };
        }
        if (statusKey && Errors.errorsList.hasOwnProperty(statusKey)) {
            return { displayMessage: Errors.errorsList[statusKey], callEndReason: statusKey };
        }
        return { displayMessage: raw, callEndReason: raw };
    }

    const reasonFromBody = message.data?.match(/text="([^"]+)"/)?.[1];
    if (reasonFromBody && reasonFromBody !== "NORMAL_CLEARING") {
        if (Errors.errorsList.hasOwnProperty(reasonFromBody)) {
            return { displayMessage: Errors.errorsList[reasonFromBody], callEndReason: reasonFromBody };
        }
        if (statusKey && Errors.errorsList.hasOwnProperty(statusKey)) {
            return { displayMessage: Errors.errorsList[statusKey], callEndReason: statusKey };
        }
        const actual = statusKey ? `${statusKey} ${reasonFromBody}` : reasonFromBody;
        return { displayMessage: actual, callEndReason: reasonFromBody };
    }

    if (["Service Unavailable", "Request Timeout"].includes(reasonPhrase) && transactionErrorKey) {
        return {
            displayMessage: checkErrorReason(transactionErrorKey),
            callEndReason: reasonPhrase
        };
    }

    if (statusKey && Errors.errorsList.hasOwnProperty(statusKey)) {
        return { displayMessage: Errors.errorsList[statusKey], callEndReason: statusKey };
    }

    if (reasonPhrase && Errors.errorsList.hasOwnProperty(reasonPhrase)) {
        return { displayMessage: Errors.errorsList[reasonPhrase], callEndReason: reasonPhrase };
    }

    if (statusKey && reasonPhrase) {
        return { displayMessage: `${statusKey} ${reasonPhrase}`, callEndReason: reasonPhrase };
    }
    if (reasonPhrase) {
        return { displayMessage: reasonPhrase, callEndReason: reasonPhrase };
    }
    if (statusKey) {
        return { displayMessage: statusKey, callEndReason: statusKey };
    }

    return {
        displayMessage: Errors.errorsList["CUSTOM_UNKNOWN_ERROR"],
        callEndReason: "CUSTOM_UNKNOWN_ERROR"
    };
}

function checkConferenceErrorReason(errorKey) {
    return checkErrorReasonGeneric(Errors.conferenceErrors, errorKey);
}

function checkConsultTransferErrorReason(errorKey) {
    return checkErrorReasonGeneric(Errors.consultTransferErrors, errorKey);
}

function checkMonitoringErrorReason(errorKey) {
    return checkErrorReasonGeneric(Errors.monitoringErrors, errorKey);
}

const handleConstraintsError = async (message) => {
    console.error(`==>> SIPJS CONSOLE => ${message}`);
    const customResponse = await mediaDeviceErrors("TypeError", "none");
    error('generalError', loginid, customResponse.alert, globalEventCallback);
    return Promise.reject(new Error(customResponse.alert));
};

// Handle CALL_INITIATE logic
const handleCallInitiate = async (constraints) => {
    let mediaStream = new MediaStream();

    try {
        if (constraints.mediaType === "AUDIO") {
            mediaStream = await getAudioStream(constraints.audio);
        } else if (constraints.mediaType === "VIDEO") {
            mediaStream = await getAudioAndVideoStream(constraints.audio, constraints.video);
        } else if (constraints.mediaType === "SCREENSHARE") {
            mediaStream = await getAudioAndScreenShareStream(constraints.audio, constraints.video);
        }
    } catch (error) {
        // console.log("==>> SIPJS CONSOLE => Error during CALL_INITIATE:", error);
        // console.log(error.description)
        throw error;
    }

    return mediaStream;
};

// Handle CALL_ANSWER logic (placeholder for future implementation)
const handleCallAnswer = async (constraints) => {
    const mediaStream = new MediaStream();
    try {
        switch (constraints.mediaType) {
            case "AUDIO":
                await handleAudioAnswer(constraints, mediaStream);
                break;

            case "VIDEO":
                await handleVideoAnswer(constraints, mediaStream);
                break;

            case "SCREENSHARE":
                await handleScreenShareAnswer(constraints, mediaStream);
                break;

            case "ONLYVIEWSCREENSHARE":
                await handleOnlyViewScreenShareAnswer(constraints, mediaStream);
                break;

            default:
                console.error("==>> SIPJS CONSOLE => Unknown mediaType for CALL_ANSWER.");
                throw new Error("Unknown mediaType for CALL_ANSWER.");
        }
    } catch (error) {
        console.error("==>> SIPJS CONSOLE => Error during CALL_ANSWER:", error);
        throw error;
    }

    return mediaStream;
};

// Get audio stream
const getAudioStream = async (audioStatus) => {
    try {
        return await navigator.mediaDevices.getUserMedia({ audio: audioStatus });
    } catch (error) {
        await handleMediaError(error, "audio");
    }
};

// Get audio and video stream
const getAudioAndVideoStream = async (audioStatus, videoStatus) => {
    const mediaStream = new MediaStream();

    // Handle Audio
    try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: audioStatus });
        console.log("==>> SIPJS CONSOLE => Audio Stream:", audioStream);
        mediaStream.addTrack(audioStream.getAudioTracks()[0]);
    } catch (audioError) {
        console.error("==>> SIPJS CONSOLE => Audio Error:", audioError);
        await handleMediaError(audioError, "audio");
        // Optional: add dummy audio if needed
        // mediaStream.addTrack(createDummyAudioTrack());
    }

    // Handle Video
    try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: videoStatus });
        console.log("==>> SIPJS CONSOLE => Video Stream:", videoStream);
        mediaStream.addTrack(videoStream.getVideoTracks()[0]);
    } catch (videoError) {
        console.warn("==>> SIPJS CONSOLE => Video Error -> ", videoError);
        console.warn("==>> SIPJS CONSOLE => Creating Dummy Video and using that");
        handleMediaDeviceError(videoError, "video");
        dummyVideoErrorReason = videoError.name;
        mediaStream.addTrack(createDummyVideoTrack());
    }

    return mediaStream;
};

// Get audio and screenshare stream
const getAudioAndScreenShareStream = async (audioStatus, videoStatus) => {
    const mediaStream = new MediaStream();

    // Handle Audio
    try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: audioStatus });
        mediaStream.addTrack(audioStream.getAudioTracks()[0]);
    } catch (audioError) {
        // if (audioError.message === "Access to Screen-share is denied. Please enable it.") {
        //     throw new Error(audioError.message); // Preserve this specific flow
        // }
        console.error("==>> SIPJS CONSOLE => Audio Error:", audioError);
        await handleMediaError(audioError, "audio");
        // Optionally: mediaStream.addTrack(createDummyAudioTrack());
    }

    // Handle Screen Share
    try {
        const videoStream = await navigator.mediaDevices.getDisplayMedia({ video: videoStatus });
        mediaStream.addTrack(videoStream.getVideoTracks()[0]);
    } catch (screenShareError) {
        console.warn("==>> SIPJS CONSOLE => Screenshare Error -> ", screenShareError);
        console.warn("==>> SIPJS CONSOLE => Creating Dummy Video and using that");
        // await handleDisplayError(screenShareError, "Screenshare Error while INITIATING ScreenShare Call");
        mediaStream.addTrack(createDummyVideoTrack());

        // throw error at this point or after the call, turn off stream and throw error
    }

    return mediaStream;
};

// Handle media device errors and throw ERROR
const handleMediaError = async (errorMessage, mediaType) => {
    const customResponse = await mediaDeviceErrors(errorMessage.name, mediaType);
    error('generalError', loginid, customResponse.alert, globalEventCallback);
    throw new Error(customResponse.alert);
};

// Handle media device errors and dont throw ERROR
const handleMediaDeviceError = async (errorMessage, mediaType) => {
    const customResponse = await mediaDeviceErrors(errorMessage.name, mediaType);
    error('generalError', loginid, customResponse.alert, globalEventCallback);
};





// Handle AUDIO case
const handleAudioAnswer = async (constraints, mediaStream) => {
    try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: constraints.audio });
        mediaStream.addTrack(audioStream.getAudioTracks()[0]);
    } catch (audioError) {
        console.warn("==>> SIPJS CONSOLE => Audio Error:", audioError);
        console.warn("==>> SIPJS CONSOLE => Creating Dummy Audio and using that");
        handleMediaDeviceError(audioError, "audio");
        dummyAudioErrorReason = audioError.name;
        // await handleMediaError(audioError, "Microphone Error while ANSWERING Audio Call");
        mediaStream.addTrack(createDummyAudioTrack());
    }
};

// Handle VIDEO case
const handleVideoAnswer = async (constraints, mediaStream) => {
    // Handle Audio
    try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: constraints.audio });
        mediaStream.addTrack(audioStream.getAudioTracks()[0]);
    } catch (audioError) {
        console.warn("==>> SIPJS CONSOLE => Audio Error:", audioError);
        console.warn("==>> SIPJS CONSOLE => Creating Dummy Audio and using that");
        handleMediaDeviceError(audioError, "audio");
        dummyAudioErrorReason = audioError.name;
        // await handleMediaError(audioError, "Microphone Error while ANSWERING Video Call");
        mediaStream.addTrack(createDummyAudioTrack());
    }

    // Handle Video
    try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: constraints.video });
        mediaStream.addTrack(videoStream.getVideoTracks()[0]);
    } catch (videoError) {
        console.warn("==>> SIPJS CONSOLE => Video Error:", videoError);
        console.warn("==>> SIPJS CONSOLE => Creating Dummy Video and using that");
        handleMediaDeviceError(videoError, "video");
        dummyVideoErrorReason = videoError.name;
        // await handleMediaError(videoError, "Video Error while ANSWERING Video Call");
        mediaStream.addTrack(createDummyVideoTrack());
    }
};

// Handle SCREENSHARE case
const handleScreenShareAnswer = async (constraints, mediaStream) => {
    // Handle Audio
    try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: constraints.audio });
        mediaStream.addTrack(audioStream.getAudioTracks()[0]);
    } catch (audioError) {
        console.warn("==>> SIPJS CONSOLE => Audio Error:", audioError);
        console.warn("==>> SIPJS CONSOLE => Creating Dummy Audio and using that");
        handleMediaDeviceError(audioError, "audio");
        dummyAudioErrorReason = audioError.name;
        // await handleMediaError(audioError, "Audio Error while ANSWERING ScreenShare Call");
        mediaStream.addTrack(createDummyAudioTrack());
    }

    // Handle Screen Share
    try {
        const screenShareStream = await navigator.mediaDevices.getDisplayMedia({ video: constraints.video });
        mediaStream.addTrack(screenShareStream.getVideoTracks()[0]);
    } catch (screenShareError) {
        console.warn("==>> SIPJS CONSOLE => Screenshare Error -> ", screenShareError);
        console.warn("==>> SIPJS CONSOLE => Creating Dummy Video and using that");
        // await handleDisplayError(screenShareError, "Screenshare Error while ANSWERING ScreenShare Call");
        mediaStream.addTrack(createDummyVideoTrack());
    }
};

// Handle ONLYVIEWSCREENSHARE case
const handleOnlyViewScreenShareAnswer = async (constraints, mediaStream) => {
    try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: constraints.audio });
        mediaStream.addTrack(audioStream.getAudioTracks()[0]);
    } catch (audioError) {
        console.warn("==>> SIPJS CONSOLE => Audio Error:", audioError);
        console.warn("==>> SIPJS CONSOLE => Creating Dummy Audio and using that");
        // await handleMediaError(audioError, "Microphone Error while ANSWERING OnlyViewScreenShare Call");
        mediaStream.addTrack(createDummyAudioTrack());
    }

    // Always create a dummy video track
    mediaStream.addTrack(createDummyVideoTrack());
};


/**
 *
 * @returns {void}
 * @description This function creates a dummy audio track.
 */

const createDummyAudioTrack = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const destination = audioContext.createMediaStreamDestination();
    const silentSource = audioContext.createBufferSource();

    // Create an empty (silent) buffer
    const buffer = audioContext.createBuffer(1, 1, 44100); // 1 channel, 1 sample frame, 44.1kHz
    silentSource.buffer = buffer;

    silentSource.connect(destination);
    silentSource.start();
    destination.stream.getAudioTracks()[0].customInfo = "dummy";

    return destination.stream.getAudioTracks()[0];
};

/**
 *
 * @param {*} width
 * @param {*} height
 * @returns {void}
 * @description This function creates a dummy video track using a canvas element.
 */

const createDummyVideoTrack = (width = 640, height = 480) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    context.fillStyle = 'black';
    context.fillRect(0, 0, width, height);

    const stream = canvas.captureStream(1); // 1 fps
    stream.getVideoTracks()[0].customInfo = "dummy";
    return stream.getVideoTracks()[0];
};

/**
 * @param {*} dialogId
 * @param {*} callback
 * @returns {void}
 * @description This function iterates through the senders of the session and stops any dummy tracks found.
 */
const removeDummyTracks = (dialogId, callback) => {
    console.log("==>> SIPJS CONSOLE => Removing Dummy Tracks");

    const index = getCallIndex(dialogId);
    if (index === -1) return;

    const sessionall = calls[index];
    if (!sessionall) return;

    const senders = sessionall.session.sessionDescriptionHandler.peerConnection.getSenders();
    console.log("==>> SIPJS CONSOLE => Checking senders for dummy tracks");

    senders.forEach(async sender => {
        const track = sender.track;
        if (track && track.customInfo === "dummy") {
            track.stop();
            console.log("==>> SIPJS CONSOLE => Dummy Track Stopped with Type ->", track.kind);

            const localMediaType = sessionall.additionalDetail.localMediaType.toLowerCase();

            if (track.kind === "video") {
                if (localMediaType !== "onlyviewscreenshare") {
                    console.log("==>> SIPJS CONSOLE => Adjusting localMediaType ->", localMediaType);
                    sessionall.additionalDetail.localMediaType = "audio";
                    setupRemoteMedia(sessionall.session, callback, dialogId);
                    publishMediaStreamUpdateEvent(dialogId, "video", "off", callback);
                }
                if (localMediaType !== "screenshare" && localMediaType !== "onlyviewscreenshare") {
                    console.log("==>> SIPJS CONSOLE => dummyVideoErrorReason ->", dummyVideoErrorReason);
                    var customResponse = await mediaDeviceErrors(dummyVideoErrorReason, "video");
                    const mediaPermissionStatus = createMediaPermissionStatusUpdateEvent(dialogId, "video", "denied", customResponse.alert);
                    callback(mediaPermissionStatus);
                    dummyVideoErrorReason = null;
                }
            }

            if (track.kind === "audio") {
                sessionall.additionalDetail.localMediaType = "audio";
                console.log("==>> SIPJS CONSOLE => dummyAudioErrorReason ->", dummyAudioErrorReason);
                var customResponse = await mediaDeviceErrors(dummyAudioErrorReason, "audio");
                const mediaPermissionStatus = createMediaPermissionStatusUpdateEvent(dialogId, "microphone", "denied", customResponse.alert);
                callback(mediaPermissionStatus);
                dummyAudioErrorReason = null;
            }
        }
    });
};

/**
 * @param {*} dialogId
 * @param {*} mediaType
 * @param {*} status
 * @param {*} errorMessage
 * @returns {Object} - The media permission status update event object.
 * @description This function creates an event object that contains information about the media permission status.
 */
const createMediaPermissionStatusUpdateEvent = (dialogId, mediaType, status, errorMessage) => {
    const sysdate = new Date();
    var datetime = sysdate.toISOString();

    return {
        ...mediaPermissionStatus,
        id: dialogId,
        loginId: loginid,
        dialog: {
            ...mediaPermissionStatus.dialog,
            permissionType: mediaType,
            permissionStatus: status,
            timeStamp: datetime,
            errorReason: errorMessage
        }
    };
}

const checkingMicroPhonePermission = async () => {
    console.log("==>> SIPJS CONSOLE => Checking Microphone Permission");
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioTrack = stream.getAudioTracks()[0];

        console.log("==>> SIPJS CONSOLE => Microphone Permission Granted")
        return true
    } catch (audioError) {
        console.log("==>> SIPJS CONSOLE => Microphone Permission Denied");
        await handleMediaError(audioError, "audio");
        return false
    }
}
