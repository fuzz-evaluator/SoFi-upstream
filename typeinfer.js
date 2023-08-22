const visit = require("ast-types").visit;
const escodegen = require("escodegen");
const path = require("path");
const utils = require(path.join(process.env.MFUZZERLIB,"utils"));

exports.visitast = visitast;

var typeset = {};
var whether_gen_expression=null;

function visitast(ast, whether_gen_expression){
    if(whether_gen_expression==null){
        whether_gen_expression = true;    
    }

    visit(ast, {
       /*
       visitNode(path){
           console.log(path.node);
           utils.visitnode(this, path);
       },*/
       visitFunctionDeclaration(path){
           dealfun(path.node);
           utils.visitnode(this, path);
       },
       visitCallExpression(path){
           dealcall(path.node);
           utils.visitnode(this, path);
       },
       visitVariableDeclarator(path){
           dealdeclar(path.node);
           utils.visitnode(this, path);
       },
       visitMemberExpression(path){
           dealattr(path.node);
           utils.visitnode(this, path);
       },
       visitUnaryExpression(path){
           dealop(path.node.argument, path.node.operator);
       
           if(whether_gen_expression){
               dealexpression(path.node);
           }
           utils.visitnode(this, path);
       },
       visitBinaryExpression(path){
           dealop(path.node.left, path.node.operator);
           dealop(path.node.right, path.node.operator);
      
           if(whether_gen_expression){
               dealexpression(path.node);
           }
           utils.visitnode(this, path);
       },
       visitAssignmentExpression(path){
           dealassign(path.node);

           utils.visitnode(this, path);
       },
       visitUpdateExpression(path){
           dealop(path.node.argument, path.node.operator);

           utils.visitnode(this, path);
       },
       visitLogicExpression(path){
           dealop(path.node.left, path.node.operator);
           dealop(path.node.right, path.node.operator);
       
           if(whether_gen_expression){      
               dealexpression(path.node);
           }
           utils.visitnode(this, path);
       },
    });

    return typeset;
}


function initialize(node){
    var name = escodegen.generate(node);
    if(name in typeset){
        return name;
    }
    typeset[name] = {};
    typeset[name]['type'] = null;
    
    try{
       //if(!name.includes('+')){
           var type = eval(name+".constructor.name");
           if(type!=null&&type!=undefined){
               typeset[name]['type'] = type;
           }
       //}
    }catch(error){
       null;
    }
    typeset[name]['attrs'] = new Set();
    typeset[name]['ops'] = new Set();
    typeset[name]['relate'] = new Set();
    
    return name;
}


function dealop(node, operator){
    if(node.type != 'Literal'&& node.type != 'Number'){
        var name = initialize(node);
        /*
        if(name=='String.name + \'xx\''){
           console.log("------------------------------------");
           console.log(typeset[name]);
           console.log("------------------------------------");
        }*/
        if(['<<', '>>', '>>>', '-', '/', '%', '*', '&', '|', '^','<', '<=', '>', '>='].includes(operator)){
            typeset[name]['type'] = 'Number';
        }else if(['||', '&&'].includes(operator)){
            typeset[name]['type'] = 'Boolean';
        }
        
        typeset[name]['ops'].add(operator);
    }
}

function dealattr(node){
    var name = initialize(node.object);
    attr = node.property.name;
    typeset[name]['attrs'].add(attr);
}

function typetransmit(name){
    var relates = typeset[name]['relate'];
    for(relate of relates){
        if(typeset[relate]!=undefined &&  typeset[relate]['type']!=null){
            typeset[name]['type'] = typeset[relate]['type'];
            return;
        }
    }
}

function dealdeclar(node){
    initialize(node.id);
    dealassignexpression(node.init ,node.id);
}

