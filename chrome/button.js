var CRLF = "\r\n";
var filename = "MAT-"+(new Date().toISOString()).replace(/:|\-|\T|\Z|\./g,"") + ".warc";
var warcConcurrentTo; //single tie-in ID, set on first request

var WARCFile = function(){
	this.warcRecords = [];
	this.contentstowrite = "";
	this.filename = filename;
	this.write = function(){
		var blob = new Blob([this.contentstowrite], {type: "text/plain;charset=utf-8"});
		saveAs(blob, this.filename);
	};
	this.writeWARCRecords = function(){
		var wStr = "";
		
		var warcInfo = new WARCInfoRecord();
		this.warcRecords.unshift(warcInfo);
		
		for(var r = 0; r<this.warcRecords.length; r++){
			wStr += this.warcRecords[r].warcData + CRLF + CRLF + this.warcRecords[r].content + CRLF + CRLF;
		}
	
		var blob = new Blob([wStr], {type: "text/plain;charset=utf-8"});
		saveAs(blob, this.filename);
	};
};

var WARCRecord = function(data){
	this.content = data;
};
var WARCInfoRecord = function(data){
	this.content = 
		"software: TODO" + CRLF +
		"ip: TODO" + CRLF +
		"hostname: TODO" + CRLF +
		"format: WARC File Format 1.0" + CRLF +
		"conformsTo: http://bibnum.bnf.fr/WARC/WARC_ISO_28500_version1_latestdraft.pdf" + CRLF +
		"isPartOf: basic" + CRLF +
		"description: TODO" + CRLF +
		"robots: ignore" + CRLF +
		"http-header-user-agent: Mozilla/5.0 (compatible; heritrix/3.1.2-SNAPSHOT-20130307.141538 +http://yourdomain.com)";
	;
	this.warcData = 
		"WARC/1.0" + CRLF +
		"WARC-Type: warcinfo" + CRLF +
		"WARC-Date: "+ (new Date()).toISOString() + CRLF +
		"WARC-Filename: " + filename + CRLF +
		"WARC-Record-ID: "+guidGenerator() + CRLF +
		"Content-Type: application/warc-fields" + CRLF +
		"Content-Length: " + this.content.length;
}
var WARCRequestRecord = function(data){
	this.content = data;
	
	//use the first request record as the basis to tie in the other records. 
	if(!warcConcurrentTo){ 
		warcConcurrentTo = guid = guidGenerator()
	}else {
		guid = guidGenerator()
	}
	
	this.warcData = 
		"WARC/1.0" + CRLF +
		"WARC-Type: request" + CRLF +
		"WARC-Target-URI: TODO" + CRLF +
		"WARC-Date: " + (new Date()).toISOString() + CRLF +
		"WARC-Concurrent-To: " + warcConcurrentTo + CRLF +
		"WARC-Record-ID: " + guid + CRLF +
		"Content-Type: application/http; msgtype=request" + CRLF +
		"Content-Length: " + this.content.length;
}
var WARCResponseRecord = function(data){
	this.content = data;
	this.warcData = 
		"WARC/1.0" + CRLF +
		"WARC-Type: response" + CRLF +
		"WARC-Target-URI: TODO" + CRLF +
		"WARC-Date: " + (new Date()).toISOString() + CRLF +
		"WARC-Payload-Digest: sha1:TODO" + CRLF +
		"WARC-IP-Address: TODO" + CRLF +
		"WARC-Record-ID: " + guidGenerator() + CRLF +
		"Content-Type: application/http; msgtype=response" + CRLF +
		"Content-Length: " + this.content.length;
}
//WARCInfoRecord.inherits(WARCRecord);
//WARCRequestRecord.inherits(WARCRecord);
//WARCResponseRecord.inherits(WARCRecord);

