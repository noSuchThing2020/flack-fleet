import os, json

from flask import Flask, render_template, session, jsonify, request, redirect, url_for, make_response
from flask_session import Session
from flask_socketio import SocketIO, emit, join_room, leave_room, send


app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["TEMPLATES_AUTO_RELOAD"] = True
# Solve the chinese input decode problem
app.config["JSON_AS_ASCII"] = False

# Configure session to use filesystem
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

socketio = SocketIO(app, cors_allowed_origins='*')
print(os.getenv("SECRET_KEY"))

channels = ["Lobby","Coding", "Stocks", "Sports", "Study"]
userIds = []
messages = {}
warningMessage = ""

@app.route("/")
def index():
    currentUser = ""
    usedNames = []
    channelMessages = []
    if channel in messages:
            channelMessages = messages[channel]
    if not session.get('currentUser') is None:
        currentUser = session["currentUser"]
    if not session.get('usedNames') is None:    
        usedNames = session["usedNames"]
    return render_template("index.html", messages = channelMessages, currentUser = currentUser, usedNames = usedNames, channels = channels, warningMessage = warningMessage, channel = channel)

@app.route("/checkUsername", methods=["POST"])
def checkUsername():
    if request.method == "POST":
        userId = request.json['userId']
        oldName = request.json['oldName']
        if userId not in userIds:
            userIds.append(userId)
            if oldName:
                userIds.remove(oldName)
            return jsonify({"exists": False}), 200
        else:
            return jsonify({"exists": True}), 200

@app.route("/update", methods = ["POST"])
def update():
    if request.method == "POST":
        session["currentUser"] = request.json['newName']
        session["usedNames"] = request.json['names']
        return jsonify({"success": "Yes"}), 200

@app.route("/create", methods = ["POST"])
def create():
    if request.method == "POST":
        newChannel = request.form.get("channel")
        if newChannel in channels:
            #warningMessage="This channel already exists, Please create a different channel!"
            #return render_template("index.html", warningMessage = "This channel already exists, Please create a different channel!")
            return redirect(url_for('index'))
        channels.append(newChannel)
        return redirect("/")

@app.route("/channels/<channel>", methods=["GET"])
def channel(channel):
    if request.method == "GET":
        currentUser = ""
        usedNames = []
        channelMessages = []
        if channel in messages:
            channelMessages = messages[channel]
        if not session.get('currentUser') is None:
            currentUser = session["currentUser"]
        if not session.get('usedNames') is None:    
            usedNames = session["usedNames"]
        return render_template("index.html", channels = channels,messages = channelMessages, currentUser = currentUser, usedNames = usedNames, currentChannel = channel)

@app.errorhandler(404)
def not_found(e):
    """Page not found."""
    return make_response(render_template("404.html"), 404)

@app.errorhandler(400)
def bad_request(e):
    """Bad request."""
    return make_response(render_template("400.html"), 400)


@app.errorhandler(500)
def server_error(e):
    """Internal server error."""
    return make_response(render_template("500.html"), 500)

@app.route("/upload", methods=["POST"])
def upload():
    if request.method == "POST":
        pass


@socketio.on('message')
def message(data):
    response = json.loads(data)
    #print(f"response is: {response}")
    myText = response["myText"]
    sendUser = response["sendUser"]
    timeStamp = response["timeStamp"]
    room = response["room"]
    channelMessages = []
    if room in messages:
        channelMessages = messages[room]
    channelMessage = {"myText": myText, "sendUser": sendUser, "timeStamp": timeStamp}
    channelMessages.append(channelMessage)
    if len(channelMessages) > 100:
        channelMessages.pop(0)
    messages[room] = channelMessages
    send({"myText": myText, "sendUser": sendUser, "timeStamp": timeStamp}, room=room)

@socketio.on('user joined')
def joined(data):
    session['currentUser'] = data["newJoin"]
    newJoin = data["newJoin"]
    oldName = data["oldName"]
    room = data["room"]
    emit('broadcast join', {"newJoin": newJoin, "oldName": oldName, "room": room}, broadcast=True)

# When a user leaves the channel
@socketio.on('join')
def on_join(data):
    username = data['userName']
    room = data['room']
    join_room(room)
    send(username + f' has entered the {room} channel.', room=room)

@socketio.on('leave')
def on_leave(data):
    username = data['userName']
    room = data['room']
    leave_room(room)
    send(username + f' has left the {room} channel.', room=room)

@socketio.on('send-image')
def send_image(data):
    response = json.loads(data)
    imageSrc = response["imageSrc"]
    sendUser = response["sendUser"]
    timeStamp = response["timeStamp"]
    room = response["room"]
    channelMessages = []
    if room in messages:
        channelMessages = messages[room]
    channelMessage = {"imageSrc": imageSrc, "sendUser": sendUser, "timeStamp": timeStamp}
    channelMessages.append(channelMessage)
    if len(channelMessages) > 100:
        channelMessages.pop(0)
    messages[room] = channelMessages
    send({"imageSrc": imageSrc, "sendUser": sendUser, "timeStamp": timeStamp}, room=room)