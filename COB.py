#!/usr/bin/python3
import logging
import camoco as co
import sys
import json
import numpy as np

from math import isinf
from itertools import chain

# Take a huge swig from the flask 
from flask import Flask, url_for, jsonify, request, send_from_directory, render_template
app = Flask(__name__)

# Generate in-memory Network and RefGen Object
networks = {x:co.COB(x) for x in ['ZmRoot']}
ZM = co.RefGen('Zm5bFGS')

# Set up the logging file
handler = logging.FileHandler('COBErrors.log')
handler.setLevel(logging.INFO)
app.logger.addHandler(handler)
app.logger.setLevel(logging.INFO)


#---------------------------------------------
#                 Routes
#
#---------------------------------------------

@app.route('/')
def index():
    return render_template("index.html")

@app.route('/static/<path:path>')
def send_js(path):
    return send_from_directory('static',path)

@app.route("/available_datasets")
def all_available_datasets():
    return str(co.available_datasets())
 
@app.route("/available_datasets/<path:type>")
def available_datasets(type=None,*args):
    return jsonify({ 
        "data" : list(
            co.available_datasets(type)[
                ['Name','Description']
            ].itertuples(index=False))
        }
    )

@app.route("/Expression/<network_name>/<ontology_name>/<term_name>",
        methods=['GET','POST'])
def expression(network_name,ontology_name,term_name):
    pass
    expr = networks[network_name].heatmap(
        network[network_name].gene_expression_vals(
            co.GWAS(ontology_name)[term_name].gene_list,
            zscore=True
        ),
        cluster_x=True,
        cluster_y=False,
        png_encode=True
    )
    return """<html><body>
        <img src="data:image/png;base64,{}"/>
        </body></html>""".format(expr)

    return jsonify({
        'rownames' : list(expr.index.values),
        'colnames' : list(expr.columns.values),
        'data' :
            [{'x': rowid,
              'y': colid,
              'value': fix_val(value)} for rowid,row in \
               enumerate(expr.itertuples(index=False)) for colid,value in \
               enumerate(row) 
            ]
    })
        
@app.route("/Ontology/Terms/<path:term_name>")
def Ontology_Terms(term_name):
    return jsonify({
        'data': [ 
            (term.id,
             term.desc,
             len(term.loci),
             len(ZM.candidate_genes(
                term.effective_loci(window_size=50000)))
             ) 
            for term in co.GWAS(term_name).iter_terms()]
    })

@app.route('/Annotations/<network_name>/<ontology_name>/<term_name>',
        methods=['GET','POST'])
def Annotations(network_name,ontology_name,term_name):
    # Retrieve SNPs from 
    cob = networks[network_name]
    term = co.GWAS(ontology_name)[term_name]
    genes = cob.refgen.from_ids(request.args.get('genes').split(','))
    try:
        gene_annots = co.Annotation('ZMFunc')[genes]
    except ValueError as e:
        return jsonify({})
    for net in networks.values():
        gene_annots.insert(
            5,'In {}'.format(net.name),
            ['true' if gene in net else 'false' for gene in genes]
        )
    gene_annots.insert(
        5,'Term SNPs',
        ["\n".join([snp.summary() for snp in \
            sorted(term.flanking_snps(gene))]) for gene in genes]
    )
    gene_annots.insert(
        5,'Global Degree',
        [str(cob.global_degree(gene)) for gene in genes]
    )
    return jsonify({
        'data' : list(gene_annots.itertuples(index=True)),
        'header' : ['Gene'] + list(gene_annots.columns.values)
    })

@app.route("/COB/<network_name>/<ontology>/<term>")
def COB_network(network_name,ontology,term):
    net = {}
    cob = networks[network_name]
    term = co.GWAS(ontology)[term]
    nodes = []
    parents = set()
    effective_loci = term.effective_loci(window_size=50000)
    candidate_genes = cob.refgen.candidate_genes(
        effective_loci,
        flank_limit=2,
        chain=True,
        include_parent_locus=True
    )
    locality = cob.locality(candidate_genes)
    for gene in candidate_genes:
        try:
            local_degree = locality.ix[gene.id]['local']
            global_degree = locality.ix[gene.id]['global']
        except KeyError as e:
            local_degree = 0
        gene_locality = local_degree / global_degree
        if np.isnan(gene_locality):
            gene_locality = 0
        nodes.append(
                {'data':{
                    'id':str(gene.id), 
                    'ldegree':int(local_degree), 
                    'locality':float(gene_locality),
                    'gdegree':int(global_degree),
                    'parent':str(gene.attr['parent_locus'])
                }}  
        )
        parents.add(str(gene.attr['parent_locus']))
    # Add parents first
    for p in parents:
        nodes.insert(0,{'data':{'id':p}})

    # Now do the edges
    subnet = cob.subnetwork(candidate_genes)
    subnet.reset_index(inplace=True)
    net['nodes'] = nodes
    net['edges'] = [
        {
            'data':{
                'source': source,
                'target' : target,
                'score' : score,
                'distance' : fix_val(distance)
            }
        } for source,target,score,significant,distance in subnet.itertuples(index=False)
    ]
    return jsonify(net)

def fix_val(val):
    if isinf(val):
        return -1
    if np.isnan(val):
        # because Fuck JSON
        return "null"
    else:
        return val

if __name__ == "__main__":
    app.debug = True
    app.run('0.0.0.0',50002)
