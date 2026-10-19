var params = {};
var callbacks = {};
var notReadyReasons = [];
var _jwClient;
var xmppClient;
var finesseFlavor = config.finesseFlavor;
var isRefreshCase = false;
var agentStateData = {state: null, reasonCodeId: null};
var failoverAgentStateData = {state: null, reasonCodeId: null};
var prevAgentState = null;
var failoverReconnect = false;
var heartbeatReceived = false;
var currentDomain = null;
var outOfService = false;
var xmmpConnectionStatus = null;
var isSSOAgent = false;
var queueInterval = null;
var queueSubscribed = false;

$(document).ready(function ()
//$(window).load(function()
{
    console.log("Window onload called");
    if (window.jabberwerx) {
        _jwClient = new jabberwerx.Client("cisco");
    }

    //Refresh case
    try{
        var logoutFlag = localStorage.getItem("logoutFlag");
        if (logoutFlag == "false" && localStorage.getItem("loginParameters")) {
            var loginParameters = JSON.parse(localStorage.getItem("loginParameters"));
            console.log(loginParameters);
            var isSSOAgent = loginParameters.parameter.isSSOUser;
            console.log(isSSOAgent);
            console.log(typeof(isSSOAgent));
            if(isSSOAgent && (isSSOAgent == "true" || isSSOAgent == true)){
                console.log("This is sso user, going to get sso user from local storage");
                isRefreshCase = true;
                var parameter = JSON.parse(localStorage.getItem("ssoUser"));
                parameter.clientCallbackFunction = window[parameter.clientCallbackFunction];
                parameter.isSSOUser = true;
                var parameters = {"parameter": parameter};
                console.log("Got parameters " , parameters);
                login(parameters);
                //login(parameters, "refresh");
            }
            else{
                console.log("this isn't sso user");
                var parameters = JSON.parse(localStorage.getItem("loginParameters"));
                loginRefreshCase(parameters);
            }
        }
    }
    catch(err){
        console.error(err);
    }
});

function initialize(parameters) {
    try {
      var authcode = parameters.parameter.loginId + ":" + parameters.parameter.password;
      const encodedData = window.btoa(authcode);
      var adminAuthcode = config.adminUsername + ":" + config.adminPassword;
      const adminEncodedData = window.btoa(adminAuthcode);
      var domain = getDomain();
      console.log("Got domain: " + domain);
      if(parameters.parameter.isMobileAgent == undefined || parameters.parameter.isMobileAgent == false){
        params =
        {
          encodedData: encodedData,
          adminEncodedData: adminEncodedData,
          domain: domain,
          teamId: null,
          extension: parameters.parameter.extension,
          isSSOUser: parameters.parameter.isSSOUser,
          username: parameters.parameter.loginId,
          password: parameters.parameter.password,
          boshUrl: null,
        }
      }
      else{
        params =
        {
          encodedData: encodedData,
          adminEncodedData: adminEncodedData,
          domain: domain,
          teamId: null,
          extension: parameters.parameter.extension,
          isSSOUser: parameters.parameter.isSSOUser,
          username: parameters.parameter.loginId,
          password: parameters.parameter.password,
          isMobileAgent: parameters.parameter.isMobileAgent,
          dialednumber: parameters.parameter.dialednumber,
          mode: parameters.parameter.mode,
          boshUrl: null,
        }
      }
      callbacks = {
        "apiCallbackFunction": apiResponseCallback,
        "eventCallbackFunction": eventCallback,
        "clientCallbackFunction": parameters.parameter.clientCallbackFunction,
      }
      return params;
    }
    catch (err) {
      console.error(err.message);
    }
  }


var eventCallback = function (data) {
    var event = _eventHandler(data);
    callbacks.clientCallbackFunction(event);
    return;
}

var apiResponseCallback = function (data) {
    var response = apiResponseHandler(data);
    console.log(response);

    if (response.length && response.length == 2 && response[0].response.dialog != undefined && response[1].response.dialog != undefined) {
        callbacks.clientCallbackFunction(response[0]);
        callbacks.clientCallbackFunction(response[1]);
    }
    else
        callbacks.clientCallbackFunction(response);

    return;
}


function getDomain() {
    try{
    if (currentDomain)
        return currentDomain;
    else {
        var currentDomainStorage = localStorage.getItem("currentDomain");
        if (currentDomainStorage && (currentDomainStorage == config.domain || currentDomainStorage == config.subDomain)) {
            currentDomain = currentDomainStorage;
            return currentDomainStorage;
        }
        return config.domain;
    }
    }
    catch(err){
        console.error(err);
    }
}

function switchDomain() {
    switch (params.domain) {
        case config.domain:
            params.domain = config.subDomain;
            return config.subDomain;
        case config.subDomain:
            params.domain = config.domain;
            return config.domain;

    }
    return config.domain;
}

function getBoshUrl() {
    if (currentDomain)
        return "https://" + currentDomain + ":7443/http-bind/";
    return config.boshUrl;
}

function switchBoshUrl() {
    switch (params.boshUrl) {
        case config.boshUrl:
            params.boshUrl = config.subBoshUrl;
            return config.subBoshUrl;
        case config.subBoshUrl:
            params.boshUrl = config.boshUrl;
            return config.boshUrl;
    }
    return config.boshUrl;
}

function manageSubscribed(teamEvent) {
    try{
        localStorage.setItem("teamId", params.teamId);
        teamEvent.response.result = "Subscribed";
        teamEvent.response.teamId = params.teamId;
        callbacks.clientCallbackFunction(teamEvent);
        return;
    }
    catch(err){
        console.error(err);
    }
}

function manageUnsubscribed(teamEvent) {
    try{
        teamEvent.response.result = "Unsubscribed";
        teamEvent.response.teamId = localStorage.getItem("teamId");
        callbacks.clientCallbackFunction(teamEvent);
        localStorage.setItem("teamId", null);

        var isLogoutFlag = localStorage.getItem("logoutFlag");
        if (isLogoutFlag && isLogoutFlag == "false") {
            subscribeToTeam();
            return;
        }
        params.teamId = null;
        return;
    }
    catch(err){
        console.error(err);
    }
}

function teamCallbackNode(nodeEvent) {
    var stringEvent = new XMLSerializer().serializeToString(nodeEvent);

    var teamEvent =
    {
        "event": "teamEvent",
        "response": {
            "loginId": params.username,
            "result": "",
            "teamId": "",
        }
    }
    if (stringEvent.includes('type="result"') && stringEvent.includes('subscription="subscribed"')) {
        manageSubscribed(teamEvent);
        return;
    }
    else if (stringEvent.includes('type="result"')) {
        manageUnsubscribed(teamEvent)
        return;
    }

    sendTeamErrorstoClient("invalidRequest", "Invalid data for the request");
    return;
}

function loginRefreshCase(parameters) {
    isRefreshCase = true;
    parameters.parameter.clientCallbackFunction = window[parameters.parameter.clientCallbackFunction];
    executeCommands(parameters);
}

function processTokenLogin(token){
    try{
        if(token.error == undefined &&!token.includes("Error while executing") )
        {
            console.log("[login] token: " , token);
            setUsersLocalStorage({"loginId":params.username, "password": params.password, "extension": params.extension, "clientCallbackFunction": callbacks.clientCallbackFunction.name});
            params.password = token;
            isSSOAgent = true;
            console.log("username: " , params.username);
            params.username = params.username.split("@")[0];
            console.log("username: " , params.username);
        }
        else if(token.error != undefined)
            apiErrors({status: token.status}, token, callbacks.apiCallbackFunction);
        else
            apiErrors({status: 417}, token, callbacks.apiCallbackFunction);
    }
    catch(err){
        console.error(err);
    }
}

function trimUsername(loginId){
    var username = loginId;
    if(username.includes("@")){
        username = username.split("@")[0];
    }
    return username;
}


async function checkIsReacheableFinesse(isFailoverCase) {
    var systemInfo = await getSystemInfo(getDomain(), isFailoverCase);
    console.log("[checkIsReacheableFinesse]  pinged  " , getDomain());
    console.log("Got System Info", systemInfo);

    if(systemInfo != 1){
        currentDomain = switchDomain();
        console.log("[checkIsReacheableFinesse] domain swithched to  " , currentDomain);
        systemInfo = await getSystemInfo(getDomain(), isFailoverCase);
        console.log("Got System Info", systemInfo);
        if(systemInfo != 1){
            throwError("Unable to reach finesse server");
            return null;
        }
    }
    if(systemInfo == 1)
        return 1;
}

function sendGetQueuesCommandFailover(){
    var commandParams =
    {
        "action": "getQueues",
        "parameter":
        {
            "userId": params.username
        }
    }
    executeCommands(commandParams);
}

async function login(parameters) {
    initialize(parameters);
    var isReacheableFinesse = await checkIsReacheableFinesse();
    if(isReacheableFinesse == null)
        return;
    if(parameters.parameter.isSSOUser && config.isGadget == false){
        try{
            var token = await getSSOToken(parameters, "login");
            processTokenLogin(token);
            parameters.parameter.password = token;
        }catch(err){
            throwError("Unable to get token");
            return;
        }
    }
    else if(parameters.parameter.isSSOUser && config.isGadget == true)
        isSSOAgent = true;
    try{
        let userObject = await getUserObjectFinesseObject(parameters);
        parameters.parameter.loginId = await processLoginUserChecks(userObject);
        console.log("userId: " , parameters.parameter.loginId);
    }catch(err){
        if(!err.includes("The specified user is already signed in"))
            err = null;
        throwError(err);
        return;
    }
    parameters.parameter.loginId = trimUsername(parameters.parameter.loginId);
    initialize(parameters);

    //error handling
    if (!params.username){
        throwError();
        return;
    }

    //if(xmmpConnectionStatus == jabberwerx.Client.status_connected && isSSOAgent){
        //console.log("Xmpp connection is connected");
        //return;
    //}

    if (window.jabberwerx) {
        console.log("username: " , params.username);
        jid = params.username + "@" + params.domain,
        _jwClient = new jabberwerx.Client("cisco");

        var boshUrl = getBoshUrl();
        console.log("Got boshUrl: " + boshUrl);
        jabberwerx._config.httpBindingURL = boshUrl;
        jabberwerx._config.httpBindingURL_secondary = config.subBoshUrl;
        jabberwerx._config.baseReconnectCountdown = 0;

        jwArgs =
        {
            httpBindingURL: boshUrl,
            serviceDiscoveryEnabled: true,
            baseReconnectCountdown: 0,
            errorCallback: onClientError,
            successCallback: function () {
                params.boshUrl = boshUrl;
                setLocalStorage(parameters);
                var xmpppEvent = getXMPPConnectedEvent();
                callbacks.eventCallbackFunction(xmpppEvent);

                if (isRefreshCase == false && failoverReconnect == false) {
                    console.log("Will perform login as this is not refresh case");
                    loginUser();
                }
                else {
                    if (failoverReconnect == true){
                        console.log("Will not login as failover case");
                        if(queueInterval == null && queueSubscribed == true)
                            sendGetQueuesCommandFailover();
                    }
                    else {
                        console.log("Will not login as refresh case");
                        isRefreshCase = false;
                    }
                    getState("login");
                }

                xmppClient = _jwClient;
            }
        };
        jabberwerx._config.unsecureAllowed = true;
        _jwClient.event("messageReceived").bindWhen("event[xmlns='http://jabber.org/protocol/pubsub#event'] items item notification", callbacks.eventCallbackFunction);
        _jwClient.event("clientStatusChanged").bind(function (evt) {
            console.log(evt.data.next);
            xmmpConnectionStatus = evt.data.next;
            if (evt.data.next == jabberwerx.Client.status_connected) {
                var xmpppEvent = getXMPPConnectedEvent();
                callbacks.eventCallbackFunction(xmpppEvent);
            }
            else if (evt.data.next == jabberwerx.Client.status_disconnected) {
                var strEvent = evt.data.error.innerHTML;
                var contains_error_unreachable = strEvent.includes("service-unavailable");
                if (contains_error_unreachable || strEvent.includes("remote-server-timeout")) {
                    processServiceUnreachable();
                    var xmpppEvent = getXMPPDisconnectedEvent();
                    callbacks.eventCallbackFunction(xmpppEvent);
                }
                else {
                    let xmppEvent;
                    if (strEvent.includes("conflict")){
                        throwDummyLogoutEvent();
                        throwError("This session is disconnected as you are signed in to a new session.", "sessionError");
                        return;
                    }
                    else
                        xmppEvent = getXMPPDisconnectedEvent();
                    callbacks.eventCallbackFunction(xmppEvent);
                }
            }
        });
        //console.log(jid);
        //console.log(parameters.parameter.password);
        _jwClient.connect(jid, parameters.parameter.password, jwArgs);

    }
    else {
        var error = {
            "event": "Error",
            "response": {
                "loginId": params.username,
                "type": "notFound",
                "description": "The request data is not found",
            }
        }
        callbacks.eventCallbackFunction(error);
    }
}

