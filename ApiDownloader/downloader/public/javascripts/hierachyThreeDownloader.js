
var especies2000url = "http://webservice.catalogueoflife.org/col/webservice?";
var especies2000urlRaw = "http://www.catalogueoflife.org/annual-checklist/";
var queryFlags = "format=json&response=full&"
//TODO
//reapara xml antes del 2015
//reparar on error en http request
var MAX_JOBS = 100;

class TaxonomyTree {
	
	constructor() {
		this.cache = {};
		this.pendingJobs = 0;
		this.completeJobs = 0;
		this.readyCallback = undefined;
		this.notify = undefined;
		this.pendingNames = [];
		this.pendingApiCalls =[];
		this.year = "";
		this.working = false;
		
		// deben tener el siguiente formato:
		//{name:"name", start:start}
		console.log("creating three");
		let actualTree = this;

		window.setInterval(function(){
				actualTree.resolveRequests(actualTree);
		},
		 100);
	}
	  
	createTreeQuery(TaxonName){
		return this.cache[TaxonName];
	  
	}

	resolveRequests(actualTree){
		//console.log("verifing pending queries" + this.pendingJobs);
		while( actualTree.pendingJobs < MAX_JOBS && actualTree.pendingApiCalls.length > 0 ){
			let nextCall = actualTree.pendingApiCalls.pop();
			//console.log(nextCall.name);
			actualTree.apiCallByName(nextCall.name, nextCall.start);
		}
		
		//we finished downloading the three, is time to build
		if(this.pendingJobs <= 0 && this.pendingApiCalls.length <= 0 ){
			this.buildTree();
		}
	}

	
	buildTree(){
		console.log("building tree");
		//console.log(this.pendingNames);
		for(let taxonIndex = 0; taxonIndex < this.pendingNames.length;taxonIndex++){
			//console.log(this.cache[this.pendingNames[taxonIndex]]);
			let children = this.cache[this.pendingNames[taxonIndex]].children;
			//console.log(children);
			for(let childIndex = 0; childIndex < children.length; childIndex++){
				let childTaxon = children[childIndex];
				//console.log(childTaxon);
				this.cache[this.pendingNames[taxonIndex]].children[childIndex] = this.cache[childTaxon.name];
			}
		}
		this.pendingNames = [];
		//console.log(this.cache);
		if(this.readyCallback !== undefined && typeof this.readyCallback === "function" && this.working){
			this.working = false;
			this.readyCallback();
		}
		
	}
	
	onApiCallError(){
		
	}
	
	setOnReadyStatusCallback(callback){
		this.readyCallback = callback;
	}
	setNotify(notifyFunction){
		this.notify = notifyFunction;
	}
	setYear(newYear){
		this.year = newYear;
	}
	//solicita al api utilizando nombre
	apiCallByName(TaxonName,start){
		this.working = true;
		//register and api call awaiting response
		this.pendingJobs++;
		
		let xhttpName;
		//console.log("api call by id: " + TaxonName);
		if(this.year.length > 3){
			xhttpName = createCORSRequest("GET",especies2000urlRaw + this.year+"/webservice?"+queryFlags+"name="+TaxonName+"&start="+start);
			//console.log(especies2000urlRaw + this.year+"/webservice?"+queryFlags+"name="+TaxonName+"&start="+start);
		}else{
		//create httprequest
			xhttpName = createCORSRequest("GET",especies2000url+queryFlags+"name="+TaxonName+"&start="+start);
		}
		let myself = this;
		xhttpName.onreadystatechange = function (xhr) {
             myself.handleResult(xhttpName);
         };
         if(this.notify !== undefined){
			this.notify(TaxonName + " & " + this.pendingJobs+ " more...  Completed:" + this.completeJobs);
			//console.log(TaxonName + " " + this.pendingJobs+ " more...  Completed:" + this.completeJobs);
        }
		xhttpName.send();
	}
	//solicita al api utilizando id
	/*apiCallById(TaxonId){
		let xhttpId = createCORSRequest("GET",especies2000url+queryFlags+"id="+TaxonId);
		//console.log("api call by name: " + TaxonName);
		
		//create httprequest
		let xhttpId = createCORSRequest("GET",especies2000url+queryFlags+"name="+TaxonName+"&start="+start);
		
		let myself = this;
		xhttpId.onreadystatechange = function (xhr) {
             myself.handleResult(xhttpId);
         };
        
		xhttpId.send();
	}*/
  //se encarga de recibir un result de el api especies2000
  //recibe al arbol como parametro
	handleResult(xhr){
		if (xhr.readyState == 4 && xhr.status == 200) {
			//register api call back complete
			this.pendingJobs--;
			this.completeJobs++;
			
			let responseText = xhr.responseText;
			let parsedResult;
			if(this.year != undefined && parseInt(this.year) < 2015){
				parsedResult = StringToXML(responseText);
				parsedResult = xmlToJson(parsedResult);
			}else{
				parsedResult = JSON.parse(responseText);
			}
			//console.log(parsedResult);
			//si no se cargo la busqueda completa
			if(parsedResult.start + parsedResult.number_of_results_returned < parsedResult.total_number_of_results){
				let pendingApiCall = {};
						pendingApiCall["name"] = parsedResult.name;
						pendingApiCall["start"] = parsedResult.start+parsedResult.number_of_results_returned;
						this.pendingApiCalls.unshift(pendingApiCall);
				//this.apiCallByName(parsedResult.name,parsedResult.start+parsedResult.number_of_results_returned);
			}
			
			
			
			//converts results to desired format
			let results = this.processResult(parsedResult);
			//console.log(results);
			//sets a query for childTaxa whose info is not complete
			for(let resultIndex = 0; resultIndex < results.length; resultIndex++){
				let childrenTaxa = results[resultIndex].children;
				//if child has not been loaded
				for(let childIndex = 0; childIndex < childrenTaxa.length;childIndex++){
					let actualChildTaxon =  childrenTaxa[childIndex];
					if(!this.cache.hasOwnProperty(actualChildTaxon.name)){
						//this.apiCallByName(actualChildTaxon.name,0);
						let pendingApiCall = {};
						pendingApiCall["name"] = actualChildTaxon.name;
						pendingApiCall["start"] = 0;
						this.pendingApiCalls.unshift(pendingApiCall);
						//console.log(actualChildTaxon);
					}
				}
			}
			//console.log("loaded result pending jobs: " + this.pendingJobs);
			
			

		}else if(xhr.readyState == 4 && xhr.status == 500){
			this.pendingJobs--;
			console.log("Error on api side, failed tp retrieve query :(")
		}

	}
	
