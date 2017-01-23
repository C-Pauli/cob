/*----------------------------------
    Selection Table Constructors
-----------------------------------*/
// Build a Fresh Network Table
function buildNetworkTable(){
  destroyTable('Network',false);
  $('#NetworkTable').DataTable({
      "ajax": ($SCRIPT_ROOT + 'available_networks'),
      "columns": [
        {data:'name', name:'name', title:'Network'},
        {data:'refgen', name:'refgen', title:'RefGen'},
        {data:'desc', name:'desc', title:'Description'}
      ],
      "dom": '<"NetworkTitle">ft',
      "order": [[0,'asc']],
      "paginate": false,
      "scrollCollapse": true,
      "scrollY": '10vh',
      "select": true,
      "searching": true,
    });
  $("div.NetworkTitle").html('Network');
  $('#NetworkTable tbody').on('click','tr', networkListner);
  return;
}

// Build a Fresh Ontology Table
function buildOntologyTable(network){
  destroyTable('Ontology',false);
  $('#OntologyTable').DataTable({
      "ajax": ($SCRIPT_ROOT + 'available_ontologies/' + network),
      "columns": [
        {data:'name', name:'name', title:'Ontology'},
        {data:'refgen', name:'refgen', title:'RefGen'},
        {data:'desc', name:'desc', title:'Description'}
      ],
      "dom": '<"OntologyTitle">ft',
      "initComplete": function(settings, json){
        if(json.data.length < 1){
          $('#GeneSelectTabs a[href="#TermGenesTab"]').tab('show');
        }
      },
      "language":{
        "emptyTable":"No ontologies available for this network. Please enter query genes in the \"Custom Gene List\" Tab."},
        "order": [[0,'asc']],
        "paginate": false,
        "scrollCollapse": true,
        "scrollY": '10vh',
        "select": true,
        "searching": true,
    });
  $("div.OntologyTitle").html('Ontology');
  $('#OntologyTable tbody').on('click','tr', ontologyListener);
  return;
}

// Build a Fresh Term Table
function buildTermTable(network,ontology){
  destroyTable('Term',false);
  $('#TermTable').DataTable({
      "ajax": ($SCRIPT_ROOT+'available_terms/'+network+'/'+ontology),
      "columns": [
        {data:'name', name:'name', title:'Name'},
        {data:'desc', name:'desc', title:'Desc'},
        {data:'snps', name:'snps', title:'SNPs'},
        {data:'genes', name:'genes', title:'Genes'}
      ],
      "dom": '<"TermTitle">frtip',
      "initComplete": function(settings, json){
        if(json.data.length < 1){
          $('#GeneSelectTabs a[href="#TermGenesTab"]').tab('show');
        }
      },
      "language":{
        "emptyTable":"No terms available for this ontology. Please enter query genes in the \"Custom Gene List\" Tab."},
      "order": [[0,'asc']],
      "paginate": false,
      "scrollCollapse": true,
      "scrollY": '23vh',
      "select": true,
      "searching": true,
    });
  $("div.TermTitle").html('Terms');
  $('#TermTable tbody').on('click','tr',termListener);
  return;
}

function resetOntology(){
  if($.fn.DataTable.isDataTable('#OntologyTable')){
    $('#OntologyTable').DataTable().rows().deselect();
  }
  destroyTable('Term',true);
}

