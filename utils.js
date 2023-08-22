const md5 = require("md5");
const v8 = require("v8");
const fs = require("fs");
const path = require("path");
const visit = require("ast-types").visit;
const escodegen = require("escodegen");
const builders = require("ast-types").builders;
const cloneDeep = require('lodash.clonedeep');

function getneedsvars(ast){
    var needsvars = new Set();
    visit(ast, {
       visitIdentifier(path){
           needsvars.add(escodegen.generate(path.node));
           visitnode(this, path);

       },  
    }); 
   
    return needsvars;
} 


function textmd5(text){
    try{
        return md5(text);
    }catch(err){
        console.log("calc md5 error: ", err);
        return "";
    }
}

function fnamemd5(fname){
    try{
        var text = fs.readFileSync(fname);
        return md5(text);
    }catch(err){
        console.log("calc md5 error: ", err);
        return "";
    }
}

function abspath(fname){
    return path.join(process.env.MFUZZERLIB, fname );
}

function tmppath(tmpdir, fname){
    return path.join(tmpdir, fname);
}


function log(logname, data){
    var logdata = "*".repeat(100) + "\n";
    logdata = logdata + Date() + "\n";
    logdata = logdata + "*".repeat(100) + "\n";
    logdata = logdata + data + "\n";
    logdata = logdata + "*".repeat(100) + "\n";
    fs.appendFileSync(logname, logdata);
}

function wraploop(stmt, wrap, wraprate){
    if(stmt == null || stmt == undefined){
        return;
    }

    if(wrap == "True"  && Math.random() < wraprate){
        var index = builders.identifier("ijjkkk");
        var decl = builders.variableDeclaration("var", [
                       builders.variableDeclarator(
                       index,
                       builders.literal(0))   
                   ]); 

        var forstmt = builders.forStatement(
                          decl,
                          builders.binaryExpression("<", index, builders.literal(100000)),
                          builders.updateExpression("++", index, true),
                          builders.blockStatement([
                             stmt
                         ])  
                      );  

        return forstmt;

    }else{
        return stmt;
    }
}


function clone(rawobj) {
   //return cloneDeep(rawobj);
   return JSON.parse(JSON.stringify(rawobj));
}

function random_int(max_num){
    return Math.floor(Math.random()*max_num);
}  

function random_pick(pickset){
    if(pickset == undefined || pickset == null){
        return null;
    }else if(pickset.constructor.name == 'Set'){
        if(pickset.size < 1){
            return null;
        }
        var newpickset = Array.from(pickset);
        var index = random_int(newpickset.length);
        return newpickset[index];

    }else if(pickset.constructor.name == 'Array'){
        if(pickset.length < 1){
            return null;
        }
        var index = random_int(pickset.length);
        return pickset[index];

    }else{
        try{
            var newset = Object.keys(pickset);
            if(newset.constructor.name == 'Array'){
                if(newset.length < 1){
                    return null;
                }
                var index = random_int(newset.length);
                return newset[index];
            }else{
                return null;
            }
        }catch(err){
            throw "random pick error"
            return null;
        }

    }
}

function visitnode(curnode, path){
    try{
       curnode.traverse(path);
    }catch(err){
       /*
       console.log("visit node----------------------------------------");
       console.log(err.stack);
       console.log("--------------------------------------------------");
       */
   }
}

function insertnodeafter(path, astnode){
    if(astnode == null|| astnode == undefined){
        return;
    }

    try{
        if(path.parent!=undefined && path.parent.node!=undefined && path.parent.node.type!=undefined && ['ForStatement','DoWhileStatement','IfStatement','WithStatement','SwitchStatement','ForInStatement', 'ForOfStatement','ForAwaitStatement','TryStatement', 'FunctionDeclaration', 'CatchClause'].includes(path.parent.node.type)){
            return; 
        }else{
            if(typeof(path.insertAfter)=='function'){
                path.insertAfter(astnode);
            }
        }
    }catch(err){
       /*
       console.log("insert after-----------------------------------------------");
       console.log(err);
       console.log("-----------------------------------------------------------");
       */
       //console.log('insert after error: ', err);
    }
}

