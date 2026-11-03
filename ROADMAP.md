# Roadmap — do protótipo ao produto no ar

Documento de execução. Responde a quatro perguntas, nesta ordem:

1. [Onde estamos](#1-onde-estamos)
2. [O que está pendente de decisão](#2-pendências-de-decisão) (você e a academia)
3. [Em que ordem construir](#3-ordem-de-execução) até o lançamento
4. [Onde hospedar, enviar e-mail e quanto custa](#4-infraestrutura-e-custos)

Documentos relacionados: [`BANCO_DE_DADOS.md`](./BANCO_DE_DADOS.md) + [`db/schema.sql`](./db/schema.sql) (modelo do banco),
[`ROTEIRO_DEMONSTRACAO.md`](./ROTEIRO_DEMONSTRACAO.md) (sessão de validação com o professor) e
[`PLANO_DESENVOLVIMENTO.md`](./PLANO_DESENVOLVIMENTO.md) (visão de produto original; em caso de divergência, vale este roadmap).

---

## 1. Onde estamos

**Feito:** front-end navegável com dados simulados, 10 telas: Login, Painel, Alunos (+ficha), Planos, Financeiro, Presença,
Agenda, Progresso, Configurações e **Check-in do aluno**. Publicado no GitHub Pages.

**Estado do protótipo (front-end com dados simulados) em relação às decisões de presença abaixo:**
o aluno faz check-in em `/checkin`, o professor vê o registro em `/presenca` e na ficha do aluno e pode corrigir qualquer um (Presente / Justificado / Falta).
Quem não fez check-in aparece como "Sem check-in · conta como falta". Os botões "Fechar chamada" e "Marcar todos" foram **removidos**.
Tudo isso é **só interface**: nada persiste, não há login real, e as regras (aula do dia, não sobrescrever o professor) estão no estado em memória, não em servidor.
O protótipo **ainda não** tem: aula cancelada, prazo de check-in/correção, auditoria das correções, e o cálculo de frequência a partir das presenças (o Painel e o campo
"% em 30d" leem números simulados fixos).

### Decisões de produto já tomadas

Registradas aqui para qualquer sessão futura. Mudar uma delas é decisão do dono do produto, não detalhe de implementação.

| # | Decisão | Consequência |
|---|---|---|
| D1 | **Não existe chamada feita pelo professor.** Quem registra presença é o **aluno**, com check-in na aula do dia, pelo celular | A tela do professor deixa de ser "fazer a chamada" e passa a ser "conferir e corrigir presenças" |
| D2 | Fez check-in = **presente na hora**. O professor não precisa marcar nem confirmar | Sem etapa de confirmação; sem "fechar chamada" |
| D3 | **Quem não fez check-in tem falta**: a presença não é computada | A falta é a **ausência do registro**, calculada nas views. Não há rotina que "gere faltas" |
| D4 | O **professor edita livremente**: marcar presente ou falta (e justificado, se mantido) | A correção do professor prevalece sobre o check-in; o aluno não a altera. Toda correção é auditada |
| D5 | O **aluno tem login na v1** (papel `aluno`): Painel, Agenda, Progresso e Check-in | Aumenta a Fase 2 (auth) e a Fase 8 (isolamento entre alunos). Estimativa ajustada |
| D6 | O **risco de fraude é aceito** na v1 (marcar de casa, ou por um colega) | Mitigação futura em ordem de custo: janela de horário, QR no tatame, geolocalização, confirmação do professor. A origem de cada presença já é gravada |
| D7 | Uma aula só entra na frequência se foi **realizada**: não cancelada e com ao menos um presente | Sem chamada do professor não há outro sinal de que a aula aconteceu. Custo: aula em que ninguém fez check-in conta como não realizada |

### Decisões técnicas já tomadas

Tomadas pelo dono do produto com base na seção 4. Mudar uma delas muda custo, segurança e esforço.

| # | Decisão | Consequência |
|---|---|---|
| D8 | **Banco: Neon (PostgreSQL). API: Node + Fastify na Railway.** A Railway já é paga (plano de US$ 5); a Neon está no plano gratuito. A Vercel (plano gratuito) **não** será usada em produção | O login e a **autorização ficam em código** (testável), não em políticas de banco. A autenticação é nossa (senha com Argon2id, recuperação por e-mail, sessão) |
| D9 | **O front é servido pela própria API**, na mesma origem | Sem CORS; cookie de sessão `httpOnly` e `SameSite=Strict`; um só serviço para publicar. Alternativa se algum dia separar: Cloudflare Pages |
| D10 | **Projetos novos e isolados** na Neon e na Railway só para o REDSHIELD; nenhum banco compartilhado com outro sistema | Dados de menores e financeiros não se misturam com outro projeto. Segredos só nas variáveis da Railway, nunca no repositório |
| D11 | **E-mail: Resend** (plano gratuito) com domínio próprio | Limite de 100 e-mails por dia; ver seção 4.3 |

**Por que não a Vercel:** o plano gratuito (Hobby) não permite uso comercial, segundo as [diretrizes de uso justo da Vercel](https://vercel.com/docs/limits/fair-use-guidelines). O sistema de uma academia que cobra mensalidade se enquadra. O plano Pro custa cerca de US$ 20 por mês, sem ganho aqui.

**Efeito prático sobre a frequência (e a graduação):** como falta é o padrão, o aluno que esquece o celular, fica sem sinal ou não tem login perde presença.
Alunos **sem celular ou sem login (crianças, em especial)** só terão presença se o professor marcar. Na prática, para esse grupo, o professor continua fazendo a chamada.
Isso é inerente a D1+D3 e precisa ser validado com a academia (**E14, E15**).

**Não existe ainda:** back-end, banco, autenticação real, persistência (recarregar a página apaga o que foi cadastrado), e-mail,
cobrança, testes automatizados.

### Defeitos e lacunas do protótipo que o back-end não pode herdar

Encontrados lendo o código. Cada um já tem destino no roteiro abaixo.

| # | Problema | Onde | Consequência | Resolvido em |
|---|---|---|---|---|
| 1 | **Não existe vínculo aluno ↔ turma.** A chamada descobre quem aparece na turma infantil pela *existência de responsável* e por ids fixos no código (`'t3'`, `'t4'`) | `pages/Presenca.tsx` | Aluno adulto em duas turmas, ou criança em turma de adultos, não funciona. Criar turma nova quebra a regra | Fase 1 (front) + tabela `aluno_turma` |
| 2 | **Critério de graduação ignora a faixa.** Elegível = 12 meses de casa + 70% de frequência, igual para branca e roxa | `pages/Progresso.tsx` | Lista de elegíveis errada para faixas altas | Decisão E1 → Fase 1 |
| 3 | **Valores em reais (`number`) no front**, centavos (`integer`) no banco | `types/index.ts` | Erro de arredondamento ou cobrança 100× maior se a conversão for esquecida | Fase 2 (camada de API converte na borda) |
| 4 | **Situação de pagamento e frequência são gravadas no aluno** (`statusPagamento`, `frequencia30d`) | `types/index.ts`, `data/mock.ts` | Ficam desatualizadas assim que alguém paga ou falta | No banco viram *views* calculadas |
| 5 | **Login só confere o e-mail;** qualquer senha com 4+ caracteres entra | `app/auth.tsx` | Nenhuma segurança | Fase 2 |
| 6 | "Esqueci a senha", "Editar" (equipe) e "Salvar" em Configurações **não fazem nada** | `Entrar.tsx`, `Configuracoes.tsx` | Botões que parecem funcionar e não funcionam | Fase 1 (esconder ou implementar) |
| 7 | Dados de pessoas reais (menores) ainda sem nenhum registro de consentimento | cadastro de aluno | Risco LGPD | Fase 1 (campos) + Fase 8 |
| 8 | **O Painel do aluno mostra a academia inteira:** total de alunos, taxa de presença geral, lista "Alunos" com nome e frequência de outros alunos (inclusive menores), e links "Ver detalhes" para telas que o aluno não pode abrir. O campo "Buscar aluno" também aparece para ele | `pages/Painel.tsx`, `Topbar.tsx` | Com login de aluno real, vaza dado pessoal de terceiros | Fase 1 (Painel do aluno só com os dados dele) + Fase 8 (testes de acesso) |
| 9 | **Os indicadores do Painel não reagem a ações feitas no sistema.** Os cálculos (`selectors.ts`) leem os dados simulados fixos, não o estado: um check-in aparece na chamada e na ficha, mas não muda "Presença 30 dias" | `data/selectors.ts` | Só é perceptível no protótipo; some quando as métricas vierem do servidor | Fase 6 |
| 10 | **O front ainda carrega o modelo antigo de chamada fechada pelo professor** (`store.fecharChamada`, `chamada.fechada`), que não cabe em D1–D3. A tela não oferece mais esses botões, mas o código e os dados simulados continuam | `store.tsx`, `data/mock.ts`, `types/index.ts` | O back-end não deve implementar "fechar chamada" | Fase 1 e Fase 4 |

**Situação em 2026-10-31** (front ligado à API, branch `feat/front-api`): 1, 3, 4, 5, 7, 8, 9 e 10 estão resolvidos (servidor + telas). O 6 está resolvido (esqueci a senha, Configurações e Equipe sem botões falsos). O 2 segue dependendo de E1: a API usa uma regra provisória e a tela avisa isso. Detalhes em `PROGRESSO.md`.

---

## 2. Pendências de decisão

Sem estas respostas, algumas fases não começam. A coluna **Bloqueia** diz qual.
**Padrão sugerido** é o que eu faria se você não tivesse preferência — não é decisão tomada.

### 2.1 Para você decidir ou responder

| ID | Pergunta | Por que importa | Bloqueia | Padrão sugerido |
|---|---|---|---|---|
| V1 | **O nome REDSHIELD está livre para uso, e a academia tem identidade visual própria?** O nome já foi adotado no sistema. Cores, tipografia e o símbolo (um escudo simples) são **provisórios**: foram prototipados a partir de uma direção de mercado, e a imagem `referencia_visual_conceitual.png` traz símbolo e fotos que **não** são do REDSHIELD | Nome parecido com marca registrada de outra empresa no mesmo ramo pode gerar notificação e obrigar a trocar nome, domínio e material. Divulgar uma identidade que lembre outra rede é o mesmo risco | Publicar para qualquer pessoa fora do círculo (Fase 0) | Consultar o INPI (classes de ensino esportivo e de software) e o registro do domínio; pedir à academia o logotipo e o manual de marca, se existirem; remover `referencia_visual_conceitual.png` do repositório antes de divulgar |
| V2 | **Quem é o cliente?** Uma academia só (a sua / do professor) ou você pretende vender para várias? | Define se multi-tenant, cadastro de academia, cobrança do SaaS, termos de uso e suporte entram no escopo | Fase 2 (escopo de auth e tenant) | Uma academia na v1. O banco já tem `academia_id`, então abrir para várias depois não exige migração |
| ~~V3~~ | ~~Quem paga a infraestrutura e quanto pode custar?~~ **Decidido:** a Railway (US$ 5/mês) já é assinada pelo dono do produto; Neon no plano gratuito até o lançamento. Ver D8 e a [seção 4](#4-infraestrutura-e-custos) | O custo adicional previsto é o domínio (~R$ 40/ano). Pendente: decidir, antes do go-live, se a Neon sobe para um plano pago com mais histórico de restauração | Fase 2 | Manter gratuita no piloto; reavaliar antes do go-live |
| V4 | **Domínio:** qual nome e quem registra? (ex.: `redshield.com.br`; verificar disponibilidade no registro.br) | Necessário para e-mail com boa entrega (SPF/DKIM) e para o endereço definitivo. ~R$ 40/ano | Fase 7 | Registrar no seu CPF/CNPJ já agora, para garantir o nome |
| ~~V5~~ | ~~Papel "aluno" entra na v1?~~ **Decidido: sim**, por causa do check-in. O aluno acessa Painel, Agenda, Progresso e Check-in | Cada papel multiplica as regras de acesso e os testes: login de aluno, recuperação de senha e isolamento entre alunos entram na v1 | Fase 2 | — (aumenta o escopo da Fase 2 e da Fase 8; estimativa ajustada) |
| V6 | **Cobrança automática (Pix/boleto/cartão com baixa automática) entra na v1 ou depois?** | É a maior dor financeira e o maior custo de desenvolvimento e de taxa. Sem ela, o Financeiro é registro manual | Fase 5 | Depois. v1 gera a cobrança e o professor dá baixa manualmente; Pix automático vira a primeira entrega pós-lançamento |
| V7 | **Prazo e data-alvo de lançamento?** | Estimativas abaixo assumem 1 desenvolvedor | Planejamento | — |
| V8 | **Quem desenvolve?** Você, eu com você, ou terceiro? | Define o ritmo e quem opera o servidor depois | Fase 2 | — |

### 2.2 Para ver com a academia (levar na sessão de validação)

Resolve-se com o [`ROTEIRO_DEMONSTRACAO.md`](./ROTEIRO_DEMONSTRACAO.md): cada pergunta aparece lá no momento certo da demonstração.

| ID | Pergunta | Bloqueia |
|---|---|---|
| E1 | **Critério real de graduação.** Tempo mínimo por faixa, frequência mínima, quantidade de graus, se há exame, se o professor decide sozinho | Fase 1 (tela Progresso) e regra de elegibilidade |
| E2 | **Planos reais:** nomes, valores, periodicidade. Existe trancamento? Desconto para irmãos/família? Taxa de matrícula? Aula experimental gratuita? | Fase 3 |
| E3 | **Como recebem hoje:** Pix na chave, boleto, cartão na maquininha, dinheiro? Em que dia do mês cobram — todos no mesmo dia ou cada um no seu? | Fases 3 e 5 |
| E4 | **Categorias de receita e despesa** que ele realmente usa (o protótipo traz uma lista inventada) | Fase 5 |
| E5 | **Turmas:** como se decide quem pertence a qual? Um aluno pode estar em mais de uma? Criança só em turma infantil? Quem é professor de qual turma? | Fase 4 (corrige o problema 1) |
| E6 | **Campos do cadastro:** precisa de CPF? Endereço? Contato de emergência? Atestado médico? Foto? *(atenção: dado de saúde é dado sensível pela LGPD)* | Fase 3 |
| E7 | **Menores:** quem assina o consentimento, como (papel ou digital), e se há termo de uso de imagem | Fase 1 (campos) e Fase 8 |
| E8 | **Há internet no tatame?** Se o aluno fizer check-in sem sinal, ele perde a presença (D3). Isso decide se a v1 precisa de check-in offline | Fase 4 |
| E9 | **Quais avisos por e-mail fazem sentido?** Os alunos têm e-mail? (crianças geralmente não — o aviso iria para o responsável) | Fase 7 |
| E10 | **A planilha atual:** formato, quantidade de linhas, quem exporta, quanto histórico (anos de presença?) vale migrar | Fase 9 |
| E11 | **Feriados e aulas canceladas:** como ele trata hoje? Quem cancela no sistema (o professor)? | Fase 4 |
| E12 | **O que ele faz todo dia?** Qualquer tarefa diária que exija mais de 2 cliques a partir do Painel precisa de ajuste | Fase 1 |
| E13 | **Disposição para o piloto em paralelo à planilha** por 2 a 4 semanas | Fase 10 |
| E14 | **O professor aceita não fazer chamada?** Os alunos têm celular e e-mail para criar o login? E as **crianças e quem não tem celular**: o responsável faz o check-in, ou o professor marca por eles? | Fase 2 e Fase 4 |
| E15 | **Falta por omissão é aceitável?** Aluno que esquece o celular, fica sem sinal ou não tem login tem falta e pode perder elegibilidade à graduação. O professor corrige — com que frequência ele topa fazer isso? | Fase 4 e Fase 6 |
| E16 | **Prazos:** até quando o aluno pode fazer check-in (só durante a aula? até X horas depois?) e até quando o professor pode corrigir (no dia? numa semana? sem limite)? Correção de dia antigo exige justificativa? | Fase 4 |
| E17 | **"Justificado" continua existindo?** O professor falou em "presente ou faltou". Hoje a falta justificada sai do cálculo de frequência (nem presença, nem falta) | Fase 4 |

---

## 3. Ordem de execução

Princípio: **cada fase termina com algo que o professor consegue usar**, e nenhuma fase começa sem que as decisões que a bloqueiam estejam respondidas.
Esforço estimado para 1 desenvolvedor; ajuste conforme dedicação.

Legenda de andamento: `[x]` feito no servidor (ver [`PROGRESSO.md`](./PROGRESSO.md)); `[~]` parcial (autenticação: falta o envio real de e-mail); `[ ]` não iniciado. Itens de front e de infraestrutura seguem em aberto.

```
Fase 0  Desbloquear         ─┐ sem código
Fase 1  Ajustar o front     ─┘
Fase 2  Fundação             ─ banco, auth, deploy
Fase 3  Alunos e planos      ┐
Fase 4  Turmas e presença     ├ núcleo do produto
Fase 5  Cobranças e caixa    ┘
Fase 6  Painel e graduações
Fase 7  E-mail e rotinas
Fase 8  Segurança, LGPD e testes
Fase 9  Importar a planilha
Fase 10 Piloto → lançamento
```

### Fase 0 — Desbloquear (sem código) · ~1 semana

- [ ] Resolver **V1**: verificar disponibilidade do nome REDSHIELD (INPI e domínio), obter a identidade visual da academia e remover `referencia_visual_conceitual.png` antes de divulgar.
- [ ] Responder **V2 e V6** (escopo da v1) — são as que mais mudam o tamanho do trabalho. A V5 já foi decidida (aluno entra, por causa do check-in).
- [ ] Rodar a sessão com o professor usando o [`ROTEIRO_DEMONSTRACAO.md`](./ROTEIRO_DEMONSTRACAO.md) e registrar as respostas **E1–E13**.
- [ ] Registrar o domínio (**V4**).
- [ ] Repositório: deixar privado até V1 estar resolvido (GitHub Pages em repositório privado exige plano pago; ver seção 4 para a alternativa gratuita).

**Pronto quando:** V1, V2, V6 respondidas e o checklist da seção 5 do `PLANO_DESENVOLVIMENTO.md` marcado com o professor.

### Fase 1 — Ajustar o front conforme a validação · ~1 semana

- [ ] **Painel do aluno** (problema 8): só os dados dele (próxima aula, check-in, frequência, faixa). Sem lista de outros alunos, sem indicadores da academia, sem link para tela bloqueada, sem busca de alunos.
- [ ] **Alinhar o protótipo a D1–D7:** retirar do front o resto do modelo antigo (`fechada`, `fecharChamada`), mostrar **aula cancelada**, e calcular frequência a partir das presenças (hoje é número simulado).
- [ ] Check-in da criança: definir com **E14** quem faz (o responsável, com o login dele?) antes de liberar para turmas infantis.
- [ ] Corrigir os problemas 1, 2 e 6 da [tabela da seção 1](#defeitos-e-lacunas-do-protótipo-que-o-back-end-não-pode-herdar):
  - vínculo **aluno ↔ turma** no cadastro e na tela de presença (remove os ids fixos);
  - regra de graduação conforme **E1**;
  - esconder ou implementar botões inertes ("Esqueci a senha", "Editar" da equipe, "Salvar" de Configurações).
- [ ] Campos de consentimento do responsável no cadastro de aluno (**E7**), e ajustar os campos do cadastro conforme **E6**.
- [ ] Ajustar planos, categorias e textos conforme **E2, E4, E12**.
- [ ] Decidir o destino dos "Avisos automáticos" (Configurações): manter só os que **E9** confirmar.
- [ ] Preparar o front para a API: `src/lib/api.ts`, TanStack Query, estados de carregamento/erro por tela. `store.tsx` continua sendo o único ponto de costura.

**Pronto quando:** o professor percorre o fluxo diário (conferir presenças, corrigir, cadastro, ver quem deve) e um aluno faz check-in, sem pedirem ajuste de layout ou texto.

### Fase 2 — Fundação · ~1 a 2 semanas

- [ ] Criar **projetos novos** na Neon e na Railway só para o REDSHIELD (D10). **Dev** e **prod** separados desde o início; na Neon, uma *branch* gratuita serve de ambiente de teste. Escolher a região mais próxima do Brasil e **conferir se a Neon tem São Paulo**.
- [~] Banco: criar um papel de aplicação **sem permissão de dono** (a API não roda migração nem altera esquema) e outro papel só para migrações. Usar a conexão **com pool** da Neon e SSL obrigatório.
- [~] API Fastify servindo também o front compilado (D9). Segredos nas variáveis da Railway. Definir **alerta e limite de gasto** na Railway, porque o crédito incluído no plano é dividido com o outro projeto da conta.
- [x] Aplicar o [`db/schema.sql`](./db/schema.sql) como migração versionada (001) e criar um *seed* equivalente aos dados simulados atuais.
- [~] Autenticação real (e-mail + senha; recuperação de senha por e-mail), **incluindo o papel aluno** e o vínculo `usuario.aluno_id` → `aluno`. Sessão com cookie `httpOnly`, `Secure` e `SameSite=Strict`. Escolher a biblioteca de autenticação **verificando se está mantida hoje**; se não houver uma boa, implementar o mínimo (senha com Argon2id, sessão em tabela, recuperação por e-mail com token de uso único).
- [x] **Autorização no servidor**, por papel e por `academia_id` — a guarda do front é só navegação. Todo acesso filtra pela academia da sessão; nenhuma rota aceita `academia_id` vindo do cliente.
- [ ] Camada de API no front: conversão **reais ↔ centavos** na borda (problema 3) e datas em ISO.
- [~] CI no GitHub Actions: lint + `tsc` + testes + build. Deploy automático na Railway a partir da `main`. O GitHub Pages atual (demonstração com dados simulados) deixa de ser necessário quando o back-end entrar; decidir se mantém como vitrine.
- [ ] Monitoramento de erro (Sentry) e de disponibilidade (UptimeRobot), ambos gratuitos.
- [~] **Backup:** rotina de `pg_dump` agendada (GitHub Actions) para armazenamento externo. A janela de restauração do plano gratuito da Neon é de cerca de 6 horas e **não substitui backup**. Fazer **um teste de restauração de verdade**.

**Pronto quando:** login real funciona em produção; um usuário de uma academia **não consegue** ler dados de outra (teste automatizado); o backup foi restaurado com sucesso em um banco vazio.

### Fase 3 — Alunos e planos · ~1 a 2 semanas

- [x] CRUD de planos (gestor) e de alunos (gestor + professor), com filtros, busca e exportação já existentes no front.
- [ ] Ficha do aluno: resumo, histórico de presença e pagamentos (as duas últimas abas ficam vazias até as fases 4 e 5).
- [x] Consentimento do responsável gravado com data e autor.
- [x] Registro em `log_auditoria` de criação, edição e remoção de aluno.

**Pronto quando:** o professor cadastra, edita e consulta alunos reais; recarregar a página não perde nada.

### Fase 4 — Turmas, agenda e presença por check-in · ~2 semanas

- [x] CRUD de turmas, aulas e do vínculo aluno ↔ turma.
- [x] **Check-in do aluno** (`POST /aulas/:aulaId/checkin`), com as regras **no servidor**: só a aula do dia; só aluno matriculado na turma; recusado se a aula foi cancelada ou fora do prazo (**E16**); repetir é inofensivo (`on conflict do nothing`); **nunca sobrescreve** uma marcação do professor. `DELETE` só desfaz o que o próprio aluno marcou.
- [x] **Correção do professor** (`PUT /chamadas/:aulaId/:data/presencas/:alunoId`): marcar presente, falta (e justificado, se **E17** mantiver), de qualquer aluno, inclusive de dias anteriores. Grava `origem = 'professor'`, uma observação opcional e **uma linha em `log_auditoria`** (antes e depois).
- [x] **Cancelar aula** (feriado, aula que não aconteceu): `POST /chamadas/:aulaId/:data/cancelar`. Aula cancelada sai da frequência de todos e recusa check-in (**E11**).
- [ ] Tela do professor: lista da aula com quem fez check-in, quem **não** fez (rotulado como falta) e botões de correção. Mostrar a origem de cada registro ("Check-in do aluno · 18:52") na lista e na ficha do aluno.
- [ ] **Não** implementar "fechar chamada" nem "marcar todos" (modelo antigo, defeito 10).
- [ ] Se **E8** disser que falta sinal no tatame: guardar o check-in no navegador e reenviar quando a conexão voltar. O servidor precisa aceitar o horário original do check-in sem permitir backdating arbitrário. Se não, adiar para o pós-lançamento.
- [ ] Para quem não tem celular ou login (**E14**): o professor marca presente na mesma tela. Definir se isso precisa de um atalho.

**Pronto quando:** um aluno de teste faz check-in pelo celular, o professor vê o registro sem recarregar, corrige para falta, e o aluno não consegue desfazer nem refazer; uma aula cancelada recusa check-in e some do cálculo de frequência.

### Fase 5 — Cobranças e financeiro · ~2 semanas

- [x] Geração mensal de `cobranca` para cada aluno ativo, conforme plano e dia de vencimento. Idempotente (`unique (aluno_id, competencia)`).
- [x] Baixa manual de cobrança: cria a `transacao` vinculada e marca como paga **na mesma transação de banco**.
- [x] Lançamento avulso de receitas e despesas, com as categorias de **E4**.
- [x] Lista de inadimplência a partir das cobranças abertas vencidas (a "situação de pagamento" do aluno é calculada, não gravada).
- [ ] Opcional (decidir em **V6**): botão "Cobrar pelo WhatsApp" que abre `wa.me/<telefone>?text=<mensagem pronta>`. Custo zero, 1 clique por aluno, sem integração.

**Pronto quando:** o professor fecha um mês real — gera cobranças, dá baixa em pagamentos — e o resultado bate com a planilha dele.

### Fase 6 — Painel, métricas e graduações · ~1 a 2 semanas

- [~] Trocar `selectors.ts` por consultas no servidor (SQL/views), para o celular não varrer 45 dias de chamadas.
- [x] Graduações: registrar promoção, histórico por aluno, e a lista de elegíveis conforme a regra de **E1**.
- [~] Auditoria de ponta a ponta nas ações sensíveis (mudança de faixa, remoção de lançamento).

**Pronto quando:** os quatro indicadores do Painel batem com contas feitas à mão sobre os dados reais.

### Fase 7 — E-mail e rotinas automáticas · ~1 semana

- [ ] Provedor de e-mail configurado com o domínio (SPF, DKIM, DMARC) — **V4** precisa estar resolvida.
- [~] Rotinas: gerar cobranças (dia 1), lembrete de vencimento, aviso de atraso, resumo semanal, só dos avisos que **E9** confirmou.
- [x] Registro em `envio_email` antes de enviar, com índice único, para a rotina **nunca mandar o mesmo aviso duas vezes**.
- [x] Respeitar os interruptores de Configurações (`config_aviso`).
- [ ] Atenção ao limite diário do provedor gratuito ao concentrar vencimentos (ver seção 4).

**Pronto quando:** um lembrete real chega na caixa de entrada (não no spam) e rodar a rotina duas vezes não duplica o envio.

### Fase 8 — Segurança, LGPD e testes · ~1 a 2 semanas

- [~] Testes de ponta a ponta nos fluxos que não podem quebrar: **check-in do aluno**, **correção do professor**, cadastro com cobrança, baixa de pagamento, **professor não abre Financeiro**, **um aluno não vê a ficha, os dados ou o check-in de outro aluno**, **uma academia não vê dados de outra**.
- [~] Rate limit no login; HTTPS e HSTS; senhas com Argon2id ou o equivalente do provedor.
- [~] Política de privacidade acessível no sistema; exportação e exclusão/anonimização de dados de um titular sob pedido.
- [~] Revisão de segurança do código e das regras de acesso do banco.
- [ ] Teste de restauração de backup repetido, agora com dados reais de teste.

**Pronto quando:** o checklist de segurança da seção 7 do `PLANO_DESENVOLVIMENTO.md` está inteiro marcado.

### Fase 9 — Importar a planilha · ~1 semana

- [ ] Exportar a planilha em CSV (**E10**).
- [x] Script de importação com validação por linha e **relatório de linhas rejeitadas**.
- [ ] Rodar primeiro em ambiente de teste; revisar as rejeições **junto com o professor**.
- [ ] Importar em produção e conferir totais: número de alunos e soma das mensalidades contra a planilha.

**Pronto quando:** os totais batem e o professor reconhece os alunos importados.

### Fase 10 — Piloto e lançamento · 2 a 4 semanas

- [ ] **Piloto em paralelo à planilha**: o professor usa o sistema de verdade, e a planilha continua sendo atualizada. É o teste que decide se ele adota ou volta para o papel.
- [ ] Registrar toda reclamação e todo "ficou chato de fazer"; corrigir antes do corte.
- [ ] **Go-live:** decidir (**V3**) se sobe para o plano pago com backup automático; apontar o domínio definitivo; remover o bloco "Acessos de demonstração" do login e apagar `mock.ts`.
- [ ] Planilha vira somente leitura por 30 dias.

**Pronto quando:** 30 dias de operação sem voltar à planilha.

### Depois do lançamento

Em ordem de valor, sujeita ao que o piloto mostrar:

0. **Endurecer o check-in**, em ordem de custo, só se o piloto mostrar abuso: (a) janela de horário (ex.: de 15 min antes a 15 min depois da aula); (b) QR code no tatame, trocado a cada aula; (c) geolocalização; (d) confirmação do professor para quem fizer check-in fora da janela. A coluna `presenca.origem` já separa o que o aluno marcou do que o professor marcou.
1. Pix com cobrança automática e baixa automática (Asaas, Mercado Pago ou similar).
2. Check-in offline (PWA instalável) — sobe de prioridade se **E8** indicar sinal ruim, já que aqui sem sinal significa falta.
3. Portal do aluno completo (hoje o aluno só tem Painel, Agenda, Progresso e Check-in).
4. Envio por WhatsApp via API oficial (tem custo por conversa).
5. Relatório de retenção por mês de matrícula.
6. Multi-unidade; programa técnico por faixa.

**Total estimado até o go-live: ~14 a 20 semanas** (inclui o login próprio da decisão D8) de trabalho de 1 desenvolvedor, sem contar a espera pelas respostas da Fase 0.

---

## 4. Infraestrutura e custos

> **Preços:** são aproximados, baseados no que eu conheço dos planos de cada serviço, e **mudam**. Confira a página oficial antes de assinar.
> Conversão usada: US$ 1 ≈ R$ 5,50.

### 4.1 Arquitetura adotada (D8–D10) e alternativas

> **Preços:** vêm de pesquisa feita na data da decisão e **mudam**. Confira as páginas oficiais antes de assinar ou mudar de plano.

**Adotada:** Neon (banco) + Railway (API Fastify que também serve o front) + Resend (e-mail) + GitHub Actions (CI e backup).

| | **Adotada (C)** | Alternativa A — tudo gerenciado | Alternativa B — servidor próprio |
|---|---|---|---|
| Front | servido pela API (Railway) | Cloudflare Pages | Cloudflare Pages |
| Banco | **Neon** | Supabase | Postgres no servidor |
| Login | código próprio | Supabase Auth | código próprio |
| API / regras | **Fastify; autorização em código** | regras de acesso no banco (RLS) + funções de borda | Node + Fastify |
| Rotinas | `node-cron` na API | `pg_cron` + funções de borda | `node-cron` |
| Custo adicional hoje | **~R$ 3/mês** (domínio), pois a Railway já é paga | ~R$ 3/mês | ~R$ 30/mês |
| Custo para operar sério | Neon pago (uso, poucos dólares) + eventual excedente da Railway | ~R$ 145/mês (Supabase Pro) | ~R$ 30/mês + seu tempo |
| Esforço de desenvolvimento | médio (login é nosso) | menor | maior |
| Risco principal | login e sessão mal feitos; custo da Railway passar do crédito incluído | regra de acesso (RLS) mal escrita vaza dados entre alunos | você vira o suporte do servidor |

**Por que C e não A:** com a Railway já paga, o custo adicional é praticamente o mesmo da opção A. E em C a regra de acesso é código que se lê e se testa,
e não política de banco, o que reduz o risco de vazar dado de menores entre alunos. O preço é o **esforço de construir o login**, estimado em cerca de uma semana a mais na Fase 2.

**Por que o front vai junto com a API (D9):** mesma origem elimina CORS e simplifica o cookie de sessão, reduzindo superfície de ataque, e é um serviço só para publicar.
O custo: se a API cair, o front cai junto. Para um sistema que só funciona com a API, isso não muda a experiência.

O modelo em `db/schema.sql` serve para as três opções. O que muda entre elas é onde mora a lógica, não o banco.

### 4.2 Limites e cuidados da combinação adotada

**Neon, plano gratuito:**
- **Banco suspenso após 5 minutos sem uso**: a primeira requisição depois disso demora mais. O professor ou o aluno vai notar na primeira abertura do dia. Manter o banco acordado com um monitor gasta as horas de computação gratuitas (cerca de 100 por mês), então não vale.
- **Armazenamento pequeno** (0,5 GB, ou 1 GB segundo fonte mais recente; conferir em [neon.com/pricing](https://neon.com/pricing)). Para centenas de alunos sobra.
- **Sem backup:** a janela de restauração gratuita é de cerca de 6 horas (fonte de terceiros). O `pg_dump` agendado é obrigatório e a restauração precisa ser testada (Fases 2 e 8).
- No plano pago o preço é por uso (computação por hora e armazenamento por GB). Para um banco deste tamanho deve custar poucos dólares por mês; **confirmar antes** de assinar.

**Railway, plano de US$ 5:**
- Inclui US$ 5 de uso por mês e **cobra o excedente**. Como a conta já tem outro projeto, o REDSHIELD entra no **mesmo crédito**. Uma API pequena usa pouca memória, mas **monitore o consumo** e defina um limite de gasto.
- **Região:** a Railway não tem região no Brasil. Adotado `us-east4` (Virgínia), a mais próxima do banco na Neon em São Paulo (decisão do dono, 2026-11-03; migrar para servidor no Brasil é um plano futuro).

**Vercel:** não usar em produção (ver D8). O projeto que você já tem pode continuar como está.

**LGPD:** o banco e a API ficam em provedores no exterior. Para dados de menores, definir a base legal da transferência internacional e citá-la na política de privacidade (Fase 8). Preferir região em São Paulo na Neon, se existir.

### 4.3 Envio de e-mail

| Serviço | Gratuito | Pago (aprox.) | Quando escolher |
|---|---|---|---|
| **Resend** (recomendado) | 3.000/mês, **100/dia**, 1 domínio | ~US$ 20/mês para 50 mil | API simples, ótima documentação. Começar aqui |
| **Brevo** | 300/dia (~9 mil/mês) | a partir de ~US$ 9/mês | Se o limite de 100/dia do Resend apertar |
| **Amazon SES** | — | ~US$ 0,10 por 1.000 e-mails | Mais barato em volume. Exige conta AWS e sair do *sandbox*; configuração mais trabalhosa |

**Cuidado com o limite diário.** Lembrete "3 dias antes do vencimento": se todos os alunos vencem no mesmo dia (ex.: dia 10), 200 alunos geram
200 e-mails em um dia — mais que o limite de 100/dia do Resend. Soluções: espalhar o vencimento (dias 5, 10, 15, 20), usar Brevo, ou
enfileirar o envio em lotes de 100/dia. Isso volta para a decisão **E3**.

**Necessário em qualquer opção:** domínio próprio com SPF, DKIM e DMARC configurados. Sem isso, os e-mails caem no spam.
Alunos menores geralmente não têm e-mail; o aviso deve ir para o e-mail do responsável (**E9**).

**Alternativa de custo zero para cobrança:** link do WhatsApp (`wa.me`) com mensagem pronta, aberto manualmente pelo professor.
Não é automação, mas resolve o problema de "como cobrar" sem pagar a API oficial.

### 4.4 Demais serviços

| Necessidade | Escolha de menor custo | Custo |
|---|---|---|
| Hospedagem do front | **Servido pela própria API na Railway** (D9). Antes disso, o GitHub Pages hospeda a demonstração (grátis só em repositório **público**). Cloudflare Pages é a alternativa, se separar | R$ 0 adicional |
| Domínio `.com.br` | registro.br | ~R$ 40/ano |
| Armazenar fotos de aluno (se **E6** pedir) | Cloudflare R2 (10 GB gratuitos) | R$ 0 |
| Backup externo | Cloudflare R2 ou Backblaze B2 (10 GB cada) | R$ 0 |
| Erros em produção | Sentry (plano gratuito, ~5 mil eventos/mês) | R$ 0 |
| Monitor de disponibilidade | UptimeRobot (plano gratuito) | R$ 0 |
| Pix automático (pós-lançamento) | Mercado Pago, Asaas ou similar — **cobram taxa por transação** | variável |
| WhatsApp oficial (pós-lançamento) | API oficial — cobra por conversa | variável |

### 4.5 Custo mensal (arquitetura adotada, revisado em 2026-11-03)

Valores aproximados, com o dólar a cerca de R$ 5,50. **Os preços de Neon, Resend e Railway são estimativas e mudam com frequência: confirmar nos sites antes de fechar valor com a academia.**

**Configuração atual (v1 no ar):**

| Item | Para que serve | Custo/mês |
|---|---|---|
| Railway (Hobby) | Servidor da API, que também serve o front | **US$ 5 (~R$ 28)**, fixo enquanto o uso **da conta inteira** ficar abaixo do crédito de US$ 5 |
| Domínio `.com.br` (registro.br) | Endereço próprio e remetente dos e-mails | ~R$ 40/ano, **~R$ 3,50/mês** |
| Neon (gratuito) | Banco de dados | R$ 0 |
| Resend (gratuito) | E-mails automáticos e recuperação de senha | R$ 0, até **100/dia** e 3.000/mês |
| Cloudflare R2 ou Backblaze B2 | Cópias diárias do backup | R$ 0, até 10 GB |
| GitHub Actions | CI e backup diário | R$ 0, dentro dos minutos gratuitos |
| UptimeRobot | Alerta de queda | R$ 0 |
| Sentry (opcional) | Registro de erros | R$ 0 |
| **Total mínimo** | | **~R$ 32/mês** |

**Como a Railway cobra:** por minuto ligado, somando memória (~US$ 10 por GB/mês), processador (~US$ 20 por vCPU/mês) e tráfego de saída (~US$ 0,05 por GB). A API fica ligada 24 h (as rotinas exigem) e usa ~100 a 200 MB, o que dá **~US$ 2 a 3/mês** só para o REDSHIELD. O volume de acessos de uma academia (centenas de check-ins por dia) soma segundos de processador por dia e quase não pesa. **A conta da Railway tem outro projeto, que divide o mesmo crédito:** conferir a página *Usage* somando os dois.

**O que pode aumentar a conta:**

| Situação | Custo a mais (aprox.) | Quando |
|---|---|---|
| Neon pago | De poucos dólares a ~US$ 20/mês (confirmar o plano) | O gratuito tem pouco espaço, suspende o banco sem uso (primeira abertura do dia mais lenta) e não tem backup próprio. **Recomendado antes de entrar dado real de muitos alunos** |
| Resend pago | ~US$ 20/mês (~R$ 110) | Mais de 100 e-mails por dia; antes, considerar espalhar os vencimentos (**E3**) |
| Excedente da Railway | Por uso | Ambiente de demonstração, outra academia, ou o outro projeto da conta |
| VPS no Brasil (no lugar da Railway) | ~R$ 30 a 50/mês | Só se houver lentidão medida, conta da Railway acima de ~US$ 10 ou recomendação jurídica (LGPD). Exige manter atualizações, HTTPS, monitoramento e deploy por conta própria |
| Pix automático | Taxa por cobrança | Pós-lançamento, depois de **V6** |

**Resumo:** mínimo **~R$ 32/mês**; recomendado para operar com dados reais (Neon pago) **~R$ 60 a 140/mês**; com volume alto de e-mail, mais ~R$ 110.

---

## 5. Critério de "no ar"

O produto está lançado quando **todos** os itens abaixo forem verdadeiros:

- [ ] V1 resolvida (marca) e domínio definitivo apontando para o sistema.
- [ ] Login real; nenhuma conta de demonstração, nenhum `mock.ts`.
- [ ] Teste automatizado provando que professor não vê Financeiro e que uma academia não vê dados de outra.
- [ ] Backup diário rodando **e restaurado com sucesso** pelo menos uma vez.
- [ ] Consentimento do responsável registrado para todo aluno menor e política de privacidade acessível.
- [ ] Dados da planilha importados e conferidos com o professor.
- [ ] Piloto de 2+ semanas em paralelo concluído, com o professor dizendo que não quer voltar para a planilha.
- [ ] Monitoramento de erro e de disponibilidade ativos.

## 6. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Uso da marca sem autorização | Alto — jurídico | **V1**, antes de divulgar |
| Professor não adota e volta à planilha | Alto — o projeto morre | Sessão de validação (Fase 0), piloto paralelo (Fase 10) |
| Falha de regra de acesso expõe dados entre academias ou de menores | Alto — LGPD | Testes automáticos de acesso (Fase 8), revisão de segurança |
| Perda de dados sem backup restaurável | Alto | Backup testado desde a Fase 2 |
| E-mails caindo no spam / estourando limite | Médio | Domínio com SPF/DKIM/DMARC; vencimentos espalhados; Brevo como reserva |
| **Fraude no check-in** (marcar de casa ou por um colega), sem confirmação do professor (D6) | Médio — contamina frequência e elegibilidade à graduação | Risco **aceito** para a v1. A origem é gravada; o professor continua podendo corrigir a chamada. Medir no piloto (check-ins fora do horário, check-ins de quem o professor depois marcou ausente) antes de endurecer |
| **Falta por omissão** (D3): aluno esquece o celular, fica sem sinal ou não tem login e perde presença; o professor passa a corrigir o que o sistema não captou | Médio — frequência injusta, trabalho de correção | Validar com **E14/E15/E16** antes de construir; auditoria das correções; check-in offline se **E8** exigir |
| Login e sessão implementados do zero com falha (sequestro de sessão, recuperação de senha fraca) | Alto | Biblioteca mantida, ou implementação mínima revisada; cookie `httpOnly`/`Secure`/`SameSite`; limite de tentativas; testes de segurança na Fase 8 |
| Crédito da Railway estourado por dois projetos na mesma conta | Baixo — custo | Alerta e limite de gasto; avaliar separar contas se crescer |
| Neon gratuita suspensa por inatividade e sem backup | Médio | `pg_dump` agendado e restauração testada; avaliar plano pago no lançamento |
| Aluno ver dado de outro aluno (menores) | Alto — LGPD | Painel do aluno só com dados dele (Fase 1) e testes de isolamento (Fase 8) |
| Escopo crescer (pagamento, WhatsApp, portal do aluno completo) | Médio — atraso | Itens "Depois do lançamento" não entram antes do go-live |
| Dependência de um único desenvolvedor | Médio | Documentação, migrações versionadas, CI desde a Fase 2 |
