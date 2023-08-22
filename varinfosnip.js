const _my_distinct___path = require('path');
const _m_y_distinct__writedata = require(_my_distinct___path.join(process.env.MFUZZERLIB,"utils")).writedata;

var varIntroSet = {};

var varIntrospect = (objname, obj) => {
    var attrs = {};
    var methods = new Set();
    if(obj==undefined || obj==null){
        return;
    }
    var enumerableProperties = Array.isArray(obj) ? Object.keys(obj) : null;
    Object.getOwnPropertyNames(Object.getPrototypeOf(obj)).forEach((name) => {
        try{
            if (typeof obj[name] === 'function') {
                methods.add(name);
            } else if (obj.hasOwnProperty(name) && attrs[name] === undefined) {
                if(name in obj && constructor in obj[name] && name in obj[name].constructor)
                    attrs[name] = obj[name].constructor.name;
            }
        }catch(err){
            null; 
        }
    });
    Object.getOwnPropertyNames(obj).forEach((name) => {
        try{
            if (enumerableProperties !== null && enumerableProperties.indexOf(name) !== -1) {
                return;
            }
            if (typeof obj[name] === 'function') {
                methods.add(name);
            } else if (obj.hasOwnProperty(name) && attrs[name] === undefined) {
                if(name in obj && constructor in obj[name] && name in obj[name].constructor)
                    attrs[name] = obj[name].constructor.name;
            }
        }catch(err){
            null;
        }
    });

    var objtype = obj.constructor.name;
    if(objtype == 'String'){
        for(var index in attrs){
            var attr = attrs[index];
            if(!isNaN(parseInt(index)) && attr == 'String'){
                delete attrs[index];
            }
        }
    }
    return {'obj':objname, 'objtype':objtype, 'methods':methods, 'attrs':attrs};
};