function getXMPPDisconnectedEvent() {
    var xmpppEvent =
    {
        "event": "xmppEvent",
        "response": {
            "loginId": params.username,
            "type": "xmppStatus",
            "description": "XMPP Status is Disconnected!",
        }
    }
    return xmpppEvent;
}

function processServiceUnreachable() {
    var errorType = "networkIssue"
    var errorString = "Service is Unreachable";
    console.log(errorString);
    failoverScenario();

    var errorResponse = {
        "event": "Error",
        "response": {
            "loginId": params.username,
            "type": errorType,
            "description": errorString,
        }
    }
    callbacks.eventCallbackFunction(errorResponse);
}

function throwDummyLogoutEvent() {
   var event = {
        "event": "agentState",
        "response": {
            "loginId": params.username,
            "extension": params.extension,
            "state": "LOGOUT",
        }
    }
    localStorage.setItem("logoutFlag", true);
    callbacks.clientCallbackFunction(event);
}

function throwError(errMsg, errType) {
    var errDescription = errMsg ? errMsg : "Invalid credentials provided";
    var errorType = errType ? errType : "subscriptionFailed";
    var error = {
        "event": "Error",
        "response": {
            "loginId": params.username,
            "type": errorType,
            "description": errDescription,
        }
    }
    callbacks.eventCallbackFunction(error);
}


function setLocalStorage(parameters) {
    try {
      if(parameters.parameter.isMobileAgent != undefined || parameters.parameter.isMobileAgent == true){
        var loginParameters =
        {
          "action": "login",
          "parameter":
          {
            "loginId": params.username,
            "password": parameters.parameter.password,
            "extension": params.extension,
            "isSSOUser": parameters.parameter.isSSOUser,
            "isMobileAgent": parameters.parameter.isMobileAgent,
            "dialednumber": parameters.parameter.dialednumber,
            "mode": parameters.parameter.mode,
            "clientCallbackFunction": callbacks.clientCallbackFunction.name
          }
        }
      }
      else if(parameters.parameter.isMobileAgent == undefined || parameters.parameter.isMobileAgent == false){
        var loginParameters =
        {
          "action": "login",
          "parameter":
          {
            "loginId": params.username,
            "password": parameters.parameter.password,
            "extension": params.extension,
            "isSSOUser": parameters.parameter.isSSOUser,
            "clientCallbackFunction": callbacks.clientCallbackFunction.name
          }
        }
      }
      localStorage.setItem("loginParameters", JSON.stringify(loginParameters));
      localStorage.setItem("currentDomain", params.domain);
    }
    catch (err) {
      console.error(err);
    }
  }

function getXMPPConnectedEvent() {
    var xmpppEvent =
    {
        "event": "xmppEvent",
        "response": {
            "loginId": params.username,
            "type": "xmppStatus",
            "description": "Connection Established, XMPP Status is Connected",
        }
    }
    return xmpppEvent;
}
function _eventHandler(data) {
    if (data.selected && data.selected.firstChild.data) {
        data = data.selected.firstChild.data;
    }

    if (!data.event) {
        var xmlObj = $.parseXML(data);
        var jsonObj = xml2json(xmlObj);

        //try
        {
            var parsedEvent = parseEvent(jsonObj);
            return parsedEvent;
        }
        //catch(err)
        {
            console.error(err.message);
        }
    }
    if (data.event && (data.event == "Error" || data.event == "xmppEvent")) {
        return data;
    }
}


function parseEvent(event) {
    console.log("Event Received");
    console.log(event);
    if(!finesseFlavor){
        finesseFlavor = config.finesseFlavor;
    }
    var parsedEvent;
    if (event.User || event.Dialogs != undefined) {
        if (event.User)
            parsedEvent = parseUserEvent(event.User);
        else if (event.Dialogs)
            parsedEvent = parseDialogEvent(event.Dialogs.Dialog);
    }
    else if (event.Update.data.user) {
        if (event.Update.data.user)
            parsedEvent = parseUserEvent(event.Update.data.user,event.Update.event);
    }
    else if (event.Update.data.dialogs || event.Update.data.dialog) {
        if (event.Update.data.dialogs)
            parsedEvent = parseDialogEvent(event.Update.data.dialogs.Dialog, event.Update.event);
        else if (event.Update.data.dialog)
            parsedEvent = parseDialogEvent(event.Update.data.dialog, event.Update.event);
    }
    else if (event.Update.data.apiErrors || event.Update.data.apiError) {
        if (event.Update.data.apiErrors) {
            parsedEvent = parseErrorEvent(event.Update.data.apiErrors.apiError);
        }
        else
            parsedEvent = parseErrorEvent(event.Update.data.apiError);
    }
    else if (event.Update.data.systemInfo) {
        parsedEvent = parseSystemInfo(event.Update.data.systemInfo);
    }
    if (parsedEvent == undefined) {
        return null;
    }
    return parsedEvent;
}

function getUserObject(userEvent) {
    var response;
    var teams = null;
    if (userEvent.teams)
        teams = userEvent.teams;
    var reasonCode = null;
    if(userEvent.reasonCode)
        reasonCode = userEvent.reasonCode;
    if (userEvent.loginId == params.username) {
        response = {
            loginId: userEvent.loginId,
            extension: userEvent.extension,
            firstName: userEvent.firstName,
            lastName: userEvent.lastName,
            fullName: userEvent.firstName + " " + userEvent.lastName,
            pendingState: userEvent.pendingState,
            reasonCode: reasonCode,
            roles: userEvent.roles,
            state: userEvent.state,
            stateChangeTime: userEvent.stateChangeTime,
            teamId: userEvent.teamId,
            teamName: userEvent.teamName,
            teams: teams,
            wrapUpOnIncoming: userEvent.settings ? userEvent.settings.wrapUpOnIncoming : null,
            mediaState: userEvent.mediaState ? userEvent.mediaState : null,
        }
        if(userEvent.state == "READY" || userEvent.state == "NOT_READY"){
            agentStateData.state = userEvent.state;
            agentStateData.reasonCodeId = userEvent.reasonCode ? userEvent.reasonCode.id : null;
        }
        return response;
    }
    response =
    {
        loginId: userEvent.loginId,
        extension: userEvent.extension,
        firstName: userEvent.firstName,
        lastName: userEvent.lastName,
        fullName: userEvent.firstName + " " + userEvent.lastName,
        pendingState: userEvent.pendingState,
        reasonCode: reasonCode,
        state: userEvent.state,
        stateChangeTime: userEvent.stateChangeTime,
        mediaState: userEvent.mediaState ? userEvent.mediaState : null,
    }
    return response;
}

function setUserRole(userEvent){
    try{
        var roles = userEvent.roles.length;
        var role;
        if(roles && roles > 1)
            role = "Supervisor";
        else
            role = userEvent.roles.role;

        if(role){
            console.log("Role: " + role);
            localStorage.setItem("Role", role);
        }

    }catch(err){
        console.error("Error while setting user role in local storage : ", err);
    }
}
function makeUserReady(userId = username) {

    var commandParams =
    {
        "action": "makeReady",
        "parameter":
        {
            "userId": userId,
        }
    };
    executeCommands(commandParams);
}

function checkLoginAfterFailover(userEvent){
    console.log("In checkLoginAfterFailover, user's state: ", userEvent.state);
    switch(finesseFlavor){
        case "UCCX":
            if(userEvent.state == "NOT_READY" && userEvent.reasonCode && userEvent.reasonCode.label == "Agent Logon"){
                if(failoverAgentStateData.state != null && failoverAgentStateData.state.toLowerCase() == "ready"){
                    makeUserReady(params.username);
                    failoverAgentStateData = {state: null, reasonCodeId: null};
                }
                else if(failoverAgentStateData.state != null)
                    failoverAgentStateData = {state: null, reasonCodeId: null};
            }
        break;
        case "UCCE":
            if(userEvent.state == "NOT_READY" && userEvent.reasonCode && userEvent.reasonCode.label == "Connection Failure" || userEvent.state == "TALKING"){
                console.log("failoverAgentStateData.state: ", failoverAgentStateData.state);
                if(failoverAgentStateData.state != null && failoverAgentStateData.state.toLowerCase() == "ready"){
                    makeUserReady(params.username);
                    failoverAgentStateData = {state: null, reasonCodeId: null};
                }
                else if(failoverAgentStateData.state != null)
                    failoverAgentStateData = {state: null, reasonCodeId: null};
            }
        break;
    }
    /*if(finesseFlavor == "UCCX" && userEvent.state == "NOT_READY" && userEvent.reasonCode && userEvent.reasonCode.label == "Agent Logon"){
        if(failoverAgentStateData.state != null && failoverAgentStateData.state.toLowerCase() == "ready"){
            makeUserReady(params.username);
            failoverAgentStateData = {state: null, reasonCodeId: null};
        }
    }*/
}

function parseUserEvent(userEvent) {
    try{
        var response = getUserObject(userEvent);

        var responseObject =
        {
            "event": "agentState",
            response,
        }
        if(userEvent.loginId == params.username){
            setUserRole(userEvent);
            switch(userEvent.state){
                case "LOGOUT":
                    processLogout(userEvent.reasonCode, responseObject);
                break;
                default:
                    checkLoginAfterFailover(userEvent);
                    failoverReconnect = false;
                    localStorage.setItem("logoutFlag", false);
                    prevAgentState = userEvent.state;

            }
        }

        return responseObject;
    }
    catch(err){
        console.error(err);
    }
}

