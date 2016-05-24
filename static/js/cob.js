/*--------------------------------
         Event Listeners
---------------------------------*/
$(document).ready(function(){
// A row on the Ontology Table is selected
$('#OntologyTable tbody').on('click','tr', function(){
  // Save the selected row
  CurrentOntology = $('td', this).eq(0).text();
  
  // Clean up the old Term Table
  CurrentTerm = '';
  $('#TermTable').addClass('hidden');
  $('#TermWait').removeClass('hidden');
  $('#TermTable').DataTable().clear();
  
  // Clean up the Network Table
  CurrentNetwork = '';
  $('#NetworkTable').addClass('hidden');
  $('#NetworkTable').DataTable().clear();
  
  // Clean up the graph
  $('#cy').addClass('hidden');
  $('#cyWait').removeClass('hidden');
  if(cy != null){cy.destroy();}
  
  // Fetch and build the new Term Table
  tableMaker('Term');
});

// A row on the Term Table is selected
$('#TermTable tbody').on('click','tr', function(){
  // Highlight the relevant row
  CurrentTerm = $('td',this).eq(0).text();
  
  // Clean up the graph
  $('#cy').addClass('hidden');
  $('#cyWait').removeClass('hidden');
  if(cy != null){cy.destroy();}
  
  // Fetch and build the network table
  tableMaker('Network');
});

// A row on the Network Table is selected
$('#NetworkTable tbody').on('click','tr',function(){
    // Highlight the current line
    CurrentNetwork = $('td',this).eq(0).text();
    
    // Delete the old graph
    if(cy != null){cy.destroy();}

    // Unhide the graph
    $('#cyWait').addClass('hidden');
    $('#cy').removeClass('hidden');
    
    // Get Netwrok Data and build graph
    $.getJSON($SCRIPT_ROOT + 'COB/' + CurrentNetwork + '/' + CurrentOntology + '/' + CurrentTerm).done(function(data){
            console.log('Recieved Data from Server, sending to cytoscape.');
            buildGraph(data);
            //buildGeneTable(data);
        })
        .fail(function(data){
            console.log("Something went wrong with the data.")
        });
    
    // Switch to Gene Data Tab
    $('#navTabs a[href="#genes"]').tab('show');
    
})});

// Update Graph with new params
$('#updateButton').click(function(){
    // Check to see if there is an exitant graph
    if(cy == null){return;}
    else{cy.destroy();}
    
    // Run the algorithm again with the new parameters
    buildGraph(cyDataCache);

    // Switch to Gene Data Tab
    $('#navTabs a[href="#genes"]').tab('show');
    return;
});

/*--------------------------------
         Table Constructor
---------------------------------*/
function tableMaker(section){
// Function to me make the table out of the analysis database
  // Keep the user updated on progress
  $('#'+section+'Wait').addClass("hidden");
  
  // Find the address for each table, this will be deprecated after server improvements
  if(section == 'Ontology'){
    var address = $SCRIPT_ROOT + 'available_datasets/GWAS';}
  else if(section == 'Term'){
    var address = $SCRIPT_ROOT + 'Ontology/Terms/' + CurrentOntology;}
  else if(section == 'Network'){
    var address = $SCRIPT_ROOT + 'available_datasets/Expr';}

  // Make sure the table is visible
  $('#'+section+'Table').removeClass("hidden");
  
  // Clean up the old table
  $('#'+section+'Table').DataTable().destroy();
  
  // Uses DataTables to build a pretty table
  $('#'+section+'Table').DataTable(
      {
      "ajax": address,
      "autoWidth": true, 
      "bPaginate": false,
      "bJQueryUI": false,
      "bScrollCollapse": true,
      "bAutoWidth": true,
      "dom": '<"'+section+'Title">frtip',
      "order": [[0,'asc']],
      "processing" : true,
      "sScrollXInner": '100%',
      "sScrollX": '100%',
      "sScrollY": ($(window).height()/4)-50,
      "select": true,
      "searching": true,
      "stripe": true,
    });
  $("div."+section+"Title").html(section);
  return;
}

/*--------------------------------
         Graph Constructor
---------------------------------*/
function buildGraph(data){
  // Save request data for full graph rebuild
  cyDataCache = data;
  
  // Initialize Cytoscape
  cy = window.cy = cytoscape({
    container: $('#cy'),
    
    // Interaction Options
    boxSelectionEnabled: false,
    autounselectify: false,
    
    // Rendering Options
    hideEdgesOnViewport: false,
    hideLabelsOnViewport: true,
    textureOnViewport: true,
    wheelSensitivity: 0.5,
    
    layout: {
      name: 'polywas',
      minNodeDegree: parseInt(document.forms["graphParams"]["nodeCutoff"].value), 
      minEdgeScore: parseFloat(document.forms["graphParams"]["edgeCutoff"].value),
    },
    style: [
        {
         selector: '[type = "chrom"]',
         css: {
           'z-index': '3',
           'background-color': 'green',
           'content': 'data(id)',
           'color': 'black',
           'text-valign': 'center',
           'text-halign': 'center',
           'text-background-color': 'green',
           'text-background-opacity': '1',
           'text-background-shape': 'roundrectangle',
           'font-size': '10',
         }
       },
       {
        selector: '[type = "snpG"]',
        css: {
          'z-index': '2',
          'shape': 'circle',
          'height': '10',
          'width': '10',
          'background-color': 'orange',
        }
       },
       {
         selector: '[type = "gene"]',
         style: {
           'z-index': '1',
           'background-color': '#62c',
           'shape': 'circle',
           'height': '10',
           'width': '10',
           //'content': 'data(id)',
           //'color': 'black',
           //'text-valign': 'center',
           //'text-halign': 'center',
           //'font-size': '5',
         }
       },
       {
         selector: 'edge',
         css: {
           'curve-style': 'unbundled-bezier',
           'width': '1',
           'opacity': '0.5',
           'line-color': 'grey'
         }
       }
     ],
   elements: {
     nodes: data.nodes,
     edges: data.edges,
  }});
  
  // Format the node data for the DataTable
  var geneData = [];
  cy.nodes().filter('[type = "gene"]').forEach(function(currentValue, index, array){
    geneData.push({
        'ID': currentValue.data('id'),
        'Chrom': currentValue.data('chrom'),
        'Start': currentValue.data('start'),
        'End': currentValue.data('end'),
        'SNP': currentValue.data('snp'),
        'Local Degree': currentValue.data('ldegree'),
        'Global Degree': currentValue.data('gdegree'),
        'Locality': currentValue.data('locality')
      });
  });
  
  // Clean up the old table
  $('#GeneTable').DataTable().destroy();
  
  // Make sure the table is visible
  $('#GeneTable').removeClass("hidden");
  
  // Uses DataTables to build a pretty table
  $('#GeneTable').DataTable(
      {
      "data": geneData,
      "autoWidth": true, 
      "bPaginate": false,
      "bJQueryUI": false,
      "bScrollCollapse": true,
      "bAutoWidth": true,
      "dom": '<"GeneTitle">frtip',
      "order": [[0,'asc']],
      "processing" : true,
      "sScrollXInner": "100%",
      "sScrollX": '100%',
      "sScrollY": $(window).height()-300,
      "select": true,
      "searching": true,
      "stripe": true,
      "columns": [
        {data: 'ID'},
        {data: 'Chrom'},
        {data: 'Start'},
        {data: 'End'},
        {data: 'SNP'},
        {data: 'Local Degree'},
        {data: 'Global Degree'},
        {data: 'Locality'}]
    });
  $("div.GeneTitle").html('Gene Data');
}