/*--------------------------------
      Gene Table Constructors
---------------------------------*/
function buildGeneTables(){
  // Enumerated column information!
  var cols = [
    {data: 'render', name:'rendered', title:'Vis'},
    {data: 'id', name:'id', title:'ID'},
    {data: 'alias', name:'alias', title:'Alias'},
    {data: 'fdr', name:'fdr', title:'FDR'},
    {data: 'cur_ldegree', name:'cur_ldegree', title:'Current Degree'},
    {data: 'ldegree', name:'ldegree', title:'Term Degree'},
    {data: 'gdegree', name:'gdegree', title:'Global Degree'},
    {data: 'chrom', name:'chrom', title:'Chrom'},
    {data: 'snp', name:'snp', title:'SNP'},
    {data: 'start', name:'start', title:'Start'},
    {data: 'end', name:'end', title:'End'},
    {data: 'numIntervening', name:'numIntervening', title:'Num Intervening'},
    {data: 'rankIntervening', name:'rankIntervening', title:'Rank Intervening'},
    {data: 'numSiblings', name:'numSiblings', title:'Num Siblings'},
    {data: 'windowSize', name:'windowSize', title:'Window Size', visible: false},
    {data: 'flankLimit', name:'flankLimit', title:'Flank Limit', visible: false},
    {data: 'annotations', name:'annotations', title:'Annotations'},
    //{data: 'parentNumIterations', name:'parentNumIterations', title: 'Num Parent Interactions'},
    //{data: 'parentAvgEffectSize', name:'parentAvgEffectSize', title: 'Avg Parent Effect Size'},
  ];
  
  // Destroy the old tables if present
  destroyTable('Gene',false);
  destroyTable('Subnet',false);
  
  // Get gene data
  var geneData = [];
  Object.keys(geneDict).forEach(function(cur,idx,arr){geneData.push(geneDict[cur]['data']);});
  
  /*--------------------------------
       Setup The Gene Table
  ---------------------------------*/
  var gene_table = $('#GeneTable').DataTable({
      "data": geneData,
      "deferRender": false,
      "dom": '<"GeneTitle">frtpB',
      "order": [[0,'dec'],[3,'asc'],[4,'dec']],
      "paging": true,
      "paginate": true,
      "rowId": 'id',
      "scrollCollapse": true,
      "scroller": {displayBuffer: 1500},
      "scrollY": $(window).height() - $('#cobHead').height() - $('#navTabs').height() - 100,
      "searching": true,
      "select": {"style": 'multi+shift'},
      "buttons": [
        {extend:'csv', filename:'genenetwork', titleAttr:'Export all genes in this table to a CSV file'},
        {text:'Graph Subnet', action:makeSubnet, titleAttr:'Build a new graph that includes only the currently selected genes and their neighbors, but you will be able to return to the current graph from the new graph'},
        {text:'GO', action:gont, enabled:hasGO, titleAttr:'Run a GO term enrichment analysis on the genes in this table'},
        {text:'GWS', action:gws, 
          available: function(dt,config){return hasGWS;},
          titleAttr:'Run a GeneWordSearch enrichment analysis on the genes in this table'
        },
      ],
      "columns": cols,
    });
  
    // Make certain columns invisible if there will be no useful data
  gene_table.columns(['snp:name', 'fdr:name', 'numIntervening:name', 'rankIntervening:name', 'numSiblings:name']).visible(isTerm);
  
  // Set the inline titles on the tables
  $("div.GeneTitle").html('Gene Data <span id="GeneTableInfo" title="This table contains information for all of the genes matched by your query. The ones that are rendered in the graph are denoted by an \'X\' in the first column. The remaining are genes that matched the query, but were discluded due to the parameters set in the options tab. They can be added to the graph by simply clicking them. To see just the genes that are selected and their neighbors, go to the \'Subnetwork\' tab." class="table-glyph glyphicon glyphicon-info-sign"></span>');
  
  /*--------------------------------
       Setup The Subnet Table
  ---------------------------------*/
  // Set up the subnetwork gene table
  var sub_table = $('#SubnetTable').DataTable({
      "data": [],
      "dom": '<"SubnetTitle">frtpB',
      "order": [[0,'dec'],[3,'asc'],[4,'dec']],
      "paging": false,
      "paginate": false,
      "rowId": 'id',
      "scrollCollapse": true,
      "scrollX": "100%",
      "scrollY": $(window).height() - $('#cobHead').height() - $('#navTabs').height() - 100,
      "searching": true,
      "select": {"style": 'multi+shift'},
      "buttons": [
        {extend:'csv', filename:'genenetwork', titleAttr:'Export all genes in this table to a CSV file'},
        {text:'Graph Subnet', action:makeSubnet, titleAttr:'Build a new graph that includes only the currently selected genes and their neighbors, but you will be able to return to the current graph from the new graph'},
        {text:'GO', action:gont, enabled:hasGO, titleAttr:'Run a GO term enrichment analysis on the genes in this table'},
        {text:'GWS', action:gws, 
          available: function(dt,config){return hasGWS;},
          titleAttr:'Run a GeneWordSearch enrichment analysis on the genes in this table'
        },
      ],
      "columns": cols,
    });
  
  // Set the inline titles on the tables
  $("div.SubnetTitle").html('Subnet Data <span id="SubnetTableInfo" title="This table contains information  for all of the selected genes and their first neighbors. This is the same data that is contained in the main gene table, forpurposes of making navigating an interesting subnetwork easier." class="table-glyph glyphicon glyphicon-info-sign"></span>');
  
  // Make certain columns invisible if there will be no useful data
  sub_table.columns(['rendered:name']).visible(false);
  sub_table.columns(['snp:name', 'fdr:name', 'numIntervening:name', 'rankIntervening:name', 'numSiblings:name']).visible(isTerm);
  
  /*----------------------------------
       Setup The Table Listeners
  -----------------------------------*/
  // Set the info in the titles
  infoTips('#GeneTableInfo, #SubnetTableInfo');
  
  // Set up qtips on table buttons
  infoTips(gene_table.buttons(0,null).nodes(),'bottom center','top center');
  infoTips(sub_table.buttons(0,null).nodes(),'bottom center','top center');
  
  // Set listener for pop effect of subnetwork table
  $('#SubnetTable tbody').on('mouseover','tr', function(evt){
    if(this['id'].length > 0){
      window.clearTimeout(popTimerID);
      popTimerID = window.setTimeout(function(id){
          cy.getElementById(id).flashClass('pop',750);
      }, 10, this['id']);
    }
  });
  
  // Handling a click on the two tables
  $('#GeneTable tbody').on('click','tr', function(evt){
    // If we are in the process of adding a gene, kill this request
    if(noAdd){
      $('#GeneTable').DataTable().row('#'+this['id']).deselect();
      window.alert('We\'re currently processing a previous add gene request, if you would like to add more than one at a time, please use the shift select method.');
      return;
    }
    
    // Otherwise update all the things
    if((evt.ctrlKey || evt.metaKey) && !(evt.shiftKey)){
      if($(evt.currentTarget).hasClass('selected')){
        $('#GeneTable').DataTable().row('#'+this['id']).deselect();}
      else{
        $('#GeneTable').DataTable().row('#'+this['id']).select();}
      window.open('http://www.maizegdb.org/gene_center/gene/'+this['id']);
    }
    else{geneSelect();}
  });
  $('#SubnetTable tbody').on('click','tr', function(evt){
    // If we are in the process of adding a gene, kill this request
    if(noAdd){
      $('#SubnetTable').DataTable().row('#'+this['id']).deselect();
      window.alert('We\'re currently processing a previous add gene request, if you would like to add more than one at a time, please use the shift select method.');
      return;
    }
    
    // Otherwise update all the things
    if((evt.ctrlKey || evt.metaKey) && !(evt.shiftKey)){
      if($(evt.currentTarget).hasClass('selected')){
        $('#SubnetTable').DataTable().row('#'+this['id']).deselect();}
      else{
        $('#SubnetTable').DataTable().row('#'+this['id']).select();}
      window.open('http://www.maizegdb.org/gene_center/gene/'+this['id']);
    }
    else{
      $('#GeneTable').DataTable().rows().deselect();
      $('#GeneTable').DataTable().rows($('#SubnetTable').DataTable().rows('.selected').ids(true)).select();
      geneSelect();
    }
  });
}

