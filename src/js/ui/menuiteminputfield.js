/**
 * Created by 212470601 on 4/15/2016.
 */

/*jslint browser: true, node: true */
/*global $, PAPAYA_MENU_HOVERING_CSS, PAPAYA_MENU_COLORTABLE_CSS, PAPAYA_MENU_UNSELECTABLE */

"use strict";

/*** Imports ***/
var papaya = papaya || {};
papaya.ui = papaya.ui || {};


/*** Constructor ***/
papaya.ui.MenuItemInputField = papaya.ui.MenuItemInputField || function (viewer, label, action, callback, dataSource,
                                                                           method, modifier) {
        this.viewer = viewer;
        this.label = label;

        this.modifier = "";
        if ((modifier !== undefined) && (modifier !== null)) {
            this.modifier = "-" + modifier;
        }

        this.action = action + this.modifier;
        this.method = method;
        this.id = this.action.replace(/ /g, "_").replace(/\(/g, "").replace(/\)/g, "") +
            this.viewer.container.containerIndex;
        this.callback = callback;
        this.dataSource = dataSource;
    };


papaya.ui.MenuItemInputField.prototype.loadFilesFromDropbox = function(filePaths, token, fiszemfaszom){
    var endpoint = "https://content.dropboxapi.com/2/files/download";
    var files = [];
    var http = [];
    for(var i = 0; i < filePaths.length; i++) {
        console.log(filePaths[i]);
        http[i] = new XMLHttpRequest();


        http[i].addEventListener("load", function() {
            console.log(this.response);
                    files.push(this.response);
                    console.log(files.length);
            this.action = "OpenDropboxFolder";
                    if(files.length === filePaths.length) {
                        console.log(files);
                        files[0].name = "dicom";
                        //papaya.utilities.ObjectUtils.bind(this, this.doAction);
                        fiszemfaszom.viewer.loadImage(files);
                        // papaya.ui.Toolbar.prototype.doAction("OpenDropboxFolder", files, true);
                    }

        });
        http[i].open("POST", endpoint, true);
        http[i].responseType = "blob";
        http[i].setRequestHeader("Authorization", "Bearer " + token);
        http[i].setRequestHeader("Dropbox-API-Arg", JSON.stringify({ path: filePaths[i]}));
        http[i].send(null);
    }



};

papaya.ui.MenuItemInputField.prototype.loadStudyFromDropbox = function(fiszemfaszom, folderPath){
    if(document.URL.indexOf('token') > 0){
        var urlParameters = document.URL.split("#")[1].split("&");
        var token = urlParameters[0].split("=")[1];
        var response = "";
        var getFolderEndpoint = "https://api.dropboxapi.com/2/files/list_folder";
        //var filename = document.getElementById('textbox_id').value;
        var folderPathInJson = JSON.stringify({
            path: folderPath
        });
        console.log(folderPathInJson);
        var filePaths = [];

        var xmlHttp = new XMLHttpRequest();

        xmlHttp.open("POST", getFolderEndpoint, true); // true for asynchronous
        xmlHttp.setRequestHeader("Authorization", "Bearer " + token);
        xmlHttp.setRequestHeader("Content-type", "application/json");


        xmlHttp.send(folderPathInJson);

        xmlHttp.onreadystatechange = function() {//Call a function when the state changes.
            if(xmlHttp.readyState == 4 && xmlHttp.status == 200) {
                response = JSON.parse(xmlHttp.responseText);
                console.log(response);

                for(var i = 0; i < response.entries.length; i++) {
                    filePaths.push(response.entries[i].path_lower);
                }

                papaya.ui.MenuItemInputField.prototype.loadFilesFromDropbox(filePaths, token, fiszemfaszom);
            }
        };

    } else {
        alert("Please sign in to Dropbox!"); //TODO: better alert
    }
};

papaya.ui.MenuItemInputField.prototype.signInToDropbox = function(){
    if(document.URL.indexOf('token') <= 0){
        var redirectUri = document.URL;
        var clientId = "4fcaqqdhvqqzagq";
        var endpoint = "https://www.dropbox.com/oauth2/authorize";
        var url = endpoint+"?response_type=token&client_id="+clientId+"&redirect_uri="+redirectUri;
        window.open(url);
    } else {
        alert("You are already signed into Dropbox!"); //TODO: better alert
    }

};

/*** Prototype Methods ***/

papaya.ui.MenuItemInputField.prototype.buildHTML = function (parentId) {
    var inputId, html, html2, html3, thisHtml, thisHtml2;

    inputId = "dropboxFileName";
    var fiszemfaszom = this;

    html = '<li id=' + '><input placeholder = "rel folder path from home" style = "margin-bottom: 10px;" type="text" id="' + inputId  +  '"><span class="' +
        PAPAYA_MENU_UNSELECTABLE + '">&nbsp;' + this.label + '</span><button id="loadFile" style="margin-right: 10px; background-color: gold" type="button" >Load file</button>' +
        '<button id="signIn" onclick="papaya.ui.MenuItemInputField.prototype.signInToDropbox()" type="cloud">Sign in to Dropbox</button></li>';
    $("#" + parentId).append(html);



    document.getElementById("loadFile").addEventListener('click', function () {
        var folderPath = document.getElementById("dropboxFileName").value;
        papaya.ui.MenuItemInputField.prototype.loadStudyFromDropbox(fiszemfaszom, folderPath);
    });
};


papaya.ui.MenuItemInputField.prototype.doAction = function () {
    console.log("Doing action: " + this.action);
    this.callback(this.action, this.files, false);
};