async function processLogout(reasonCode, responseObject) {
    try{
        var logoutStatus = localStorage.getItem("logoutFlag");
        if (logoutStatus && logoutStatus == "false")
            await unsubscribeToTeam();

        localStorage.setItem("logoutFlag", true);
        var prevFailoverStatus = failoverReconnect;
        var prevOutOfService = outOfService;
        failoverReconnect = false;
        outOfService == false;
        if (_jwClient && prevAgentState && prevAgentState != "LOGOUT") {
            isRefreshCase = false;
            //disconnectXmppConnection();
            if ((prevFailoverStatus == true || prevOutOfService == true) && (reasonCode == undefined || reasonCode == "undefined")) {
                responseObject.response.reasonCode = "failover";
                // Again reconnect To execute login api in this case.
                setTimeout(function () { handleReconnection(); }, 1000);
            }
            else{
                disconnectXmppConnection();
            }
        }
        prevAgentState = "LOGOUT";
        return;
    }
    catch(err){
        console.error(err);
        return;
    }
}

function disconnectXmppConnection() {
    if (_jwClient) {
        console.log("Going to disconnect connection");
        _jwClient.disconnect();
        _jwClient = null;
    }
}

function parseDialogEvent(dialogEvent, eventType) {
    if (dialogEvent.id) {
        var secondaryId = null;
        if (dialogEvent.secondaryId)
            secondaryId = dialogEvent.secondaryId;

        var wrapUpReason = null;
        if (dialogEvent.mediaProperties.wrapUpReason)
            wrapUpReason = dialogEvent.mediaProperties.wrapUpReason;

        var queueName = null;
        if(dialogEvent.mediaProperties.queueName)
            queueName = dialogEvent.mediaProperties.queueName;

        var dialog =
        {
            id: dialogEvent.id,
            callType: dialogEvent.mediaProperties.callType,
            fromAddress: dialogEvent.fromAddress,
            dialedNumber: dialogEvent.mediaProperties.dialedNumber,
            dnis: dialogEvent.mediaProperties.DNIS,
            ani: null,
            state: dialogEvent.state,
            wrapUpReason: wrapUpReason,
            wrapUpItems: dialogEvent.mediaProperties.wrapUpItems ? dialogEvent.mediaProperties.wrapUpItems.wrapUpItem : null,
            queueName: queueName,
            associatedDialogUri: getDigits(dialogEvent.associatedDialogUri),
            secondaryId: secondaryId,
            participants: dialogEvent.participants,
            callVariables: dialogEvent.mediaProperties.callvariables,
            outboundClassification: dialogEvent.mediaProperties.outboundClassification ? dialogEvent.mediaProperties.outboundClassification : null,
            callbackNumber : dialogEvent.callbackNumber ? dialogEvent.callbackNumber : null,
            scheduledCallbackInfo : dialogEvent.scheduledCallbackInfo ? dialogEvent.scheduledCallbackInfo : null,
            isCallEnded : 0,
            dialogEndingReason: null,
            eventType: eventType,
        }
        setCallObjectLocalStorage(dialog);

        if (dialog.callType == "NULL")
            dialog.callType = processFailoverCall(dialog);

        var responseObject = parseDialogEventType(dialog);
        return responseObject;
    }
    else
        return null;
}

function setCallObjectLocalStorage(dialog) {
    try{
        if (dialog.id && dialog.callType && dialog.callType != "NULL" && dialog.callType != "CONSULT" && dialog.state != "DROPPED")
            setMainCallObject(dialog);
        else if (dialog.id && dialog.callType && dialog.callType != "NULL" && dialog.callType == "CONSULT" && dialog.state != "DROPPED")
            setConsultCallObject(dialog);
    }
    catch(err){
        console.error(err);
    }
}

function getUserRole(){
    var role = localStorage.getItem("Role");
    if(role && role.includes("Supervisor") || role.includes("supervisor")){
        return "Supervisor";
    }
    return "Agent";
}

function setMainCallObject(dialog) {
    var userRole = getUserRole();
    if(dialog.callType == callTypes.silentMonitorType && userRole == "Agent")
        return;
    var mainCallObj = { "id": dialog.id, "callType": dialog.callType };
    localStorage.setItem("mainCallObject", JSON.stringify(mainCallObj));
}

function setConsultCallObject(dialog) {
    var consultCallObj = { "id": dialog.id, "callType": dialog.callType };
    localStorage.setItem("consultCallObject", JSON.stringify(consultCallObj));
}

function getDigits(text) {
    if (text) {
       // return text.replace(/\D/g, "");
       return text;
    }
    return null;
}

 function parseDialogEventType(dialog) {
    try{
        var callType = dialog.callType;
        var dialogEvent;
        switch (callType) {
            case callTypes.directType:
                dialogEvent = processDirectCall(dialog);
                break;
            case callTypes.inboundTypeCCE:
            case callTypes.inboundTypeCCX:
                dialogEvent = processInboundCall(dialog);
                break;
            case callTypes.outboundType:
            case callTypes.outboundType2:
                if (finesseFlavor == "UCCE" && dialog.associatedDialogUri)
                    dialogEvent = processConsultCall(dialog);
                else
                    dialogEvent = processOutboundCall(dialog);
                break;
            case callTypes.consultType:
                dialogEvent = processConsultCall(dialog);
                break;
            case callTypes.directTransferTypeCCE:
            case callTypes.directTransferTypeCCX:
            case callTypes.consultTransferTypeCCE:
            case callTypes.consultTransferTypeCCX:
                if(finesseFlavor == "UCCE" && callType == callTypes.directTransferTypeCCE)
                    dialogEvent = processDirectTransferCall(dialog);
                else if(finesseFlavor == "UCCX" && callType == callTypes.directTransferTypeCCX)
                    dialogEvent = processDirectTransferCall(dialog);
                else if(finesseFlavor == "UCCE" && callType == callTypes.consultTransferTypeCCE)
                    dialogEvent = processConsultTransferCall(dialog);
                else if(finesseFlavor == "UCCX" && callType == callTypes.consultTransferTypeCCX)
                    dialogEvent = processConsultTransferCall(dialog);
                break;
            case callTypes.conferenceType:
                dialogEvent = processConferenceCall(dialog);
                break;
            case callTypes.outboundCampaignType:
            case callTypes.outboundCampaignCallbackCCEType1:
            case callTypes.outboundCampaignCallbackCCEType2:
                dialogEvent = processOutboundCampaignCall(dialog);
                break;
            case callTypes.outboundPreviewCampaignTypeCCX:
            case callTypes.outboundPreviewCampaignTypeCCE:
            case callTypes.outboundPreviewCampaignCallbackCCEType1:
            case callTypes.outboundPreviewCampaignCallbackCCEType2:
                dialogEvent = processOutboundPreviewCampaignCall(dialog);
                break;
            case callTypes.silentMonitorType:
                dialogEvent = processSilentMonitor(dialog);
                break;
            case callTypes.bargeInTypeCCX:
            case callTypes.bargeInTypeCCE:
                dialogEvent = processBargeIn(dialog);
                break;
        }
        dialogEvent.response.dialog.ani = getDigits(dialogEvent.response.dialog.ani);
        //dialogEvent.response.dialog.isCallEnded = checkIfCallEnded(dialogEvent.response.dialog);
        // if(dialogEvent.response.dialog.isCallEnded == 1 && dialogEvent.event != "consultCall")
        //     dialogEvent.response.dialog.ani = getCallVariableValue(dialog, config.callVariable);

        return dialogEvent;
    }catch(err){
        console.error(err);
    }
}

function checkIfCallEnded(dialog){
    try{
        if(dialog.state && dialog.state == "DROPPED")
            return 1;
        if(dialog.state && dialog.state == "ACTIVE")
        {
            let participants = dialog.participants.Participant;
            if(participants.length && participants.length == 2){
                for(participant of participants){
                    if(participant.state == "DROPPED" && dialog.eventType == "DELETE")
                        return 1;
                }
                return 0;
            }
            else if(participants.length == undefined){
                let participant = participants;
                if(participant.state != "DROPPED")
                    return 0;
                else
                    return 1;
            }
        }
        return 0;
    }catch{err}{
        console.error(err);
    }
}
/*function checkIfCallEnded(dialog){
    if(dialog.state && dialog.state == "DROPPED")
        return 1;
    if(dialog.state && dialog.state == "ACTIVE")
    {
        let participants = dialog.participants.Participant;
        if(participants.length){
            for(participant of participants){
                if(participant.state != "DROPPED")
                    return 0;
            }
            return 1;
        }
        else{
            let participant = participants;
            if(participant.state != "DROPPED")
                return 0;
            else
                return 1;
        }
    }
    return 0;
}*/

function processFailoverCall(dialog) {
    var callType = getCallTypeFromLocalStorage(dialog.id);
    if (callType)
        return callType;
    return null;
}

function getCallTypeFromLocalStorage(dialogId) {
    try{
        if (localStorage.getItem("mainCallObject")) {
            var mainCallObject = JSON.parse(localStorage.getItem("mainCallObject"));
            if (mainCallObject && mainCallObject.id == dialogId)
                return mainCallObject.callType;
        }

        if (localStorage.getItem("consultCallObject")) {
            var consultCallObject = JSON.parse(localStorage.getItem("consultCallObject"));
            if (consultCallObject && consultCallObject.id == dialogId)
                return consultCallObject.callType;
        }

        return null;
    }
    catch(err){
        console.error(err);
    }
}

function processBargeIn(dialog) {
    dialog.ani = getCallVariableValue(dialog, config.callVariable);
    var response =
    {
        "event": "dialogState",
        "response":
        {
            "loginId": params.username,
            dialog,
        }
    }
    return response;
}

function processSilentMonitor(dialog) {
    dialog.ani = dialog.dialedNumber;

    var response =
    {
        "event": "dialogState",
        "response":
        {
            "loginId": params.username,
            dialog,
        }
    }
    return response;
}
function processOutboundPreviewCampaignCall(dialog) {
    dialog.ani = dialog.fromAddress;

    var response =
    {
        "event": "campaignCall",
        "response":
        {
            "loginId": params.username,
            dialog,
        }
    }
    return response;
}

function processOutboundCampaignCall(dialog) {
    dialog.ani = getCustomer(dialog.participants);
    // Handle UCCX 12.5 condition where dialing on customer there is no customer in particpant.
    if (!dialog.ani && finesseFlavor == "UCCX")
        dialog.ani = dialog.dialedNumber;

    var response =
    {
        "event": "campaignCall",
        "response":
        {
            "loginId": params.username,
            dialog,
        }
    }
    return response;
}

function checkIfAllConsultParticipantsDropped(participants){
    try{
        participants = participants.Participant;
        if(participants.length){
            for(participant of participants){
                if(participant.state != "DROPPED")
                    return 0;
            }
            return 1;
        }
        return 0;
    }catch(err){
        console.error(err);
        return 0;
    }
}

function checkIfConsultEnd(dialog){
    let consultEndEvent = 0;
    if(dialog.state == "DROPPED"){
        consultEndEvent = checkIfAllConsultParticipantsDropped(dialog.participants);
    }
    return consultEndEvent;
}

function processConferenceCall(dialog) {
    let isConsultEnd = checkIfConsultEnd(dialog);
    if(isConsultEnd){
        let response = processConsultCall(dialog);
        return response;
    }
    dialog.ani = getCallVariableValue(dialog, config.callVariable);
    var loggedParticipantState = getLoggedInParticipantState(dialog.participants);
    if (dialog.state == "ALERTING" && loggedParticipantState == "ALERTING") {
        eventType = "newInboundCall";
    }
    else
        eventType = "dialogState";

    let response =
    {
        "event": eventType,
        "response":
        {
            "loginId": params.username,
            dialog,
        }
    }
    return response;
}