/*---------------------------------------
           Table Cleanup
---------------------------------------*/
function destroyTable(table,hide){
  // Deconstruct the table if they exist
  var tableID = '#'+table+'Table'
  if($.fn.DataTable.isDataTable(tableID)){
    $(tableID).DataTable().destroy();
    $(tableID).off().empty();
  }
  
  // Show the wait messages
  if(table === 'Ontology'){tableID = '#GeneSelect';}
  var waitID = tableID + 'Wait';
  
  $(tableID).toggleClass('hidden',hide);
  $(waitID).toggleClass('hidden',!(hide));
}

/*---------------------------------------
      Run Enrichment Functions
---------------------------------------*/
function gws(e,dt,node,config){
  // Build the gene query list
  var geneList = dt.rows().ids();
  enrich(geneList,false);
}

function gont(e,dt,node,cofig){
  // Build the gene query list
  var geneList = dt.rows().ids();
  enrich(geneList,true);
}

/*-------------------------------
      Subnet Table Updater
-------------------------------*/
function updateSubnetTable(newGenes, newGenesSel){
  // Get the table api ref
  var tbl = $('#SubnetTable').DataTable();
  
  // Find the genes we must add and remove
  var oldGenes = new Set();
  tbl.rows().ids().each(function(cur){oldGenes.add(cur)});
  var toAdd = [...newGenes].filter(cur => !oldGenes.has(cur));
  var toSub = [...oldGenes].filter(cur => !newGenes.has(cur));
  
  // Get the data in the proper formats for adding and removing
  toAdd.forEach(function(cur,idx,arr){arr[idx] = geneDict[cur]['data'];});
  toSub.forEach(function(cur,idx,arr){arr[idx] = '#'+cur;});
  
  // Clear old data and add new
  if(toSub.length > 0){tbl.rows(toSub).remove();}
  tbl.rows.add(toAdd).draw();
  
  // Update the selections
  tbl.rows('.selected').deselect();
  tbl.rows(newGenesSel).select();
}

/*--------------------------------
  Listeners for Selection Tables 
---------------------------------*/
function networkListner(){
  // Save the selected row
  curNetwork = $('td', this).eq(0).text();
  
  // Clear obsolete graph
  clearResults();
  
  // Clean up tables
  curOntology = '';
  curTerm = '';
  destroyTable('Term',true);

  // Fetch and build the next table
  buildOntologyTable(curNetwork);
  
  // Set up the text completion engine for the gene list
  setupTextComplete(curNetwork, '#geneList');
}

function ontologyListener(){
  if($('#OntologyTable').DataTable().rows().count() < 1){return;}
  
  // Highlight the relevant row
  curOntology = $('td',this).eq(0).text();
  
  // Clear obsolete graph
  clearResults();

  // Prep the Term Table
  curTerm = '';
  
  // Fetch and build the network table
  buildTermTable(curNetwork,curOntology);
}

function termListener(){
    // Highlight the last line
    curTerm = $('td',this).eq(0).text();

    // Get the new Graph
    loadGraph(true,true,true);
}