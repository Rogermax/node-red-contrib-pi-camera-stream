const { StreamCamera, Codec } = require("pi-camera-connect");
const fs = require("fs");

const PATH_TEST_VIDEO = "resources/video-stream.h264.in"
const PATH_VIDEO_STREAM = "resources/video-stream.h264"
let PATH_VIDEO_HTTP = `http://localhost:1880/resources/node-red-contrib-pi-camera-stream/video-stream.h264`

module.exports = function(RED) {
    function PiCameraStream(config) {
        RED.nodes.createNode(this, config);
        this.log('node: ' + JSON.stringify(this));
        this.log('config: ' + JSON.stringify(config));
        PATH_VIDEO_HTTP = `http://${config.host}/resources/node-red-contrib-pi-camera-stream/video-stream.h264`
        var node = this;
        try {
            node.on('input', function(msg, send, done) {
                manageNodeInput(msg, send, done, node)
            });
            node.on('error', function(err) {
                errFunc(err, send, done, node)
            }) 
        } catch (e) {
            errFunc(e, null, null, node)
        }
    }
    RED.nodes.registerType("pi-camera-stream",PiCameraStream);
}

function manageNodeInput(msg, send, done, node) {
    node.status({fill:"grey", shape:"dot", text:"waiting input..."});
    try {
        const writeStream = fs.createWriteStream(PATH_VIDEO_STREAM);
        writeStream.on('error', function(err) {
            errFunc(err, send, done, node)
            writeStream.end();
        });
        if (process.env.NODE_ENV === 'test') {
            emulateVideoStream(writeStream, msg, send, done, node)
        } else {
            captureCameraStream(writeStream, msg, send, done, node)
        }
    } catch (e) {
        errFunc(e, send, done, node)
    }
}

function emulateVideoStream(writeStream, msg, send, done, node) {
    const timeInMilisenconds = msg.payload;
    const stream = fs.createReadStream(PATH_TEST_VIDEO);
    stream.on('error', function (err) {
        errFunc(err, send, done, node)
    });
    stream.pipe(writeStream);
    stream.on('open', function () {
        try {
            node.status({fill:"blue", shape:"dot", text:"recording..."});
            msg.payload = PATH_VIDEO_HTTP + '?time=' + new Date().getTime(); 
            node.send(msg);
            setTimeout(() => {
                stream.destroy();
                node.status({});
            }, timeInMilisenconds);
        } catch (err) {
            errFunc(err, send, done, node)
        }
    });
}

function captureCameraStream(writeStream, msg, send, done, node) {
    const streamCamera = new StreamCamera({
        codec: Codec.H264
    });
    streamCamera.on('error', function(err) {
        errFunc(err, send, done, node)
    });
    const timeInMilisenconds = msg.payload;
    const stream = streamCamera.createStream();
    stream.on('error', function(err) {
        errFunc(err, send, done, node)
    });
    stream.pipe(writeStream);
    streamCamera.startCapture()
        .then(() => {
            try {
                node.status({fill:"blue", shape:"dot", text:"recording..."});
                msg.payload = PATH_VIDEO_HTTP + '?time=' + new Date().getTime(); 
                node.send(msg);
                setTimeout(() => {
                    streamCamera.stopCapture();
                    node.status({});
                }, timeInMilisenconds);
            } catch (e) {
                errFunc(e, send, done, node)
            }
        })
        .catch((err) => errFunc(err, send, done, node));
}

const errFunc = (err, send, done, node) => {
    const errMsg = "Error: " + err.message;
    node.status({fill:"red", shape:"dot", text: errMsg});
    if (err) {
        if (done) {
            // Node-RED 1.0 compatible
            done(errMsg);
        } else {
            // Node-RED 0.x compatible
            node.error(errMsg, msg);
        }
    }
}