function processConsultTransferCall(dialog) {
    let isConsultEnd = checkIfConsultEnd(dialog);
    if(isConsultEnd){
        let response = processConsultCall(dialog);
        return response;
    }
    dialog.ani = getCustomer(dialog.participants);
    var loggedParticipantState = getLoggedInParticipantState(dialog.participants);
    if (dialog.state == "ALERTING" && loggedParticipantState == "ALERTING") {
        eventType = "newInboundCall";
    }
    else
        eventType = "dialogState";

    var response =
    {
        "event": eventType,
        "response":
        {
            "loginId": params.username,
            dialog,
        }
    }
    return response;
}

function processDirectTransferCall(dialog) {
    if(dialog.callType == callTypes.consultTransferTypeCCX || dialog.callType == callTypes.directTransferTypeCCE){
        let isConsultEnd = checkIfConsultEnd(dialog);
        if(isConsultEnd){
            let response = processConsultCall(dialog);
            return response;
        }
    }

    dialog.ani = getCallVariableValue(dialog, config.callVariable);
    var loggedParticipantState = getLoggedInParticipantState(dialog.participants);
    if (dialog.state == "ALERTING" && loggedParticipantState == "ALERTING") {
        eventType = "newInboundCall";
    }
    else
        eventType = "dialogState";

    var response =
    {
        "event": eventType,
        "response":
        {
            "loginId": params.username,
            dialog,
        }
    }
    return response;
}

function getCallVariableValue(dialog, callVariableName) {
    for (var i = 0; i < dialog.callVariables.CallVariable.length; i++) {
        if (dialog.callVariables.CallVariable[i].name == callVariableName) {
            return dialog.callVariables.CallVariable[i].value;
        }
    }
    return null;
}

function processConsultCall(dialog) {
    if (finesseFlavor == "UCCE") {
        dialog.ani = setAniForConsultCCE(dialog);
    }
    else
        dialog.ani = setAniForConsultCCX(dialog);

    var response =
    {
        "event": "consultCall",
        "response":
        {
            "loginId": params.username,
            dialog,
        }
    }
    return response;
}

function setAniForConsultCCX(dialog) {
    if (dialog.callType == callTypes.outboundType || dialog.callType == callTypes.outboundType2) {
        return getCustomer(dialog.participants);
    }
    else {
        if (dialog.fromAddress != params.extension) {
            return dialog.fromAddress;
        }
        else {
            return dialog.dnis;
        }
    }
}

function setAniForConsultCCE(dialog) {
    if (dialog.callType == callTypes.outboundType || dialog.callType == callTypes.outboundType2) {
        var customerNumber = getCustomer(dialog.participants);
        if (!customerNumber) {
            customerNumber = getSecondPartner(dialog.participants);
        }
        return getCustomer(dialog.participants);
    }
    else {
        if (dialog.fromAddress != params.extension) {
            return dialog.fromAddress;
        }
        else {
            var customer = getCustomer(dialog.participants);
            if (!customer)
                customer = getSecondPartner(dialog.participants);
            if (customer) {
                return customer;
            }
            else {
                return dialog.dnis;
            }
        }
    }
}

function getCustomer(participants) {

    var length;
    if (participants.Participant)
        length = participants.Participant.length;

    if (length) {
        for (var i = 0; i < length; i++) {
            if (participants.Participant[i].mediaAddressType != "AGENT_DEVICE") {
                return participants.Participant[i].mediaAddress;
            }
        }
    }
    return null;
}

function getSecondPartner(participants) {
    var length;
    if (participants.Participant)
        length = participants.Participant.length;

    if (length) {
        for (var i = 0; i < length; i++) {
            if (participants.Participant[i].mediaAddress != params.extension) {
                return participants.Participant[i].mediaAddress;
            }
        }
    }
    return null;
}

