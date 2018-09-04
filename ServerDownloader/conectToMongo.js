var MongoClient = require('mongodb').MongoClient,format=require('util').format;

var url = 'mongodb://localhost:27017';

var fs = require('fs');

function readFiles(dirname) {
  fs.readdir(dirname, function(err, filenames) {
    if (err) {
      console.log(err);
      //onError(err);
      return;
    }
    console.log(filenames);
    onFileNames(filenames,dirname);

  });
  
}

function onFileNames(filenames,dirname){
	filenames.forEach(function(filename) {
      fs.readFile(dirname + filename, 'utf-8', function(err, content) {
        if (err) {
          console.log(err);
          //onError(err);
          return;
        }
        onFileContent(filename, content);
      });
    });
}

function onFileContent(filename,content){
	console.log(content);
	newTaxonomie = JSON.parse(content); 
	MongoClient.connect(url, function(err, db) {
	  if (err) throw err;
	  var dbo = db.db("downloaderTax");

	  //var myobj = { name: "Company Inc", address: "Highway 37" };

	  dbo.collection("taxonomies").insertOne(newTaxonomie, function(err, res) {
	    if (err) throw err;
	    console.log("1 document inserted");
	    db.close();
	  });
	});

}

readFiles('C:\\Users\\Andre\\Documents\\TEC\\Beca\\Taxonomies\\',function(){},function(){});




