var tree = new TaxonomyTree();
tree.setNotify(Notify)
/*tree.setOnReadyStatusCallback(
	function(){
		let treeResult = tree.createTreeQuery("Apus");
		console.log(treeResult);
		
				
	}
);*/



$(function () {
    $("#searchButton").click(function ()
    {
        let name = $('#name').val();
        let year = $('#year').val();
        //alert('button clicked' + name + "---" + year);
        if(year.length > 3){
			//cambiar por ano actual
			//year = 2018;
			tree.setYear(year);
			
		}
        if(name.length > 2){
				tree.apiCallByName(name,0);
				tree.setOnReadyStatusCallback( function(){
				
					let treeResult = tree.createTreeQuery(name,0);
					console.log(treeResult);
					 //$("#resultadoName").html(JSON.stringify(treeResult));
					 //alert("cargado");
					let resultText = JSON.stringify(treeResult);
					let blob = new Blob([resultText], {type: "application/json"});
					let url  = URL.createObjectURL(blob);

					$('#notify').html("Finished downloading " + name +"!!!");

					let a = document.createElement('a');
					a.download    = name+".json";
					a.href        = url;
					a.textContent = "Download backup.json";
					//$("#resultadoName").append(a)
					// no compatible con todos los navegadores
					a.click(); 
			}
			);
        }
        
        
    }
    );
});



function Notify(text){
		 $('#notify').html("Downloading: " + text);
	}