function getLoggedInParticipantState(participants) {
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

function setOutboundConnectedNumberCCX(dialog) {
    var length;
    if (dialog.participants.Participant)
        length = dialog.participants.Participant.length;

    if(length && length == 3)
        return getCustomer(dialog.participants);
    if (params.extension != dialog.fromAddress) {
        return dialog.fromAddress;
    }
    else {
        if (dialog.dnis) {
            return dialog.dnis;
        }
        else {
            return dialog.dialedNumber;
        }
    }
    return null;
}

function setOutboundConnectedNumberCCE(dialog) {
    if (dialog.dialedNumber != params.extension) {
        var customer = getCustomer(dialog.participants);
        if (customer) {
            return customer;
        }
        else {
            return dialog.dialedNumber;
        }
    }
    else {
        return dialog.fromAddress;
    }
    return null;
}

function processOutboundCall(dialog) {
    if (finesseFlavor == "UCCE") {
        dialog.ani = setOutboundConnectedNumberCCE(dialog);
    }
    else
        dialog.ani = setOutboundConnectedNumberCCX(dialog);

    var eventType;
    if ((dialog.state == "INITIATING" || dialog.state == "INITIATED") && !dialog.associatedDialogUri) {
        eventType = "outboundDialing";
    }
    else {
        eventType = "dialogState";
    }

    var dialogEvent =
    {
        "event": eventType,
        "response": {
            "loginId": params.username,
            dialog,
        }
    }
    return dialogEvent;
}

function processInboundCall(dialog) {
    if (finesseFlavor == "UCCX") {
        dialog.ani = dialog.fromAddress;
    }
    else
        dialog.ani = getCustomer(dialog.participants);

    if (dialog.ani == null)
        dialog.ani = getSecondPartner(dialog.participants);

    var loggedParticipantState = getLoggedInParticipantState(dialog.participants);
    var eventType;
    if (dialog.state == "ALERTING" && loggedParticipantState == "ALERTING")
        eventType = "newInboundCall";
    else
        eventType = "dialogState";

    var response =
    {
        "event": eventType,
        "response":
        {
            "loginId": params.username,
            dialog,
        }
    }
    return response;
}

function processDirectCall(dialog) {
    dialog.ani = dialog.fromAddress;

    var eventType;
    var loggedParticipantState = getLoggedInParticipantState(dialog.participants);
    if (dialog.state == "ALERTING" && loggedParticipantState == "ALERTING") {
        eventType = "newInboundCall";
    }
    else
        eventType = "dialogState";

    var response =
    {
        "event": eventType,
        "response": {
            "loginId": params.username,
            dialog,
        }
    }
    return response;
}

function parseNoDialogEvent() {
    var responseObject =
    {
        "event": "dialogState",
        "response":
        {
            "loginId": params.username,
            "dialog": null,
        }
    }
    return responseObject;
}

function parseErrorEvent(errorEvent) {
    if (typeof errorEvent.errorType == "string") {
        errorEvent.errorType = formatCamelCase(errorEvent.errorType);
    }

    makeEventErrorsReadable(errorEvent);

    var response =
    {
        "loginId": params.username,
        "description": errorEvent.errorMessage,
        "type": errorEvent.errorType,
    }

    var errorJson = {
        "event": "Error",
        response
    }
    return errorJson;
}

function makeEventErrorsReadable(errorEvent) {
    switch (errorEvent.errorMessage) {
        case "CF_INVALID_OBJECT_STATE":
            errorEvent.errorMessage = "The object is in the incorrect state for the request, Send the request again.";
            return errorEvent;
        case "CF_GENERIC_UNSPECIFIED_REJECTION":
            errorEvent.errorType = "invalidDevice";
            return errorEvent;
    }
}

function parseSystemInfo(systemInfo) {
    console.log(systemInfo.status)
    if (systemInfo.status == "IN_SERVICE" && failoverReconnect == true) {
        //reconnect with alternate node
        console.log("In [parseSystemInfo], we are going to execute failover");
        outOfService = false;
        //failoverReconnect = false;
        //switchConnection();
        retryCount = 0;
        clearInterval(intervalID);
        intervalID = null;
        disconnectXmppConnection();
        setTimeout(function () { handleReconnection() }, 2000);

    }
    else if (systemInfo.status == "IN_SERVICE" && failoverReconnect == false) {
        //Current node responded before 3 times request exceeds.
        console.log("In [parseSystemInfo], not going to execute failover, only reconnect");
        clearInterval(intervalID);
        outOfService = false;
        intervalID = null;
        retryCount = 0;
        failoverReconnect = true;
        disconnectXmppConnection();
        setTimeout(function () { handleReconnection(); }, 2000);
    }
    else if (systemInfo.status == "OUT_OF_SERVICE") {
        console.log("Inside OUT_OF_SERVICE, failoverAgentStateData.state : ", failoverAgentStateData.state);
        if(failoverAgentStateData.state == null){
            failoverAgentStateData = structuredClone(agentStateData);
            console.log("failoverAgentStateData is set. State : ", failoverAgentStateData.state);
        }
        outOfService = true;
        heartbeatReceived = false;
    }
    var responseObject =
    {
        "event": "systemInfo",
        "response":
        {
            "loginId": params.username,
            systemInfo
        }
    }
    return responseObject;
}

function onClientError(rsp) {
    var stringdoc = new XMLSerializer().serializeToString(rsp);
    var contains_error_authentication = stringdoc.includes("not-authorized");
    var contains_error_unreachable = stringdoc.includes("service-unavailable");
    var contains_error_internalServer = stringdoc.includes("<error><internal-server-error");
    var errorString, errorType;

    if (contains_error_authentication) {
        errorType = "subscriptionFailed";
        errorString = "Invalid credentials provided";
    }
    else if (contains_error_unreachable || stringdoc.includes("remote-server-timeout")) {
        errorType = "networkIssue"
        errorString = "Service is Unreachable";
        console.log(errorString);
        if (intervalID == null)
            failoverScenario();
    }
    else {
        errorType = "generalError"
        errorString = "XMPP Connection Failed";
    }

    var errorResponse = {
        "event": "Error",
        "response": {
            "loginId": params.username,
            "type": errorType,
            "description": errorString,
        }
    }
    callbacks.eventCallbackFunction(errorResponse);
    if (contains_error_internalServer) {
        console.log("contains_error_internalServer");
        if (_jwClient) {
            _jwClient.disconnect();
            _jwClient = null;
            handleReconnection();
        }
    }
}


var intervalID = null;
async function failoverScenario() {
    console.log("Inside failoverScenario, failoverAgentStateData.state : ", failoverAgentStateData.state);
    if(failoverAgentStateData.state == null){
        failoverAgentStateData = structuredClone(agentStateData);
        console.log("failoverAgentStateData is set. State : ", failoverAgentStateData.state);
    }
    intervalID = 1;
    console.log("going to clear interval. ATM: ", queueInterval);
    clearInterval(queueInterval);
    queueInterval = null;
    console.log("After clearing interval: ", queueInterval);
    var systemInfo = await checkIsReacheableFinesse(true);
    if(systemInfo != 1){
        console.log("Didn't get response from finesse server, will keep checking.")
        while(systemInfo != 1){
            systemInfo = await checkIsReacheableFinesse(true);
        }
        console.log("Pingable server " , currentDomain);
    }
}

function handleReconnection() {
    try{
        if (params && callbacks) {
            console.log("Reconnecting from memory");
            let parameters;
            let userid = params.username;
            let pass = params.password;
            let dialedNumber = undefined;
            let mode = undefined;
            if(params.isSSOUser && (params.isSSOUser == "true" || params.isSSOUser == true)){
                console.log("This is sso user, will fetch sso creds from local storage");
                var parameter = JSON.parse(localStorage.getItem("ssoUser"));
                userid = parameter.loginId;
                pass = parameter.password;
            }
            if(params.isMobileAgent != undefined || params.isMobileAgent == true) {
                dialedNumber = params.dialednumber;
                mode = params.mode;
            }
            parameters = {
                "action": "login",
                "parameter":
                {
                    "loginId": userid,
                    "password": pass,
                    "extension": params.extension,
                    "isSSOUser": params.isSSOUser,
                    "clientCallbackFunction": callbacks.clientCallbackFunction,
                    "isMobileAgent": params.isMobileAgent,
                    "dialednumber": params.dialednumber,
                    "mode": params.mode,
                }
            }
            executeCommands(parameters);
        }
        else {
            console.log("Reconnecting from local storage");
            if (localStorage.getItem("loginParameters")) {
                var parameters = JSON.parse(localStorage.getItem("loginParameters"));
                loginRefreshCase(parameters);
            }
        }
    }
    catch(err){
        console.error(err);
    }
}

function print2Console(type, data) {
    console.log(typeof (data) + ": ");
    console.log(data);
}

function xml2json(xml) {
    try {
        var obj = {};
        if (xml.children.length > 0) {
            for (var i = 0; i < xml.children.length; i++) {
                var item = xml.children.item(i);
                var nodeName = item.nodeName;

                if (typeof (obj[nodeName]) == "undefined") {
                    obj[nodeName] = xml2json(item);
                }
                else {
                    if (typeof (obj[nodeName].push) == "undefined") {
                        var old = obj[nodeName];

                        obj[nodeName] = [];
                        obj[nodeName].push(old);
                    }
                    obj[nodeName].push(xml2json(item));
                }
            }
        }
        else {
            obj = xml.textContent;
        }
        return obj;
    }
    catch (e) {
        console.error(e.message);
        return null;
    }
}


function apiResponseHandler(data) {
    if (data.selected && data.selected.firstChild.data) {
        data = data.selected.firstChild.data;
    }

    if (!data.event) {
        var jsonObj;
        if(!data.access_token){
            var xmlObj = $.parseXML(data);
            jsonObj = xml2json(xmlObj);
        }
        else {
            jsonObj = data;
        }
        try {
            var parsedResponse = parseApiResponse(jsonObj);
            return parsedResponse;
        }
        catch (err) {
            console.error(err.message)
        }
    }
    else if (data.event && data.event == "Error") {
        return data;
    }
}

function parseApiResponse(response) {
    console.log("Got api response");
    console.log(response);
    var parsedResponse = [];

    if (response.User) {
        parsedResponse[0] = parseUserEvent(response.User);
    }
    else if (response.Dialogs) {
        if (response.Dialogs.Dialog.length) {
            for (var i = 0; i < response.Dialogs.Dialog.length; i++) {
                parsedResponse[i] = parseDialogEvent(response.Dialogs.Dialog[i]);
            }
        }
        else {
            parsedResponse[0] = parseDialogEvent(response.Dialogs.Dialog);
        }
    }
    else if (response.Dialogs != undefined && !response.Dialogs) {
        parsedResponse[0] = parseNoDialogEvent();
    }
    else if (response.ReasonCodes) {
        parsedResponse[0] = parseReasonCodes(response.ReasonCodes.ReasonCode);
    }
    else if (response.WrapUpReasons) {
        parsedResponse[0] = parseWrapUpReasonCodes(response.WrapUpReasons.WrapUpReason);
    }
    else if (response.Team) {
        parsedResponse[0] = parseTeam(response.Team);
    }
    else if (response.SystemInfo) {
        parsedResponse[0] = parseSystemInfo(response.SystemInfo);
    }
    else if (response.Queues != null && response.Queues != undefined) {
        if (response.Queues != "")
            parsedResponse[0] = parseQueues(response.Queues.Queue);
        else
            parsedResponse[0] = parseQueues(response.Queues);
    }
    else if (response.PhoneBooks != null && response.PhoneBooks != undefined) {
        if (response.PhoneBooks != "")
            parsedResponse[0] = parsePhoneBooks(response.PhoneBooks.PhoneBook);
        else
            parsedResponse[0] = parsePhoneBooks(response.PhoneBooks);
    }
    else if(response.access_token){
        console.log("Goint to parse tokens");
        parsedResponse[0] = parseSSOTokenResponse(response);
    }


    if (parsedResponse[0] == undefined) {
        return null;
    }

    if (parsedResponse.length == 1)
        return parsedResponse[0];
    return parsedResponse;
}

function parseCallVariables(variables) {
    var variableString = "";
    for (var i = 0; i < variables.length; i++) {
        variableString += "<CallVariable><name>" + variables[i].name + "</name><value>" + variables[i].value + "</value></CallVariable>"
    }
    return variableString;
}

async function apiErrors(jqXHR, errorThrown, callback, requestParameters) {
    if(jqXHR.responseText){
        var xmlError = $.parseXML(jqXHR.responseText);
        var jsonErrorObj = xml2json(xmlError);
    }

    if (typeof jqXHR.status == "string") {
        jqXHR.status = formatCamelCase(jqXHR.status);
    }
    else if (typeof jqXHR.status == "number") {
        var errObj = makeApiErrorsReadable(jqXHR.status, errorThrown);
        jqXHR.status = errObj.type;
        errorThrown = errObj.description;
    }


    if (jqXHR.status == 0 && !errorThrown) {
        jqXHR.status = "generalError";
        errorThrown = "Sorry we are unable to process your request";
    }

    if (errorThrown == "" && jsonErrorObj && jsonErrorObj.ApiErrors.ApiError.ErrorMessage)
        errorThrown = jsonErrorObj.ApiErrors.ApiError.ErrorMessage;
    var response =
    {
        "loginId": params.username,
        "type": jqXHR.status,
        "description": errorThrown,
    }
    var responseObject =
    {
        "event": "Error",
        response,
    }
    console.error(responseObject);

    if(isSSOAgent && (jqXHR.status == "generalError" || jqXHR.status == "unAuthorized")){
        var systemInfo = await getSystemInfo(currentDomain, false);
        if(systemInfo == 1){
            var parameters = getSSOParameters();
            if(parameters && config.isGadget == false){
                var token = await getSSOToken(parameters, "token expired");
                updateTokenLoginParamaterLocalStorage(token);
                params.password = token;
                executeCommands(requestParameters);
            }
            else if (parameters && config.isGadget == true) {
                sendPostMessage(requestParameters);
            }
        }
        else{
            console.log("going to clear interval. ATM: ", queueInterval);
            clearInterval(queueInterval);
            queueInterval = null;
            console.log("After clearing interval: ", queueInterval);
            callback(responseObject);
        }
    }
    else{
        callback(responseObject);
    }
}

window.addEventListener("message", (event) => {
    console.log("Message received==>", event);
    if(event.data.type == "exchangeToken"){
        var token = event.data.token;
        var requestParameters = event.data.command;
        console.log("token==>", token)
        console.log("requestParametes==>", requestParameters)
        if (token) {
            console.log("token ecits==>")
            updateTokenLoginParamaterLocalStorage(token);
            params.password = token;
            executeCommands(requestParameters);
        }
        console.log("token not ==>")
    }
}, false);

function sendPostMessage(command) {

    let postObject = {
        type: "exchangeToken",
        command: command,
    }
    console.log("postmessage called==>", postObject)
    window.parent.postMessage(postObject, "*",);
    console.log("postmessage sent==>")
}

function updateTokenLoginParamaterLocalStorage(token){
    try{
        var loginParameters = localStorage.getItem("loginParameters");
        if(loginParameters){
            loginParameters = JSON.parse(loginParameters);
            loginParameters.parameter.password = token;
            localStorage.setItem("loginParameters", JSON.stringify(loginParameters));
        }
    }
    catch(err){
        console.error(err);
    }
}

function getSSOParameters(){
    try{
        console.log("Going to get sso parameters")
        var users = JSON.parse(localStorage.getItem("ssoUser"));
        console.log(users);
        if(users && users.loginId){
            var parameters =
            {
                "parameter":
                {
                    "loginId": users.loginId,
                    "password": users.password,
                }
            }
            return parameters;
        }
        return null;
    }
    catch(err){
        console.error(err);
    }
}

function makeApiErrorsReadable(type, description) {
    switch (type) {
        case 400:
            return { "type": "badRequest", "description": "Bad request, some data is missing." }
        case 401:
        case 417:
            return { "type": "unAuthorized", "description": "Invalid credentials provided." }
        case 405:
            return { "type": "methodNotAllowed", "description": "Dialog ID is missing, can not process the request." }
        case 404:
            return { "type": "notFound", "description": "The request data is not found." }
        case 416:
            return { "type": "badRequest", "description": "" };

    }
    return { "type": type, "description": description }

}

function formatCamelCase(str) {
    if (!str || str.split(" ").length > 2)
        return null;

    var firstLetter = str.substr(0, 1);
    str = firstLetter.toLowerCase() + str.substr(1);
    str = str.replace(" ", "");
    return str;
}

function sendTeamErrorstoClient(errorType, errorDescription) {
    var errorEvent = {
        "event": "Error",
        "response": {
            "description": errorDescription,
            "loginId": params.username,
            "type": errorType,
        }
    }
    callbacks.clientCallbackFunction(errorEvent);
}

function setUsersLocalStorage(userObj) {
    try{
        console.log("userObj: ", userObj);
        console.log("Added user #" + userObj.loginId);
        localStorage.setItem("ssoUser", JSON.stringify(userObj));
    }
    catch(ex){
        console.error(ex);
    }
}

async function processLoginUserChecks(userObject){
    console.log("processLoginUserChecks userObject: ", userObject);
    if(userObject && userObject.state && userObject.state != "LOGOUT"){
        if(userObject.extension == params.extension)
            return userObject.loginId;
        else
            throw "The specified user is already signed in with extension " + userObject.extension;
    }
    else if(userObject.state == "LOGOUT")
        return userObject.loginId;

}

async function getUserObjectFinesseObject(parameters)
{
    var username = parameters.parameter.loginId;
    if(username.includes("@") && isSSOAgent == true)
        parameters.parameter.loginId = username.split("@")[0];
    console.log("Going to get user. Parameters: ", parameters);
    initialize(parameters);
    var myHeaders = new Headers();
    myHeaders.append("Authorization", getAuthorizationHeaderValue(true));

    var requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow'
      };

    var response = await fetch("https://" + params.domain + ":8445/finesse/api/User/" + parameters.parameter.loginId, requestOptions)
    .then(response => response.text())
    .then(result => {
        //console.log("[getUserObjectFinesseObject]" , result);
        let xmlObj = $.parseXML(result);
        jsonObj = xml2json(xmlObj);
        console.log("[getUserObjectFinesseObject] jsonObj: " , jsonObj);
        return jsonObj.User;
    })
    .catch(error => {
        console.error('error: ', error);
        throw error;
    });
    return response;
}
async function getSSOToken(parameters, source)
{
    //console.log("Going to get token. Parameters: ", parameters);
    if(parameters.parameter.extension)
        initialize(parameters);
    if(config.isGadget == false){
        var myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");

        var raw = JSON.stringify({
        "username": parameters.parameter.loginId,
        "password": parameters.parameter.password
        });

        var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
        };

        var response =
        await fetch(config.ssoBackendUrl + "getaccesstoken", requestOptions)
        .then(response => response.text())
        .then(result => {
            //console.log("[getSSOToken]" , result);
            if(!result.includes("Error while executing"))
            {
                result = JSON.parse(result);
                console.log(result);
            }
            else
                console.log(result);
            //resolve(result) ;
            return result;
        })
        .catch(error => {
            console.error('error: ', error);
            //reject(error);
            throw error;
        });
        if(response.access_token)
            return response.access_token;
        return response;
        /*if(response.access_token)
            callbacks.apiCallbackFunction(response);
        else
            apiErrors({status: 417}, response, callbacks.apiCallbackFunction);*/
    }
    else if(config.isGadget == true){
        try{
            var token = JSON.parse(sessionStorage.getItem("ssoTokenObject"));
            token = token? token.token : null;
            console.log(token);
            return token;
        }
        catch(ex){
            console.error(ex);
        }
    }
}

