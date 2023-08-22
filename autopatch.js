const fs = require('fs');
const path = require("path");
const {ArgumentParser} = require('argparse');
const child_process = require('child_process');
const utils = require(path.join(process.env.MFUZZERLIB, "utils"));
const patchfix = require(path.join(process.env.MFUZZERLIB, "patchfix"));

class AutoPatch{
    constructor(seedname, timeout, enginename="node", maxfixtry=3){
        this.timeout = timeout;
        this.seedname = seedname;
        this.enginename = enginename;
        this.maxfixtry = maxfixtry;

        this.fixed = false;
        this.Error = /[E|e][R|r][R|r][O|o][R|r]/;
        // error line
        this.Range_Error = /RangeError/;
        this.URI_Error = /URIError/;
        
        // error name
        this.Reference_Error = /ReferenceError:\s+(\w+)/;
        this.Type_Error = /TypeError:\s+(\w+)\.(\w+)\s+is/;

        this.fix_many_times();
    }

    fix_many_times(){
        while(this.maxfixtry--){
            var errorinfo = this.errorcheck();        
            if(errorinfo == null){
                this.fixed = true;
                break;
            }

            this.error_match_fix(errorinfo);
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


    error_match_fix(errorinfo){
        /**
          Range Error fix
        **/
        if(this.Range_Error.test(errorinfo)){
            var match_line = this.error_line_match(errorinfo);
            if(match_line == null)
                return;
            patchfix.fixrange(this.seedname, match_line);
            return;
        } 

        /**
          URI Error fix
        **/
        if(this.URI_Error.test(errorinfo)){
            var match_line = this.error_line_match(errorinfo);
            if(match_line == null)
                return;
            patchfix.fixuri(this.seedname, match_line);
            return;
        } 

        /**
          Type Error fix
        **/

        if(this.Type_Error.test(errorinfo)){
            var out = this.Type_Error.exec(errorinfo);
            if(out == null || out[1] == null)
                return;
            patchfix.fixreftype(this.seedname, out[1]);
            return;
        } 

        /**
          Reference Error fix
        **/

        if(this.Reference_Error.test(errorinfo)){
            var out = this.Reference_Error.exec(errorinfo);
            if(out == null || out[1] == null)
                return;

            patchfix.fixreftype(this.seedname, out[1]);
            return;
        } 

    }

    errorcheck(){
        try{
             var ret = child_process.spawnSync(this.enginename, [this.seedname], {encoding: "utf-8", timeout: this.timeout});
             if(ret.stderr){
                 //console.log(ret.stderr);
                 if(this.Error.test(ret.stderr)){
                     return ret.stderr;
                 }else{
                     return null;
                 } 
             }
             return null;
        }catch(err){
             console.log(err);
             return null;
        }
    }
}
/*
const parser = new ArgumentParser();

parser.add_argument("-s", "--seedname", { default: "test1.js" }); 
parser.add_argument("-j", "--enginename", { default: "node" }); 
parser.add_argument("-x", "--maxfixtry",{ default: "3" }); 
parser.add_argument("-t", "--timeout",{ default: "5000" }); 

args = parser.parse_args();

try{
    new AutoPatch(seedname=args.seedname, enginename=args.enginename, maxfixtry=args.maxfixtry, timeout=args.timeout);
}catch(err){
    console.log("@@@@@@@@@@@@@@@@@@@@ AutoPatch Error @@@@@@@@@@@@@@@@@@@@@@@");
    console.log(err);
    console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
}
*/
exports.AutoPatch = AutoPatch;