function dealassignexpression(right, left){
    if(right == null){
        return 0;
    }
    
    var name = initialize(left);
    if(right.type == 'BinaryExpression' && right.operator == '+'){
        if((typeof right.left.value)=='string'||(typeof right.right.value)=='string'){
            typeset[name]['type'] = 'String';
        }else if((typeof right.left.value)=='number'||(typeof right.right.value)=='number'){
            typeset[name]['type'] = 'Number'; 
        }else if((typeof right.left.value)=='boolean'||(typeof right.right.value)=='boolean'){
            typeset[name]['type'] = 'Boolean';           
        }
    }else if(right.type == 'BinaryExpression' && right.operator != '+'){
        if(['<<', '>>', '>>>', '-', '/', '%', '*', '&', '|', '^'].includes(right.operator)){
            typeset[name]['type'] = 'Number';
        }else if(['==', '!=', '===', '!==', '<', '<=', '>', '>='].includes(right.operator)){
            typeset[name]['type'] = 'Boolean';
        }
    }else if(right.type == 'LogicalExpression'){
        typeset[name]['type'] = 'Boolean';
    }else if(right.type == 'UpdateExpression'||right.type=='UnaryExpression'){
        typeset[name]['type'] = 'Number';
    }else if(right.type == 'Identifier'){
        typeset[name]['relate'].add(right.name);
        typetransmit(name);
    }else if(right.type == 'Literal'){
        if((typeof right.value) == 'string'){
            typeset[name]['type'] = 'String';
        }else if((typeof right.value) == 'number'){
            typeset[name]['type'] = 'Number';
        }else if((typeof right.value) == 'boolean'){
            typeset[name]['type'] = 'Boolean';
        }else if('regex' in right ){
            typeset[name]['type'] = 'Regex';
        }
    }else if(right.type == 'ArrayExpression'){
        typeset[name]['type'] = 'Array';
    }else if(right.type == 'NewExpression'){
        typeset[name]['type'] = right.callee.name;
    }else if(right.type == 'CallExpression'){
        null;
    }else if(right.type == undefined){
        null;
    }else if(right.type == 'ObjectExpression'){
        // TODO
        null;
    }else if(right.type == 'ComputedMemberExpression'){
       // TODO
       null;
    }else if(right.type == 'MemberExpression'){
       // TODO
       null;
    }else if(right.type == 'FunctionExpression'){
        typeset[name]['type'] = 'Function';
    }else if(right.type == 'ArrowFunctionExpression'){
       // TODO
       null;       
    }else if(right.type == 'ConditionalExpression'){
        if(right.consequent.type == 'Literal'){
            if((typeof right.consequent.value) == 'string'){
                typeset[name]['type'] = 'String';
            }else if((typeof right.consequent.value) == 'number'){
                typeset[name]['type'] = 'Number';
            }else if((typeof right.consequent.value) == 'boolean'){
                typeset[name]['type'] = 'Boolean';
            }else if('regex' in right){
                argtype == 'Regex';
            }

        }else if(right.consequent.type == 'Identifier'){
            typeset[name]['relate'].add(right.consequent.name);
            typetransmit(name);
        }
    }else if(right.type == 'ThisExpression'){
        null;
    }else if(right.type == 'AssignmentExpression'){
        null;
    }else if(right.type == 'TemplateLiteral'){
        null;
    }else if(right.type == 'NewExpression'){
        null;
        //console.log("#############################################");
        //console.log(right);
        //console.log("#############################################");
    }else if(right.type == 'YieldExpression'){
        null;
    }else if(right.type == 'SequenceExpression'){
        null;
    }else{
        console.log("===================================================");
        console.log(escodegen.generate(right));
        console.log("###################################################");;
        console.log(right);
        console.log("===================================================");
        throw('undeal expression  type:', right.type);
    }
}

function dealassign(node){
    var left = node.left;
    var right = node.right;

    var name = initialize(left);

    if(node.operator != '='){
        typeset[name]['type'] = 'Number';
    }else if(node.operator == '='){
        dealassignexpression(right, left);
    }
}

function dealcall(node){
    var name = initialize(node.callee);
    typeset[name]['type'] = 'Function';
}

function dealfun(node){
    var name = initialize(node.id);
    typeset[name]['type'] = 'Function';
}

function dealexpression(node){
    var name = initialize(node);
    typeset[name]['ops'].add(node.operator);

    if(node.type == 'LogicalExpression'){
        typeset[name]['type'] = 'Boolean';
    }else if(node.type == 'BinaryExpression'){
        if(node.operator == '+'){
            var leftname = initialize(node.left);
            var rightname = initialize(node.right);
 
            if(typeset[leftname]['type']=='String' || typeset[rightname]['type']=='String'){
                typeset[name]['type'] = 'String';
            }else if(typeset[leftname]['type']=='Number'|| typeset[rightname]['type']=='Number'){
                typeset[name]['type'] = 'Number';
            }else if(typeset[leftname]['type']=='Boolean'|| typeset[rightname]['type']=='Boolean'){
                typeset[name]['type'] = 'Boolean';
            }

        }else{
            if(['<<', '>>', '>>>', '-', '/', '%', '*', '&', '|', '^'].includes(node.operator)){
                typeset[name]['type'] = 'Number';
            }else if(['==', '!=', '===', '!==', '<', '<=', '>', '>='].includes(node.operator)){
                typeset[name]['type'] = 'Boolean';
            }
        }
    }else if(node.type == 'UnaryExpression'){
        typeset[name]['type'] = 'Number';
        typeset[name]['ops'].add(node.operator);
    }
}