function getUserPhoneBook(parameters) {
    $ = jQuery.noConflict();
    var weblink = "https://" + params.domain + ":8445/finesse/api/User/" + parameters.parameter.userId + "/PhoneBooks";

    $.ajax(
        {
            url: weblink,
            type: 'GET',
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", getAuthorizationHeaderValue());
                request.setRequestHeader("Range", "objects=1-" + parameters.parameter.range);
            },
            crossDomain: true,
            success: function (result) {
                result = new XMLSerializer().serializeToString(result);
                callbacks.apiCallbackFunction(result);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction, parameters);
            }
        });
}

function getUserQueues(parameters) {
    $ = jQuery.noConflict();
    var weblink = "https://" + params.domain + ":8445/finesse/api/User/" + parameters.parameter.userId + "/Queues";

    $.ajax(
        {
            url: weblink,
            type: 'GET',
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", getAuthorizationHeaderValue(true));
            },
            crossDomain: true,
            success: function (result) {
                result = new XMLSerializer().serializeToString(result);
                callbacks.apiCallbackFunction(result);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                //apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction, parameters);
                console.error("Queue Api Error");
            }
        });
}

function reclassifyDialog(parameters) {
    $ = jQuery.noConflict();
    var weblink = "https://" + params.domain + ":8445/finesse/api/Dialog/" + parameters.parameter.dialogId;

    $.ajax(
        {
            url: weblink,
            data: "<Dialog><requestedAction>RECLASSIFY</requestedAction><targetMediaAddress>" + params.extension + "</targetMediaAddress><actionParams><ActionParam><name>outboundClassification</name><value>" + parameters.parameter.reclassifyAction + "</value></ActionParam> </actionParams></Dialog>",
            type: 'PUT',
            dataType: "xml",
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", getAuthorizationHeaderValue());
                request.setRequestHeader("Content-Type", "application/xml");
            },
            crossDomain: true,
            success: function (result) {
                return 202;
            },
            error: function (jqXHR, textStatus, errorThrown) {
                apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction, parameters);
            }
        });
}

function scheduleCallbackDialog(parameters, apiTurn = 1) {
    $ = jQuery.noConflict();
    var weblink = "https://" + params.domain + ":8445/finesse/api/Dialog/" + parameters.parameter.dialogId;
    var datStr;

    if(apiTurn == 1)
        datStr = "<Dialog><targetMediaAddress>" + params.extension + "</targetMediaAddress><requestedAction>UPDATE_SCHEDULED_CALLBACK</requestedAction><actionParams><ActionParam><name>callbackTime</name><value>" + parameters.parameter.callbackDateTime + "</value></ActionParam></actionParams></Dialog>";
    else
        datStr = "<Dialog><targetMediaAddress>" + params.extension + "</targetMediaAddress><requestedAction>UPDATE_SCHEDULED_CALLBACK</requestedAction><actionParams><ActionParam><name>callbackNumber</name><value>" + parameters.parameter.callbackNumber + "</value></ActionParam></actionParams></Dialog>";
    $.ajax(
        {
            url: weblink,
            data: datStr,
            type: 'PUT',
            dataType: "xml",
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", getAuthorizationHeaderValue());
                request.setRequestHeader("Content-Type", "application/xml");
            },
            crossDomain: true,
            success: function (result) {
                if(apiTurn == 1)
                    scheduleCallbackDialog(parameters, 2);
                else
                    return 202;
            },
            error: function (jqXHR, textStatus, errorThrown) {
                apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction, parameters);
            }
        });
}


function dropParticipant(parameters) {
    $ = jQuery.noConflict();
    var weblink = "https://" + params.domain + ":8445/finesse/api/Dialog/" + parameters.parameter.dialogId;

    $.ajax(
        {
            url: weblink,
            data: "<Dialog><requestedAction>PARTICIPANT_DROP</requestedAction><targetMediaAddress>" + parameters.parameter.participantToDrop + "</targetMediaAddress></Dialog>",
            type: 'PUT',
            dataType: "xml",
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", getAuthorizationHeaderValue());
                request.setRequestHeader("Content-Type", "application/xml");
            },
            crossDomain: true,
            success: function (result) {
                return 202;
            },
            error: function (jqXHR, textStatus, errorThrown) {
                apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction, parameters);
            }
        });
}

function bargeIn(parameters) {
    $ = jQuery.noConflict();
    var weblink = "https://" + params.domain + ":8445/finesse/api/User/" + params.username + "/Dialogs";

    $.ajax(
        {
            url: weblink,
            data: "<Dialog><requestedAction>BARGE_CALL</requestedAction><fromAddress>" + params.extension + "</fromAddress><toAddress>" + parameters.parameter.toAddress + "</toAddress><associatedDialogUri>/finesse/api/Dialog/" + parameters.parameter.dialogId + "</associatedDialogUri></Dialog>",
            type: 'POST',
            dataType: "xml",
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", getAuthorizationHeaderValue());
                request.setRequestHeader("Content-Type", "application/xml");
            },
            crossDomain: true,
            success: function (result) {
                return 202;
            },
            error: function (jqXHR, textStatus, errorThrown) {
                apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction, parameters);
            }
        });
}

function silentMonitor(parameters) {
    $ = jQuery.noConflict();
    var weblink = "https://" + params.domain + ":8445/finesse/api/User/" + params.username + "/Dialogs";

    $.ajax(
        {
            url: weblink,
            data: "<Dialog><requestedAction>SILENT_MONITOR</requestedAction><fromAddress>" + params.extension + "</fromAddress><toAddress>" + parameters.parameter.toAddress + "</toAddress></Dialog>",
            type: 'POST',
            dataType: "xml",
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", getAuthorizationHeaderValue());
                request.setRequestHeader("Content-Type", "application/xml");
            },
            crossDomain: true,
            success: function (result) {
                return 202;
            },
            error: function (jqXHR, textStatus, errorThrown) {
                apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction, parameters);
            }
        });
}

function getTeamUsers(parameters) {
    $ = jQuery.noConflict();
    var weblink = "https://" + params.domain + ":8445/finesse/api/Team/" + parameters.parameter.teamId + "?includeLoggedOutAgents=" + parameters.parameter.logoutFlag;

    $.ajax(
        {
            url: weblink,
            type: 'GET',
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", getAuthorizationHeaderValue());
            },
            crossDomain: true,
            success: function (result) {
                result = new XMLSerializer().serializeToString(result);
                callbacks.apiCallbackFunction(result);
                if (parameters.parameter.subscribeFlag == true) {
                    params.teamId = parameters.parameter.teamId;
                    subscribeToTeam();
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction, parameters);
            }
        });
}

function subscribeToTeam() {
    try {
        var teamId = localStorage.getItem("teamId");
        if (teamId && teamId != "null" && teamId == params.teamId) {
            //sendTeamErrorstoClient("teamSubscription", "Subscribed to this team already");
            return;
        }
        else if (teamId && teamId != "null" && teamId != params.teamId) {
            unsubscribeToTeam();
            return;
        }

        var jid = params.username + "@" + params.domain;
        var builder = new jabberwerx.NodeBuilder("{http://jabber.org/protocol/pubsub}pubsub");
        builder.element("subscribe").attribute("node", "/finesse/api/Team/" + params.teamId + "/Users").
            attribute("jid", jid);

        xmppClient.sendIq("set", "pubsub." + params.domain, builder.data, teamCallbackNode, 5000);
    }
    catch (Exception) {
        sendTeamErrorstoClient("Exception", Exception);
    }
}

function unsubscribeToTeam() {
    try {
        var teamId = localStorage.getItem("teamId");
        if (teamId && teamId != "null" && teamId != null) {
            var jid = params.username + "@" + params.domain;
            console.log("Got id: " + teamId);
            console.log("Got jid: " + jid);

            var builder = new jabberwerx.NodeBuilder("{http://jabber.org/protocol/pubsub}pubsub");
            builder.element("unsubscribe").attribute("node", "/finesse/api/Team/" + teamId + "/Users").attribute("jid", jid);

            xmppClient.sendIq("set", "pubsub." + params.domain, builder.data, teamCallbackNode, 5000);
            localStorage.setItem("teamId", null);
            console.log("cleared teamId ");
        }

    }
    catch (Exception) {
        sendTeamErrorstoClient("Exception", Exception);
    }
    return;
}

function makeConsult(parameters) {
    $ = jQuery.noConflict();
    var weblink = "https://" + params.domain + ":8445/finesse/api/Dialog/" + parameters.parameter.dialogId;

    $.ajax(
        {
            url: weblink,
            data: "<Dialog><toAddress>" + parameters.parameter.numberToConsult + "</toAddress><targetMediaAddress>" + params.extension + "</targetMediaAddress><requestedAction>CONSULT_CALL</requestedAction></Dialog>",
            type: 'PUT',
            dataType: "xml",
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", getAuthorizationHeaderValue());
                request.setRequestHeader("Content-Type", "application/xml");
            },
            crossDomain: true,
            success: function (result) {
                return 202;
            },
            error: function (jqXHR, textStatus, errorThrown) {
                apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction, parameters);
            }
        });
}

function transferCall(parameters) {
    var transferAction;
    if (parameters.action == "SST") {
        transferAction = "TRANSFER_SST";
    }
    else
        transferAction = "TRANSFER";

    if (!parameters.parameter.numberToTransfer)
        parameters.parameter.numberToTransfer = "";

    $ = jQuery.noConflict();
    var weblink = "https://" + params.domain + ":8445/finesse/api/Dialog/" + parameters.parameter.dialogId;

    $.ajax(
        {
            url: weblink,
            data: "<Dialog><toAddress>" + parameters.parameter.numberToTransfer + "</toAddress><targetMediaAddress>" + params.extension + "</targetMediaAddress><requestedAction>" + transferAction + "</requestedAction></Dialog>",
            type: 'PUT',
            dataType: "xml",
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", getAuthorizationHeaderValue());
                request.setRequestHeader("Content-Type", "application/xml");
            },
            crossDomain: true,
            success: function (result) {
                return 202;
            },
            error: function (jqXHR, textStatus, errorThrown) {
                apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction, parameters);
            }
        });
}