var warcreate = {
	"generateWARC": function () {
  		alert("Logging data to console...");	
  		/*console.log("Request Headers");
  		console.log(requestHeaders);
  		console.log("ResponseHeaders");
  		console.log(responseHeaders);
  		console.log("Response data");
  		console.log(responseData);*/
  		
  		//console.log("requestHeaders has "+Object.keys(requestHeaders).length+" keys.");
  		//console.log("responseHeaders has "+Object.keys(responseHeaders).length+" keys.");
  		
  		/*console.log("URI check");
  		var uris_requestHeaders = Object.keys(requestHeaders);
  		var uris_responseHeaders = Object.keys(responseHeaders);
  		var uris_responseData = Object.keys(responseData);
  		for(var uriI=0; uriI<uris0.length;uriI++){
  			console.log(uriI+":");
  			console.log(" "+uris_requestHeaders[uriI]);
  			console.log(" "+uris_responseHeaders1[uriI]);
  			console.log(" "+uris_responseData[uriI]);
  		}
  		*/
  		
  		
  		var str = "";
  		var uris = Object.keys(responseData);
  		var warcRecords = [];
  		for(var uriI=0; uriI<uris.length;uriI++){
  			console.log("Collecting data to write for "+uris[uriI]);
  			str += requestHeaders[uris[uriI]]+"\r\n\r\n";
  			warcRecords.push(new WARCRequestRecord(requestHeaders[uris[uriI]]));
  			str += responseHeaders[uris[uriI]]+"\r\n\r\n";
  			str += responseData[uris[uriI]]+"\r\n\r\n";
  			warcRecords.push(new WARCResponseRecord(responseHeaders[uris[uriI]]+CRLF+CRLF+responseData[uris[uriI]]));
  		}
  		var w = new WARCFile();
  		w.warcRecords = warcRecords;
  		console.log("warc file: ");
  		console.log(w);
  		//w.contentstowrite = str;
  		w.writeWARCRecords();
		
  	}

}

//"Associative arrays" of data collected where the key is the URI
var requestHeaders = [];
var responseHeaders = [];
var responseData = [];

let httpCommunicationObserver = {
  observe : function(aSubject, aTopic, aData) {
  	if(aTopic == "http-on-modify-request"){
		
		aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);
		var str = aSubject.requestMethod+" "+aSubject.URI.path+" HTTP/1.1\r\n";
		aSubject.visitRequestHeaders(
			function(header, value){
  				str += header+": "+value+"\r\n";
			}
		);
		aSubject.setRequestHeader("Cache-Control","no-cache, no-store",false);
		
		if(!requestHeaders[aSubject.URI.spec]){requestHeaders[aSubject.URI.spec] = "";}
		requestHeaders[aSubject.URI.spec] += str;
		console.log(str);
	}else if(aTopic == "http-on-examine-response" || aTopic == "http-on-examine-cached-response"){
		var newListener = new TracingListener();
        aSubject.QueryInterface(Ci.nsITraceableChannel);
        newListener.originalListener = aSubject.setNewListener(newListener);
	
		console.log(aSubject);
		var str = "HTTP/1.1 "+aSubject.responseStatus+" "+aSubject.responseStatusText+" \r\n";
		aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);
		aSubject.visitResponseHeaders(
			function(header, value){
  				str += header+": "+value+"\r\n";
			}
		);
		
		if(!responseHeaders[aSubject.URI.spec]){responseHeaders[aSubject.URI.spec] = "";}
		responseHeaders[aSubject.URI.spec] += str;
		console.log(str);
	}
	
	console.log(aTopic);
  	return;
  }
}


let observerService = Components.classes["@mozilla.org/observer-service;1"].
    getService(Components.interfaces.nsIObserverService);

observerService.addObserver(httpCommunicationObserver, "http-on-modify-request", false);
observerService.addObserver(httpCommunicationObserver,"http-on-examine-response",false);

observerService.addObserver(httpCommunicationObserver,"http-opening-request",false);
observerService.addObserver(httpCommunicationObserver,"http-on-examine-cached-response",false);
observerService.addObserver(httpCommunicationObserver,"http-on-examine-merged-response",false);

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
        if(!responseData[request.URI.spec]){responseData[request.URI.spec] = "";}
        responseData[request.URI.spec]+=data;
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