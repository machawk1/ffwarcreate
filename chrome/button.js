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
		
		var warcMetadata = new WARCMetadataRecord();
		this.warcRecords.unshift(warcMetadata);
		
		var warcInfo = new WARCInfoRecord();
		this.warcRecords.unshift(warcInfo);
		
		for(var r = 0; r<this.warcRecords.length; r++){
			wStr += this.warcRecords[r].warcData + CRLF + CRLF + this.warcRecords[r].content + CRLF + CRLF + CRLF;
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
		"software: Firefox WARCreate 20130918" + CRLF +
		//"ip: TODO" + CRLF +
		//"hostname: TODO" + CRLF +
		"format: WARC File Format 1.0" + CRLF +
		"conformsTo: http://bibnum.bnf.fr/WARC/WARC_ISO_28500_version1_latestdraft.pdf" + CRLF +
		"description: A test WARC file generated from the Firefox WARCreate Chrome extension." + CRLF +
		"robots: ignore" + CRLF +
		"http-header-user-agent: Mozilla/5.0 (compatible; FFWARCreate +http://warcreate.com)" + CRLF;
	;
	this.warcData = 
		"WARC/1.0" + CRLF +
		"WARC-Type: warcinfo" + CRLF +
		"WARC-Date: "+ (new Date()).toISOString() + CRLF +
		"WARC-Filename: " + filename + CRLF +
		"WARC-Record-ID: "+guidGenerator() + CRLF +
		"Content-Type: application/warc-fields" + CRLF +
		"Content-Length: " + this.content.length;
};
var WARCMetadataRecord = function(data){
	this.content = 
		"seed:" + CRLF +
		//"fetchTimeMs: TODO" + CRLF +
		//"charsetForLinkExtraction: TODO" +CRLF +
		"usingCharsetInHTML: " + dom.inputEncoding + CRLF;

	//console.log(dom);

	//TODO: include favicon in outlinks
	
	// Grab the relevant arrays from the DOM 
	var anchors = dom.links;
	var stylesheets = dom.styleSheets;
	var images = dom.images;
	
	//Initialize strings of the respective element-types that will be populated with outlink data
	var outlinks_a = "";
	var outlinks_css = "";
	var outlinks_img = "";

	// Build the string representing the outlink data for links in the page
	for(var linkI=0; linkI<anchors.length; linkI++){
		outlinks_a += "outlink: "+anchors[linkI].href+" L a/@href" + CRLF;
	}
	
	// Build the string representing the outlink data for stylesheets in the page
	for(var linkI=0; linkI<stylesheets.length; linkI++){
		outlinks_css += "outlink: "+stylesheets[linkI].href+" E link/@href" + CRLF;
	}

	// Build the string representing the outlink data for images in the page
	for(var linkI=0; linkI<images.length; linkI++){
		outlinks_img += "outlink: "+images[linkI].src+" E img/@src" + CRLF;
	}
	
	// Concatenate the strings built for the respective element types on the page.
	this.content += outlinks_a + outlinks_css + outlinks_img;
	
	
	this.warcData = 
		"WARC/1.0" + CRLF +
		"WARC-Type: metadata" + CRLF +
		//"WARC-Target-URI: TODO" + CRLF +
		"WARC-Date: " + (new Date()).toISOString() + CRLF +
		//"WARC-Payload-Digest: sha1:TODO" + CRLF +
		//"WARC-IP-Address: TODO" + CRLF +
		"WARC-Concurrent-To: " + warcConcurrentTo + CRLF +
		"WARC-Record-ID: " + guidGenerator() + CRLF +
		"Content-Type: application/warc-fields" + CRLF +
		"Content-Length: " + this.content.length;
};
var WARCRequestRecord = function(data){
	this.content = data;
	this.gui = "garbage output, unassigned!";
	this.targetUri = "";
	
	//use the first request record as the basis to tie in the other records. 
	if(!warcConcurrentTo){ 
		warcConcurrentTo = this.guid = guidGenerator()
	}else {
		this.guid = guidGenerator()
	}
	
	//extract the target URI
	var dataLines = data.split("\n");
	var host = ""; var path = ""; var protocol = ""; var protocolComponents = [];
	for(var line=0; line<dataLines.length; line++){
		if(dataLines[line].indexOf("GET") == 0 || dataLines[line].indexOf("POST") == 0){
			var pathComponents = dataLines[line].split(" "); //e.g., result = [GET,/path/to/file.png,HTTP/1.1]
			path = pathComponents[1].trim();
			protocolComponents = pathComponents[2].split("/");
			protocol = protocolComponents[0].toLowerCase() + "://";
		}else if(dataLines[line].indexOf("Host:") == 0){
			var hostComponents = dataLines[line].split(" "); //e.g., result = [GET,/path/to/file.png,HTTP/1.1]
			host = protocol + hostComponents[1].trim();		
		}
		
		if(host != "" && path != ""){break;} //short-circuit
	}
	this.targetUri = host + path;
	// end target URI extraction
	
	this.warcData = 
		"WARC/1.0" + CRLF +
		"WARC-Type: request" + CRLF +
		"WARC-Target-URI: " + this.targetUri + CRLF +
		"WARC-Date: " + (new Date()).toISOString() + CRLF +
		"WARC-Concurrent-To: " + warcConcurrentTo + CRLF +
		"WARC-Record-ID: " + this.guid + CRLF +
		"Content-Type: application/http; msgtype=request" + CRLF +
		"Content-Length: " + this.content.length;
};
var WARCResponseRecord = function(data,targetUri){
	this.content = data;
	var HTTPheaderBreak = this.content.substring(0,this.content.indexOf("\r\n\r\n"));
	var linesInHTTPHeader = HTTPheaderBreak.match(/\n/g).length;
	
	this.warcData = 
		"WARC/1.0" + CRLF +
		"WARC-Type: response" + CRLF +
		"WARC-Target-URI: " + targetUri + CRLF +
		"WARC-Date: " + (new Date()).toISOString() + CRLF +
		//"WARC-Payload-Digest: sha1:TODO" + CRLF +
		//"WARC-IP-Address: TODO" + CRLF +
		"WARC-Record-ID: " + guidGenerator() + CRLF +
		"Content-Type: application/http; msgtype=response" + CRLF +
		"Content-Length: " + this.content.length +" " + (this.content.length + linesInHTTPHeader);//(parseInt(this.content.length,10) + parseInt(this.content.split("\n").length,10) + 3);
	//this.warcData += "Will adding " + this.content.split("\n").length + " fix this?";  
};



