function doIt(){
	document.getElementById('foo').style.display = 'none';
}

var observer = {
  observe: function(aSubject, aTopic, aData) {
    if (aTopic == "addon-options-displayed" && aData == "MY_ADDON@MY_DOMAIN") {
      var doc = aSubject;
      var control = doc.getElementById("myaddon-pref-control");
      control.value = "test";
    }
  }
};

Services.obs.addObserver(observer, "addon-options-displayed", false);
// Don't forget to remove your observer when your add-on is shut down.