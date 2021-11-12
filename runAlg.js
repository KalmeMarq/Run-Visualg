"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
class CmdReader {
    constructor(cmd) {
        this.args = new Map();
        this.read(cmd);
    }
    read(cmd) {
        for (let i = 0; i < cmd.length; i++) {
            let c = cmd[i];
            if (c[0] !== '-') {
                continue;
            }
            if (c.split('=').length === 2) {
                const a = c.split('=');
                this.args.set(a[0], a[1]);
            }
            else if (cmd[i + 1] && cmd[i + 1][0] !== '-')
                this.args.set(c, cmd[++i]);
            else
                this.args.set(c, '');
        }
    }
    get(name) {
        let v = this.args.get(name);
        if (v === undefined) {
            v = this.args.get('-' + name);
        }
        return v !== null && v !== void 0 ? v : null;
    }
    has(name) {
        return this.args.has(name) || this.args.has('-' + name);
    }
}
var Type;
(function (Type) {
    Type[Type["NONE"] = 0] = "NONE";
    Type[Type["INTEGER"] = 1] = "INTEGER";
    Type[Type["FLOAT"] = 2] = "FLOAT";
    Type[Type["STRING"] = 3] = "STRING";
    Type[Type["BOOLEAN"] = 4] = "BOOLEAN";
})(Type || (Type = {}));
;
(() => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const cmdReader = new CmdReader(process.argv.slice(2));
    const legalChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_';
    const numbers = '0123456789';
    if (cmdReader.has('h') || cmdReader.has('-help')) {
        console.log('---------------------------------------');
        console.log('                 Help                  ');
        console.log('---------------------------------------');
        console.log('');
        console.log('-keep\n    E.g. "-keep"');
        console.log('    Keep the generated javascript file.\n');
        console.log('-f {name of the file}\n    E.g. "-f visualg.alg"');
        console.log('    Alg file to be executed. If not specified it will try "visualg.alg" by default.');
    }
    const defaultPath = path_1.default.join(__dirname, 'visualg.alg');
    const filePath = cmdReader.get('f') ? path_1.default.join(__dirname, cmdReader.get('f')) : defaultPath;
    if (!(0, fs_1.existsSync)(filePath)) {
        console.log(`${filePath.substr(filePath.lastIndexOf('\\') + 1, filePath.length)} does not exist`);
        return;
    }
    const file = (yield (0, promises_1.readFile)(filePath, 'utf-8')).replace(/\B\/\/.+/g, '').trim();
    // Old way
    const constantsBody = (_a = file.match(/(?<=Const)(.|\n|\r)+(?=var)/gi)) !== null && _a !== void 0 ? _a : file.match(/(?<=Const)(.|\n|\r)+(?=Inicio)/gi);
    let constArr;
    if (constantsBody && constantsBody[0]) {
        constArr = constantsBody[0].trim().split(/\r\n/g).map(v => v.trim());
    }
    const vars = [];
    const varBody = (_b = file.match(/(?<=var)(.|\n|\r)+(?=Const)/gi)) !== null && _b !== void 0 ? _b : file.match(/(?<=var)(.|\n|\r)+(?=Inicio)/gi);
    if (!varBody || !varBody[0]) {
        console.log('Variables section not found.');
        return;
    }
    const varArr = varBody[0].trim().split(/\r\n/g).map(v => v.trim());
    function getVars(arr, isConst = false) {
        for (let i = 0; i < arr.length; i++) {
            const varSplit = isConst ? arr[i].split('=').map(v => v.trim()) : arr[i].split(':').map(v => v.trim());
            if (varSplit[0] === '')
                continue;
            const varNames = varSplit[0].split(',').map(v => v.trim());
            if (varSplit[1] === undefined && !isConst) {
                if (varNames.length < 2)
                    console.log('Var "' + varNames + '" has no type.');
                else
                    console.log('Var ' + varNames.map(v => '"' + v + '"').join(' and ') + ' have no type.');
                return;
            }
            let type = Type.NONE;
            let v = '';
            if (!isConst) {
                if (varSplit[1].toLowerCase() === 'inteiro') {
                    type = Type.INTEGER;
                }
                else if (varSplit[1].toLowerCase() === 'real') {
                    type = Type.FLOAT;
                }
                else if (varSplit[1].toLowerCase() === 'caractere') {
                    type = Type.STRING;
                }
                else if (varSplit[1].toLowerCase() === 'logico') {
                    type = Type.BOOLEAN;
                }
                else {
                    console.log(`Type ${varSplit[1].toLowerCase()} does not exist`);
                    return;
                }
            }
            else {
                if (typeof Number(varSplit[1]) === 'number') {
                    type = Type.FLOAT;
                    v = varSplit[1];
                }
                else if (varSplit[1].toLowerCase() === 'verdadeiro' || varSplit[1].toLowerCase() === 'falso') {
                    type = Type.BOOLEAN;
                    v = varSplit[1].toLowerCase() === 'verdadeiro' ? 'true' : 'false';
                }
                else {
                    type = Type.STRING;
                    v = varSplit[1];
                }
            }
            for (let j = 0; j < varNames.length; j++) {
                if (varNames[j].split('').some(v => !legalChars.includes(v))) {
                    console.log(`Variable ${varNames[j]} has illegal characters.`);
                    return;
                }
                else if (numbers.includes(varNames[j][0])) {
                    console.log(`Variable ${varNames[j]}: a variable name cannot start with a number.`);
                    return;
                }
                vars.push({ type: type, name: varNames[j], value: isConst ? v : '', isConst: isConst });
            }
        }
    }
    getVars(varArr);
    if (constArr) {
        getVars(constArr, true);
    }
    let outData = `;(async () => {
        var stdin = process.openStdin();

        const PI = ${Math.PI};

        const sqrNum = (v) => {
            return v * v;
        }
    `;
    vars.forEach(v => {
        if (v.type === Type.INTEGER || v.type === Type.FLOAT)
            outData += `\n${v.isConst ? 'const' : 'let'} ${v.name} = ${v.isConst ? v.value : '0'};`;
        if (v.type === Type.STRING)
            outData += `\n${v.isConst ? 'const' : 'let'} ${v.name} = ${v.isConst ? v.value : '""'};`;
        if (v.type === Type.BOOLEAN)
            outData += `\n${v.isConst ? 'const' : 'let'} ${v.name} = ${v.isConst ? v.value : 'false'};`;
    });
    let bodySec = file.match(/(?<=Inicio)(.|\n|\r)+(?=FimAlgoritmo)/gi);
    if (!bodySec || !bodySec[0]) {
        console.log('Main body section not found.');
        return;
    }
    bodySec = bodySec[0].trim();
    let body = bodySec
        .replace(/;(\r|\n)/gim, '')
        .replace(/\bescreva\s*\(.+\)/gi, (m) => {
        var _a, _b;
        const n = (_a = m.match(/(?<=\().+(?=\))/i)) !== null && _a !== void 0 ? _a : [];
        return `process.stdout.write(String(${(_b = n[0]) !== null && _b !== void 0 ? _b : ''}) + ' ');`;
    })
        .replace(/\bInt\s*\(.*\)/gi, (m) => {
        return m.replace(/\bInt/gi, 'Math.floor');
    })
        .replace(/\babs\s*\(.*\)/gi, (m) => {
        return m.replace(/\babs/gi, 'Math.abs');
    })
        .replace(/\bsin\s*\(.*\)/gi, (m) => {
        return m.replace(/\bsin/gi, 'Math.sin');
    })
        .replace(/\bsqrt\s*\(.*\)/gi, (m) => {
        return m.replace(/\bsqrt/gi, 'Math.sqrt');
    })
        .replace(/\bsqr\s*\(.*\)/gi, (m) => {
        return m.replace(/\bsqr/gi, 'sqrNum');
    })
        .replace(/\bcos\s*\(.*\)/gi, (m) => {
        return m.replace(/\bcos/gi, 'Math.cos');
    })
        .replace(/\bescreval\s*\(.*\)/gi, (m) => {
        var _a, _b;
        const n = (_a = m.match(/(?<=\().+(?=\))/i)) !== null && _a !== void 0 ? _a : [];
        return `console.log(String(${(_b = n[0]) !== null && _b !== void 0 ? _b : ''}) + ' ');`;
    })
        .replace(/^\s*(se|at(e|é)).+\s*<>\s*/gim, (m) => {
        return m.replace('<>', '!=');
    })
        .replace(/\b(\s|\))e(\s|\))\b/gi, '&&')
        .replace(/\b(\s|\))ou(\s|\))\b/gi, '||')
        .replace(/\b(\w|\d)+:\d:\d\b/gi, (m) => {
        var _a, _b;
        let p = m.split(':');
        let q = Number(m.split(':')[2]);
        let n = ((_a = vars.find(v => v.name === p[0].trim())) === null || _a === void 0 ? void 0 : _a.type) === Type.INTEGER || ((_b = vars.find(v => v.name === p[0].trim())) === null || _b === void 0 ? void 0 : _b.type) === Type.FLOAT || Number(p[0]) !== NaN ? '' + p[0] + '.toFixed(' + q + ')' : m;
        return n;
    })
        .replace(/^\s*(se|at(e|é)).+\s*=\s*/gim, (m, a, b) => {
        // return b[a - 1] !== '<' && b[a - 1] !== '>' ? m.replace('=', '==') : m
        return m;
    })
        .replace(/^\s*(\w|\d)*\s*<-\s*("|\d|\(|[a-zA-Z])/gim, (m) => {
        return m.replace('<-', '=');
    })
        .replace(/^\s*(\w|\d)*\s*:=\s*("|\d|\(|[a-zA-Z])/gim, (m) => {
        return m.replace(':=', '=');
    })
        .replace(/^\s*\bse.+entao\b/gim, (m) => {
        return m
            .replace(/\bse\b/gi, 'if(')
            .replace(/\bentao\b/gi, ') {');
    })
        .replace(/^\s*senao\s*^/gim, (m) => {
        return m.replace(/senao/gi, '} else {');
    })
        .replace(/^\s*interrompa\s*^/gim, (m) => {
        return m.replace(/interrompa/gi, 'break;');
    })
        .replace(/^\s*Repita\s*$/gim, (m) => {
        return m.replace(/replace/gi, 'while(true) {');
    })
        .replace(/^\s*at(é|e).+\s*$/gim, (m) => {
        return `if (${m}) { break; } \n }`.replace(/at(é|e)/gi, '');
    })
        .replace(/\bEnquanto.+faca$/gim, (m) => {
        return m
            .replace(/\bEnquanto\b/gi, 'while(')
            .replace(/\bfaca\b/gi, ') {');
    })
        .replace(/\bFimenquanto$\b/gim, '}')
        .replace(/\bfimse$\b/gim, '}')
        .replace(/^\s*fimescolha\s*$/gim, '}')
        .replace(/\bescolha\s+.+\b/gi, (m) => {
        let n = m.replace(/(?:Escolha\s+)/gi, '');
        return `switch(${n}) {`;
    })
        .replace(/caso(?=\s+\d+)/gi, 'case')
        .replace(/\boutro\s*caso\b/gi, 'default:')
        .replace(/case\s+.+/gi, (m) => {
        return m + ':';
    })
        .replace(/\bcase\b.+:(\r\n|.)*?(?=case)/gi, (m) => {
        return m + '\nbreak;\n';
    })
        .replace(/case(.|\r\n)+(?=})/, (m) => {
        return m + '\nbreak;\n';
    })
        .replace(/,(?!(?=[^"]*"[^"]*(?:"[^"]*"[^"]*)*$))/gi, (m, a, b) => {
        return b[a - 1] === '"' || b[a - 2] === '"' ? ' + " " + ' : ' + ';
    })
        .replace(/\s*(?<=case).+\+(?!(?=[^"]*"[^"]*(?:"[^"]*"[^"]*)*$))/gi, (m) => {
        return m.replace(/\+/gi, ': \ncase');
    })
        .replace(/Leia\s*(.+)/gi, (m) => {
        // @ts-ignore
        let n = m.match(/\(.+(?=)/)[0].trim();
        n = n.slice(1, n.length - 1);
        // @ts-ignore
        const t = vars.find(jk => jk.name === n).type;
        if (t === Type.INTEGER || t === Type.FLOAT) {
            return `
              await new Promise((resolve, reject) => {
                function n(arg) {
                  ${n} = Number(arg.toString().replace(/((\\r)?\\n)$/, '').trim());
                  stdin.off('data', n);
                  resolve();
            
                }
                stdin.on('data', n);
              })
              `;
        }
        else {
            return `
              await new Promise((resolve, reject) => {
                function n(arg) {
                  ${n} = arg.toString().replace(/((\\r)?\\n)$/, '').trim();
                  stdin.off('data', n);
                  resolve();
                }
                stdin.on('data', n);
              })
              `;
        }
    });
    outData += `\n${body}`;
    outData += `

    console.log("\\n>>> End of the program!");
    
    process.stdout.write('>>> Press any key to exit...');

    stdin.on('data', () => {
        stdin.end();
        process.exit(0);
    });
    
    })();`;
    (0, fs_1.writeFileSync)(path_1.default.resolve(__dirname, 'outfile.js'), outData);
    if (!cmdReader.has('norun')) {
        const { exec } = require("child_process");
        exec('start cmd.exe /c node outfile.js');
    }
}))();