//WARCInfoRecord.inherits(WARCRecord);
//WARCRequestRecord.inherits(WARCRecord);
//WARCResponseRecord.inherits(WARCRecord);

var addOnEnabled = false;

var warcreate = {
	"generateWARC": function () {
		
		if(!addOnEnabled){alert("First navigate to a web page before trying to create a WARC.");return;}
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
  			str += requestHeaders[uris[uriI]] + CRLF + CRLF;
  			warcRecords.push(new WARCRequestRecord(requestHeaders[uris[uriI]]));
  			str += responseHeaders[uris[uriI]] + CRLF + CRLF;
  			str += responseData[uris[uriI]] + CRLF + CRLF + CRLF;
  			var targetUri = warcRecords.slice(-1)[0].targetUri; //get targetURI as determined in the request record
  			warcRecords.push(new WARCResponseRecord(responseHeaders[uris[uriI]]+CRLF+CRLF+responseData[uris[uriI]]+CRLF, targetUri));
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
  		enableAddOn();
		aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);
		
		//if(!WARC_Target_URI){WARC_Target_URI = aSubject.URI.spec;} //set once per WARC file generation
		
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

/* Save the DOM on page load */
gBrowser.addEventListener(
	"load", 	//the designated event
	saveDOM, 	//the function to execute
	true		//fire this every time?
);
var dom;

function saveDOM(event){
	dom = event.target;
}

function enableAddOn(){
	$('#custom-button-1').removeClass("disabled");
	addOnEnabled = true;
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