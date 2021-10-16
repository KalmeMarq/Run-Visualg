const { readFileSync, writeFileSync } = require("fs")

let file = readFileSync('visualg.arg').toString('utf-8')
file = file.replace(/\B\/\/.+/g, '').trim()

let arq = file.match(/(?<=arquivo\s*").+(?=")/i)

let data = `
// ${file.match(/Algoritmo.+"/gi)[0]}

const { resolve } = require("path");
const { rmSync, readFileSync, writeFileSync, existsSync } = require("fs");
${process.argv[2] === '-keep' ? `` : `
rmSync('outfile.js')`}

let m = ""
let p = ${arq.length > 0 ? 'true': 'false'}

if (existsSync(resolve(__dirname, "${arq}"))) {
  m = readFileSync(resolve(__dirname, "${arq}")).toString('utf-8')
}

;(async () => {
var stdin = process.openStdin();
`


let vars = []
let varBody = file.match(/Var(.|\r\n)+(?=Inicio)/gi)[0]
varBody = varBody.replace(/Var/gi, '').trim()
varBody.split('\r\n').forEach(l => {
  if (l !== '') {
    let b = l.split(':')
    b = b.map(n => n.trim())

    let v = null
    let t = 'null'
    let m = 0
    if (b[1] === 'caractere') {
      t = 'caractere'
      v = '""'
    } else if (b[1].startsWith('vetor')) {
      let n = b[1].match(/\[.+\]/)[0].split('..')
      n[0] = n[0].slice(1)
      n[1] = n[1].slice(0, n[1].length - 1)
      m = Number(n[1])
      t = 'array'
    } else if (b[1] === 'inteiro' || b[1] === 'real') {
      v = 0
      t = 'number'
    }

    vars.push({
      name: b[0],
      value: v,
      type: t,
      len: m
    })
  }
})

vars.forEach(v => {
  if (v.type === 'array') {
    data += `let ${v.name} = new Array(${v.len}).fill(0);\n`
  } else {
    data += `let ${v.name} = ${v.value};\n`
  }
})


let body = file.match(/\bInicio(.|\n|\r)+(?=Fimalgoritmo)/gi)[0]
body = body.replace(/Inicio/gi, '').trim()

body = body.replace(/\be\b/gi, '&&')

body = body.replace(/para.+faca/gi, (m) => {
  let v = m.match(/(?<=para).+(?=de)/gi)[0].trim()

  let fn = Number(m.match(/(?<=de).+(?=at(é|e))/gi)[0].trim())
  let ln = Number(m.match(/(?<=at(e|é)).+(?=(passo|faca))/gi)[0].trim())
  let bn = m.match(/(?<=passo)(-|.)+(?=faca)/gi) ?? ['1']
  let r = Number(bn[0].trim())

  let s = fn > ln ? '>=' : '<='

  return `for (${v} = ${fn}; ${v} ${s} ${ln}; ${v} = ${v} + (${r})) {`
})

body = body.replace(/fimpara/gi, '}')

body = body.replace(/Escreva\s+\(.+/gi, (m) => {
  let n = m.match(/\(.+\)/)[0]  
  return `process.stdout.write(String(${n}) + ' ');`
})

body = body.replace(/Escreval\s*\(.+/gi, (m) => {
  let n = m.match(/\(.+\)/)[0]
  let p = n.split(/,(?!(?=[^"]*"[^"]*(?:"[^"]*"[^"]*)*$))/)
  p = p.map(q => `(${q})`)

  return `console.log${p.join()};`
})

body = body.replace(/,(?!(?=[^"]*"[^"]*(?:"[^"]*"[^"]*)*$))/gi, ' + ')

body = body.replace(/<-/g, '=')

body = body.replace(/Repita/gi, 'while(true) {')

body = body.replace(/at(é|e).+/gi, (m) => {
  return `if (${m}) { break; } \n }`.replace(/at(é|e)/gi, '')
})

body = body.replace(/\bEnquanto\b/gi, 'while(')
body = body.replace(/\bfaca\b/gi, ') {')
body = body.replace(/\bfimenquanto\b/gi, '}')

body = body.replace(/\bescolha\s+.+\b/gi, (m) => {
  let n = m.replace(/(?:Escolha\s+)/gi, '')
  return `switch(${n}) {`
})

body = body.replace(/caso(?=\s+\d+)/gi, 'case')

body = body.replace(/case\s+.+/gi, (m) => {
  return m + ':'
})

body = body.replace(/\bfimescolha\b/gi, '}')
body = body.replace(/\bcase\b.+:(\r\n|.)*?(?=case)/gi, (m) => {
  return m + '\nbreak;\n'
})
body = body.replace(/case(.|\r\n)+(?=})/, (m) => {
  return  m + '\nbreak;\n'
})

body = body.replace(/\bse\b/gi, 'if(')
body = body.replace(/\bentao\b/gi, ') {')
body = body.replace(/\bsenao\b/gi, '} else {')
body = body.replace(/\bfimse\b/gi, '}')

body = body.replace(/Leia\s+(.+)/gi, (m) => {
  let n = m.match(/\(.+(?=)/)[0].trim()
  n = n.slice(1, n.length - 1)
  const t = vars.find(jk => jk.name === n).type

  if (t === 'number') {
    return `
    await new Promise((resolve, reject) => {
      function n(arg) {
        ${n} = Number(arg.toString().replace(/((\\r)?\\n)$/, '').trim());
        if (p) {
          m += '\\n' + ${n}
        }
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

        if (p) {
          m += '\\n' + ${n}
        }
        resolve();
  
      }
      stdin.on('data', n);
    })
    `
  }
})

data += '\n' + body + '\n'
data += `

console.log("\\n\\n>>> End of the program!");
  
if (p) {
  writeFileSync(resolve(__dirname, "${arq}"), m);
}

process.stdout.write('>>> Press any key to exit...');
stdin.on('data', () => {
  stdin.end();
  process.exit(0);
});
})();`
writeFileSync('outfile.js', data)

if (process.argv[3] !== '-norun') {
  const { exec } = require("child_process");
  exec('start cmd.exe /c node outfile.js')  
}