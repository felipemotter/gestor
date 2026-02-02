# Plano: Reconciliação — Fase A

## Resumo

Implementar a base do sistema de reconciliação: flag `is_reconcilable` nas contas, rastreamento do período reconciliado, bloqueio de lançamentos manuais em período reconciliado, campos bloqueados para transações OFX, e metadados de período/saldo na importação.

---

## 1. Schema: novos campos em `accounts`

**Arquivo:** `db/init/001_init.sql` + novo patch `db/patches/007_reconciliation.sql`

Adicionar à tabela `accounts`:
```sql
is_reconcilable boolean not null default false,
reconciled_until date,       -- data até onde o extrato cobre (DTEND do último OFX)
reconciled_balance numeric(14,2)  -- saldo informado pelo banco (BALAMT do último OFX)
```

**Patch:** ALTER TABLE + atualizar contas que já tiveram importação (`SELECT DISTINCT account_id FROM transactions WHERE source = 'ofx'`) setando `is_reconcilable = true`.

---

## 2. Trigger: bloquear lançamento manual em período reconciliado

**Arquivo:** `db/patches/007_reconciliation.sql`

Criar trigger `enforce_reconciled_period` na tabela `transactions` (BEFORE INSERT OR UPDATE):
- Se a conta tem `reconciled_until` e `posted_at <= reconciled_until`
- E a transação tem `source` diferente de `'ofx'`
- E o usuário **não** é admin/owner da família → RAISE EXCEPTION
- Admin/owner pode ignorar o bloqueio (usa `is_family_admin(family_id)` da conta)

---

## 3. Atualizar tipo `Account` no frontend

**Arquivo:** `apps/web/src/contexts/AppContext.tsx`

Adicionar ao tipo `Account`:
```typescript
is_reconcilable: boolean;
reconciled_until: string | null;
reconciled_balance: number | null;
```

---

## 4. Filtrar contas na tela de importação

**Arquivo:** `apps/web/src/app/(app)/importacoes/page.tsx`

No select de conta, filtrar apenas contas com `is_reconcilable === true`. Se nenhuma conta for reconciliável, mostrar mensagem orientando a habilitar no cadastro da conta.

---

## 5. Toggle `is_reconcilable` no AccountModal

**Arquivo:** `apps/web/src/components/modals/AccountModal.tsx`

Adicionar toggle/checkbox "Conta reconciliável (importação de extrato)" no formulário. Salvar no insert/update. Ao editar, carregar o valor atual.

---

## 6. Gravar período e saldo na importação

**Arquivo:** `apps/web/src/app/(app)/importacoes/page.tsx` — enviar `startDate`, `endDate`, `ledgerBalance` no body do confirm.

**Arquivo:** `apps/web/src/app/api/imports/confirm/route.ts`:
- Receber `startDate`, `endDate`, `ledgerBalance` no request
- Gravar em `import_batches.metadata`: `{ date_start, date_end, ledger_balance, ... }`
- Após inserir transações com sucesso, atualizar a conta:
  ```sql
  UPDATE accounts SET reconciled_until = endDate, reconciled_balance = ledgerBalance
  WHERE id = accountId AND (reconciled_until IS NULL OR reconciled_until < endDate)
  ```
  (só avança a data, nunca retrocede)

---

## 7. Bloquear campo `posted_at` no TransactionModal para transações OFX

**Arquivo:** `apps/web/src/components/modals/TransactionModal.tsx`

Quando editando e `source === 'ofx'` ou `external_id` existe:
- Desabilitar o campo de data (já desabilita conta e valor, adicionar data)
- Mostrar texto explicativo: "Data não editável — veio do extrato bancário"

---

## 8. Aviso/bloqueio no TransactionModal para período reconciliado

**Arquivo:** `apps/web/src/components/modals/TransactionModal.tsx`

Ao submeter (criação manual, não edição):
- Buscar a conta selecionada nos `accounts` do contexto
- Se `reconciled_until` existe e `transactionDate <= reconciled_until`:
  - Se o usuário é `member` ou `viewer` → exibir erro e bloquear
  - Se o usuário é `admin` ou `owner` → exibir aviso amarelo mas permitir submissão

---

## 9. Atualizar CLAUDE.md

Documentar novos campos, trigger, regra de negócio sobre reconciliação.

---

## Arquivos tocados (resumo)

| Arquivo | Mudança |
|---------|---------|
| `db/init/001_init.sql` | Novos campos em `accounts` |
| `db/patches/007_reconciliation.sql` | ALTER TABLE + trigger |
| `apps/web/src/contexts/AppContext.tsx` | Tipo `Account` atualizado |
| `apps/web/src/components/modals/AccountModal.tsx` | Toggle reconciliável |
| `apps/web/src/components/modals/TransactionModal.tsx` | Bloqueio data OFX + aviso período |
| `apps/web/src/app/(app)/importacoes/page.tsx` | Filtrar contas + enviar período |
| `apps/web/src/app/api/imports/confirm/route.ts` | Receber período + atualizar conta |
| `CLAUDE.md` | Documentação |

## Fora do escopo (Fases B e C)

- Reconciliação/fusão de transações manuais ↔ importadas
- Regras de categorização automática
- Comparação saldo esperado vs. real
- Tela dedicada de reconciliação
