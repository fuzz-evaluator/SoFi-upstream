const visit = require("ast-types").visit;
const escodegen = require("escodegen");
const esprima = require("esprima");
const fs = require("fs");
const path = require("path");

const utils = require(path.join(process.env.MFUZZERLIB,"utils"));
const typeinfer = require(path.join(process.env.MFUZZERLIB, "typeinfer"));
const PreStaticTypeData = require(path.join(process.env.MFUZZERLIB, "prestatictype")).PreStaticTypeData;

function getLiveReflectAst(locmd5, varlist){
    var reflectcode = "";
    reflectcode = reflectcode + "var tmpSet = new Set();\n";
    varlist.forEach(function(value){
        reflectcode = reflectcode + "try{"+value+";\nif("+value+"!=undefined){tmpSet.add('"+ value+"')}}catch(err){null;}\n";  
    });
    reflectcode = reflectcode + "liveIntroSet['"+ locmd5 +"'] = tmpSet;";
    var reflectast = esprima.parse(reflectcode, {tolerant:true, loc:true});

    return reflectast;
}

function infoanalysis(seedname, varintrolog, livevarlog, statictypelog, funargtypelog, whether_gen_expression){
    try{
        var code = fs.readFileSync(seedname, 'utf-8');
        var reflectast = esprima.parse(code, {tolerant:true, loc:true});
    }catch(err){
        return;
    }
    var liveast = utils.clone(reflectast);
    var typeast = utils.clone(reflectast);
    var funtypeast = utils.clone(reflectast);

     ///////////////////////////////////////////////////////////////////////////////////////////
     ///  reflect detect
     ///
     ///////////////////////////////////////////////////////////////////////////////////////////


    function getReflectAst(obj){
        var reflectcode = "";
        if(obj!=undefined){
            reflectcode =  reflectcode + "var res = varIntrospect('"+obj.toString()+"'," +obj+ ");\n"
            reflectcode = reflectcode + "varIntroSet['" + obj.toString() + "'] = res;\n";
        }
        var reflectast = esprima.parse(reflectcode, {tolerant:true, loc:true});
        return reflectast;
    }

    visit(reflectast, {
        visitExpressionStatement(path){
            const nodeExpression = path.node.expression;
            if(nodeExpression != null && nodeExpression.left != null){
                var reflectast = getReflectAst(nodeExpression.left.name);
                utils.insertnodeafter(path, reflectast);
            }
            utils.visitnode(this, path);
        },
        visitVariableDeclaration(path){
            if(path.node.declarations.length > 0 ){
                for(index in path.node.declarations){
                    var newnode = path.node.declarations[index];
                    var reflectast = getReflectAst(newnode.id.name);
                    utils.insertnodeafter(path, reflectast); 
                }
            }
            utils.visitnode(this, path);
        }
    });


    var newcode = escodegen.generate(reflectast);
    var introspect_code = fs.readFileSync(path.join(process.env.MFUZZERLIB, "varinfosnip.js"));

    var writecode = "_m_y_distinct__writedata('"+ varintrolog +"', varIntroSet);\n";
    var reflectcode = introspect_code + "\n" + newcode + "\n" + writecode;

    try{
        eval(reflectcode);
    }catch(err){
        console.log("reflect error: ", err);
        //utils.log("debug_log", reflectcode); 
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////
    //                   live detect
    //
    //////////////////////////////////////////////////////////////////////////////////////////////////////

    var varlist = new Set();
    if(fs.existsSync(varintrolog)){
        varIntroSet = utils.readdata(varintrolog);
        for(locmd5 in varIntroSet){
            if(varIntroSet[locmd5]!=undefined  && 'obj' in varIntroSet[locmd5]){
                varlist.add(varIntroSet[locmd5]['obj']);
            }
        }
    }

    if(varlist.size > 0){
        visit(liveast, {
            visitExpressionStatement(path){
                const nodeExpression = path.node.expression;
                var locmd5 = utils.getlocmd5(path.node.loc);
                if(nodeExpression!=null && nodeExpression!=undefined && nodeExpression.left!=null && nodeExpression.left!=undefined){
                    var reflectast = getLiveReflectAst(locmd5, varlist);
                    utils.insertnodeafter(path, reflectast);
                }
                utils.visitnode(this, path);
            },
            visitVariableDeclaration(path){
                var locmd5 = utils.getlocmd5(path.node.loc);
                if(path.node.declarations.length > 0 ){
                    for(index in path.node.declarations){
                        var newnode = path.node.declarations[index];
                        var reflectast = getLiveReflectAst(locmd5, varlist);
                        utils.insertnodeafter(path, reflectast); 
                    }
                }
                utils.visitnode(this, path);
           }
        });

        var newcode = escodegen.generate(liveast);
        var introspect_code = fs.readFileSync(path.join(process.env.MFUZZERLIB,"livevarsnip.js"));

        var writecode = "_my__distinct_writedata('"+ livevarlog +"', liveIntroSet);\n";

        var reflectcode = introspect_code + "\n" + newcode + "\n" + writecode;

        try{
            eval(reflectcode);
        }catch(err){
            console.log("live detect error:", err);
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /////   static type analysis
    /////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
 


    if(whether_gen_expression==undefined){
        whether_gen_expression = true;
    }

    var typeset = typeinfer.visitast(typeast);

    utils.writedata(statictypelog, typeset);

    ///////////////////////////////////////////////////////////////////////////////////////////////
    /////   function arg type analysis
    ///// 
    ///////////////////////////////////////////////////////////////////////////////////////////////

    var preStaticTypeObj = new PreStaticTypeData(varintrolog, statictypelog);
    var funArgType = {};

    visit(funtypeast, {
        visitFunctionDeclaration(path){
            fname = path.node.id.name;
            funArgType[fname] = path.node;
            utils.visitnode(this, path);
        },
    });

    ///  infer through usage of argument
    
    for(fname in funArgType ){
        var funast = funArgType[fname];
        var params = {};
        for(index in funast.params){
            var param = funast.params[index];
            params[index] = param.name;
        }
        typeset = typeinfer.visitast(funast);
        for(index in params){
            if(params[index] in typeset && 'type' in typeset[params[index]]){
                params[index] = typeset[params[index]]['type'];
            }else{
                params[index] = null;
            }
        }
        funArgType[fname] = params
        //console.log(params);
    }

    ///// infer through function call 

    visit(funtypeast, {
        visitCallExpression(path){
         
            if(path.node.callee.type != 'MemberExpression'){
                var fname = path.node.callee.name;
                if(!(fname in funArgType)){
                    utils.visitnode(this, path);
                    return;
                }
                var funargs = path.node.arguments;

                for(index in funargs){
                    var arg = funargs[index];
                    var argtype = preStaticTypeObj.determine_arg_type(arg);
                    if(funArgType[fname][index]==null){ 
                         funArgType[fname][index] = argtype;
                    }
                
                }
           }
           utils.visitnode(this, path);
       },
    });

    utils.writedata(funargtypelog, funArgType);
}

exports.infoanalysis = infoanalysis;