	//loads every result
	processResult(responseJson){
		let taxons = responseJson.results;

		let results = [];
		if(taxons === undefined){
			return results;
		}
		for (let taxonIndex = 0; taxonIndex < taxons.length; taxonIndex++) {
			let procesedTaxon = taxons[taxonIndex];
			
			//verifies if taxon has been loaded
			//ignores loaded taxons
			if(!this.cache.hasOwnProperty(procesedTaxon.name)){
				let result = this.extractData(procesedTaxon);
				this.cache[result.name] = result;
				results.push(result);
				
				//add to the list of name pending to be added on the three
				this.pendingNames.push(result.name);
			}
			
			
		}
		return results;
	}
	
	//catalogue of life format
	extractData(originalJson){
		let newTaxon = {};
		
		//load from original
		let originalChildren = originalJson.child_taxa;
		let newChildTaxons = [];
		//load every children in the json
		if(originalChildren !== undefined){
		for(let childIndex = 0; childIndex < originalChildren.length ;childIndex++ ){
			newChildTaxons.push({name: originalChildren[childIndex].name});
		}
		}		
		newTaxon.name = originalJson.name;
		newTaxon.author = originalJson.author;
		let scrutinyDate = originalJson.record_scrutiny_date;
		if(scrutinyDate !== undefined){
			newTaxon.record_scrutiny_date = scrutinyDate.scrutiny;
		}else{
			newTaxon.record_scrutiny_date = undefined;
		}

		newTaxon.Synonym = originalJson.synonyms;
		newTaxon.children = newChildTaxons;
		newTaxon.author = originalJson.author;
		newTaxon.rank = originalJson.rank;
		//console.log(newTaxon);
		
		
		return newTaxon;
	}
}

//usage example
/*var tree = new TaxonomyTree();
tree.setOnReadyStatusCallback(
	function(){
		let treeResult = tree.createTreeQuery("Apus");
		console.log(treeResult);
		
	}
);
tree.apiCallByName("apus");
*/





// Create the XHR object.
function createCORSRequest(method, url) {
  var xhr = new XMLHttpRequest();
  if ("withCredentials" in xhr) {
    // XHR for Chrome/Firefox/Opera/Safari.
    xhr.open(method, url, true);
  } else if (typeof XDomainRequest != "undefined") {
    // XDomainRequest for IE.
    xhr = new XDomainRequest();
    xhr.open(method, url);
  } else {
    // CORS not supported.
    xhr = null;
  }
  return xhr;
}


//from https://davidwalsh.name/convert-xml-json
// Changes XML to JSON
function xmlToJson(xml) {
	
	// Create the return object
	var obj = {};

	if (xml.nodeType == 1) { // element
		// do attributes
		if (xml.attributes.length > 0) {
		obj["@attributes"] = {};
			for (var j = 0; j < xml.attributes.length; j++) {
				var attribute = xml.attributes.item(j);
				obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
			}
		}
	} else if (xml.nodeType == 3) { // text
		obj = xml.nodeValue;
	}

	// do children
	if (xml.hasChildNodes()) {
		for(var i = 0; i < xml.childNodes.length; i++) {
			var item = xml.childNodes.item(i);
			var nodeName = item.nodeName;
			if (typeof(obj[nodeName]) == "undefined") {
				obj[nodeName] = xmlToJson(item);
			} else {
				if (typeof(obj[nodeName].push) == "undefined") {
					var old = obj[nodeName];
					obj[nodeName] = [];
					obj[nodeName].push(old);
				}
				obj[nodeName].push(xmlToJson(item));
			}
		}
	}
	return obj;
};


//from https://www.dotnettricks.com/learn/javascript/convert-string-to-xml-and-xml-to-string-using-javascript
function StringToXML(oString) {
 //code for IE
 if (window.ActiveXObject) { 
 var oXML = new ActiveXObject("Microsoft.XMLDOM"); oXML.loadXML(oString);
 return oXML;
 }
 // code for Chrome, Safari, Firefox, Opera, etc. 
 else {
 return (new DOMParser()).parseFromString(oString, "text/xml");
 }
}