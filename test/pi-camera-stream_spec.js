var helper = require("node-red-node-test-helper");
var piCameraNode = require("../pi-camera-stream.js");

describe('pi-camera-stream Node', function () {

  afterEach(function () {
    helper.unload();
  });

  it('should be loaded', function (done) {
    var flow = [{ id: "n1", type: "pi-camera-stream", name: "test name" }];
    helper.load(piCameraNode, flow, function () {
      var n1 = helper.getNode("n1");
      n1.should.have.property('name', 'test name');
      done();
    });
  });

  it('should make payload pi camera stream', function (done) {
    var flow = [{ id: "n1", type: "pi-camera-stream", name: "test name", wires:[["n2"]] },
    { id: "n2", type: "helper" }];
    helper.load(piCameraNode, flow, function () {
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");
      n2.on("input", function (msg) {
        console.log(msg);
        done();
      });
      n1.receive({ payload: 1000 });
    });
  });
});