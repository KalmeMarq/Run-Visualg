const { readFileSync, writeFileSync } = require("fs")


const dataOld = `
const { rmSync } = require("fs");

rmSync('outfile.js')

;(async () => {
  var stdin = process.openStdin();

  // Var
  let count = 0;
  let nomeF = "";
  let notaF = "";

  let nome = "";
  let nota = "";
  
  let index = 0; 

  // Begin
  process.stdout.write("How many students there are? ");
  await new Promise((resolve, reject) => {
    function n(arg) {
      count = Number(arg.toString().replace(/((\\r)?\\n)$/, ''));
      stdin.off('data', n);
      resolve();

    }
    stdin.on('data', n);
  })

  notaF = 0;
  nota = 0;
  index = 0;

  while(index < count) {
    console.log("Student " + (index + 1));

    process.stdout.write("Name: ");
    await new Promise((resolve, reject) => {
      function n(arg) {
        nomeF = arg.toString().replace(/((\\r)?\\n)$/, '');
        stdin.off('data', n);
        resolve();
      }
      stdin.on('data', n);
    });

    process.stdout.write("Nota: ")
    await new Promise((resolve, reject) => {
      function n(arg) {
        notaF = Number(arg.toString().replace(/((\\r)?\\n)$/, ''))
        stdin.off('data', n);
        resolve();
      }
      stdin.on('data', n);
    });

    if (notaF > nota) {
      nome = nomeF;
      nota = notaF;
    }

    index = index + 1;
  }

  if (nome) {
    console.log("A melhor nota é do " +  nome + " (" + nota + ").");
  }

  console.log("\\n>>> End of the program!");
  
  process.stdout.write('>>> Press any key to exit...');
  stdin.on('data', () => {
    stdin.end();
    process.exit(0);
  });
})();
`

let file = readFileSync('visualg.arg').toString('utf-8')
file = file.replace(/\B\/\/.+/g, '').trim()

let data = `
// ${file.match(/Algoritmo.+"/)[0]}

${process.argv[2] === '-keep' ? `` : `
const { rmSync } = require("fs");
rmSync('outfile.js')`}

;(async () => {
var stdin = process.openStdin();
`

let vars = []
let varBody = file.match(/Var(.|\r\n)+(?=Inicio)/)[0]
varBody = varBody.replace(/Var/, '').trim()
varBody.split('\r\n').forEach(l => {
  if (l !== '') {
    let b = l.split(':')
    b = b.map(n => n.trim())

    vars.push({
      name: b[0],
      value: b[1] === 'inteiro' || b[1] === 'real' ? 0 : b[1] === 'caractere' ? '""' : null,
      type: b[1] === 'inteiro' || b[1] === 'real' ? 'number' : b[1] === 'caractere' ? 'string' : null
    })
  }
})

vars.forEach(v => {
  data += `let ${v.name} = ${v.value};\n`
})


let body = file.match(/\bInicio(.|\n|\r)+(?=Fimalgoritmo)/gi)[0]
body = body.replace(/Inicio/gi, '').trim()

body = body.replace(/Escreva\s+\(.+/gi, (m) => {
  let n = m.match(/\(.+\)/)[0]
  
  return `process.stdout.write(String(${n}) + ' ');`
})

body = body.replace(/Escreval\s+\(.+/gi, (m) => {
  let n = m.match(/\(.+\)/)[0]
  return `console.log${n};`
})

body = body.replace(/<-/g, '=')

body = body.replace(/\bEnquanto\b/gi, 'while(')
body = body.replace(/\bfaca\b/gi, ') {')
body = body.replace(/\bfimenquanto\b/gi, '}')

body = body.replace(/\bse\b/gi, 'if(')
body = body.replace(/\bentao\b/gi, ') {')
body = body.replace(/\bsenao\b/gi, '} else {')
body = body.replace(/\bfimse\b/gi, '}')

body = body.replace(/Leia\s+(.+)/gi, (m) => {
  let n = m.match(/\(.+/)[0]
  n = n.slice(1, n.length - 1)
  const t = vars.find(jk => jk.name === n).type

  if (t === 'number') {
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


data += '\n' + body + '\n'
data += `

console.log("\\n>>> End of the program!");
  
process.stdout.write('>>> Press any key to exit...');
stdin.on('data', () => {
  stdin.end();
  process.exit(0);
});
})();`
writeFileSync('outfile.js', data)
const { exec } = require("child_process");
exec('start cmd.exe /c node outfile.js')