function updateCallVariableData(parameters) {
    var callVariables = parseCallVariables(parameters.parameter.callVariables.callVariable);
    parameters.parameter.callVariables = callVariables;

    $ = jQuery.noConflict();
    var weblink = "https://" + params.domain + ":8445/finesse/api/Dialog/" + parameters.parameter.dialogId;
    var dataXml = "<Dialog><requestedAction>UPDATE_CALL_DATA</requestedAction><mediaProperties><callvariables>" + JSON.stringify(parameters.parameter.callVariables) + "</callvariables></mediaProperties></Dialog>";

    $.ajax(
        {
            url: weblink,
            data: dataXml,
            type: 'PUT',
            dataType: "xml",
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", getAuthorizationHeaderValue());
                request.setRequestHeader("Content-Type", "application/xml");
            },
            crossDomain: true,
            success: function (result) {
                return 202;
            },
            error: function (jqXHR, textStatus, errorThrown) {
                apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction, parameters);
            }
        });
}

function updateWrapupData(parameters) {
    $ = jQuery.noConflict();
    var weblink = "https://" + params.domain + ":8445/finesse/api/Dialog/" + parameters.parameter.dialogId;
    var dataXml = "<Dialog><requestedAction>UPDATE_CALL_DATA</requestedAction><mediaProperties><wrapUpReason>" + parameters.parameter.wrapupReason + "</wrapUpReason></mediaProperties></Dialog>";

    $.ajax(
        {
            url: weblink,
            data: dataXml,
            type: 'PUT',
            dataType: "xml",
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", getAuthorizationHeaderValue());
                request.setRequestHeader("Content-Type", "application/xml");
            },
            crossDomain: true,
            success: function (result) {
                return 202;
            },
            error: function (jqXHR, textStatus, errorThrown) {
                apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction, parameters);
            }
        });
}

function getWrapUpReasons() {
    $ = jQuery.noConflict();
    var weblink = "https://" + params.domain + ":8445/finesse/api/User/" + params.username + "/WrapUpReasons";

    $.ajax(
        {
            url: weblink,
            type: 'GET',
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", getAuthorizationHeaderValue());
            },

            crossDomain: true,

            success: function (result) {
                var stringdoc = new XMLSerializer().serializeToString(result);
                callbacks.apiCallbackFunction(stringdoc);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction, parameters);
            }
        });
}

function getNotReadyApiXmlBody(parameters) {
    if ((parameters.parameter.reasonCode && !parameters.parameter.userId) || (parameters.parameter.reasonCode && parameters.parameter.userId == params.username))
        return "<User><state>NOT_READY</state> <reasonCodeId>" + parameters.parameter.reasonCode + "</reasonCodeId> </User>";
    else
        return "<User><state>NOT_READY</state></User>";
    /*else if(parameters.parameter.userId  && parameters.parameter.userId  != params.username)
        return "<User><state>NOT_READY</state> <reasonCodeId>" + config.supervisorInitiatedNotReadyReason + "</reasonCodeId> </User>";*/

}


function makeNotReady(parameters) {
    var weblink = getStateChangeApiEndpoint(parameters);
    var dataXml = getNotReadyApiXmlBody(parameters);

    $.ajax(
        {
            url: weblink,
            data: dataXml,
            type: 'PUT',
            dataType: "xml",
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", getAuthorizationHeaderValue());
                request.setRequestHeader("Content-Type", "application/xml");
            },
            statusCode: {
                401: function(xhr) {
                    console.log("Status code is 401");
                  if(window.console) console.log(xhr.responseText);
                }
              },
            crossDomain: true,
            success: function (result) {
                console.log(result);
                return 202;
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR);
                console.log(textStatus);
                console.log(errorThrown);
                apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction, parameters);
            }
        });
}

function makeWorkReady(parameters) {
    $ = jQuery.noConflict();
    var weblink = "https://" + params.domain + ":8445/finesse/api/User/" + params.username;

    $.ajax(
        {
            url: weblink,
            data: "<User><state>" + parameters.parameter.wrapupState + "</state></User>",
            type: 'PUT',
            dataType: "xml",
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", getAuthorizationHeaderValue());
                request.setRequestHeader("Content-Type", "application/xml");
            },
            crossDomain: true,

            success: function (result) {
                return 202;
            },
            error: function (jqXHR, textStatus, errorThrown) {
                apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction, parameters);
            }
        });
}

function getStateChangeApiEndpoint(parameters) {
    if (parameters.parameter && parameters.parameter.userId)
        return "https://" + params.domain + ":8445/finesse/api/User/" + parameters.parameter.userId;
    else
        return "https://" + params.domain + ":8445/finesse/api/User/" + params.username;
}
function makeReady(parameters) {
    $ = jQuery.noConflict();
    var weblink = getStateChangeApiEndpoint(parameters);

    $.ajax(
        {
            url: weblink,
            data: "<User><state>READY</state></User>",
            type: 'PUT',
            dataType: "xml",
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", getAuthorizationHeaderValue());
                request.setRequestHeader("Content-Type", "application/xml");
            },
            crossDomain: true,

            success: function (result) {
                return 202;
            },
            error: function (jqXHR, textStatus, errorThrown) {
                apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction, parameters);
            }
        });
}

function dialogAction(parameters) {
    $ = jQuery.noConflict();
    var action = getCallAction(parameters.action);
    var weblink = "https://" + params.domain + ":8445/finesse/api/Dialog/" + parameters.parameter.dialogId;

    $.ajax(
        {
            url: weblink,
            data: "<Dialog><targetMediaAddress>" + params.extension + "</targetMediaAddress><requestedAction>" + action + "</requestedAction></Dialog>",
            type: 'PUT',
            dataType: "xml",
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", getAuthorizationHeaderValue());
                request.setRequestHeader("Content-Type", "application/xml");
            },
            crossDomain: true,
            success: function (result) {
                return 202;
            },
            error: function (jqXHR, textStatus, errorThrown) {
                apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction, parameters);
            }
        });
}

function getCallAction(action) {
    switch (action) {
        case "answerCall":
            return "ANSWER";
        case "releaseCall":
            return "DROP";
        case "holdCall":
            return "HOLD";
        case "retrieveCall":
            return "RETRIEVE";
        case "conferenceCall":
            return "CONFERENCE";
        case "acceptCall":
            return "ACCEPT";
        case "rejectCall":
            return "REJECT";
        case "closeCall":
            return "CLOSE";
    }
    return null;
}


function makeCall(parameters) {
    $ = jQuery.noConflict();
    var weblink = "https://" + params.domain + ":8445/finesse/api/User/" + params.username + "/Dialogs";

    $.ajax(
        {
            url: weblink,
            data: "<Dialog><requestedAction>MAKE_CALL</requestedAction><fromAddress>" + params.extension + "</fromAddress><toAddress>" + parameters.parameter.calledNumber + "</toAddress></Dialog>",
            type: 'POST',
            dataType: "xml",
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", getAuthorizationHeaderValue());
                request.setRequestHeader("Content-Type", "application/xml");
            },
            crossDomain: true,
            success: function (result) {
                return 202;
            },
            error: function (jqXHR, textStatus, errorThrown) {
                apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction, parameters);
            }
        });
}

function getAuthorizationHeaderValue(isAdmin)
{
    if(isAdmin != undefined && isAdmin == true)
        return "Basic " + params.adminEncodedData;
    if(isSSOAgent)
        return "Bearer " + params.password;
    else
        return "Basic " + params.encodedData;
}

function getMobileAgentPayload(){
    if(params.isMobileAgent != undefined && params.isMobileAgent == true){
      return "<mobileAgent><mode>" + params.mode + "</mode><dialNumber>" + params.dialednumber + "</dialNumber></mobileAgent>";
    }
    return "";
  }

  function loginUser() {
    $ = jQuery.noConflict();
    var weblink = "https://" + params.domain + ":8445/finesse/api/User/" + params.username;
    let mobileAgentPayload = getMobileAgentPayload();
    $.ajax(
      {
        url: weblink,
        data: "<User><state>LOGIN</state><extension>" + params.extension + "</extension>" + mobileAgentPayload + "</User>",
        type: 'PUT',
        dataType: "xml",
        beforeSend: function (request) {
          request.setRequestHeader("Authorization", getAuthorizationHeaderValue());
          request.setRequestHeader("Content-Type", "application/xml");
        },
        crossDomain: true,
        success: function (result) {
          getState("login");
        },
        error: function (jqXHR, textStatus, errorThrown) {
          apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction);
        }
      });
  }

async function getSystemInfo(domain, isFailoverCase){
    console.log("Going to get system info for " + domain + " from api");

    var requestOptions = {
        method: 'GET',
        redirect: 'follow'
      };

    var response = await fetch("https://" + domain + ":8445/finesse/api/SystemInfo", requestOptions)
    .then(response => response.text())
    .then(result => {
        var xmlObj = $.parseXML(result);
        jsonObj = xml2json(xmlObj);
        console.log("[getSystemInfo] response: " , jsonObj);
        if(isFailoverCase)
            callbacks.apiCallbackFunction(result)

        heartbeatReceived = true;
        if(jsonObj && jsonObj.SystemInfo && jsonObj.SystemInfo.status == "IN_SERVICE")
            return 1;
        return null;
    })
    .catch(error => {
        heartbeatReceived = false;
        console.error('error: ', error);
        return error;
    });
    return response;
}

function getState(source) {
    $ = jQuery.noConflict();
    var weblink = "https://" + params.domain + ":8445/finesse/api/User/" + params.username;
    $.ajax(
        {
            url: weblink,
            type: 'GET',
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", getAuthorizationHeaderValue());
            },

            crossDomain: true,

            success: function (result) {
                result = new XMLSerializer().serializeToString(result);
                if (source == 'login') {
                    getDialogs();
                }
                callbacks.apiCallbackFunction(result)
            },

            error: function (jqXHR, textStatus, errorThrown) {
                apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction);
            }
        });
}

function getDialogs() {
    var weblink = "https://" + params.domain + ":8445/finesse/api/User/" + params.username + "/Dialogs";

    $.ajax(
        {
            url: weblink,
            data: "",
            type: 'GET',
            dataType: "xml",
            beforeSend: function (request) {
                request.setRequestHeader("Authorization",  getAuthorizationHeaderValue());
            },
            success: function (result) {
                result = new XMLSerializer().serializeToString(result);
                callbacks.apiCallbackFunction(result);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction);
            }
        });
}

function getLogoutApiXmlBody(parameters) {
    if ((parameters.parameter.reasonCode && parameters.parameter.userId && parameters.parameter.userId == params.username) || (parameters.parameter.reasonCode && !parameters.parameter.userId))
        return "<User><state>LOGOUT</state> <reasonCodeId>" + parameters.parameter.reasonCode + "</reasonCodeId> </User>";
    else
        return "<User><state>LOGOUT</state></User>";
    /*else if(parameters.parameter.userId && parameters.parameter.userId != params.username)
        return "<User><state>LOGOUT</state> <reasonCodeId>" + config.supervisorInitiatedLogoutReason + "</reasonCodeId> </User>";*/

}

function logout(parameters) {
    var weblink = getStateChangeApiEndpoint(parameters);
    var dataXml = getLogoutApiXmlBody(parameters);

    $.ajax(
        {
            url: weblink,
            data: dataXml,
            type: 'PUT',
            dataType: "xml",
            beforeSend: function (request) {
                request.setRequestHeader("Authorization",  getAuthorizationHeaderValue());
                request.setRequestHeader("Content-Type", "application/xml");
            },
            crossDomain: true,
            success: function (result) {
                return 202;
            },
            error: function (jqXHR, textStatus, errorThrown) {
                apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction, parameters);
            }
        });
}