function insertnodebefore(path, astnode){
    if(astnode == null || astnode == undefined){
        return;
    }
    try{
         if(path.parent!=undefined && path.parent.node!=undefined && path.parent.node.type!=undefined && ['ForStatement','DoWhileStatement','IfStatement','WithStatement','SwitchStatement','ForInStatement', 'ForOfStatement','ForAwaitStatement','TryStatement', 'FunctionDeclaration', 'CatchClause'].includes(path.parent.node.type)){
       
            return; 
        }else{
            if(typeof(path.insertBefore)=='function'){
               path.insertBefore(astnode);
               //console.log('@@'.repeat(10000));
            }
        }
 
    }catch(err){
       /*
       console.log("insert before-----------------------------------------------");
       console.log(err);
       console.log("------------------------------------------------------------");
       */
       //console.log('insert before error: ', err);
    }
}

function nodereplace(path, astnode){
    if(astnode == null || astnode == undefined){
        return;
    }

    try{
       path.replace(astnode);
    }catch(err){
       /*
       console.log("replace -----------------------------------------------------");
       console.log(err);
       console.log("-------------------------------------------------------------");
       */
    }
}

function nodeprune(path, astnode){
    try{
        if(path.parent!=undefined && path.parent.node!=undefined && path.parent.node.type!=undefined && ['ForStatement','DoWhileStatement','IfStatement','WithStatement','SwitchStatement','ForInStatement', 'ForOfStatement','ForAwaitStatement','TryStatement', 'FunctionDeclaration', 'CatchClause'].includes(path.parent.node.type)){
            console.log("####################################");
            return; 
        }else{
            if(typeof(path.prune)=='function'){
               path.prune();
               //console.log('@@'.repeat(10000));
            }
 
        }
    
    }catch(err){
       null;
       //console.log('prune error: ', err);
    }
}

function getlocmd5(loc){
    var line = loc['start']['line'];
    return line;
} 

/*
function getlocmd5(loc){
    var startline = loc['start']['line'];
    var startcol = loc['start']['column'];
    return startline + "#" + startcol;
} 
*/


/*
function getlocmd5(loc){
    var startline = loc['start']['line'];
    var startcol = loc['start']['column'];
    var endline = loc['end']['line'];
    var endcol = loc['end']['column']; 
    var loccombine = startline + '#' + startcol + '#' + endline + '#' + endcol;
    //console.log(loccombine);
    var locmd5 = md5(loccombine);
    return locmd5;
}
*/

function getdulocmd5(loc){
    var startline = loc['start']['line'] - 1;
    var startcol = loc['start']['column'];
    var endline = loc['end']['line'] - 1;
    var endcol = loc['end']['column'] + 1;
    var loccombine = startline + '#' + startcol + '#' + endline + '#' + endcol;
    var locmd5 = md5(loccombine);
    return locmd5;
}


function writedata(fname, data){
   var rawdata = v8.serialize(data); 
   fs.writeFileSync(fname, rawdata);
}

function readdata(fname){
   var rawdata = fs.readFileSync(fname);
   var data = v8.deserialize(rawdata);
   return data;
}

/*
function writedata(fname, data){
   fs.writeFileSync(fname, JSON.stringify(data));
}

function readdata(fname){
   var rawdata = fs.readFileSync(fname);
   var data = JSON.parse(rawdata); 
   return data;
}
*/

exports.random_int = random_int;
exports.random_pick = random_pick;
exports.getlocmd5 = getlocmd5;
exports.getdulocmd5 = getdulocmd5;
exports.visitnode = visitnode;
exports.insertnodeafter = insertnodeafter;
exports.insertnodebefore = insertnodebefore;
exports.nodereplace = nodereplace;
exports.nodeprune = nodeprune;
exports.readdata = readdata;
exports.writedata = writedata;
exports.clone = clone;
exports.wraploop = wraploop;
exports.log = log;

exports.abspath = abspath;
exports.tmppath = tmppath;

exports.fnamemd5 = fnamemd5;
exports.textmd5 = textmd5;

exports.getneedsvars = getneedsvars;
