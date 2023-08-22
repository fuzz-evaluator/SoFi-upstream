const esprima = require("esprima");
const fs = require("fs");
const path = require("path");
const visitast = require(path.join(process.env.MFUZZERLIB, "typeinfer.js")).visitast;
const writedata = require(path.join(process.env.MFUZZERLIB,"utils")).writedata;

const args = process.argv.slice(2);
exports.visitast = visitast;

var seedname = args[0];            //"hello.js";
var statictypelog = args[1];       //"statictypelog";
var whether_gen_expression = args[2]; // true;

if(whether_gen_expression==undefined){
    whether_gen_expression = true;
}
var code = fs.readFileSync(seedname, 'utf-8');
var ast = esprima.parse(code, {tolerant:true});

var typeset = visitast(ast);

writedata(statictypelog, typeset);
