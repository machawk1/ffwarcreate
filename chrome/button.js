var warcreate = {
	1: function () {
  		alert("Creating WARC!");	
  	}

}
//console.log("test");

let httpCommunicationObserver = {
  observe : function(aSubject, aTopic, aData) {
  	if(aTopic == "http-on-modify-request"){
		
		aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);
		var str = aSubject.requestMethod+" "+aSubject.URI.path+" HTTP/1.1\r\n";
		aSubject.visitRequestHeaders(
			function(header, value){
  				str += header+" "+value+"\r\n";
			}
		);
		aSubject.setRequestHeader("Cache-Control","no-cache, no-store",false);
		console.log(str);
	}else if(aTopic == "http-on-examine-response"){
		var newListener = new TracingListener();
        aSubject.QueryInterface(Ci.nsITraceableChannel);
        newListener.originalListener = aSubject.setNewListener(newListener);
	
		console.log(aSubject);
		var str = "";
		aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);
		aSubject.visitRequestHeaders(
			function(header, value){
  				str += header+" "+value+"\r\n";
			}
		);
		console.log(str);
	}
  	return;
  }
}


let observerService = Components.classes["@mozilla.org/observer-service;1"].
    getService(Components.interfaces.nsIObserverService);

observerService.addObserver(httpCommunicationObserver, "http-on-modify-request", false);
observerService.addObserver(httpCommunicationObserver,"http-on-examine-response",false);

gBrowser.addEventListener(
	"load", //the designated event
	foo, 	//the function to execute
	true	//fire this every time?
);

function foo(event){
	//console.log(event.target.documentElement);
}

function CCIN(cName, ifaceName) {
    return Cc[cName].createInstance(Ci[ifaceName]);
}

function TracingListener() {
    this.originalListener = null;
    this.receivedData = [];   // array for incoming data.
}

TracingListener.prototype =
{
    onDataAvailable: function(request, context, inputStream, offset, count)
    {
        var binaryInputStream = CCIN("@mozilla.org/binaryinputstream;1",
                "nsIBinaryInputStream");
        var storageStream = CCIN("@mozilla.org/storagestream;1", "nsIStorageStream");
        var binaryOutputStream = CCIN("@mozilla.org/binaryoutputstream;1",
                "nsIBinaryOutputStream");
        binaryInputStream.setInputStream(inputStream);
        storageStream.init(8192, count, null);
        binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));
        // Copy received data as they come.
        var data = binaryInputStream.readBytes(count);
        this.receivedData.push(data);
		console.log(data);
        binaryOutputStream.writeBytes(data, count);

        this.originalListener.onDataAvailable(request, context,
            storageStream.newInputStream(0), offset, count);
    },

    onStartRequest: function(request, context) {
        this.originalListener.onStartRequest(request, context);
    },

    onStopRequest: function(request, context, statusCode)
    {
        // Get entire response
        var responseSource = this.receivedData.join();
        this.originalListener.onStopRequest(request, context, statusCode);
    },

    QueryInterface: function (aIID) {
        if (aIID.equals(Ci.nsIStreamListener) ||
            aIID.equals(Ci.nsISupports)) {
            return this;
        }
        throw Components.results.NS_NOINTERFACE;
    }
}