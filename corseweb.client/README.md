# CorseWeb — cliente web

Cliente SPA construído com React, TypeScript, Vite e SCSS. As rotas públicas, do aluno, administrativas e o editor visual estão em `src/Pages/` e são registradas em `src/App.tsx`.

## Desenvolvimento

```bash
npm ci
npm run dev
```

Em desenvolvimento, o Vite encaminha `/api`, `/uploads` e `/weatherforecast` para o backend ASP.NET Core. Para apontar para uma URL específica, defina `VITE_API_PROXY_TARGET` antes de executar o servidor.

## Verificações

```bash
npm run lint
npm run test:i18n
npm run build
```

`test:i18n` executa os testes Node disponíveis para resolução de locale e utilitários. Não equivale a uma suíte de testes de interface ponta a ponta.

## Organização

- `src/Pages/`: páginas e áreas públicas, aluno, administração e editor.
- `src/components/` e `src/UIComplement/`: componentes reutilizáveis.
- `src/i18n/`: provider, seleção de locale e dicionários pt-BR/en/es.
- `src/store/`: sessão, cursos e matrículas.
- `src/lib/api.ts`: wrapper HTTP com credenciais por cookie.
- `src/types/course.ts`: contrato TypeScript de curso, módulo, aula, nó e conexão.
- `src/Styles/` e arquivos `.scss`: tokens e estilos por componente/página.

Para setup completo, credenciais e comandos .NET, consulte [`../docs/DEVELOPMENT/local-setup.md`](../docs/DEVELOPMENT/local-setup.md). Índice da documentação: [`../docs/README.md`](../docs/README.md).