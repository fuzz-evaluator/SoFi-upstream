const md5 = require("md5");
const fs = require("fs");
const path = require("path");
const readlines = require("n-readlines");
const {ArgumentParser} = require('argparse');
const child_process = require('child_process');

const utils = require(path.join(process.env.MFUZZERLIB,"utils"));
const fixname = require(path.join(process.env.MFUZZERLIB,"fixname"));

class AutoRemove{
    constructor(seedname, timeout, enginename, maxfixtry=50){
        this.seedname = seedname;
        if(enginename!="node" && !path.isAbsolute(enginename)){
            enginename = path.resolve(enginename);
        }

        this.timeout = timeout;
        this.enginename = enginename;
        this.maxfixtry = maxfixtry;

        this.fixed = false; 
        /* 
        console.log("================================================================================");
        console.log("seedname:", this.seedname);
        console.log("timeout:", this.timeout);
        console.log("enginenamet:", this.enginename);
        console.log("maxfixtry:", this.maxfixtry);
        console.log("================================================================================");
        */

        this.errorfilter = /[E|e][R|r][R|r][O|o][R|r]/

        this.syntaxjsname = utils.abspath("jsc")
        this.syntaxfixswitch = false

        this.maxfixtry = maxfixtry

        this.errormd5 = null

        this.fix_many_times()
        
    }

    errorhash(text){
        return md5(text);

    }

    fix_many_times(){
        while(this.maxfixtry--){
            var errorinfo = this.errorcheck();    
            if(errorinfo == null){
                this.fixed = true;
                break;
            }   

            this.fix(errorinfo);
        }   
    }   

    error_line_match(errorinfo){
        var abs_seedname = path.resolve(this.seedname);
        var patterns = [abs_seedname + ":(\\d+)",
                       this.seedname + ":(\\d+)",
                       "Error: Line (\\d+)",
                       "line: (\\d+)"
                      ]

        for(var index in patterns){
            var pattern = new RegExp(patterns[index]);
            var error_name = pattern.exec(errorinfo);
            if(error_name!=null){
                return error_name[1];
            }
        }
        return null;
    }

    error_name_match(errorinfo){
        var patterns = [
                   /SyntaxError: Illegal\s+(\w+)\-expression/,
                   /SyntaxError: Identifier\s+'(\w+)'\s+/,

                   /at\s+new\s+(\w+)\s+/,
                   /Error:\s+\"*\'*([\$|\w]+)\"*\'*\s+is not/,
                   /Error:\s+Function\s+\"*\'*(\w+)\"*\'*/,
                   /Error:\s+Cannot\s+read\s+property\s+\"*\'*(\w+)\"*\'*/,

                   /RangeError:\s+(\w+)\(\)\s+argument/,
                   /RangeError:\s+(\w+)\(\) radix argument must be between/,
                   /RangeError: Invalid string length\s+at\s+String\.(\w+)/,
                   /RangeError: Invalid array buffer length\s+at new\s+(\w+)\s+/,
                   /RangeError: Maximum call stack size exceeded\s+at\s+(\w+)\s+/,
                   /RangeError: Invalid array length\s+at\s+Array\.(\w+)/,

                   /TypeError: \w+\.(\w+) is not a/,
                   /TypeError: Cannot read property '(\w+)' of undefined/,
                   /TypeError: Cannot set property\s+(\w)\s+of/,
                   /TypeError: Cannot redefine property:\s+(\w+)/,
                   /TypeError:\s+(\w)\s+is not a function/,
                   /TypeError: Cannot set property '(\w+)' of undefined/,
                   /TypeError: Method Intl\.(\w+)/

        ] 

        for(var index in patterns){
            var pattern = new RegExp(patterns[index]);
            var error_name = pattern.exec(errorinfo);
            if(error_name!=null){
                return error_name[1];
            } 
        } 
      
        return null;
    }

    swapengine(){
        var tmp = this.enginename;
        this.enginename = this.syntaxjsname;
        this.syntaxjsname = tmp;

    }

    maybe_try_syntaxfix(erro_line){
        this.swapengine()
        this.error_line_fix((Number(erro_line)-1).toString())
        this.swapengine()
    }

    error_line_fix(erro_line){
        var edges = [];     
        var edges = []; 
        var next;
        var count = 0;
        var liner = new readlines(this.seedname);

        while (next = liner.next()) {
            if(count != erro_line-1){
                edges.push(next.toString());
            }
            count = count + 1;
        }
        fs.writeFileSync(this.seedname, edges.join("")); 
    }

    errorcheck(){
        try{
            var ret = child_process.spawnSync(this.enginename, [this.seedname], {encoding: "utf-8", timeout: this.timeout});
            var output = ret.stdout + ret.stderr;
            if(!this.errorfilter.test(output)){
                return null;
            }

            var curerrmd5 = this.errorhash(output);
            if(curerrmd5 == this.errormd5){
                this.syntaxfixswitch = true;
            }
            this.errormd5 = curerrmd5;

            var matchline = this.error_line_match(output);
            if(matchline!=null){
                return ["line", matchline];
            }
            var matchname = this.error_name_match(output);
            if(matchname!=null){
                return ["name", matchname];
            }
           
            return null;
        }catch(err){
            return err;
        }
    }

    fix(errinfo){
        if(errinfo[0] == "line"){
             if(this.syntaxfixswitch){
                 this.maybe_try_syntaxfix(errinfo[1]);
                 this.syntaxfixswitch = false;
             }else{
                 this.error_line_fix(errinfo[1]);
             }
        }else{
             fixname.fixname(this.seedname, errinfo[1]);
        } 

    }
}

/*
const parser = new ArgumentParser();

parser.add_argument("-s", "--seedname", { default: "test1.js" });
parser.add_argument("-j", "--enginename", { default: "node" });
parser.add_argument("-x", "--maxfixtry",{ default: "50" });
parser.add_argument("-t", "--timeout",{ default: "5000" });

args = parser.parse_args();

try{
    new AutoRemove(seedname=args.seedname, enginename=args.enginename, maxfixtry=args.maxfixtry, timeout=args.timeout);
}catch(err){
    console.log("@@@@@@@@@@@@@@@@@@@@ AutoRemove Error @@@@@@@@@@@@@@@@@@@@@@@");
    console.log(err);
    console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
}
*/

exports.AutoRemove = AutoRemove;