function getNotReadyLogoutReasons() {
    $ = jQuery.noConflict();
    var weblink = "https://" + params.domain + ":8445/finesse/api/User/" + params.username + "/ReasonCodes?category=NOT_READY";

    $.ajax(
        {
            url: weblink,
            type: 'GET',
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", getAuthorizationHeaderValue());
            },

            crossDomain: true,

            success: function (result) {
                var stringdoc = new XMLSerializer().serializeToString(result);
                parseNotReadyReasons(stringdoc);
                getReasonsLogout();
                //callback(stringdoc);
                /*var parser = new DOMParser();
                var xmlDoc = parser.parseFromString(stringdoc, "text/xml");
                var parsedReasons = parseReasonCodes(xmlDoc);
                callback(parsedReasons);*/
            },


            error: function (jqXHR, textStatus, errorThrown) {
                apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction, parameters);
            }
        });
}

function parseNotReadyReasons(reasons) {
    var xmlObj = $.parseXML(reasons);
    var response = xml2json(xmlObj);
    parseReasonCodes(response.ReasonCodes.ReasonCode, "notReady");
}

function getReasonsLogout() {
    $ = jQuery.noConflict();
    var weblink = "https://" + params.domain + ":8445/finesse/api/User/" + params.username + "/ReasonCodes?category=LOGOUT";

    $.ajax(
        {
            url: weblink,
            type: 'GET',
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", getAuthorizationHeaderValue());
            },

            crossDomain: true,

            success: function (result) {
                var stringdoc = new XMLSerializer().serializeToString(result);
                callbacks.apiCallbackFunction(stringdoc);
            },

            error: function (jqXHR, textStatus, errorThrown) {
                apiErrors(jqXHR, errorThrown, callbacks.apiCallbackFunction, parameters);
            }
        });
}

function parseReasonCodes(reasons, src) {
    var category;
    var label;
    var systemCode;
    var uri;
    var code;
    var i = 0;
    var logoutReasons = [];
    //var reasonsLength = reasons.length;

    if (src == "notReady")
        notReadyReasons = [];

    if (Array.isArray(reasons)) {
        while (i < reasons.length) {
            systemCode = reasons[i].systemCode;

            if (systemCode == "false") {
                category = reasons[i].category;
                label = reasons[i].label;
                code = getIdFromUri(reasons[i].uri);

                var reason = { 'label': label, 'code': code, 'systemCode': systemCode };

                if (category == "LOGOUT") {
                    logoutReasons.push(reason)
                }
                else
                    notReadyReasons.push(reason);
            }
            i++;
        }
    }
    else if (reasons) {
        systemCode = reasons.systemCode;
        if (systemCode == "false") {
            category = reasons.category;
            label = reasons.label;
            code = getIdFromUri(reasons.uri);

            var reason = { 'label': label, 'code': code, 'systemCode': systemCode };
            if (category == "LOGOUT") {
                logoutReasons.push(reason)
            }
            else
                notReadyReasons.push(reason);
        }
    }
    if (src == "notReady")
        return notReadyReasons;

    var AllReasons =
    {
        "event": "notReadyLogoutReasonCode",
        "response":
        {
            "loginId": params.username,
            notReadyReasons,
            logoutReasons,
        }
    }
    return AllReasons;
}

function getIdFromUri(uri){
    var lastIndexofUriString = uri.lastIndexOf("/");
    return uri.substring(lastIndexofUriString + 1, uri.length);
}

function parseWrapUpReasonCodes(reasons) {
    var label;
    var uri;
    var code;
    var i = 0;
    var wrapupReasons = [];
    //var reasonsLength = reasons.length;

    if (Array.isArray(reasons)) {
        while (i < reasons.length) {
            label = reasons[i].label;
            code = getIdFromUri(reasons[i].uri);

            var reason = { 'label': label, 'code': code, 'forAll': reasons[i].forAll };
            wrapupReasons.push(reason);
            i++;
        }
    }
    else if (reasons) {
        label = reasons.label;
        code = getIdFromUri(reasons.uri);

        var reason = { 'label': label, 'code': code, 'forAll': reasons.forAll };
        wrapupReasons.push(reason);
    }
    var wrapReasons =
    {
        "event": "wrapupReasonCode",
        "response":
        {
            "loginId": params.username,
            wrapupReasons,
        }
    }
    return wrapReasons;
}

function parseTeam(teamEvent) {
    var users = [];
    var i = 0;
    var teamUserLength;
    if(teamEvent.users!= "" && teamEvent.users.User.length)
        teamUserLength = teamEvent.users.User.length;

    if (teamUserLength && teamUserLength > 1) {
        while (i < teamUserLength) {
            var reasonCode = null;
            if(teamEvent.users.User[i].reasonCode)
                reasonCode = teamEvent.users.User[i].reasonCode;
            var user =
            {
                "firstName": teamEvent.users.User[i].firstName,
                "lastName": teamEvent.users.User[i].lastName,
                "fullName": teamEvent.users.User[i].firstName + " " + teamEvent.users.User[i].lastName,
                "extension": teamEvent.users.User[i].extension,
                "loginId": teamEvent.users.User[i].loginId,
                "state": teamEvent.users.User[i].state,
                "reasonCode": reasonCode,
                "pendingState": teamEvent.users.User[i].pendingState,
                "stateChangeTime": teamEvent.users.User[i].stateChangeTime,
                "mediaType": teamEvent.users.User[i].mediaType,
                "mediaState": teamEvent.users.User[i].mediaState ? teamEvent.users.User[i].mediaState : null,
            }
            users.push(user);
            i++;
        }
    }
    else if ((teamUserLength == 1 || teamUserLength == undefined) && teamEvent.users!= "" && teamEvent.users.User.firstName) {
        var reasonCode = null;
        if(teamEvent.users.User.reasonCode)
            reasonCode = teamEvent.users.User.reasonCode;
        var user =
        {
            "firstName": teamEvent.users.User.firstName,
            "lastName": teamEvent.users.User.lastName,
            "fullName": teamEvent.users.User.firstName + " " + teamEvent.users.User.lastName,
            "extension": teamEvent.users.User.extension,
            "loginId": teamEvent.users.User.loginId,
            "state": teamEvent.users.User.state,
            "reasonCode": reasonCode,
            "pendingState": teamEvent.users.User.pendingState,
            "stateChangeTime": teamEvent.users.User.stateChangeTime,
            "mediaType": teamEvent.users.User.mediaType,
            "mediaState": teamEvent.users.User.mediaState ? teamEvent.users.User.mediaState : null,
        }
        users.push(user);
    }
    var teamResponse =
    {
        "event": "teamUsersList",
        "response":
        {
            "loginId": params.username,
            "teamId": teamEvent.id,
            "teamName": teamEvent.name,
            "users": users,
        }
    }
    return teamResponse;
}
function parseQueues(queueEvent) {
    var queues = [];
    var i = 0;
    var queuesLength = queueEvent.length;

    if (queuesLength && queuesLength > 1) {
        while (i < queuesLength) {
            var id = queueEvent[i].uri;
            var lastIndex = id.lastIndexOf("/");
            id = id.substring(lastIndex + 1, id.length);
            var queue =
            {
                "name": queueEvent[i].name,
                "statistics": queueEvent[i].statistics,
                "id": id,
            }
            queues.push(queue);
            i++;
        }
    }
    else if ((queuesLength == 1 || queuesLength == undefined) && queueEvent.name) {
        var id = queueEvent.uri;
        var lastIndex = id.lastIndexOf("/");
        id = id.substring(lastIndex + 1, id.length);
        var queue =
        {
            "name": queueEvent.name,
            "statistics": queueEvent.statistics,
            "id": id,
        }
        queues.push(queue);
    }
    var queueResponse =
    {
        "event": "queueList",
        "response":
        {
            "loginId": params.username,
            "queues": queues,
        }
    }
    return queueResponse;
}

function parsePhoneBooks(phoneBookEvent) {
    var phoneBooks = [];
    var i = 0;
    var phoneBooksLength = phoneBookEvent.length;

    if (phoneBooksLength && phoneBooksLength > 1) {
        while (i < phoneBooksLength) {
            var id = phoneBookEvent[i].uri;
            var lastIndex = id.lastIndexOf("/");
            id = id.substring(lastIndex + 1, id.length);
            var contacts = [];
            if (phoneBookEvent[i].contacts != null && phoneBookEvent[i].contacts != undefined) {
                if (phoneBookEvent[i].contacts != "")
                    contacts = parsePhoneBookContacts(phoneBookEvent[i].contacts.Contact);
                else
                    contacts = parsePhoneBookContacts(phoneBookEvent[i].contacts);
            }
            var phoneBook =
            {
                "name": phoneBookEvent[i].name,
                "type": phoneBookEvent[i].type,
                "id": id,
                "contacts": contacts,
            }
            phoneBooks.push(phoneBook);
            i++;
        }
    }
    else if ((phoneBooksLength == 1 || phoneBooksLength == undefined) && phoneBookEvent.name) {
        var id = phoneBookEvent.uri;
        var lastIndex = id.lastIndexOf("/");
        id = id.substring(lastIndex + 1, id.length);
        var contacts = [];
        if (phoneBookEvent.contacts != null && phoneBookEvent.contacts != undefined) {
            if (phoneBookEvent.contacts != "")
                contacts = parsePhoneBookContacts(phoneBookEvent.contacts.Contact);
            else
                contacts = parsePhoneBookContacts(phoneBookEvent.contacts);
        }
        var phoneBook =
        {
            "name": phoneBookEvent.name,
            "type": phoneBookEvent.type,
            "id": id,
            "contacts": contacts,
        }
        phoneBooks.push(phoneBook);
    }
    var phoneBookResponse =
    {
        "event": "phoneBookList",
        "response":
        {
            "loginId": params.username,
            "phoneBooks": phoneBooks,
        }
    }
    return phoneBookResponse;
}

function parsePhoneBookContacts(contactEvent) {
    var contacts = [];
    var i = 0;
    var contactsLength = contactEvent.length;

    if (contactsLength && contactsLength > 1) {
        while (i < contactsLength) {
            var id = contactEvent[i].uri;
            var lastIndex = id.lastIndexOf("/");
            id = id.substring(lastIndex + 1, id.length);
            var contact =
            {
                "firstName": contactEvent[i].firstName,
                "lastName": contactEvent[i].lastName,
                "description": contactEvent[i].description,
                "phoneNumber": contactEvent[i].phoneNumber,
                "id": id,
            }
            contacts.push(contact);
            i++;
        }
    }
    else if ((contactsLength == 1 || contactsLength == undefined) && contactEvent.firstName) {
        var id = contactEvent.uri;
        var lastIndex = id.lastIndexOf("/");
        id = id.substring(lastIndex + 1, id.length);
        var contact =
        {
            "firstName": contactEvent.firstName,
            "lastName": contactEvent.lastName,
            "description": contactEvent.description,
            "phoneNumber": contactEvent.phoneNumber,
            "id": id,
        }
        contacts.push(contact);
    }
    return contacts;
}

function parseSSOTokenResponse(tokenEvent){
    try{
        isSSOAgent = true;
        localStorage.setItem("isSSOUser", true);
        var response = {
            "event": "ssoToken",
            "response": {
                "loginId": params.username,
                "accessToken": tokenEvent.access_token,
            }
        }
        return response;
    }
    catch(err){
        console.error(err);
    }
}
