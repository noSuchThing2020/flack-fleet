/***
 *  Main JavaScript file for the simple chat app - Flack-Fleet
 */

document.addEventListener('DOMContentLoaded', () => {
    // Creat Web socket connection
    var URL  = location.protocol + '//' + document.domain + ':' + location.port;
    //io.set('transports', ['websocket']);
    //var socket = io.connect(URL);
    // var socket = io(URL,{
    //     transports: ['websocket']
    // })
    var socket = io(URL, {transports: ['websocket']});
    console.log(URL);
    console.log(socket);
    
    // Set the default channel for the user
    let room = "Lobby";

    if (localStorage.getItem("displayName")) {
        $("#blocker").hide();
        $("#nameBlock").hide();
        $("#userName").text(localStorage.getItem("displayName"));
        if(localStorage.getItem("currentChannel")) {
            joinRoom(localStorage.getItem("currentChannel"));
            room = localStorage.getItem("currentChannel");
        } else {
            joinRoom(room);
        }
    }
    let newUrl = `/channels/${room}`;
    let currentUrl = window.location.href;
    let oldIndex = currentUrl.lastIndexOf("/") + 1;
    let newIndex = newUrl.lastIndexOf("/") + 1;
    if (currentUrl.substring(oldIndex) != newUrl.substring(newIndex)) {
        window.location.replace(newUrl);
    }

    var displayName = localStorage.getItem("displayName");
    // Change display name 
    document.querySelector("#userName").onclick = ()=> {
        document.querySelector(".pickName").innerHTML = "Pick a new display name!";
        $("#blocker").show();
        $("#nameBlock").show();
    }

    // Close the modal when user clicks the close button
    document.querySelector("#close-modal").onclick = ()=> {
        $("#blocker").hide();
        $("#nameBlock").hide();
    }

    //Once connected websocket, configure the button
    socket.on('connect', () => {
        console.log("Connected!");
        // emit the text user typed in
        myButton = document.querySelector('#send-btn');
        myButton.onclick = ()=>{
            event.preventDefault();
            let myText = document.querySelector('#message').value;
            //console.log(myText);
            let sendUser = localStorage.getItem("displayName");
            // Get time stamp
            let newTime = new Date();
            let timeStamp = newTime.toLocaleString();
            let message = {'myText': myText,"sendUser":sendUser, "timeStamp": timeStamp, "room":room}
            message = JSON.stringify(message)
            socket.emit('message', message);
        };

        // emit the user joined when selected a name
        addNameBtn = document.querySelector("#addName");
        addNameBtn.onclick = () => {
            let names = []
            if (localStorage.getItem("names")) {
                names = JSON.parse(localStorage.getItem("names"));
            }
            var newName = document.querySelector("#displayName").value;
            if(newName === "") {
                if(document.querySelector(".empty-alert")){
                    return;
                }
                var alert = document.createElement("p")
                alert.classList = "alert-warning alert empty-alert";
                alert.innerHTML = "Your name cannot be empty!";
                document.querySelector("#nameblock").append(alert);
                return;
            }

            let oldName = localStorage.getItem("displayName");
            let data = {"userId": newName, "oldName": oldName};
            // let usernameExists = false;
            $.ajax({
                type:"POST",
                cache:false,
                url:"/checkUsername",
                contentType: 'application/json;charset=UTF-8',
                data:JSON.stringify(data),    
                dataType: 'json',
                success: function (res) {
                    if (res["exists"] === true) {
                        document.querySelector("#nameExists").classList = "alert-warning alert";
                        return;
                    } else {
                        document.querySelector("#nameExists").classList = "alert-warning alert none";
                        localStorage.setItem("displayName", newName);
                        $("#userName").text(newName);
                        $("#blocker").hide();
                        $("#nameBlock").hide();
                        socket.emit('user joined', {"newJoin": newName, "oldName": oldName, "room": room});
                    }
                }
            });
            
            names.push(newName);
            localStorage.setItem("names", JSON.stringify(names))
            
            data = {"newName": newName,"names": names};
            $.ajax({
                type:"POST",
                cache:false,
                url:"/update",
                contentType: 'application/json;charset=UTF-8',
                data:JSON.stringify(data),    
                dataType: 'json',
                success: function (data) {
                    console.log(`${data["success"]} successfully sent`);
                }
            });
        }
    });

    // When a new user joins annonce to all
    socket.on('broadcast join',data=>{
        const p = document.createElement('p');
        if(data.oldName) {
            p.innerHTML = `<b>${data.oldName}</b> is now <b>${data.newJoin}</b>！`;
        } else {
            p.innerHTML = `<b>${data.newJoin}</b> has joined！`;
        }
        p.classList = "clear";
        document.querySelector("#messages").append(p);
    });

    // Handle the broadcasted messages
    //socket.on('broadcast message', data => {
    socket.on('message', data => {
        const div = document.createElement('div')
        div.innerHTML = "<p><span></span></p>"
        const p = document.createElement('p');
        console.log("raw data is:" + data);
        if (data.myText) {
            if(data.sendUser === localStorage.getItem("displayName")) {
                div.classList.add("end","message");
            } else {
                div.classList.add("start","message");
            }
            console.log("The data received is:" + data);
            div.innerHTML = `<p><span class='displayName'>${data.sendUser}</span><span class='timeStamp'>${data.timeStamp}</span></p><p>${data.myText}</p>`
            document.querySelector('#messages').append(div);
            // Empty the input field after send
            document.querySelector('input[name="message"]').value = "";
        } else if (data.imageSrc) {
            if(data.sendUser === localStorage.getItem("displayName")) {
                div.classList.add("end","message");
            } else {
                div.classList.add("start","message");
            }
            console.log("The data received is:" + data);
            div.innerHTML = `<p><span class='displayName'>${data.sendUser}</span><span class='timeStamp'>${data.timeStamp}</span></p><img src=${data.imageSrc}></img>`
            document.querySelector('#messages').append(div);
            // Empty the input field after send
            document.querySelector('input[name="message"]').value = "";
        } else {
            p.innerHTML = data;
            p.classList = "warning-message";
            console.log("backend data is:" + data);
            document.querySelector("#messages").append(p);
        }

        if (data.imageSrc) {
            if(data.sendUser === localStorage.getItem("displayName")) {
                div.classList.add("end","message");
            } else {
                div.classList.add("start","message");
            }
            console.log("The data received is:" + data);
            div.innerHTML = `<p><span class='displayName'>${data.sendUser}</span><span class='timeStamp'>${data.timeStamp}</span></p><img src=${data.imageSrc}></img>`
            document.querySelector('#messages').append(div);
            // Empty the input field after send
            document.querySelector('input[name="message"]').value = "";
        }
        
        // Scroll the window to the latest message when overflowed
        let messageDiv = document.getElementById("messages");
        messageDiv.scrollTop = messageDiv.scrollHeight;
    });

    
    socket.on('broadcast-image', data => {
        const div = document.createElement('div')
        div.innerHTML = "<p><span></span></p>"
        // const p = document.createElement('p');
        if (data.imageSrc) {
            if(data.sendUser === localStorage.getItem("displayName")) {
                div.classList.add("end","message");
            } else {
                div.classList.add("start","message");
            }
            console.log("The data received is:" + data);
            div.innerHTML = `<p><span class='displayName'>${data.sendUser}</span><span class='timeStamp'>${data.timeStamp}</span></p><img src=${data.imageSrc}></img>`
            document.querySelector('#messages').append(div);
            // Empty the input field after send
            document.querySelector('input[name="message"]').value = "";
        }
    });

    // Handle join the channel
    //document.querySelectorAll('.join-channel').forEach(el => {
    var channelLinks = document.querySelectorAll('.join-channel');
    channelLinks.forEach(function(el){
        el.addEventListener("click", function(event){
            let newRoom = el.innerHTML;
            //el.classList = "join-channel alert";
            console.log("channel is" + newRoom);
            console.log(room == newRoom);
            if(room === newRoom) {
                event.preventDefault();
                let p = document.createElement('p');
                p.classList = "warning-message warning";
                p.innerHTML = `You are already in the ${room} channel!`;
                document.querySelector("#messages").append(p);
                mySideNav.classList = "";
                document.querySelector(".public-channel").style.display = "none";
                document.querySelector(".channel-heading").style.display = "None";
                document.getElementById("mySidenav").style.width = "0";
                document.getElementById("main").style.transform= "translateX(0)";
                let messageDiv = document.getElementById("messages");
                messageDiv.scrollTop = messageDiv.scrollHeight;
            } else {
                leaveRoom(room);
                joinRoom(newRoom);
                document.querySelectorAll('.join-channel').classList = "join-channel";
                el.classList = "join-channel active-channel";
                room = newRoom
            }
        })
    });

    var postBoxes = document.querySelectorAll('.post-box')
    postBoxes.forEach(function(postBox) {
        postBox.addEventListener('click', function() {
        var postId = this.getAttribute('post-id')
        console.log(postId)
        document.getElementById('comment-form-' + postId).style.display = 'block'
        })
    })

    function joinRoom(room) {
        let userName = localStorage.getItem("displayName");
        localStorage.setItem("currentChannel", room);
        socket.emit('join', {"userName": userName, "room": room})
    }

    function leaveRoom(room) {
        let userName = localStorage.getItem("displayName"); 
        socket.emit('leave', {"userName": userName, "room": room})
    }

    var navHeight = document.querySelector("#topNav").offsetHeight;
    document.getElementById("mySidenav").style.top = navHeight;


    var mySideNav = document.querySelector("#mySidenav")
    document.querySelector("#toggleButton").onclick = () => {
        if (mySideNav.classList == "") {
            mySideNav.classList = "active";
            document.getElementById("mySidenav").style.width = "60%";
            document.getElementById("main").style.transform = "translateX(60%)";
            document.querySelector(".public-channel").style.display = "block";
            document.querySelector(".channel-heading").style.display = "block";
        } else {
            mySideNav.classList = "";
            document.querySelector(".public-channel").style.display = "none";
            document.querySelector(".channel-heading").style.display = "None";
            document.getElementById("mySidenav").style.width = "0";
            document.getElementById("main").style.transform= "translateX(0)";
        }
    }

    // Handle send message input
    var messageInput = document.querySelector("#message");
    var sendBtn = document.querySelector("#send-btn");

    messageInput.onkeyup = function(){
        if(messageInput.value === ""){
            sendBtn.disabled = true;
        } else {
            sendBtn.disabled = false;
        }
    }

    messageInput.onfocus = function(){
        if(messageInput.value === ""){
            sendBtn.disabled = true;
        } else {
            sendBtn.disabled = false;
        }
    }       

    // Dynamically set the message window height
    var window_height = window.innerHeight;
    var nav_height = document.querySelector("#topNav").offsetHeight;
    var sendBtn_height = document.querySelector(".send-form").offsetHeight;
    var main_height = window_height - nav_height;
    var messages_height = window_height - (nav_height + sendBtn_height) - 20;
    document.querySelector("#messages").style.height = messages_height;
    document.querySelector("#main").style.height = main_height;

    // Emoji library plugin
    const button = document.querySelector('#emoji-button');
    const picker = new EmojiButton();

    picker.on('emoji', emoji => {
        document.querySelector('#message').value += emoji;
    });

    button.addEventListener('click', () => {
        picker.togglePicker(button);
    });


    //  Handle file upload
    var myFile = document.querySelector("#myFile");
    var imageSrc = ""
    myFile.addEventListener('change', function(){
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            previewImage = document.querySelector("#output");
            messageInput = document.querySelector("#message");
            reader.addEventListener('load', function(){
                console.log(this);
                if(file.size > 6000000) {
                    alert("Your file is too big!")
                } else {
                    previewImage.setAttribute('src', this.result);
                    previewImage.classList = "";
                    imageSrc =  this.result
                }
            });
            reader.readAsDataURL(file);
        }
    });

    document.querySelector("#send-img").onclick = () => {
        document.querySelector("#preview-div").classList = "none";
        document.querySelector("#output").classList = "none";
        document.querySelector(".send-form").style.display = "block";
        let sendUser = localStorage.getItem("displayName");
        // Get time stamp
        let newTime = new Date();
        let timeStamp = newTime.toLocaleString();
        let message = {'imageSrc': imageSrc,"sendUser":sendUser, "timeStamp": timeStamp, "room":room}
        message = JSON.stringify(message)
        socket.emit('send-image', message);
    }

    document.querySelector(".myFile-label").onclick = () => {
        document.querySelector("#preview-div").classList = "";
        document.querySelector(".send-form").style.display = "none";
    }

});