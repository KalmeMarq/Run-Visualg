Algoritmo "Dependentes Funcionário"
// Disciplina   : [Aplicações Informáticas]
// Professor   : Antonio Carlos Nicolodi 
// Descrição   : Aqui você descreve o que o programa faz! (função)
// Autor(a)    : Nome do(a) aluno(a)
// Data atual  : 10/21/2021
Var
// Seção de Declarações das variáveis
name: caractere
sal: real
depends: inteiro
newSal: real

Inicio
// Seção de Comandos, procedimento, funções, operadores, etc...
Escreva ("Nome do funcionário: ")
Leia (name)

Escreva ("Salário: ")
Leia (sal)

newSal <- sal

Escreva ("Número de dependentes: ")
Leia (depends)

Escolha depends
   caso 0
      newSal <- newSal + (sal * (5/100))
   caso 1, 2, 3
      newSal <- newSal + (sal * (10/100))
   caso 4, 5, 6
      newSal <- newSal + (sal * (15/100))
   outro caso
      newSal <- newSal + (sal * (18/100))
Fimescolha
      
Escreval ("")
Escreval ("Nome: ", name)
Escreval ("Novo salário: ", newSal)


Fimalgoritmo