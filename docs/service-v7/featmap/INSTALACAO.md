# Featmap local do Service

Instalado em 20/10/2026, a partir de `https://github.com/amborle/featmap.git`.
Revisão instalada: `42c6239a5a47a85d5c2e7b78c16469868af4d7fa`.

Aplicação: <http://localhost:5180/cexservice>.

Mapas:

- [Funcionalidades e validação: 34 módulos, 211 cartões](http://localhost:5180/cexservice/projects/4264c283-2114-52b5-81ff-2575a6183fc2)
- [Jornadas de ponta a ponta: 12 jornadas, 110 cartões](http://localhost:5180/cexservice/projects/53ac0c9c-9c6d-58f0-9f08-76328841af3e)

## Entrar

O email e a senha gerada estão em `/Users/macbook/.local/share/featmap/ACESSO.txt`.
São credenciais exclusivas desta instância local. O arquivo tem permissão 600.
O cadastro foi feito localmente; não há SMTP configurado.

## Localização e persistência

- Código da ferramenta: `/Users/macbook/.local/share/featmap/source`.
- Configuração local: `/Users/macbook/.local/share/featmap/compose.yaml`.
- PostgreSQL 16 em volume Docker `cex-featmap_featmap-data`.
- Aplicação publicada apenas em `127.0.0.1:5180`; banco sem porta publicada.
- Compartilhamento externo desligado no workspace.
- Nenhuma conexão com banco de produção ou credencial do Service.

O Docker precisa estar rodando. Os containers reiniciam com Docker, exceto se forem parados explicitamente.

## Operação

Iniciar:

```bash
docker compose -p cex-featmap -f ~/.local/share/featmap/compose.yaml up -d
```

Parar preservando os dados:

```bash
docker compose -p cex-featmap -f ~/.local/share/featmap/compose.yaml stop
```

Reimportar a análise a partir da raiz deste repositório:

```bash
python3 tools/featmap/importar.py docs/service-v7/featmap/analise-service.json
```

O importador usa IDs determinísticos e preserva cartões já existentes. Reimportar não atualiza automaticamente os textos editados pelo usuário. `snapshot-featmap.json` é uma cópia da resposta verificada da API; `analise-service.json` é a entrada do importador.

## Verificação realizada

- Build do frontend e backend concluído no Docker.
- `/v1/health` retorna `healthy`.
- Cadastro e login local, criação de mapas, personas, colunas, cartões e descrições via API.
- Leitura de retorno: 321 cartões em dois projetos, com descrições presentes.
- Segunda importação mantém os mesmos totais, sem duplicar cartões.
- Divergência da Secretaria verificada executando a função `podeVerRota` extraída do código atual.
- Navegador integrado indisponível por erro de conexão do ambiente. A interface não teve verificação visual.
- Não foram executadas jornadas autenticadas no Service nem alterações no código do aplicativo.
