const path = require("path");
const {ArgumentParser} = require('argparse');
const child_process = require('child_process');
const utils = require(path.join(process.env.MFUZZERLIB,"utils"));

const autoremove = require(path.join(process.env.MFUZZERLIB,"autoremove"));
const autopatch = require(path.join(process.env.MFUZZERLIB,"autopatch"));

const autofix = require(path.join(process.env.MFUZZERLIB,"autofix"));

class AutoFix{
    constructor(seedname, enginename, maxfixtry, timeout){
        /*
        var replaceengines = ['jerry', 'xst'];
        var baseenginename = path.basename(enginename);
        for(var index in replaceengines){
            var replaceengine = replaceengines[index];
            if(baseenginename.search(replaceengine)!=-1){
                enginename = utils.abspath("jsc");
                break;
            }   
        }   
        */
        enginename = utils.abspath("jsc");
        this.enginename = enginename;

        this.seedname = seedname;
        this.maxfixtry = maxfixtry;
        this.timeout = timeout;

        this.fixed = false;
        
        try{
            child_process.spawnSync(this.enginename, [this.seedname], {timeout: this.timeout, encoding: "utf-8"});
            this.fix();
        }catch(err){
            console.log("=====================seed timeout===========================");
            console.log(err);
            console.log("===========================================================");
        }
    }

    fix(){
        /////////////////////////////////////////////////////////////////////////////////////
        // Notices 
        // 1. AutoPatch focuses on standard errors, therefore use the default engine(node)
        // 2. AutoPatch needs less fixing times, therefore use the defautlt maxfixtry(3)
        /////////////////////////////////////////////////////////////////////////////////////

        try{

            if(!this.fixed){
                var subfix = new autopatch.AutoPatch(this.seedname, this.timeout);
                this.fixed = subfix.fixed;
            }

            if(!this.fixed){
                var subfix = new autoremove.AutoRemove(this.seedname, this.timeout, this.enginename, this.maxfixtry);
                this.fixed = subfix.fixed;
            }

        }catch(err){
            console.log("&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&");
            console.log("fix error: ", err);
            console.log("&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&");
 
        }
    }

}

const parser = new ArgumentParser();

parser.add_argument("-s", "--seedname", { default: "test1.js" });
parser.add_argument("-j", "--enginename", { default: "node" });
parser.add_argument("-x", "--maxfixtry",{ default: "25" });
parser.add_argument("-t", "--timeout",{ default: "1000" });

args = parser.parse_args();

try{
    console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
    console.log(args.seedname, args.enginename, args.maxfixtry, args.timeout);
    console.log("------------------------------------------------------------------------------------------------");
    new AutoFix(args.seedname, args.enginename, parseInt(args.maxfixtry), parseInt(args.timeout));
    //new  autofix.AutoFix(args.seedname, args.enginename, parseInt(args.maxfixtry), parseInt(args.timeout));
    console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
}catch(err){
    console.log("@@@@@@@@@@@@@@@@@@@@ AutoFix Error @@@@@@@@@@@@@@@@@@@@@@@");
    console.log(err);
    console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
}

