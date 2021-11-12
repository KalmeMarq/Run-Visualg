import { existsSync, writeFileSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";

class CmdReader {
    public args: Map<string, string>;
    
    public constructor(cmd: string[]) {
        this.args = new Map();
        this.read(cmd);
    }

    public read(cmd: string[]): void {
        for (let i = 0; i < cmd.length; i++) {
            let c = cmd[i];
            if (c[0] !== '-') {
                continue;
            }
    
            if (c.split('=').length === 2) {
                const a = c.split('=');
                this.args.set(a[0], a[1]);
            }
            else if (cmd[i + 1] && cmd[i + 1][0] !== '-') this.args.set(c, cmd[++i]);
            else this.args.set(c, '');
        }
    }

    public get(name: string): string | null {
        let v = this.args.get(name);

        if (v === undefined) {
            v = this.args.get('-' + name)
        }

        return v ?? null;
    }

    public has(name: string) {
        return this.args.has(name) || this.args.has('-' + name);
    }
}

enum Type {
    NONE,
    INTEGER,
    FLOAT,
    STRING,
    BOOLEAN
}

;(async () => {
    const cmdReader = new CmdReader(process.argv.slice(2));
    const legalChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'
    const numbers = '0123456789';

    if (cmdReader.has('h') || cmdReader.has('-help')) {
        console.log('---------------------------------------')
        console.log('                 Help                  ')
        console.log('---------------------------------------')
        console.log('')
        console.log('-keep\n    E.g. "-keep"')
        console.log('    Keep the generated javascript file.\n');
        console.log('-f {name of the file}\n    E.g. "-f visualg.alg"')
        console.log('    Alg file to be executed. If not specified it will try "visualg.alg" by default.');
    }
   
    const defaultPath = path.join(__dirname, 'visualg.alg');
    const filePath = cmdReader.get('f') ? path.join(__dirname, cmdReader.get('f') as string) : defaultPath;

    if (!existsSync(filePath)) {
        console.log(`${filePath.substr(filePath.lastIndexOf('\\') + 1, filePath.length)} does not exist`)
        return;
    }

    const file = (await readFile(filePath, 'utf-8')).replace(/\B\/\/.+/g, '').trim();

    // Old way
    const constantsBody = file.match(/(?<=Const)(.|\n|\r)+(?=var)/gi) ?? file.match(/(?<=Const)(.|\n|\r)+(?=Inicio)/gi);

    let constArr;
    if (constantsBody && constantsBody[0]) {
        constArr = constantsBody[0].trim().split(/\r\n/g).map(v => v.trim());
    }

    const vars: { type: Type, name: string, value: string, isConst: boolean }[] = [];
    const varBody = file.match(/(?<=var)(.|\n|\r)+(?=Const)/gi) ?? file.match(/(?<=var)(.|\n|\r)+(?=Inicio)/gi);
    if (!varBody || !varBody[0]) {
        console.log('Variables section not found.')
        return;
    }
    
    const varArr = varBody[0].trim().split(/\r\n/g).map(v => v.trim());

    function getVars(arr: string[], isConst: boolean = false) {
        for (let i = 0; i < arr.length; i++) {
            const varSplit = isConst ? arr[i].split('=').map(v => v.trim()) : arr[i].split(':').map(v => v.trim());
            
            if (varSplit[0] === '') continue;
    
            const varNames = varSplit[0].split(',').map(v => v.trim());
    
            if (varSplit[1] === undefined && !isConst) {
                if (varNames.length < 2) console.log('Var "' + varNames  + '" has no type.')
                else console.log('Var ' + varNames.map(v => '"' + v + '"').join(' and ')  +' have no type.')
                return;
            }
    
            let type = Type.NONE;
            let v: any = '';
            if (!isConst) {
                if (varSplit[1].toLowerCase() === 'inteiro') {
                    type = Type.INTEGER;
                } else if (varSplit[1].toLowerCase() === 'real') {
                    type = Type.FLOAT;
                } else if (varSplit[1].toLowerCase() === 'caractere') {
                    type = Type.STRING;
                } else if (varSplit[1].toLowerCase() === 'logico') {
                    type = Type.BOOLEAN;
                } else {
                    console.log(`Type ${varSplit[1].toLowerCase()} does not exist`)
                    return;
                }
            } else {
                if (typeof Number(varSplit[1]) === 'number') {
                    type = Type.FLOAT;
                    v = varSplit[1]
                } else if (varSplit[1].toLowerCase() === 'verdadeiro' || varSplit[1].toLowerCase() === 'falso') {
                    type = Type.BOOLEAN;
                    v = varSplit[1].toLowerCase() === 'verdadeiro' ? 'true' : 'false'
                } else {
                    type = Type.STRING;
                    v = varSplit[1]
                }
            }
    
            for (let j = 0; j < varNames.length; j++) {
                if (varNames[j].split('').some(v => !legalChars.includes(v))) {
                    console.log(`Variable ${varNames[j]} has illegal characters.`)
                    return;
                } else if (numbers.includes(varNames[j][0])) {
                    console.log(`Variable ${varNames[j]}: a variable name cannot start with a number.`)
                    return;
                }

                vars.push({ type: type, name: varNames[j], value: isConst ? v : '', isConst: isConst })
            }
        }
    }

    getVars(varArr)
    if (constArr) {
        getVars(constArr, true)
    }

    let outData = 
    `;(async () => {
        var stdin = process.openStdin();

        const PI = ${Math.PI};

        const sqrNum = (v) => {
            return v * v;
        }
    `
    
    vars.forEach(v => {
        if (v.type === Type.INTEGER || v.type === Type.FLOAT) outData += `\n${v.isConst ? 'const' : 'let'} ${v.name} = ${v.isConst ? v.value : '0'};`
        if (v.type === Type.STRING) outData += `\n${v.isConst ? 'const' : 'let'} ${v.name} = ${v.isConst ? v.value : '""'};`
        if (v.type === Type.BOOLEAN) outData += `\n${v.isConst ? 'const' : 'let'} ${v.name} = ${v.isConst ? v.value : 'false'};`
    })

    let bodySec: any = file.match(/(?<=Inicio)(.|\n|\r)+(?=FimAlgoritmo)/gi);
    if (!bodySec || !bodySec[0]) {
        console.log('Main body section not found.')
        return;
    }

    bodySec = bodySec[0].trim();
    
    let body: string = (bodySec as string)
        .replace(/;(\r|\n)/gim, '')
        .replace(/\bescreva\s*\(.+\)/gi, (m) => {
            const n = m.match(/(?<=\().+(?=\))/i) ?? [];
            return `process.stdout.write(String(${n[0] ?? ''}) + ' ');`
        })
        .replace(/\bInt\s*\(.*\)/gi, (m) => {
            return m.replace(/\bInt/gi, 'Math.floor')
        })
        .replace(/\babs\s*\(.*\)/gi, (m) => {
            return m.replace(/\babs/gi, 'Math.abs')
        })
        .replace(/\bsin\s*\(.*\)/gi, (m) => {
            return m.replace(/\bsin/gi, 'Math.sin')
        })
        .replace(/\bsqrt\s*\(.*\)/gi, (m) => {
            return m.replace(/\bsqrt/gi, 'Math.sqrt')
        })
        .replace(/\bsqr\s*\(.*\)/gi, (m) => {
            return m.replace(/\bsqr/gi, 'sqrNum')
        })
        .replace(/\bcos\s*\(.*\)/gi, (m) => {
            return m.replace(/\bcos/gi, 'Math.cos')
        })
        .replace(/\bescreval\s*\(.*\)/gi, (m) => {
            const n = m.match(/(?<=\().+(?=\))/i) ?? [];
            return `console.log(String(${n[0] ?? ''}) + ' ');`
        })
        .replace(/^\s*(se|at(e|é)).+\s*<>\s*/gim, (m) => {
            return m.replace('<>', '!=')
        })
        .replace(/\b(\s|\))e(\s|\))\b/gi, '&&')
        .replace(/\b(\s|\))ou(\s|\))\b/gi, '||')
        .replace(/\b(\w|\d)+:\d:\d\b/gi, (m) => {
            let p: any  = m.split(':');
            let q: any = Number(m.split(':')[2]);

            let n = vars.find(v => v.name === p[0].trim())?.type === Type.INTEGER || vars.find(v => v.name === p[0].trim())?.type === Type.FLOAT || Number(p[0]) !== NaN ? '' + p[0] + '.toFixed(' + q + ')' : m

            return n;
        })
        .replace(/^\s*(se|at(e|é)).+\s*=\s*/gim, (m, a, b) => {
            // return b[a - 1] !== '<' && b[a - 1] !== '>' ? m.replace('=', '==') : m
            return m
        })
        .replace(/^\s*(\w|\d)*\s*<-\s*("|\d|\(|[a-zA-Z])/gim, (m) => {
            return m.replace('<-', '=')
        })
        .replace(/^\s*(\w|\d)*\s*:=\s*("|\d|\(|[a-zA-Z])/gim, (m) => {
            return m.replace(':=', '=')
        })
        .replace(/^\s*\bse.+entao\b/gim, (m) => {
            return m
                .replace(/\bse\b/gi, 'if(')
                .replace(/\bentao\b/gi, ') {')
        })
        .replace(/^\s*senao\s*^/gim, (m) => {
            return m.replace(/senao/gi, '} else {')
        })
        .replace(/^\s*interrompa\s*^/gim, (m) => {
            return m.replace(/interrompa/gi, 'break;')
        })
        .replace(/^\s*Repita\s*$/gim, (m) => {
            return m.replace(/replace/gi, 'while(true) {')
        })
        .replace(/^\s*at(é|e).+\s*$/gim, (m) => {
            return `if (${m}) { break; } \n }`.replace(/at(é|e)/gi, '')
        })
        .replace(/\bEnquanto.+faca$/gim, (m) => {
            return m
                .replace(/\bEnquanto\b/gi, 'while(')
                .replace(/\bfaca\b/gi, ') {')
        })
        .replace(/\bFimenquanto$\b/gim, '}')
        .replace(/\bfimse$\b/gim, '}')
        .replace(/^\s*fimescolha\s*$/gim, '}')
        .replace(/\bescolha\s+.+\b/gi, (m) => {
            let n = m.replace(/(?:Escolha\s+)/gi, '')
            return `switch(${n}) {`
          })
        .replace(/caso(?=\s+\d+)/gi, 'case')
        .replace(/\boutro\s*caso\b/gi, 'default:')
        .replace(/case\s+.+/gi, (m) => {
            return m + ':'
          })
        .replace(/\bcase\b.+:(\r\n|.)*?(?=case)/gi, (m) => {
            return m + '\nbreak;\n'
          })
        .replace(/case(.|\r\n)+(?=})/, (m) => {
            return  m + '\nbreak;\n'
          })
        .replace(/,(?!(?=[^"]*"[^"]*(?:"[^"]*"[^"]*)*$))/gi, (m, a, b) => {
            return b[a - 1] === '"' || b[a - 2] === '"' ? ' + " " + ' : ' + ';
        })
        .replace(/\s*(?<=case).+\+(?!(?=[^"]*"[^"]*(?:"[^"]*"[^"]*)*$))/gi, (m) => {
            return m.replace(/\+/gi, ': \ncase')
        })
        .replace(/Leia\s*(.+)/gi, (m) => {
            // @ts-ignore
            let n = m.match(/\(.+(?=)/)[0].trim()
            n = n.slice(1, n.length - 1)
            // @ts-ignore
            const t = vars.find(jk => jk.name === n).type
          
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
              `
            } else {
              return `
              await new Promise((resolve, reject) => {
                function n(arg) {
                  ${n} = arg.toString().replace(/((\\r)?\\n)$/, '').trim();
                  stdin.off('data', n);
                  resolve();
                }
                stdin.on('data', n);
              })
              `
            }
          })
    
    outData += `\n${body}`
    outData += `

    console.log("\\n>>> End of the program!");
    
    process.stdout.write('>>> Press any key to exit...');

    stdin.on('data', () => {
        stdin.end();
        process.exit(0);
    });
    
    })();`

    writeFileSync(path.resolve(__dirname, 'outfile.js'), outData);

    if (!cmdReader.has('norun')) {
        const { exec } = require("child_process");
        exec('start cmd.exe /c node outfile.js')  
      }
})();