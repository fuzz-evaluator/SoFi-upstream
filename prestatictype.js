const escodegen = require("escodegen");
const fs = require("fs");
const v8 = require("v8");
const path = require("path");
const readdata = require(path.join(process.env.MFUZZERLIB,"utils")).readdata;

class PreStaticTypeData{
    constructor(varintrolog, typeinferlog){
        this.objattrs = {};

        if(fs.existsSync(varintrolog)){
           this.varIntroSet = readdata(varintrolog);
           for(var locmd5 in this.varIntroSet){
               var varSet = this.varIntroSet[locmd5];
               if(varSet == undefined){
                   continue;
               }
               var obj = varSet['obj'];
               this.objattrs[obj] = varSet;
           }
        }

        if(fs.existsSync(typeinferlog)){
            var rawStaticTypeSet = fs.readFileSync(typeinferlog);
            this.statictypes = v8.deserialize(rawStaticTypeSet);
        }else{
            this.statictypes = {};
        }
    }

    obtain_obj_type(obj){
        var objtype = null;
        if(obj in this.objattrs){
            objtype = this.objattrs[obj]['objtype'];
        }else if(obj in this.statictypes && this.statictypes[obj]['type']!=null){
            objtype = this.statictypes[obj]['type'];
        }else{
            try{
               objtype = eval(obj+'.constructor.name');
            }catch(error){
               null;
            }
        }
        return objtype;
    }

    pick_from_typeset(argname){
        var argtype = null;

        if(argname in this.objattrs){
            argtype = this.objattrs[argname]['objtype'];
        }else if(argname in this.statictypes){
            argtype = this.statictypes[argname]['type'];
        }

        return argtype;
    }

    determine_arg_type(arg){
        var argtype = null;

        if(arg.type=='FunctionExpression'){
            argtype = "Function";

        }else if(arg.type=='Literal'){
            if((typeof arg.value)=='string'){
                argtype = 'String';
            }else if((typeof arg.value)=='number'){
                argtype = 'Number';
            }else if((typeof arg.value)=='boolean'){
                argtype = 'Boolean';
            }else if('regex' in arg){
                argtype = 'Regex';
            }else if(arg.value == null){
                null;
            }else{
                argtype = null;
                console.log('@@@', arg);
                console.log('==', typeof arg.value);
                throw("undeal literal:", arg);
            }

        }else if(arg.type=='ArrayExpression'){
            argtype = 'Array';

        }else{
            var argname = escodegen.generate(arg);
            argtype = this.pick_from_typeset(argname);
        }

        return argtype;
    }
}

exports.PreStaticTypeData = PreStaticTypeData;
