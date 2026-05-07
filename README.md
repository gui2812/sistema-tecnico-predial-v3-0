# Sistema Técnico Predial v2.8

## Rodar o projeto

```bash
npm install
npm run dev
```

Abra o link exibido no terminal, normalmente: http://localhost:5173/

## Acessos padrão

- admin / 1455
- manutencao / 1234
- limpeza / 1234
- bms / 1234

## Novidades da v2.8

- Nova aba **Usuários e Permissões**.
- Criar novos usuários.
- Alterar nome exibido, usuário de login, senha e setor.
- Ativar/desativar usuário.
- Excluir usuário.
- Perfis rápidos: Administrador, Líder, Técnico e Consulta.
- Permissões por página.
- Botão para resetar usuários padrão.

## Observação

Nesta versão os dados continuam salvos em localStorage no navegador. Para uso em vários computadores e celulares ao mesmo tempo, a próxima etapa recomendada é migrar para Supabase.
